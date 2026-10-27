const assert = require('node:assert/strict')
const { before, test } = require('node:test')
const { NodeHelpers } = require('n8n-workflow')
const { prepareHarness, harness } = require('./helpers/delight-harness.cjs')

before(prepareHarness)

test('attached document schemas are the intersection of API results and supported platform schemas', async () => {
	const {
		getOptionsDatasetSchemasWithDocuments
	} = require('../dist/nodes/Delight/methods/loadOptions')
	const h = harness()
	h.onRequest = async () => ({
		result: [
			true,
			{
				schemas: [
					{ name: '@table:nwm_products', title: 'Products' },
					{ name: '@table:nwm_claims', title: 'Claims' },
					{ name: '@table:contacts', title: 'Contacts' },
					{ name: '@table:article_article', title: 'Articles' }
				]
			}
		]
	})
	assert.deepEqual(await getOptionsDatasetSchemasWithDocuments.call(h.context()), [
		{ value: '@table:article_article', name: 'Articles' },
		{ value: '@table:nwm_claims', name: 'Claims' },
		{ value: '@table:nwm_products', name: 'Products' }
	])
})

const documentMappings = [
	['@table:nwm_products', '{14003704-5069-4B18-AA23-A71F76B231C2}'],
	['@table:nwm_claims', '{14003704-5069-4B18-AA23-A71F76B231C2}'],
	['@table:crm_actions', '{A48847CA-33D3-4EB0-A586-E316EA2E5322}'],
	['@table:article_article', '{28FFFE04-66C0-4F03-BB58-92B5D6F2D78E}']
]

const documentRecordUid = '{B74046D1-96A1-41B5-9B52-F8266DE1D6DA}'

test('document options are visible only for Dataset Get with a supported schema', () => {
	const {
		datasetGetSingleFields
	} = require('../dist/nodes/Delight/resources/dataset/fields/getSingle')
	const options = datasetGetSingleFields.find((field) => field.name === 'options')
	const parameters = { resource: 'dataset', operation: 'get' }
	for (const [schema] of documentMappings) {
		assert.equal(NodeHelpers.displayParameter({ ...parameters, schema }, options, null, null), true)
	}
	for (const changes of [
		{ schema: '@table:contacts' },
		{ schema: '' },
		{ schema: '@table:nwm_products', operation: 'getMany' },
		{ schema: '@table:nwm_products', resource: 'attachedDocument' }
	]) {
		assert.equal(
			NodeHelpers.displayParameter({ ...parameters, ...changes }, options, null, null),
			false
		)
	}
})

for (const [schema, moduleUid] of documentMappings) {
	test(`both document download paths use the module UID, schema and record for ${schema}`, async () => {
		const { executeDatasetGet } = require('../dist/nodes/Delight/resources/dataset/actions/get')
		const {
			executeAttachedDocumentDownload
		} = require('../dist/nodes/Delight/resources/attachedDocument/actions/download')
		const h = harness()
		h.onRequest = async (request) => ({
			result: [
				true,
				request.url.endsWith('/QueryRecords')
					? { records: [{ globalrecuid: documentRecordUid }] }
					: { documents: [] }
			]
		})
		const context = h.context('first', {
			schema,
			recordId: documentRecordUid,
			'options.downloadDocuments': true
		})
		const dataset = await executeDatasetGet.call(context, 0)
		const attached = await executeAttachedDocumentDownload.call(context, 0)
		assert.equal(dataset.json.globalrecuid, documentRecordUid)
		assert.equal(attached.json.downloaded, false)
		assert.deepEqual(
			h
				.requests()
				.filter((request) => request.url.endsWith('/QueryRecordResourceList'))
				.map((request) => request.body),
			[
				[moduleUid, schema, documentRecordUid, [], { start: -1, count: -1 }],
				[moduleUid, schema, documentRecordUid, [], { start: -1, count: -1 }]
			]
		)
		assert.equal(h.logins().length, 1)
	})
}

