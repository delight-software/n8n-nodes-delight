import { IExecuteFunctions, JsonObject } from 'n8n-workflow'
import { getRecords } from '../../../api/events'

export async function executeDatasetGetMany(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<JsonObject[]> {
	const schema = this.getNodeParameter('schema', itemIndex) as string
	const returnFields = this.getNodeParameter('returnFields', itemIndex, []) as string[]
	const filtersData = this.getNodeParameter('filters', itemIndex, {}) as {
		filter?: Array<{
			logicalOperator: string
			fieldName: string
			filterType: string
			value: string
			openGroup?: boolean
			closeGroup?: boolean
		}>
	}
	const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean

	const apiFilters: unknown[] = []
	const rawFilters = filtersData.filter || []

	rawFilters.forEach((filter, index) => {
		if (index > 0) {
			apiFilters.push(filter.logicalOperator)
		}

		if (filter.openGroup) {
			apiFilters.push('(')
		}

		apiFilters.push({
			fieldname: filter.fieldName,
			filtertype: filter.filterType,
			value: filter.filterType === 'LIKE' ? `%${filter.value}%` : filter.value
		})

		if (filter.closeGroup) {
			apiFilters.push(')')
		}
	})

	const pagination = {
		start: -1,
		count: -1
	}

	if (!returnAll) {
		const limit = this.getNodeParameter('limit', itemIndex, 50) as number
		pagination.start = 0
		pagination.count = limit
	}

	const response = await getRecords.call(this, schema, apiFilters, returnFields, pagination)
	return response?.records ?? []
}
