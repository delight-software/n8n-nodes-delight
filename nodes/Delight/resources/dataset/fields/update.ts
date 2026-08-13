import type { INodeProperties } from 'n8n-workflow'

const showOnlyForDatasetUpdate = {
	operation: ['update'],
	resource: ['dataset']
}

export const datasetUpdateFields: INodeProperties[] = [
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForDatasetUpdate
		},
		description: 'Globalrecuid of the record to be updated'
	},
	{
		displayName: 'Fields to Update',
		name: 'fields',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null
		},
		required: true,
		displayOptions: {
			show: showOnlyForDatasetUpdate,
			hide: { schema: [''] }
		},
		typeOptions: {
			loadOptionsDependsOn: ['resource', 'operation', 'schema'],
			resourceMapper: {
				resourceMapperMethod: 'getResourceDatasetFields',
				mode: 'add',
				fieldWords: {
					singular: 'field',
					plural: 'fields'
				},
				addAllFields: false,
				multiKeyMatch: true
			}
		}
	}
]
