import { IExecuteFunctions, JsonObject, NodeOperationError } from 'n8n-workflow'
import { addRecord, getRecords, updateRecord } from '../../../api/events'

async function executeAddRecord(
	this: IExecuteFunctions,
	schema: string,
	fields: JsonObject
): Promise<JsonObject> {
	const response = await addRecord.call(this, schema, [fields], Object.keys(fields))

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

async function executeUpdateRecord(
	this: IExecuteFunctions,
	schema: string,
	guid: string,
	fields: JsonObject
): Promise<JsonObject> {
	const response = await updateRecord.call(this, schema, guid, fields, Object.keys(fields))

	const result = response?.record_info?.[0]?.result

	return {
		updated: result === true,
		globalrecuid: guid
	}
}

export async function executeDatasetCreateOrUpdate(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<JsonObject> {
	const schema = this.getNodeParameter('schema', itemIndex) as string

	const fieldsToMatch = this.getNodeParameter('fieldsToMatch', itemIndex) as string[]

	const fieldsToSend = this.getNodeParameter('fieldsToSend', itemIndex) as {
		mappingMode: string
		value: JsonObject
	}

	const filter = Object.entries(fieldsToSend.value)
		.filter(([fieldname]) => fieldsToMatch.includes(fieldname))
		.flatMap(([fieldname, value], index, entries) => [
			{ fieldname, value },
			...(index < entries.length - 1 ? ['and'] : [])
		])

	const response = await getRecords.call(this, schema, filter)

	const records = response?.records
	if (records && records.length > 0) {
		if (records.length > 1) {
			const behavior = this.getNodeParameter('multipleMatchesBehavior', itemIndex) as
				'error' | 'updateFirst' | 'createNew'

			switch (behavior) {
				case 'error':
					throw new NodeOperationError(this.getNode(), 'Multiple matching records found')

				case 'updateFirst': {
					return await executeUpdateRecord.call(
						this,
						schema,
						records[0].globalrecuid as string,
						fieldsToSend.value
					)
				}

				case 'createNew':
					return await executeAddRecord.call(this, schema, fieldsToSend.value)

				default:
					throw new NodeOperationError(this.getNode(), 'Multiple matching records found')
			}
		}

		return await executeUpdateRecord.call(
			this,
			schema,
			records[0].globalrecuid as string,
			fieldsToSend.value
		)
	}

	return await executeAddRecord.call(this, schema, fieldsToSend.value)
}
