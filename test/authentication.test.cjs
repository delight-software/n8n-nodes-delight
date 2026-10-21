const assert = require('node:assert/strict')
const { before, test } = require('node:test')
const { Expression, NodeApiError, NodeHelpers } = require('n8n-workflow')
const { prepareN8nRuntime } = require('./helpers/n8n-runtime.cjs')
const { DelightApi } = require('../dist/credentials/DelightApi.credentials')
const { delightApiRequest } = require('../dist/nodes/Delight/api/delightApi')
const { getSessionConfiguration } = require('../dist/nodes/Delight/api/sessionConfiguration')
const events = require('../dist/nodes/Delight/api/events')

let runtime
before(async () => {
	runtime = await prepareN8nRuntime()
})

const configuration = (changes = {}) => ({
	restApiUrl: 'https://api.example.invalid/rest/',
	username: 'test-user',
	password: 'test-password',
	...changes
})

function httpError(status) {
	return Object.assign(new Error(`HTTP ${status}`), {
		response: { status, data: { message: `HTTP ${status}` } }
	})
}

function harness() {
	const credential = new DelightApi()
	const stored = new Map([['first', configuration()]])
	const sessions = new Map()
	const calls = []
	const writes = []
	let sequence = 0
	const h = { credential, stored, sessions, calls, writes }
	h.onLogin = async (options) => {
		const identity = JSON.stringify([options.url, options.body[0]])
		if (!sessions.has(identity)) sessions.set(identity, `session-${++sequence}`)
		return { result: [sessions.get(identity), true, { auth: true }] }
	}
	h.onRequest = async (options) => {
		if (options.url.endsWith('/QuerySchemas')) {
			return {
				result: [true, { schemas: [{ name: '@table:contacts', title: 'Contacts', fields: [] }] }]
			}
		}
		return { result: [true, { records: [] }] }
	}
	const transport = async (options) => {
		calls.push(structuredClone(options))
		return options.url.endsWith('/Authentication/Login') ? h.onLogin(options) : h.onRequest(options)
	}
	const nativeRequest = runtime.createRequestHelper(transport)
	const credentialsHelper = new runtime.CredentialsHelper({
		getByName: (type) => {
			assert.equal(type, 'delightApi')
			return credential
		},
		getParentTypes: () => []
	})
	// Only persistence is substituted: n8n's preAuthentication and authenticate
	// implementations above execute unchanged, including their merge behavior.
	credentialsHelper.getCredentials = async ({ id }) => ({
		getData: async () => structuredClone(stored.get(id))
	})
	credentialsHelper.updateCredentials = async ({ id }, type, data) => {
		assert.equal(type, 'delightApi')
		stored.set(id, structuredClone(data))
		writes.push({ id, data: structuredClone(data) })
	}
	h.context = (id = 'first', parameters = {}, type = 'n8n-nodes-delight.delight') => {
		const node = {
			id: 'node',
			name: 'Delight',
			type,
			typeVersion: 1,
			position: [0, 0],
			parameters,
			credentials: { delightApi: { id, name: `Credential ${id}` } }
		}
		const staticData = {}
		const context = {
			getNode: () => node,
			getWorkflow: () => ({ id: 'workflow' }),
			getMode: () => 'trigger',
			getWorkflowStaticData: () => staticData,
			getNodeWebhookUrl: () => 'https://n8n.example.invalid/webhook/test',
			getNodeParameter: (key, index, fallback) => parameters[key] ?? fallback,
			getCurrentNodeParameter: (key) => parameters[key],
			getCredentials: async (type) => {
				assert.equal(type, 'delightApi')
				const values = NodeHelpers.getNodeParameters(
					credential.properties,
					structuredClone(stored.get(id)),
					true,
					false,
					null,
					null
				)
				const expression = new Expression('UTC')
				return Object.fromEntries(
					Object.entries(values).map(([key, value]) => [
						key,
						expression.resolveSimpleParameterValue(value, {})
					])
				)
			},
			logger: { warn: () => assert.fail('Unexpected single-use request body') },
			helpers: {
				httpRequest: transport,
				async httpRequestWithAuthentication(type, options, additionalOptions) {
					assert.equal(this, context)
					return nativeRequest.call(
						context,
						type,
						options,
						{},
						node,
						{ credentialsHelper },
						additionalOptions
					)
				},
				returnJsonArray: (data) => (Array.isArray(data) ? data : [data]).map((json) => ({ json })),
				constructExecutionMetaData: (data, { itemData }) =>
					data.map((item) => ({ ...item, pairedItem: itemData }))
			}
		}
		return context
	}
	h.request = (context = h.context(), body = ['contacts', [], []]) =>
		delightApiRequest(context, 'POST', '/database/table/QueryRecords', body)
	h.logins = () => calls.filter((call) => call.url.endsWith('/Authentication/Login'))
	h.requests = () => calls.filter((call) => !call.url.endsWith('/Authentication/Login'))
	return h
}

