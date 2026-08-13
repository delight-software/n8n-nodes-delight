import { IExecuteFunctions, JsonObject } from 'n8n-workflow'
import { DelightApiResponse } from '../../../types'
import { updateRecord } from '../../../api/events'
import { getValidatedGlobalRecUid } from '../../../utils/validators'

export async function executeDatasetUpdate(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<DelightApiResponse> {
	const recordId = getValidatedGlobalRecUid(this, 'recordId', itemIndex)
	const schema = this.getNodeParameter('schema', itemIndex) as string
	const fields = this.getNodeParameter('fields', itemIndex) as {
		mappingMode: string
		value: JsonObject
	}

	return await updateRecord.call(this, schema, recordId, fields.value, Object.keys(fields.value))
}
