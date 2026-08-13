import type { INodeProperties } from 'n8n-workflow'

const showOnlyForDatasetGetSingle = {
	operation: ['get'],
	resource: ['dataset']
}

export const datasetGetSingleFields: INodeProperties[] = [
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForDatasetGetSingle
		},
		description: 'Globalrecuid of the record to retrieve'
	}
]