test('existing credentials log in with the exact payload and reuse the persisted session', async () => {
	const h = harness()
	await h.request()
	await h.request(h.context())
	assert.equal(h.logins().length, 1)
	assert.deepEqual(h.logins()[0], {
		method: 'POST',
		url: 'https://api.example.invalid/rest/services/Authentication/Login',
		body: ['test-user', 'test-password', 'n8n', true, { deviceid: '', devicename: 'n8n' }],
		json: true
	})
	assert.equal(h.writes.length, 1)
	assert.equal(h.stored.get('first').sessionToken, 'session-1')
	assert.equal(h.requests()[1].headers.SESSIONKEY, 'session-1')
	assert.deepEqual(h.requests()[0].body, ['contacts', [], []])
	assert.equal(h.requests()[0].json, true)
})

test('session fields are hidden, sensitive, and only the session key is expirable', () => {
	const credential = new DelightApi()
	for (const name of ['sessionToken', 'sessionTokenConfigurationHash']) {
		const field = credential.properties.find((field) => field.name === name)
		assert.equal(field.type, 'hidden')
		assert.equal(field.typeOptions.password, true)
		assert.equal(field.default, '')
		assert.equal(!!field.typeOptions.expirable, name === 'sessionToken')
	}
	assert.equal(credential.name, 'delightApi')
	assert.deepEqual(
		credential.properties.filter((p) => p.required).map((p) => p.name),
		['restApiUrl', 'username', 'password']
	)
})

test('401 refreshes through n8n and replays the same write exactly once', async () => {
	const h = harness()
	await h.request()
	h.calls.length = 0
	h.sessions.clear()
	let attempts = 0
	h.onRequest = async () => {
		if (++attempts === 1) throw httpError(401)
		return { result: [true, { record_info: [{ server_uid: 'new-record' }] }] }
	}
	await events.addRecord.call(h.context(), '@table:contacts', [{ name: 'Example' }], ['name'])
	assert.equal(h.logins().length, 1)
	assert.equal(h.requests().length, 2)
	assert.deepEqual(h.requests()[0].body, h.requests()[1].body)
	assert.equal(h.requests()[0].url, h.requests()[1].url)
	assert.equal(h.requests()[0].headers.SESSIONKEY, 'session-1')
	assert.equal(h.requests()[1].headers.SESSIONKEY, 'session-2')
})

test('a second 401 terminates without another refresh or write replay', async () => {
	const h = harness()
	h.onRequest = async () => {
		throw httpError(401)
	}
	await assert.rejects(events.addRecord.call(h.context(), 's', [{}], []), { httpCode: '401' })
	assert.equal(h.logins().length, 2)
	assert.equal(h.requests().length, 2)
})

