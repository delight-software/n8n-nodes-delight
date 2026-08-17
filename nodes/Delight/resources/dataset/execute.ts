import type { IExecuteFunctions, INodeExecutionData, JsonObject } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'
import { executeDatasetCreate } from './actions/create'
import { executeDatasetGetMany } from './actions/getAll'
import { executeDatasetUpdate } from './actions/update'
import { executeDatasetGet } from './actions/get'
import { executeDatasetDelete } from './actions/delete'
import { executeDatasetCreateOrUpdate } from './actions/createOrUpdate'

export async function executeDataset(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<JsonObject | JsonObject[] | INodeExecutionData> {
	const operation = this.getNodeParameter('operation', itemIndex) as string

	switch (operation) {
		case 'get': {
			return await executeDatasetGet.call(this, itemIndex)
		}

		case 'getMany': {
			return await executeDatasetGetMany.call(this, itemIndex)
		}

		case 'create': {
			return await executeDatasetCreate.call(this, itemIndex)
		}

		case 'createOrUpdate': {
			return await executeDatasetCreateOrUpdate.call(this, itemIndex)
		}

		case 'update': {
			return await executeDatasetUpdate.call(this, itemIndex)
		}

		case 'delete': {
			return await executeDatasetDelete.call(this, itemIndex)
		}

		default:
			throw new NodeOperationError(
				this.getNode(),
				{
					message: 'Operation not supported'
				},
				{
					message: `Operation ${operation} not supported`,
					description: `Operation ${operation} is not supported!`
				}
			)
	}
}
