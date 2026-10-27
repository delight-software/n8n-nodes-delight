const assert = require('node:assert/strict')
const { before, test } = require('node:test')
const events = require('../dist/nodes/Delight/api/events')
const { prepareHarness, configuration, harness } = require('./helpers/delight-harness.cjs')

before(prepareHarness)

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

for (const [label, settings, language, title] of [
	['existing credentials', {}, 'english', 'Description'],
	['English', { labelLanguage: 'english' }, 'english', 'Description'],
	['German', { labelLanguage: 'german' }, 'german', 'Beschreibung']
]) {
	test(`metadata loaders and resource mapping preserve identifiers with ${label}`, async () => {
		const options = require('../dist/nodes/Delight/methods/loadOptions')
		const mapping = require('../dist/nodes/Delight/methods/resourceMapping')
		const { DelightPollingTrigger } = require('../dist/nodes/Delight/DelightPollingTrigger.node')
		const { DelightWebhookTrigger } = require('../dist/nodes/Delight/DelightWebhookTrigger.node')
		const h = harness()
		h.stored.set('first', configuration(settings))
		const schema = '@table:nwm_products'
		const fields = [
			{ name: 'descr', title, type: 'String' },
			{ name: 'id', title: 'ID', type: 'AutoInc' }
		]
		h.onRequest = async () => ({ result: [true, { schemas: [{ name: schema, title, fields }] }] })
		const context = h.context('first', { schema })
		const expectedSchemas = [{ value: schema, name: title }]
		assert.deepEqual(await options.getOptionsDatasetSchemas.call(context), expectedSchemas)
		assert.deepEqual(
			await options.getOptionsDatasetSchemasWithDocuments.call(context),
			expectedSchemas
		)
		assert.deepEqual(
			await options.getOptionsDatasetFields.call(context),
			[
				{ value: 'descr', name: title },
				{ value: 'id', name: 'ID' }
			].sort((a, b) => a.name.localeCompare(b.name))
		)
		assert.deepEqual(await options.getOptionsDatasetFilteredFields.call(context), [
			{ value: 'descr', name: title }
		])
		assert.deepEqual(await mapping.getResourceDatasetFields.call(context), {
			fields: [
				{
					id: 'descr',
					displayName: title,
					required: false,
					type: 'string',
					defaultMatch: false,
					display: true
				}
			]
		})
		for (const trigger of [new DelightPollingTrigger(), new DelightWebhookTrigger()]) {
			assert.deepEqual(
				await trigger.methods.loadOptions.getOptionsDatasetSchemas.call(context),
				expectedSchemas
			)
		}
		assert.deepEqual(
			h.requests().map((request) => request.body),
			[
				[[], false, language],
				[[], false, language],
				[[schema], true, language],
				[[schema], true, language],
				[[schema], true, language],
				[[], false, language],
				[[], false, language]
			]
		)
		assert.equal(h.logins().length, 1)
	})
}

test('raw credentials without label language also request English metadata', async () => {
	const h = harness()
	const context = h.context()
	context.getCredentials = async () => structuredClone(h.stored.get('first'))
	await events.getSchemaFields.call(context, '@table:contacts')
	assert.deepEqual(h.requests()[0].body, [['@table:contacts'], true, 'english'])
})

test('generated codex metadata matches registered node names', () => {
	const { readFileSync } = require('node:fs')
	const { resolve } = require('node:path')
	const pkg = require('../package.json')
	for (const file of pkg.n8n.nodes) {
		const Node = Object.values(require(`../${file}`))[0]
		const expected = `${pkg.name}.${new Node().description.name}`
		const jsonPath = file.replace(/\.js$/, '.json')
		for (const path of [jsonPath, jsonPath.replace(/^dist\//, '')]) {
			assert.equal(JSON.parse(readFileSync(resolve(__dirname, '..', path), 'utf8')).node, expected)
		}
	}
})