for (const status of [403, 429, 500]) {
	test(`HTTP ${status} does not trigger a login refresh or replay`, async () => {
		const h = harness()
		h.onRequest = async () => {
			throw httpError(status)
		}
		await assert.rejects(h.request(), { httpCode: String(status) })
		assert.equal(h.logins().length, 1)
		assert.equal(h.requests().length, 1)
	})
}

test('transport failures do not replay writes', async () => {
	const h = harness()
	h.onRequest = async () => {
		throw new Error('connection interrupted')
	}
	await assert.rejects(events.addRecord.call(h.context(), 's', [{}], []), /connection interrupted/)
	assert.equal(h.requests().length, 1)
	assert.equal(h.logins().length, 1)
})

for (const [field, value] of [
	['restApiUrl', 'https://other.example.invalid/api'],
	['username', 'other-user'],
	['password', 'changed-password']
]) {
	test(`changing ${field} authenticates again before any application request`, async () => {
		const h = harness()
		await h.request()
		h.calls.length = 0
		h.stored.get('first')[field] = value
		await h.request()
		assert.equal(h.calls[0].url.endsWith('/Authentication/Login'), true)
		assert.equal(h.logins().length, 1)
		assert.equal(h.requests().length, 1)
		assert.equal(
			h.stored.get('first').sessionTokenConfigurationHash,
			getSessionConfiguration(h.stored.get('first'))
		)
	})
}

test('a failed login after a configuration change never sends the previous session', async () => {
	const h = harness()
	await h.request()
	h.calls.length = 0
	h.stored.get('first').password = 'invalid-password'
	h.onLogin = async () => ({ result: ['', false] })
	await assert.rejects(h.request(), /delight API Authentication failed/)
	assert.equal(h.logins().length, 1)
	assert.equal(h.requests().length, 0)
})

test('credential authentication fails closed for stale configuration outside Delight nodes', async () => {
	const h = harness()
	await h.request()
	const credentials = { ...h.stored.get('first'), password: 'changed' }
	await assert.rejects(
		h.credential.authenticate(credentials, { url: 'https://example.invalid' }),
		/Credential configuration changed/
	)
})

test('fingerprint encoding cannot collide through separators and does not store plaintext inputs', () => {
	const a = configuration({ restApiUrl: 'https://example.invalid/api_a', username: 'b' })
	const b = configuration({ restApiUrl: 'https://example.invalid/api', username: 'a_b' })
	assert.notEqual(getSessionConfiguration(a), getSessionConfiguration(b))
	assert.match(getSessionConfiguration(a), /^[a-f0-9]{64}$/)
})

test('separate credential records each persist their own session', async () => {
	const h = harness()
	h.stored.set('second', configuration())
	await h.request(h.context('first'))
	await h.request(h.context('second'))
	assert.equal(h.logins().length, 2)
	assert.deepEqual(
		h.writes.map((write) => write.id),
		['first', 'second']
	)
	await h.request(h.context('first'))
	await h.request(h.context('second'))
	assert.equal(h.logins().length, 2)
})

test(
	'concurrent cold logins reuse the server session without custom synchronization',
	{ timeout: 10000 },
	async () => {
		const h = harness()
		const login = h.onLogin
		let release
		const gate = new Promise((resolve) => {
			release = resolve
		})
		let entered = 0
		h.onLogin = async (options) => {
			if (++entered === 2) release()
			await gate
			return login(options)
		}
		await Promise.all([h.request(), h.request()])
		assert.equal(h.logins().length, 2)
		assert.equal(h.requests().length, 2)
		assert.equal(h.requests()[0].headers.SESSIONKEY, h.requests()[1].headers.SESSIONKEY)
		await Promise.all([h.request(), h.request()])
		assert.equal(h.logins().length, 2)
	}
)

