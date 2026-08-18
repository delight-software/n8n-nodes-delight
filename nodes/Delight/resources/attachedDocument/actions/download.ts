import { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { getValidatedGlobalRecUid } from '../../../utils/validators'
import { schemaUidMap } from '../../../constants/schemas'
import { getBinaryDocuments } from '../../../utils/binaryUtils'

export async function executeAttachedDocumentDownload(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<INodeExecutionData> {
	const recordId = getValidatedGlobalRecUid(this, 'recordId', itemIndex)
	const schema = this.getNodeParameter('schema', itemIndex) as string
	const documentPrefix =
		(this.getNodeParameter('options.documentPrefix', itemIndex, 'document_') as string) ||
		'document_'

	const json: IDataObject = {
		globalrecuid: recordId,
		downloaded: false,
		documents_downloaded: 0,
		documents: []
	}

	const schemaUid = schemaUidMap[schema]

	if (!schemaUid) {
		return { json }
	}

	const { binaryData, metadata } = await getBinaryDocuments.call(
		this,
		schemaUid,
		schema,
		recordId,
		documentPrefix
	)

	const binaryDataExists = !!Object.keys(binaryData).length

	json.downloaded = binaryDataExists
	json.documents_downloaded = metadata.length
	json.documents = metadata

	return {
		json,
		binary: binaryDataExists ? binaryData : undefined
	}
}
