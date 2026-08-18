import type { INodeProperties } from 'n8n-workflow'
import { SCHEMAS_WITH_DOCUMENTS } from '../../../constants/schemas'

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
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForDatasetGetSingle,
				schema: SCHEMAS_WITH_DOCUMENTS
			}
		},
		options: [
			{
				displayName: 'Download Documents',
				name: 'downloadDocuments',
				type: 'boolean',
				default: false,
				description: 'Whether the documents will be downloaded and included in the output'
			},
			{
				displayName: 'Include Document Metadata',
				name: 'includeDocumentMetadata',
				type: 'boolean',
				default: false,
				description:
					'Whether to include document details, such as folder paths and file names, in the JSON output'
			},
			{
				displayName: 'Document Prefix',
				name: 'documentPrefix',
				type: 'string',
				default: 'document_',
				description:
					"Prefix for name of the binary property to which to write the document. An index starting with 0 will be added. So if name is 'document_' the first attachment is saved to 'attachment_0'."
			}
		]
	}
]
