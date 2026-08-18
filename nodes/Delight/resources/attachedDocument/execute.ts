import type { IExecuteFunctions, INodeExecutionData, JsonObject } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'
import { executeAttachedDocumentUpload } from './actions/upload'
import { executeAttachedDocumentDownload } from './actions/download'

export async function executeAttachedDocument(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<JsonObject | INodeExecutionData> {
	const operation = this.getNodeParameter('operation', itemIndex) as string

	switch (operation) {
		case 'upload':
			return await executeAttachedDocumentUpload.call(this, itemIndex)

		case 'download':
			return await executeAttachedDocumentDownload.call(this, itemIndex)

		default:
			throw new NodeOperationError(
				this.getNode(),
				{
					message: 'Operation not supported'
				},
				{
					message: `Operation ${operation} not supported`,
					description: `Operation ${operation} is not supported for the Attached Document resource.`
				}
			)
	}
}
