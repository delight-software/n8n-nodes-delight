import { IExecuteFunctions, JsonObject } from 'n8n-workflow'
import { updateRecord } from '../../../api/events'
import { getValidatedGlobalRecUid } from '../../../utils/validators'

export async function executeAttachedDocumentUpload(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<JsonObject> {
	const recordId = getValidatedGlobalRecUid(this, 'recordId', itemIndex)
	const schema = this.getNodeParameter('schema', itemIndex) as string
	const uploadAll = this.getNodeParameter('uploadAll', itemIndex, true) as boolean

	let binaryPropertyNames: string[] = []

	if (uploadAll) {
		const item = this.getInputData()[itemIndex]

		if (item.binary) {
			binaryPropertyNames = Object.keys(item.binary)
		}
	} else {
		const propertyNameStr = this.getNodeParameter('binaryPropertyName', itemIndex) as string
		binaryPropertyNames = propertyNameStr.split(',').map((name) => name.trim())
	}

	if (binaryPropertyNames.length === 0) {
		return {
			uploaded: false,
			globalrecuid: recordId
		}
	}

	const insertPayload = []

	for (const propertyName of binaryPropertyNames) {
		const binaryData = this.helpers.assertBinaryData(itemIndex, propertyName)

		const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryData)
		const base64 = buffer.toString('base64')

		insertPayload.push({
			name: binaryData.fileName || 'uploaded_document',
			'content--encoding': 'Base64',
			content: base64
		})
	}

	const payload = {
		record_documents: {
			insert: insertPayload
		}
	}

	const response = await updateRecord.call(this, schema, recordId, payload, ['record_documents'])

	const recordInfo = response.record_info ?? []

	return {
		uploaded: recordInfo.some((record) => record.result === true),
		globalrecuid: recordId,
		documents_uploaded: insertPayload.length
	}
}
