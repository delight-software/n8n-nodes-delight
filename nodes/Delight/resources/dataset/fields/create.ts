import type { INodeProperties } from 'n8n-workflow'

const showOnlyForDatasetCreate = {
	operation: ['create'],
	resource: ['dataset']
}

export const datasetCreateFields: INodeProperties[] = [
	{
		displayName: 'Fields to Set',
		name: 'fields',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null
		},
		required: true,
		displayOptions: {
			show: showOnlyForDatasetCreate,
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
