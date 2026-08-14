import { IExecuteFunctions, JsonObject } from 'n8n-workflow'
import { getRecords } from '../../../api/events'
import { getValidatedGlobalRecUid } from '../../../utils/validators'

export async function executeDatasetGet(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<JsonObject> {
	const recordId = getValidatedGlobalRecUid(this, 'recordId', itemIndex)
	const schema = this.getNodeParameter('schema', itemIndex) as string
	const returnFields = this.getNodeParameter('returnFields', itemIndex, []) as string[]

	const filters = [
		{
			fieldname: 'globalrecuid',
			value: recordId
		}
	]

	const response = await getRecords.call(this, schema, filters, returnFields)
	return response?.records?.[0] ?? {}
}
