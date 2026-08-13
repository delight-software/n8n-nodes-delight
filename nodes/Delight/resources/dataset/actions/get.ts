import { IExecuteFunctions } from 'n8n-workflow'
import { DelightApiResponse } from '../../../types'
import { getRecords } from '../../../api/events'
import { getValidatedGlobalRecUid } from '../../../utils/validators'

export async function executeDatasetGet(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<DelightApiResponse> {
	const recordId = getValidatedGlobalRecUid(this, 'recordId', itemIndex)
	const schema = this.getNodeParameter('schema', itemIndex) as string
	const returnFields = this.getNodeParameter('returnFields', itemIndex, []) as string[]

	const filters = [
		{
			fieldname: 'globalrecuid',
			value: recordId
		}
	]

	return await getRecords.call(this, schema, filters, returnFields)
}
