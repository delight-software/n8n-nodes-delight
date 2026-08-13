import { IExecuteFunctions, JsonObject } from 'n8n-workflow'
import { DelightApiResponse } from '../../../types'
import { addRecord } from '../../../api/events'

export async function executeDatasetCreate(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<DelightApiResponse> {
	const schema = this.getNodeParameter('schema', itemIndex) as string

	const fields = this.getNodeParameter('fields', itemIndex) as {
		mappingMode: string
		value: JsonObject
	}

	return await addRecord.call(this, schema, [fields.value], Object.keys(fields.value))
}
