import { IExecuteFunctions, JsonObject } from 'n8n-workflow'
import { deleteRecord } from '../../../api/events'
import { getValidatedGlobalRecUid } from '../../../utils/validators'

export async function executeDatasetDelete(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<JsonObject> {
	const recordId = getValidatedGlobalRecUid(this, 'recordId', itemIndex)
	const schema = this.getNodeParameter('schema', itemIndex) as string

	const response = await deleteRecord.call(this, schema, recordId)

	const affectedCount = response?.result_info?.affectedcount

	return {
		deleted: affectedCount > 0,
		globalrecuid: recordId
	}
}
