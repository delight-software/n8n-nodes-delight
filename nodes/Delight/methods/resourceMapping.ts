import { FieldType, ILoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow'
import { getFilteredSchemaFields } from '../api/events'
import { DelightSchemaField } from '../types'

const getMappedN8nFieldType = (field: DelightSchemaField): FieldType => {
	if (field.style === 'DropDown') {
		return 'string'
	}
	if (field.type === 'Integer' || field.type === 'Float') {
		return 'number'
	}

	if (field.type === 'DateTime' || field.type === 'Date') {
		return 'dateTime'
	}

	return 'string'
}

async function getResourceDatasetFields(
	this: ILoadOptionsFunctions
): Promise<ResourceMapperFields> {
	const schema = this.getCurrentNodeParameter('schema') as string

	if (!schema) {
		return { fields: [] }
	}

	const schemaFields = await getFilteredSchemaFields.call(this, schema)

	return {
		fields: schemaFields.map((field) => ({
			id: field.name,
			displayName: field.title,
			required: false,
			type: getMappedN8nFieldType(field),
			defaultMatch: false,
			display: true
		}))
	}
}

export { getResourceDatasetFields }
