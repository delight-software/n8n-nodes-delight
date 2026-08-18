import {
	IExecuteFunctions,
	INodeExecutionData,
	JsonObject,
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription
} from 'n8n-workflow'
import { datasetFields, executeDataset } from './resources/dataset'
import { documentsCenterFields, executeDocumentsCenter } from './resources/documents-center'
import * as loadOptions from './methods/loadOptions'
import * as resourceMapping from './methods/resourceMapping'

export class Delight implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Delight Actions',
		name: 'delight',
		icon: { light: 'file:delight.svg', dark: 'file:delight.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Delight API',
		defaults: {
			name: 'delight'
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'delightApi', required: true }],
		requestDefaults: {
			baseURL: '={{$credentials.restApiUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			}
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Dataset',
						value: 'dataset'
					},
					{
						name: 'Documents Center',
						value: 'documentsCenter'
					}
				],
				default: 'dataset'
			},
			...datasetFields,
			...documentsCenterFields
		]
	}

	methods = {
		loadOptions,
		resourceMapping
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData()
		const returnData: INodeExecutionData[] = []

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string
				let responseData: JsonObject | JsonObject[] | INodeExecutionData

				switch (resource) {
					case 'dataset':
						responseData = await executeDataset.call(this, i)
						break

					case 'documentsCenter':
						responseData = await executeDocumentsCenter.call(this, i)
						break

					default:
						throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`)
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } }
				)

				returnData.push(...executionData)
			} catch (error) {
				error.message = `${error.message} (item ${i})`
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: i }
					})
					continue
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					description: error.description,
					itemIndex: i
				})
			}
		}

		return [returnData]
	}
}
