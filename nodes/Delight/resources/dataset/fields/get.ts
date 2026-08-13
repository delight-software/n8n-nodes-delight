import type { INodeProperties } from 'n8n-workflow'

const showOnlyForDatasetGet = {
	operation: ['get', 'getMany'],
	resource: ['dataset']
}

export const datasetGetFields: INodeProperties[] = [
	{
		displayName: 'Return Field Names or IDs',
		name: 'returnFields',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getOptionsDatasetFields',
			loadOptionsDependsOn: ['resource', 'operation', 'schema']
		},
		displayOptions: {
			show: showOnlyForDatasetGet,
			hide: { schema: [''] }
		},
		default: [],
		description:
			'Which fields to include in the response. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.'
	}
]
