import type { INodeProperties } from 'n8n-workflow'

const showOnlyForDatasetCreateOrUpdate = {
	operation: ['createOrUpdate'],
	resource: ['dataset']
}

export const datasetCreateOrUpdateFields: INodeProperties[] = [
	{
		displayName: 'Multiple Matches Behavior',
		name: 'multipleMatchesBehavior',
		type: 'options',
		options: [
			{
				name: 'Error',
				value: 'error',
				description: 'Stop execution if more than one matching record is found'
			},
			{
				name: 'Update First',
				value: 'updateFirst',
				description: 'Update the first matching record returned'
			},
			{
				name: 'Create New',
				value: 'createNew',
				description: 'Create a new record instead of updating existing records'
			}
		],
		default: 'error',
		description: 'Defines what happens when multiple matching records are found',
		displayOptions: {
			show: showOnlyForDatasetCreateOrUpdate
		}
	},
	{
		displayName: 'Match Against Names or IDs',
		name: 'fieldsToMatch',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getOptionsDatasetFilteredFields',
			loadOptionsDependsOn: ['resource', 'operation', 'schema']
		},
		displayOptions: {
			show: showOnlyForDatasetCreateOrUpdate,
			hide: { schema: [''] }
		},
		default: [],
		description:
			'The fields to check to see if the record already exists. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.'
	},
	{
		displayName: 'Fields to Send',
		name: 'fieldsToSend',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null
		},
		required: true,
		displayOptions: {
			show: showOnlyForDatasetCreateOrUpdate,
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
