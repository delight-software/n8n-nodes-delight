const assert = require('node:assert/strict')
const { before, test } = require('node:test')
const events = require('../dist/nodes/Delight/api/events')
const { prepareHarness, harness } = require('./helpers/delight-harness.cjs')

before(prepareHarness)

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
	await events.getRecordResourceList.call(context, 'module', 's', 'uid')
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
