import type { INodeProperties } from 'n8n-workflow'

const showOnlyForDatasetGetMany = {
	operation: ['getMany'],
	resource: ['dataset']
}

export const datasetGetManyFields: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true
		},
		displayOptions: {
			show: showOnlyForDatasetGetMany,
			hide: { schema: [''] }
		},
		default: {},
		description:
			'Filter conditions to narrow the result set. Without any filters, all records are returned.',
		options: [
			{
				name: 'filter',
				displayName: 'Filter',
				// eslint-disable-next-line n8n-nodes-base/node-param-fixed-collection-type-unsorted-items
				values: [
					{
						displayName: 'Logical Operator',
						name: 'logicalOperator',
						type: 'options',
						options: [
							{
								name: 'AND',
								value: 'and',
								description: 'Both this and the previous condition must match'
							},
							{
								name: 'OR',
								value: 'or',
								description: 'Either this or the previous condition must match'
							}
						],
						default: 'and',
						description:
							'How to combine this filter with the previous one. Ignored for the first filter.'
					},
					{
						displayName: 'Open Group',
						name: 'openGroup',
						type: 'boolean',
						default: false,
						description:
							'Whether to add a "(" before this condition to group it with subsequent conditions'
					},
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getOptionsDatasetFilteredFields'
						},
						default: '',
						description:
							'The dataset field to filter by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.'
					},
					{
						displayName: 'Filter Type',
						name: 'filterType',
						type: 'options',
						options: [
							{ name: 'Contains (Like)', value: 'LIKE' },
							{ name: 'Equals (=)', value: 'eq' },
							{ name: 'Greater Than (>)', value: '>' },
							{ name: 'Greater Than or Equal (>=)', value: '>=' },
							{ name: 'Less Than (<)', value: '<' },
							{ name: 'Less Than or Equal (<=)', value: '<=' },
							{ name: 'Not Equals (!=)', value: '<>' }
						],
						default: 'eq',
						description: 'The comparison operator to apply'
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'The value to compare against. Use an expression for dynamic values.'
					},
					{
						displayName: 'Close Group',
						name: 'closeGroup',
						type: 'boolean',
						default: false,
						description:
							'Whether to add a ")" after this condition to close a previously opened group'
					}
				]
			}
		]
	},

	{
		displayName: 'Return All Records',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: showOnlyForDatasetGetMany
		},
		default: true,

		description: 'Whether to return all results or only up to a given limit'
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1
		},
		displayOptions: {
			show: {
				...showOnlyForDatasetGetMany,
				returnAll: [false]
			}
		},
		default: 50,
		description: 'Max number of results to return'
	}
]
