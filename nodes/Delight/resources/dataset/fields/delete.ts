import type { INodeProperties } from 'n8n-workflow'

const showOnlyForDatasetDelete = {
	operation: ['delete'],
	resource: ['dataset']
}

export const datasetDeleteFields: INodeProperties[] = [
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForDatasetDelete
		},
		description: 'Globalrecuid of the record to be deleted'
	}
]
