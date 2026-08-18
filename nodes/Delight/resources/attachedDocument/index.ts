import type { INodeProperties } from 'n8n-workflow'
import { attachedDocumentUploadFields } from './fields/upload'
import { attachedDocumentDownloadFields } from './fields/download'

const showOnlyForAttachedDocument = {
	resource: ['attachedDocument']
}

export const attachedDocumentFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForAttachedDocument
		},
		options: [
			{
				name: 'Upload',
				value: 'upload',
				action: 'Upload documents',
				description: 'Upload documents'
			},
			{
				name: 'Download',
				value: 'download',
				action: 'Download documents',
				description: 'Download documents'
			}
		],
		default: 'upload'
	},
	{
		displayName: 'Dataset Schema Name or ID',
		name: 'schema',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOptionsDatasetSchemasWithDocuments'
		},
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForAttachedDocument
		},
		description:
			'Choose the schema to load fields for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.'
	},
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForAttachedDocument
		},
		description: 'Globalrecuid of the record to upload the documents to'
	},

	...attachedDocumentUploadFields,
	...attachedDocumentDownloadFields
]
