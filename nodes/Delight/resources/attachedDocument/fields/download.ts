import type { INodeProperties } from 'n8n-workflow'

const showOnlyForDocumentDownload = {
	operation: ['download'],
	resource: ['attachedDocument']
}

export const attachedDocumentDownloadFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForDocumentDownload
		},
		options: [
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