test('concurrent 401 responses each refresh once without invalidating other requests', async () => {
	const h = harness()
	await h.request()
	h.calls.length = 0
	h.sessions.clear()
	h.onRequest = async (options) => {
		if (options.headers.SESSIONKEY === 'session-1') throw httpError(401)
		return { result: [true, { records: [] }] }
	}
	await Promise.all([h.request(), h.request()])
	assert.equal(h.logins().length, 2)
	assert.equal(h.requests().length, 4)
	assert.equal(h.requests().filter((r) => r.headers.SESSIONKEY === 'session-2').length, 2)
})

test('a credential edit during login cannot bind the returned session to the new configuration', async () => {
	const h = harness()
	const login = h.onLogin
	h.onLogin = async (options) => {
		h.stored.get('first').password = 'new-password'
		return login(options)
	}
	await h.request()
	assert.equal(h.stored.get('first').password, 'new-password')
	assert.notEqual(
		h.stored.get('first').sessionTokenConfigurationHash,
		getSessionConfiguration(h.stored.get('first'))
	)
	h.onLogin = login
	await h.request()
	assert.equal(h.logins().length, 2)
	assert.equal(h.logins()[1].body[1], 'new-password')
})

test('expression-backed credential inputs remain expressions after session persistence', async () => {
	const h = harness()
	h.stored.get('first').password = '={{ "test-password" }}'
	await h.request()
	await h.request()
	assert.equal(h.stored.get('first').password, '={{ "test-password" }}')
	assert.equal(h.logins().length, 1)
	h.stored.get('first').password = '={{ "new-password" }}'
	await h.request()
	assert.equal(h.logins().length, 2)
})

for (const [label, response, message] of [
	['missing result', {}, 'delight API Authentication failed'],
	['missing key', { result: ['', true] }, 'delight API Authentication failed'],
	['rejected credentials', { result: ['key', false] }, 'delight API Authentication failed'],
	[
		'2FA challenge',
		{ result: ['key', true, { auth: false }] },
		'Two-Factor Authentication Not Supported'
	],
	['incomplete auth info', { result: ['key', true, {}] }, 'Two-Factor Authentication Not Supported']
]) {
	test(`${label} does not persist a session or send an application request`, async () => {
		const h = harness()
		h.onLogin = async () => response
		await assert.rejects(h.request(), { message })
		assert.equal(h.logins().length, 1)
		assert.equal(h.requests().length, 0)
		assert.equal(h.writes.length, 0)
	})
}

test('login response without auth info remains accepted', async () => {
	const h = harness()
	h.onLogin = async () => ({ result: ['legacy-session', true] })
	await h.request()
	assert.equal(h.requests()[0].headers.SESSIONKEY, 'legacy-session')
})

test('a login HTTP 401 has only n8n’s single refresh attempt and no application write', async () => {
	const h = harness()
	h.onLogin = async () => {
		throw httpError(401)
	}
	await assert.rejects(events.addRecord.call(h.context(), 's', [{}], []), { httpCode: '401' })
	assert.equal(h.logins().length, 2)
	assert.equal(h.requests().length, 0)
})

for (const [label, response, expected] of [
	['missing result', {}, 'InvalidResponse'],
	[
		'API error',
		{ result: [false, { error: { class: 'ExampleError', message: 'Rejected' } }] },
		'ExampleError'
	],
	['empty payload', { result: [true, null] }, 'Something went wrong'],
	[
		'record error',
		{
			result: [
				true,
				{ record_info: [{ error: { class: 'RecordError', message: 'Invalid record' } }] }
			]
		},
		'RecordError'
	]
]) {
	test(`application validation preserves ${label} without replay`, async () => {
		const h = harness()
		h.onRequest = async () => response
		await assert.rejects(
			h.request(),
			(error) => error instanceof NodeApiError && error.message === expected
		)
		assert.equal(h.requests().length, 1)
		assert.equal(h.logins().length, 1)
	})
}

