import {
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	IWebhookFunctions,
	IWebhookResponseData
} from 'n8n-workflow'
import { getOptionsDatasetSchemas } from './methods/loadOptions'
import { executeWebhook, webhookTriggerFields, webhookMethods } from './resources/trigger'

export class DelightWebhookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Delight Webhook Trigger',
		name: 'delightWebhookTrigger',
		icon: { light: 'file:delight.svg', dark: 'file:delight.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["schema"]}}',
		description:
			'Triggers instantly when delight pushes a webhook event for new, updated, or deleted records.',
		defaults: {
			name: 'Delight Webhook Trigger'
		},
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook'
			}
		],
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'delightApi',
				required: true
			}
		],
		properties: webhookTriggerFields,
		usableAsTool: true
	}

	methods = {
		loadOptions: {
			getOptionsDatasetSchemas
		}
	}

	webhookMethods = webhookMethods

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		return executeWebhook.call(this)
	}
}
