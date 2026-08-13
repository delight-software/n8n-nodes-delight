import { IExecuteFunctions } from 'n8n-workflow'
import { DelightApiResponse } from '../../../types'
import { deleteRecord } from '../../../api/events'
import { getValidatedGlobalRecUid } from '../../../utils/validators'

export async function executeDatasetDelete(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<DelightApiResponse> {
	const recordId = getValidatedGlobalRecUid(this, 'recordId', itemIndex)
	const schema = this.getNodeParameter('schema', itemIndex) as string

	return await deleteRecord.call(this, schema, recordId)
}
