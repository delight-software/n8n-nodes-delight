import { IExecuteFunctions, JsonObject } from 'n8n-workflow'
import { updateRecord } from '../../../api/events'
import { getValidatedGlobalRecUid } from '../../../utils/validators'

type UpdateRecordPaylaod = {
	name: string
	content: string
	'content--encoding': 'Base64'
	path?: string
	remote_uid?: string
}

export async function executeAttachedDocumentUpload(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<JsonObject> {
	const recordId = getValidatedGlobalRecUid(this, 'recordId', itemIndex)
	const schema = this.getNodeParameter('schema', itemIndex) as string
	const uploadAll = this.getNodeParameter('uploadAll', itemIndex, true) as boolean
	const path = this.getNodeParameter('options.path', itemIndex, '') as string

	const executionId = this.getExecutionId() ?? 'manual'
	const workflowId = this.getWorkflow().id ?? 'unsaved'

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

		const payload = {
			remote_uid: `n8n_wf_${workflowId}_exec_${executionId}_item_${itemIndex}_${propertyName}`,
			name: binaryData.fileName || 'uploaded_document',
			'content--encoding': 'Base64',
			content: base64
		} as UpdateRecordPaylaod

		if (path) {
			payload.path = path
		}

		insertPayload.push(payload)
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
