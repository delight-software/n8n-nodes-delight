import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow'
import { getFilteredSchemaFields, getSchemaFields, getSchemas } from '../api/events'

async function getOptionsDatasetSchemas(
	this: ILoadOptionsFunctions
): Promise<INodePropertyOptions[]> {
	const schemas = await getSchemas.call(this, [], false)

	return schemas.map((field) => ({
		value: field.name,
		name: field.title
	}))
}

async function getOptionsDatasetFields(
	this: ILoadOptionsFunctions
): Promise<INodePropertyOptions[]> {
	const schema = this.getCurrentNodeParameter('schema') as string

	if (!schema) {
		return []
	}

	const fields = await getSchemaFields.call(this, schema)

	return fields.map((field) => ({
		value: field.name,
		name: field.title
	}))
}

async function getOptionsDatasetFilteredFields(
	this: ILoadOptionsFunctions
): Promise<INodePropertyOptions[]> {
	const schema = this.getCurrentNodeParameter('schema') as string

	if (!schema) {
		return []
	}

	const fields = await getFilteredSchemaFields.call(this, schema)

	return fields.map((field) => ({
		value: field.name,
		name: field.title
	}))
}

export { getOptionsDatasetSchemas, getOptionsDatasetFields, getOptionsDatasetFilteredFields }