test('credential test resolves its URL, performs the real login hook once, and checks authenticated access', async () => {
	const h = harness()
	await h.request()
	h.calls.length = 0
	const context = h.context('first', { temp: '' }, 'n8n-nodes-base.noOp')
	const expression = new Expression('UTC')
	const baseURL = expression.resolveSimpleParameterValue(h.credential.test.request.baseURL, {
		$credentials: await context.getCredentials('delightApi')
	})
	const { baseURL: unused, ...request } = h.credential.test.request
	assert.equal(unused, h.credential.test.request.baseURL)
	const response = await context.helpers.httpRequestWithAuthentication.call(context, 'delightApi', {
		...request,
		url: `${baseURL}${request.url}`
	})
	assert.equal(response.result[0], true)
	assert.equal(h.logins().length, 1)
	assert.equal(h.requests().length, 1)
	assert.deepEqual(h.requests()[0].body, [[], false, 'german'])
	assert.equal(h.requests()[0].headers.SESSIONKEY, 'session-1')
	assert.equal(h.credential.test.rules[0].properties.key, 'result[0]')
})

for (const [label, result, message] of [
	['invalid credentials', ['', false], 'delight API Authentication failed'],
	[
		'unsupported 2FA',
		['challenge', true, { auth: false }],
		'Two-Factor Authentication Not Supported'
	]
]) {
	test(`credential test rejects ${label} even when an older session is cached`, async () => {
		const h = harness()
		await h.request()
		h.calls.length = 0
		h.onLogin = async () => ({ result })
		const context = h.context('first', { temp: '' }, 'n8n-nodes-base.noOp')
		await assert.rejects(
			context.helpers.httpRequestWithAuthentication.call(context, 'delightApi', {
				url: 'https://api.example.invalid/rest/database/schema/QuerySchemas',
				method: 'POST',
				body: [[], false, 'german'],
				json: true
			}),
			{ message }
		)
		assert.equal(h.logins().length, 1)
		assert.equal(h.requests().length, 0)
	})
}

test('existing Get Many workflow parameters retain grouped filter semantics', async () => {
	const { Delight } = require('../dist/nodes/Delight/Delight.node')
	const h = harness()
	const context = h.context('first', {
		resource: 'dataset',
		operation: 'getMany',
		schema: '@table:contacts',
		returnFields: ['name'],
		returnAll: false,
		limit: 5,
		filters: {
			filter: [
				{
					logicalOperator: 'and',
					openGroup: true,
					fieldName: 'name',
					filterType: 'LIKE',
					value: 'A'
				},
				{ logicalOperator: 'or', closeGroup: true, fieldName: 'name', filterType: 'eq', value: 'B' }
			]
		}
	})
	context.getInputData = () => [{ json: {} }]
	context.continueOnFail = () => false
	await new Delight().execute.call(context)
	assert.deepEqual(h.requests()[0].body, [
		'@table:contacts',
		[
			'(',
			{ fieldname: 'name', filtertype: 'LIKE', value: '%A%' },
			'or',
			{ fieldname: 'name', filtertype: 'eq', value: 'B' },
			')'
		],
		['globalrecuid', 'name'],
		{ start: 0, count: 5 }
	])
})

test('normal node execution and continueOnFail use the authenticated helper', async () => {
	const { Delight } = require('../dist/nodes/Delight/Delight.node')
	const h = harness()
	const context = h.context('first', {
		resource: 'dataset',
		operation: 'create',
		schema: '@table:contacts',
		fields: { value: { name: 'Example' } }
	})
	context.getInputData = () => [{ json: {} }]
	context.continueOnFail = () => false
	h.onRequest = async () => ({ result: [true, { record_info: [{ server_uid: 'created' }] }] })
	const result = await new Delight().execute.call(context)
	assert.equal(result[0][0].json.server_uid, 'created')
	context.continueOnFail = () => true
	h.onRequest = async () => ({
		result: [false, { error: { class: 'WriteError', message: 'Rejected' } }]
	})
	const failure = await new Delight().execute.call(context)
	assert.match(failure[0][0].json.error, /WriteError/)
	assert.equal(h.logins().length, 1)
	assert.equal(h.requests().length, 2)
})

