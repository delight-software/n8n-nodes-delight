import { NodeOperationError, INodeExecutionData, IPollFunctions } from 'n8n-workflow'
import { getRecords } from '../../api/events'

export async function poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
	const schema = this.getNodeParameter('schema') as string
	const event = this.getNodeParameter('event') as string
	const returnFields = this.getNodeParameter('returnFields') as string[]

	const staticData = this.getWorkflowStaticData('node')

	const now = new Date().toISOString()

	const isManualTest = this.getMode() === 'manual'
	if (isManualTest) {
		// Static data isn't available when testing workflows. It only exists when published and called by a trigger or webhook.
		const jsDate = new Date(now)
		jsDate.setMinutes(jsDate.getMinutes() - 1)
		staticData.lastPollTime = jsDate.toISOString()
	}

	const lastPollTime = (staticData.lastPollTime as string) || now

	try {
		const filters: unknown[] = []

		if (event === 'created') {
			filters.push({ fieldname: 'creadate', filtertype: '>', value: lastPollTime })
		} else if (event === 'updated') {
			filters.push({ fieldname: 'lastchangedtsp', filtertype: '>', value: lastPollTime })
		}

		const response = await getRecords.call(this, schema, filters, returnFields)

		const records = response.records || []

		staticData.lastPollTime = now

		if (records.length === 0) {
			return null
		}

		return [this.helpers.returnJsonArray(records)]
	} catch (error) {
		staticData.lastPollTime = now
		throw new NodeOperationError(this.getNode(), error)
	}
}
