import { INodeProperties } from 'n8n-workflow'

const showOnlyForDocumentUpload = {
	operation: ['upload'],
	resource: ['attachedDocument']
}

export const attachedDocumentUploadFields: INodeProperties[] = [
	{
		displayName: 'Upload All Files',
		name: 'uploadAll',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: showOnlyForDocumentUpload
		},
		description: 'Whether to upload all the binary properties found on the item'
	},
	{
		displayName: 'Input Binary Field(s)',
		name: 'binaryPropertyName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				...showOnlyForDocumentUpload,
				uploadAll: [false]
			}
		},
		description:
			'Name of the binary property containing the file to upload. To process multiple properties, separate them with a comma (e.g. data_0,data_1).'
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForDocumentUpload
		},
		options: [
			{
				displayName: 'Folder Path',
				name: 'path',
				type: 'string',
				default: '',
				description:
					'The destination path where the documents will be saved. Separate nested folders with a comma (e.g., MainFolder,SubFolder).'
			}
		]
	}
]
