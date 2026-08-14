import type { IExecuteFunctions, JsonObject } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'
import { executeDocumentsCenterCreate } from './actions/create'

export async function executeDocumentsCenter(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<JsonObject> {
	const operation = this.getNodeParameter('operation', itemIndex) as string

	switch (operation) {
		case 'create':
			return await executeDocumentsCenterCreate.call(this, itemIndex)

		default:
			throw new NodeOperationError(
				this.getNode(),
				{
					message: 'Operation not supported'
				},
				{
					message: `Operation ${operation} not supported`,
					description: `Operation ${operation} is not supported for the Documents Center resource.`
				}
			)
	}
}
