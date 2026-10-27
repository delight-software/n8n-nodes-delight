const assert = require('node:assert/strict')
const { before, test } = require('node:test')
const { NodeApiError, Workflow } = require('n8n-workflow')
const { DelightApi } = require('../dist/credentials/DelightApi.credentials')
const { getSessionConfiguration } = require('../dist/nodes/Delight/api/sessionConfiguration')
const events = require('../dist/nodes/Delight/api/events')
const {
	prepareHarness,
	configuration,
	httpError,
	harness
} = require('./helpers/delight-harness.cjs')

before(prepareHarness)

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
	assert.equal(h.requests()[0].url, 'https://api.example.invalid/rest/database/table/QueryRecords')
	assert.deepEqual(h.requests()[0].headers, { SESSIONKEY: 'session-1' })
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

async function resolveCredentialTestRequest(context, credential) {
	const node = context.getNode()
	const workflow = new Workflow({
		nodes: [structuredClone(node)],
		connections: {},
		active: false,
		nodeTypes: { getByNameAndVersion: () => ({ description: { properties: [] } }) },
		settings: { timezone: 'UTC' }
	})
	// Use n8n's recursive request expression evaluation, including array body entries.
	const { baseURL, ...request } = workflow.expression.getSimpleParameterValue(
		node,
		credential.test.request,
		'internal',
		{ $credentials: await context.getCredentials('delightApi') }
	)
	return { ...request, url: `${baseURL}${request.url}` }
}

for (const [label, settings, language] of [
	['existing credentials', {}, 'english'],
	['English', { labelLanguage: 'english' }, 'english'],
	['German', { labelLanguage: 'german' }, 'german']
]) {
	test(`credential test resolves URL and language for ${label} and checks authenticated access`, async () => {
		const h = harness()
		h.stored.set('first', configuration(settings))
		await h.request()
		h.calls.length = 0
		const context = h.context('first', { temp: '' }, 'n8n-nodes-base.noOp')
		const request = await resolveCredentialTestRequest(context, h.credential)
		assert.equal(request.url, 'https://api.example.invalid/rest/database/schema/QuerySchemas')
		const response = await context.helpers.httpRequestWithAuthentication.call(
			context,
			'delightApi',
			request
		)
		assert.equal(response.result[0], true)
		assert.equal(h.logins().length, 1)
		assert.equal(h.requests().length, 1)
		assert.deepEqual(h.requests()[0].body, [[], false, language])
		assert.equal(h.requests()[0].headers.SESSIONKEY, 'session-1')
		assert.equal(h.credential.test.rules[0].properties.key, 'result[0]')
	})
}

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
			context.helpers.httpRequestWithAuthentication.call(
				context,
				'delightApi',
				await resolveCredentialTestRequest(context, h.credential)
			),
			{ message }
		)
		assert.equal(h.logins().length, 1)
		assert.equal(h.requests().length, 0)
	})
}

test('label language is optional and defaults to English', () => {
	const field = new DelightApi().properties.find((property) => property.name === 'labelLanguage')
	assert.equal(field.displayName, 'Label Language')
	assert.equal(field.type, 'options')
	assert.equal(field.default, 'english')
	assert.ok(!field.required)
	assert.deepEqual(field.options, [
		{ name: 'English', value: 'english' },
		{ name: 'German', value: 'german' }
	])
})

test('changing label language reuses the session and preserves record payloads and filters', async () => {
	const h = harness()
	const context = h.context()
	await events.getSchemas.call(context, [], false)
	const fingerprint = getSessionConfiguration(h.stored.get('first'))
	h.stored.get('first').labelLanguage = 'german'
	assert.equal(getSessionConfiguration(h.stored.get('first')), fingerprint)
	await events.getSchemas.call(context, [], false)
	const schema = '@table:contacts'
	const values = { descr: 'Unchanged record value' }
	const filters = [{ fieldname: 'descr', filtertype: '=', value: values.descr }]
	await events.addRecord.call(context, schema, [values], ['descr'])
	await events.updateRecord.call(context, schema, 'record-uid', values, ['descr'])
	await events.getRecords.call(context, schema, filters, ['descr'])
	assert.deepEqual(
		h.requests().map((request) => request.body),
		[
			[[], false, 'english'],
			[[], false, 'german'],
			[schema, [values], ['descr']],
			[schema, [{ server_uid: 'record-uid', ...values }], ['descr']],
			[schema, filters, ['globalrecuid', 'descr'], { start: -1, count: -1 }]
		]
	)
	assert.equal(h.logins().length, 1)
	assert.equal(h.writes.length, 1)
})