test('unsupported schemas retain their existing document skip and empty-result behavior', async () => {
	const { executeDatasetGet } = require('../dist/nodes/Delight/resources/dataset/actions/get')
	const {
		executeAttachedDocumentDownload
	} = require('../dist/nodes/Delight/resources/attachedDocument/actions/download')
	const h = harness()
	h.onRequest = async () => ({ result: [true, { records: [{ globalrecuid: documentRecordUid }] }] })
	const context = h.context('first', {
		schema: '@table:contacts',
		recordId: documentRecordUid,
		'options.downloadDocuments': true
	})
	assert.deepEqual(await executeDatasetGet.call(context, 0), {
		json: { globalrecuid: documentRecordUid }
	})
	assert.deepEqual(await executeAttachedDocumentDownload.call(context, 0), {
		json: {
			globalrecuid: documentRecordUid,
			downloaded: false,
			documents_downloaded: 0,
			documents: []
		}
	})
	assert.equal(h.requests().length, 1)
	assert.ok(h.requests()[0].url.endsWith('/QueryRecords'))
})

test('document downloads preserve binary data, folder metadata and document IDs', async () => {
	const {
		executeAttachedDocumentDownload
	} = require('../dist/nodes/Delight/resources/attachedDocument/actions/download')
	const h = harness()
	h.onRequest = async (request) => ({
		result: [
			true,
			request.url.endsWith('/QueryRecordResourceList')
				? {
						directories: [
							{ name: 'Folder', documents: [{ server_uid: 'document-uid', name: 'a.txt' }] }
						]
					}
				: { name: 'a.txt', content: 'eA==' }
		]
	})
	const context = h.context('first', { schema: '@table:nwm_products', recordId: documentRecordUid })
	context.helpers.prepareBinaryData = async (buffer, name, mime) => {
		assert.equal(buffer.toString(), 'x')
		assert.equal(name, 'a.txt')
		assert.equal(mime, 'text/plain')
		return { data: buffer.toString('base64'), fileName: name, mimeType: mime }
	}
	const result = await executeAttachedDocumentDownload.call(context, 0)
	assert.equal(result.binary.document_0.data, 'eA==')
	assert.equal(result.json.downloaded, true)
	assert.equal(result.json.documents_downloaded, 1)
	assert.deepEqual(result.json.documents, [
		{ property: 'document_0', fileName: 'a.txt', path: 'Folder' }
	])
	assert.deepEqual(h.requests()[1].body, [
		'document-uid',
		{ position: -1, size: -1 },
		{ format: 'txt' }
	])
})

test('attached document upload retains the record_documents payload without module lookup', async () => {
	const {
		executeAttachedDocumentUpload
	} = require('../dist/nodes/Delight/resources/attachedDocument/actions/upload')
	const h = harness()
	h.onRequest = async () => ({ result: [true, { record_info: [{ result: true }] }] })
	const context = h.context('first', { schema: '@table:nwm_claims', recordId: documentRecordUid })
	context.getExecutionId = () => 'execution'
	context.getInputData = () => [{ json: {}, binary: { data: { fileName: 'a.txt' } } }]
	context.helpers.assertBinaryData = () => ({ fileName: 'a.txt' })
	context.helpers.getBinaryDataBuffer = async () => Buffer.from('x')
	assert.deepEqual(await executeAttachedDocumentUpload.call(context, 0), {
		uploaded: true,
		globalrecuid: documentRecordUid,
		documents_uploaded: 1
	})
	assert.equal(h.requests().length, 1)
	assert.ok(h.requests()[0].url.endsWith('/UpdateRecord'))
	assert.deepEqual(h.requests()[0].body, [
		'@table:nwm_claims',
		[
			{
				server_uid: documentRecordUid,
				record_documents: {
					insert: [
						{
							remote_uid: 'n8n_wf_workflow_exec_execution_item_0_data',
							name: 'a.txt',
							'content--encoding': 'Base64',
							content: 'eA=='
						}
					]
				}
			}
		],
		['record_documents']
	])
})