test('load options and resource mapping reuse authenticated schema requests', async () => {
	const options = require('../dist/nodes/Delight/methods/loadOptions')
	const mapping = require('../dist/nodes/Delight/methods/resourceMapping')
	const h = harness()
	const context = h.context('first', { schema: '@table:contacts' })
	assert.deepEqual(await options.getOptionsDatasetSchemas.call(context), [
		{ value: '@table:contacts', name: 'Contacts' }
	])
	await options.getOptionsDatasetFields.call(context)
	await options.getOptionsDatasetFilteredFields.call(context)
	await mapping.getResourceDatasetFields.call(context)
	assert.equal(h.logins().length, 1)
	assert.equal(h.requests().length, 4)
})

test('polling reuses sessions across poll contexts', async () => {
	const { DelightPollingTrigger } = require('../dist/nodes/Delight/DelightPollingTrigger.node')
	const h = harness()
	const poll = () =>
		new DelightPollingTrigger().poll.call(
			h.context('first', {
				schema: '@table:contacts',
				event: 'created',
				returnFields: []
			})
		)
	assert.equal(await poll(), null)
	assert.equal(await poll(), null)
	assert.equal(h.logins().length, 1)
	assert.equal(h.requests().length, 2)
})

test('webhook registration, lookup, cleanup, and inbound handling preserve their data flow', async () => {
	const { DelightWebhookTrigger } = require('../dist/nodes/Delight/DelightWebhookTrigger.node')
	const h = harness()
	const context = h.context('first', { schema: '@table:contacts', events: ['created', 'updated'] })
	let created = 0
	h.onRequest = async (options) => {
		if (options.url.endsWith('/AddRecord')) {
			return { result: [true, { record_info: [{ server_uid: `created-${++created}` }] }] }
		}
		if (options.url.endsWith('/DeleteRecords')) return { result: [true, { result_info: {} }] }
		return { result: [true, { records: [] }] }
	}
	const trigger = new DelightWebhookTrigger()
	assert.equal(await trigger.webhookMethods.default.checkExists.call(context), false)
	assert.equal(await trigger.webhookMethods.default.create.call(context), true)
	assert.equal(await trigger.webhookMethods.default.delete.call(context), true)
	assert.equal(h.logins().length, 1)
	assert.equal(h.requests().filter((r) => r.url.endsWith('/AddRecord')).length, 2)
	assert.equal(h.requests().filter((r) => r.url.endsWith('/DeleteRecords')).length, 2)
	const requests = h.calls.length
	context.getBodyData = () => ({ event: 'created' })
	assert.deepEqual(await trigger.webhook.call(context), {
		workflowData: [[{ json: { event: 'created' } }]]
	})
	assert.equal(h.calls.length, requests)
})

test('remaining endpoint wrappers retain their request bodies and one shared credential session', async () => {
	const h = harness()
	const context = h.context()
	await events.updateRecord.call(context, 's', 'uid', { name: 'A' }, ['name'])
	await events.deleteRecord.call(context, 's', 'uid')
	await events.addDocument.call(context, [{ name: 'a.txt', content: 'eA==' }])
	await events.getRecordResourceList.call(context, 'container', 's', 'uid')
	await events.getDocument.call(context, 'doc', 'pdf')
	assert.equal(h.logins().length, 1)
	assert.deepEqual(
		h.requests().map((r) => new URL(r.url).pathname),
		[
			'/rest/database/table/UpdateRecord',
			'/rest/database/table/DeleteRecords',
			'/rest/documentscenter/DocumentsInbox/AddDocuments',
			'/rest/services/DocumentStore/QueryRecordResourceList',
			'/rest/services/DocumentStore/DownloadDocumentEx'
		]
	)
})
