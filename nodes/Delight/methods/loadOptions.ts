import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow'
import { getFilteredSchemaFields, getSchemaFields, getSchemas } from '../api/events'

async function getOptionsDatasetSchemas(
	this: ILoadOptionsFunctions
): Promise<INodePropertyOptions[]> {
	const schemas = await getSchemas.call(this, [], false)

	const titleCounts = new Map<string, number>()
	for (const { title } of schemas) {
		titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1)
	}

	return schemas
		.map((field) => {
			const isDuplicateTitle = (titleCounts.get(field.title) ?? 0) > 1

			const cleanName = field.name.replace('@table:', '')
			const displayName = isDuplicateTitle ? `${field.title} (${cleanName})` : field.title

			return {
				value: field.name,
				name: displayName
			}
		})
		.sort((a, b) => a.name.localeCompare(b.name))
}

async function getOptionsDatasetFields(
	this: ILoadOptionsFunctions
): Promise<INodePropertyOptions[]> {
	const schema = this.getCurrentNodeParameter('schema') as string

	if (!schema) {
		return []
	}

	const fields = await getSchemaFields.call(this, schema)

	return fields
		.map((field) => ({
			value: field.name,
			name: field.title
		}))
		.sort((a, b) => a.name.localeCompare(b.name))
}

async function getOptionsDatasetFilteredFields(
	this: ILoadOptionsFunctions
): Promise<INodePropertyOptions[]> {
	const schema = this.getCurrentNodeParameter('schema') as string

	if (!schema) {
		return []
	}

	const fields = await getFilteredSchemaFields.call(this, schema)

	return fields
		.map((field) => ({
			value: field.name,
			name: field.title
		}))
		.sort((a, b) => a.name.localeCompare(b.name))
}

export { getOptionsDatasetSchemas, getOptionsDatasetFields, getOptionsDatasetFilteredFields }
