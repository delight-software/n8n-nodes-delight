import { IExecuteFunctions, JsonObject, NodeOperationError } from 'n8n-workflow'
import { DelightApiResponse } from '../../../types'
import { addRecord, getRecords, updateRecord } from '../../../api/events'

export async function executeDatasetCreateOrUpdate(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<DelightApiResponse> {
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

	const records = response?.result?.[1]?.records
	if (records && records.length > 0) {
		if (records.length > 1) {
			const behavior = this.getNodeParameter('multipleMatchesBehavior', itemIndex) as
				| 'error'
				| 'updateFirst'
				| 'createNew'

			switch (behavior) {
				case 'error':
					throw new NodeOperationError(this.getNode(), 'Multiple matching records found')

				case 'updateFirst':
					return await updateRecord.call(
						this,
						schema,
						records[0].globalrecuid as string,
						fieldsToSend.value,
						Object.keys(fieldsToSend.value)
					)

				case 'createNew':
					return await addRecord.call(
						this,
						schema,
						[fieldsToSend.value],
						Object.keys(fieldsToSend.value)
					)

				default:
					throw new NodeOperationError(this.getNode(), 'Multiple matching records found')
			}
		}

		return await updateRecord.call(
			this,
			schema,
			records[0].globalrecuid as string,
			fieldsToSend.value,
			Object.keys(fieldsToSend.value)
		)
	}

	return await addRecord.call(this, schema, [fieldsToSend.value], Object.keys(fieldsToSend.value))
}
