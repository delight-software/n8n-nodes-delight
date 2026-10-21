import {
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	INodeExecutionData,
	NodeConnectionTypes
} from 'n8n-workflow'
import { getOptionsDatasetSchemas, getOptionsDatasetFields } from './methods/loadOptions'
import { executePoll, pollingTriggerFields } from './resources/trigger'

export class DelightPollingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Delight Polling Trigger',
		name: 'delightPollingTrigger',
		icon: { light: 'file:delight.svg', dark: 'file:delight.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Polls for new or updated records in delight on a schedule.',
		defaults: {
			name: 'Delight Trigger'
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'delightApi',
				required: true
			}
		],
		properties: pollingTriggerFields
	}

	methods = {
		loadOptions: {
			getOptionsDatasetSchemas,
			getOptionsDatasetFields
		}
	}

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		return executePoll.call(this)
	}
}
