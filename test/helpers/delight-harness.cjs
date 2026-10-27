const assert = require('node:assert/strict')
const { Expression, NodeHelpers } = require('n8n-workflow')
const { prepareN8nRuntime } = require('./n8n-runtime.cjs')
const { DelightApi } = require('../../dist/credentials/DelightApi.credentials')
const { delightApiRequest } = require('../../dist/nodes/Delight/api/delightApi')

let runtime
async function prepareHarness() {
	runtime = await prepareN8nRuntime()
}

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

module.exports = { prepareHarness, configuration, httpError, harness }
