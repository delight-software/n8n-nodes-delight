import type { INodeProperties } from 'n8n-workflow'
import { datasetCreateFields } from './fields/create'
import { datasetGetFields } from './fields/get'
import { datasetUpdateFields } from './fields/update'
import { datasetGetManyFields } from './fields/getAll'
import { datasetGetSingleFields } from './fields/getSingle'
import { datasetDeleteFields } from './fields/delete'
import { datasetCreateOrUpdateFields } from './fields/createOrUpdate'

const showOnlyForDataset = {
	resource: ['dataset']
}

export { executeDataset } from './execute'

export const datasetFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForDataset
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create record',
				description: 'Create a new record'
			},
			{
				name: 'Create or Update',
				value: 'createOrUpdate',
				action: 'Create or update',
				description: 'Create a new record, or update an existing one'
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete record',
				description: 'Delete a record permanently'
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get record',
				description: 'Get a record'
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get records',
				description: 'Get many records'
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update record',
				description: 'Update a record'
			}
		],
		default: 'create'
	},

	{
		displayName: 'Dataset Schema Name or ID',
		name: 'schema',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOptionsDatasetSchemas'
		},
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForDataset
		},
		description:
			'Choose the schema to load fields for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.'
	},

	...datasetCreateFields,
	...datasetCreateOrUpdateFields,
	...datasetDeleteFields,
	...datasetGetFields,
	...datasetGetSingleFields,
	...datasetGetManyFields,
	...datasetUpdateFields
]
