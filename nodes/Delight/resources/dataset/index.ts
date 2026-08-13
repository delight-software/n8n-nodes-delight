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
				action: 'Create an record',
				description: 'Create an record'
			},
			{
				name: 'Create or Update',
				value: 'createOrUpdate',
				action: 'Create or update',
				description: 'Create a new record, or update the current one if it already exists'
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an record',
				description: 'Delete an record'
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an record',
				description: 'Get an record'
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get records',
				description: 'Get records'
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an record',
				description: 'Update an record'
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
