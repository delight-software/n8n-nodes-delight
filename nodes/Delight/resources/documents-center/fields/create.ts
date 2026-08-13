import type { INodeProperties } from 'n8n-workflow'

const showOnlyForDocumentsCenterCreate = {
	operation: ['create'],
	resource: ['documentsCenter']
}

export const documentsCenterCreateFields: INodeProperties[] = [
	{
		displayName: 'Reply Type',
		name: 'replyType',
		type: 'options',
		default: 'archive',
		displayOptions: {
			show: showOnlyForDocumentsCenterCreate
		},
		options: [
			{
				name: 'Reply',
				value: 'reply'
			},
			{
				name: 'Archive',
				value: 'archive'
			}
		]
	},
	{
		displayName: 'Auto Assign by Sender',
		name: 'autoAssign',
		type: 'boolean',
		description: 'Whether the email should be auto assigned or not',
		default: true,
		displayOptions: {
			show: showOnlyForDocumentsCenterCreate
		}
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForDocumentsCenterCreate
		},

		options: [
			{
				displayName: 'Display Name',
				name: 'displayName',
				type: 'string',
				default: '',
				description:
					'Display name of the document shown in the CRM. If left empty, the subject of the e-mail or document is used.'
			},
			{
				displayName: 'Document Class',
				name: 'documentClass',
				type: 'options',
				options: [
					{
						name: 'Document',
						value: 'document',
						description: 'Generic document (PDF, image, etc.)'
					},
					{
						name: 'Email',
						value: 'email',
						description: 'Email message'
					}
				],
				default: 'email',
				description:
					'The document class controls how the CRM processes and categorises the uploaded file'
			},
			{
				displayName: 'Origin',
				name: 'origin',
				type: 'string',
				default: '',
				description:
					'The origin or sender of the document, typically an email address. Used for auto-assignment.'
			},
			{
				displayName: 'Message Type',
				name: 'messageType',
				type: 'options',
				options: [
					{
						name: 'Automatic',
						value: 'auto',
						description: 'Use the value of the received labels'
					},
					{
						name: 'Inbox (Received)',
						value: 'inbox',
						description: 'The message was received'
					},
					{
						name: 'Outbox (Sent)',
						value: 'outbox',
						description: 'The message was sent'
					}
				],
				default: 'auto',
				description: 'Direction of the email message. Only relevant for "Email" document class.'
			}
		]
	}
]
