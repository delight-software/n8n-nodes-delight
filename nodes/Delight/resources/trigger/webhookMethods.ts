import { IHookFunctions, JsonObject, NodeOperationError } from 'n8n-workflow'
import { addRecord, deleteRecord, getRecords } from '../../api/events'

type NotificationHandlerTriggerResult =
	| {
			found: true
			triggerId: string
			endpointId: string
	  }
	| {
			found: false
	  }

const getDbActions = (events: string[]): number => {
	let dbactions = 0
	if (events.includes('created')) dbactions |= 1
	if (events.includes('updated')) dbactions |= 2
	if (events.includes('deleted')) dbactions |= 4

	return dbactions
}

const getNodeDescr = (context: IHookFunctions): string => {
	const workflowId = context.getWorkflow().id || ''
	const nodeId = context.getNode().id

	return `n8n-wf-${workflowId}-node-${nodeId}`
}

const findNotificationHandlerTrigger = async (
	context: IHookFunctions,
	webhookUrl: string
): Promise<NotificationHandlerTriggerResult> => {
	const filters = [
		{
			fieldname: 'triggerendpointid',
			filtertype: 'IN',
			refschema: 'notificationhandler_triggerendpoints',
			value: 'id',
			filters: [
				{
					fieldname: 'triggerendpointdata',
					filtertype: '=',
					value: webhookUrl
				}
			]
		}
	]

	const returnFields = [
		{
			fieldname: 'triggerendpointid',
			lookupvaluemode: 'lookupfields',
			lookupfields: ['globalrecuid']
		}
	]

	const { result } = await getRecords.call(
		context,
		'@table:notificationhandler_triggers',
		filters,
		returnFields
	)
	const records = result?.[1]?.records || []

	if (records.length > 0) {
		return {
			found: true,
			triggerId: records[0].globalrecuid as string,
			endpointId: records[0]['triggerendpointid-globalrecuid'] as string
		}
	}

	return { found: false }
}

export const webhookMethods = {
	default: {
		async checkExists(this: IHookFunctions): Promise<boolean> {
			const webhookUrl = this.getNodeWebhookUrl('default') as string

			const result = await findNotificationHandlerTrigger(this, webhookUrl)
			if (result.found) {
				const webhookData = this.getWorkflowStaticData('node')
				webhookData.triggerId = result.triggerId
				webhookData.endpointId = result.endpointId

				return true
			}

			return false
		},

		async create(this: IHookFunctions): Promise<boolean> {
			const webhookUrl = this.getNodeWebhookUrl('default') as string
			const rawSchema = this.getNodeParameter('schema') as string
			const schemaName = rawSchema.replace('@table:', '')
			const events = this.getNodeParameter('events') as string[]

			const endpointValues = {
				descr: getNodeDescr(this),
				triggerendpointdata: webhookUrl,
				triggerendpointtypeident: 'HTTPPOSTJSON'
			}

			const { result: createEndpointResult } = await addRecord.call(
				this,
				'@table:notificationhandler_triggerendpoints',
				endpointValues as unknown as JsonObject[],
				Object.keys(endpointValues)
			)

			const endpointGUID = createEndpointResult?.[1]?.record_info?.[0]?.server_uid
			if (!endpointGUID) {
				throw new NodeOperationError(this.getNode(), 'Missing Endpoint ID from CRM', {
					description:
						'The CRM processed the request, but did not return a server ID for the webhook endpoint.'
				})
			}

			const triggerValues = {
				dbactions: getDbActions(events),
				sqltableid: schemaName,
				triggerendpointid: endpointGUID
			}

			const triggerKeys = [
				'dbactions',
				'sqltableid',
				{
					fieldname: 'triggerendpointid',
					lookupvaluemode: 'globalrecuid'
				}
			]

			const { result: createTriggerResult } = await addRecord.call(
				this,
				'@table:notificationhandler_triggers',
				triggerValues as unknown as JsonObject[],
				triggerKeys
			)

			const triggerId = createTriggerResult?.[1]?.record_info?.[0]?.server_uid
			if (!triggerId) {
				throw new NodeOperationError(this.getNode(), 'Missing Trigger ID from CRM', {
					description:
						'The CRM processed the request, but did not return a server ID for the webhook trigger.'
				})
			}

			const webhookData = this.getWorkflowStaticData('node')
			webhookData.triggerId = triggerId
			webhookData.endpointId = endpointGUID

			return true
		},

		async delete(this: IHookFunctions): Promise<boolean> {
			const webhookData = this.getWorkflowStaticData('node')
			let endpointId = webhookData.endpointId as string | undefined
			let triggerId = webhookData.triggerId as string | undefined

			if (!endpointId || !triggerId) {
				const webhookUrl = this.getNodeWebhookUrl('default') as string

				const result = await findNotificationHandlerTrigger(this, webhookUrl)
				if (result.found) {
					endpointId = result.endpointId
					triggerId = result.triggerId
				}
			}

			if (triggerId) {
				await deleteRecord.call(this, '@table:notificationhandler_triggers', triggerId)
				delete webhookData.triggerId
			}

			if (endpointId) {
				await deleteRecord.call(this, '@table:notificationhandler_triggerendpoints', endpointId)
				delete webhookData.endpointId
			}

			return true
		}
	}
}
