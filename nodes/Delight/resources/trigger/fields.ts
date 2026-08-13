import { INodeProperties } from 'n8n-workflow'

const generalFields: INodeProperties[] = [
	{
		displayName: 'Schema Name or ID',
		name: 'schema',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOptionsDatasetSchemas'
		},
		default: '',
		required: true,
		description:
			'Choose the schema to monitor for changes. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.'
	}
]

export const pollingTriggerFields: INodeProperties[] = [
	{
		displayName: 'Trigger On',
		name: 'event',
		type: 'options',
		options: [
			{
				name: 'New Record Created',
				value: 'created'
			},
			{
				name: 'Record Updated',
				value: 'updated'
			}
		],
		default: 'created',
		required: true,
		description: 'Event that causes the workflow to trigger'
	},
	...generalFields,
	{
		displayName: 'Return Field Names or IDs',
		name: 'returnFields',
		type: 'multiOptions',
		displayOptions: {
			hide: { schema: [''] }
		},
		typeOptions: {
			loadOptionsMethod: 'getOptionsDatasetFields',
			loadOptionsDependsOn: ['event', 'schema']
		},
		default: [],
		description:
			'Which fields to include in the response. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.'
	}
]

export const webhookTriggerFields: INodeProperties[] = [
	{
		displayName: 'Trigger On',
		name: 'events',
		type: 'multiOptions',
		options: [
			{ name: 'New Record Created', value: 'created' },
			{ name: 'Record Updated', value: 'updated' },
			{ name: 'Record Deleted', value: 'deleted' }
		],
		default: ['created'],
		required: true,
		description: 'Events that cause the workflow to trigger'
	},
	...generalFields
]
