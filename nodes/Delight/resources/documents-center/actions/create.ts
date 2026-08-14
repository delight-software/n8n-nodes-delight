import { IExecuteFunctions, JsonObject, JsonValue, NodeOperationError } from 'n8n-workflow'
import { addDocument } from '../../../api/events'
import { createEmlBase64, EmailAttachment, normalizeEmail } from '../../../utils/normalizeEmail'

type ReplyTypeOptions = 'reply' | 'archive'
type DocumentClassOptions = 'email' | 'document'
type MessageTypeOptions = 'auto' | 'inbox' | 'outbox'

interface DocumentsCenterAdditionalOptions {
	displayName?: string
	documentClass?: DocumentClassOptions
	origin?: string
	messageType?: MessageTypeOptions
}

type RecordDocumentsEmailObject = {
	name: string
	'content--encoding': string
	content: string
	processing: {
		document_class: string
		converter?: {
			enabled: boolean
			format: string
			msg_type: string
		}
		properties?: {
			operation?: string
		}
		attributes: {
			crm_actions?: {
				subtype?: string
			}
			adresses?: Record<string, string>
		}
	}
}

export async function executeDocumentsCenterCreate(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<JsonObject> {
	const items = this.getInputData()
	const item = items[itemIndex]

	const replyType = this.getNodeParameter('replyType', itemIndex) as ReplyTypeOptions
	const autoAssign = this.getNodeParameter('autoAssign', itemIndex) as boolean
	const additionalOptions = this.getNodeParameter(
		'additionalOptions',
		itemIndex,
		{}
	) as DocumentsCenterAdditionalOptions

	let displayName = (additionalOptions.displayName ?? '').trim()
	let origin = additionalOptions.origin ?? ''
	const documentClass = additionalOptions.documentClass ?? 'email'
	const selectedMessageType = additionalOptions.messageType ?? 'auto'

	const isEmailClass = documentClass === 'email'
	const recordDocuments: JsonObject[] = []
	const attachments: EmailAttachment[] = []

	if (item.binary) {
		for (const binaryKey of Object.keys(item.binary)) {
			const binaryMeta = item.binary[binaryKey]
			const fileName = (binaryMeta.fileName as string) || `${binaryKey}.bin`
			const mimeType = binaryMeta.mimeType || 'application/octet-stream'

			const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryKey)

			attachments.push({
				name: fileName,
				mimeType,
				content: buffer.toString('base64')
			})
		}
	}

	if (isEmailClass) {
		const email = normalizeEmail(item.json)

		const messageType =
			selectedMessageType === 'auto' ? (email.detectedMessageType ?? 'inbox') : selectedMessageType

		origin ||= messageType === 'inbox' ? email.from : (email.to[0] ?? '')
		displayName ||= email.subject || attachments[0]?.name || ''

		const emailDoc: RecordDocumentsEmailObject = {
			name: `${email.subject}.eml`,
			'content--encoding': 'Base64',
			content: createEmlBase64(email, attachments),
			processing: {
				document_class: autoAssign ? 'email-by-sender' : 'email',
				converter: {
					enabled: true,
					format: '.mlmsg',
					msg_type: messageType
				},
				attributes: {
					crm_actions: { subtype: messageType }
				}
			}
		}

		if (replyType === 'reply') {
			emailDoc.processing.properties = {
				operation: 'reply'
			}
		}

		if (autoAssign) {
			emailDoc.processing.attributes.adresses = {
				'@flaEmail': origin
			}
		}

		recordDocuments.push(emailDoc)
	} else {
		for (const attachment of attachments) {
			displayName ||= attachment.name || ''

			recordDocuments.push({
				name: attachment.name,
				'content--encoding': 'Base64',
				content: attachment.content
			})
		}
	}

	if (recordDocuments.length === 0) {
		throw new NodeOperationError(this.getNode(), 'No documents found.')
	}

	const requestData: JsonObject = {
		displayname: displayName,
		origin,
		ownertype: 'session',
		processing: {
			options: { auto: autoAssign }
		},
		record_documents: {
			insert: recordDocuments as JsonValue[]
		}
	}

	const response = await addDocument.call(this, [requestData])

	const recordInfo = response?.record_info?.[0]

	return recordInfo ? { ...recordInfo } : {}
}
