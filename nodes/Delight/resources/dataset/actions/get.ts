import { IBinaryKeyData, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { getDocument, getRecordResourceList, getRecords } from '../../../api/events'
import { getValidatedGlobalRecUid } from '../../../utils/validators'
import { SCHEMAS_WITH_DOCUMENTS_SET, schemaUidMap } from '../../../constants/schemas'
import { getFileExtension, getMimeTypeByExtension } from '../../../utils/fileUtils'
import { DelightDocument, DelightQueryRecordResourceListPayload } from '../../../types'

function extractAllDocuments(node: DelightQueryRecordResourceListPayload): DelightDocument[] {
	const docs: DelightDocument[] = []

	if (node?.documents && Array.isArray(node.documents)) {
		docs.push(...node.documents)
	}

	if (node?.directories && Array.isArray(node.directories)) {
		for (const dir of node.directories) {
			docs.push(...extractAllDocuments(dir))
		}
	}

	return docs
}

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

	const filters = [
		{
			fieldname: 'globalrecuid',
			value: recordId
		}
	]

	const response = await getRecords.call(this, schema, filters, returnFields)
	const json = response?.records?.[0] ?? {}

	const schemaUid = schemaUidMap[schema]
	const globalrecuid = json.globalrecuid as string

	if (
		!downloadDocuments ||
		!SCHEMAS_WITH_DOCUMENTS_SET.has(schema) ||
		!schemaUid ||
		!globalrecuid
	) {
		return { json }
	}

	const resources = await getRecordResourceList.call(this, schemaUid, schema, globalrecuid)
	const documents = extractAllDocuments(resources || {})

	if (documents.length === 0) {
		return { json }
	}

	const files = await Promise.all(
		documents.map((doc) => getDocument.call(this, doc.server_uid, getFileExtension(doc.name)))
	)

	const binaryData: IBinaryKeyData = {}

	for (const [index, file] of files.entries()) {
		if (file.content) {
			const fileExt = getFileExtension(file.name)

			const binaryKey = documentPrefix + String(index)

			binaryData[binaryKey] = await this.helpers.prepareBinaryData(
				Buffer.from(file.content, 'base64'),
				file.name,
				getMimeTypeByExtension(fileExt)
			)
		}
	}

	return {
		json,
		binary: Object.keys(binaryData).length ? binaryData : undefined
	}
}
