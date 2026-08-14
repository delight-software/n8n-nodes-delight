import { IExecuteFunctions, JsonObject } from 'n8n-workflow'
import { addRecord } from '../../../api/events'

export async function executeDatasetCreate(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<JsonObject> {
	const schema = this.getNodeParameter('schema', itemIndex) as string

	const fields = this.getNodeParameter('fields', itemIndex) as {
		mappingMode: string
		value: JsonObject
	}

	const response = await addRecord.call(this, schema, [fields.value], Object.keys(fields.value))

	const recordInfo = response?.record_info?.[0]
	if (recordInfo) {
		return {
			created: true,
			...recordInfo
		}
	}

	return {
		created: false
	}
}
