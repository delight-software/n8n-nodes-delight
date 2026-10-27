import { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { getRecords } from '../../../api/events'
import { getValidatedGlobalRecUid } from '../../../utils/validators'
import { SCHEMA_MODULE_UIDS_WITH_DOCUMENTS } from '../../../constants/schemas'
import { getBinaryDocuments } from '../../../utils/binaryUtils'

export async function executeDatasetGet(
	this: IExecuteFunctions,
	itemIndex: number
): Promise<INodeExecutionData> {
	const recordId = getValidatedGlobalRecUid(this, 'recordId', itemIndex)
	const schema = this.getNodeParameter('schema', itemIndex) as string
	const returnFields = this.getNodeParameter('returnFields', itemIndex, []) as string[]
	const documentPrefix =
		(this.getNodeParameter('options.documentPrefix', itemIndex, 'document_') as string) ||
		'document_'

	const downloadDocuments = this.getNodeParameter(
		'options.downloadDocuments',
		itemIndex,
		false
	) as boolean

	const includeDocumentMetadata = this.getNodeParameter(
		'options.includeDocumentMetadata',
		itemIndex,
		false
	) as boolean

	const filters = [
		{
			fieldname: 'globalrecuid',
			value: recordId
		}
	]

	const response = await getRecords.call(this, schema, filters, returnFields)
	const json: IDataObject = response?.records?.[0] ?? {}

	const moduleUid = SCHEMA_MODULE_UIDS_WITH_DOCUMENTS[schema]
	const globalrecuid = json.globalrecuid as string

	if (!downloadDocuments || !moduleUid || !globalrecuid) {
		return { json }
	}

	const { binaryData, metadata } = await getBinaryDocuments.call(
		this,
		moduleUid,
		schema,
		globalrecuid,
		documentPrefix
	)

	if (includeDocumentMetadata) {
		json.documents = metadata
	}

	return {
		json,
		binary: Object.keys(binaryData).length ? binaryData : undefined
	}
}
