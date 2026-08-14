import type { INodeProperties } from 'n8n-workflow'
import { documentsCenterCreateFields } from './fields/create'

const showOnlyForDocumentsCenter = {
	resource: ['documentsCenter']
}

export { executeDocumentsCenter } from './execute'

export const documentsCenterMethods = {
	loadOptions: {},
	resourceMapping: {}
}

export const documentsCenterFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForDocumentsCenter
		},
		options: [
			{
				name: 'Upload Document',
				value: 'create',
				action: 'Upload document',
				description: 'Upload a file to the document center'
			}
		],
		default: 'create'
	},
	...documentsCenterCreateFields
]
