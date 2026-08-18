import { IBinaryKeyData, IExecuteFunctions } from 'n8n-workflow'
import { DelightDocument, DelightQueryRecordResourceListPayload } from '../types'
import { getDocument, getRecordResourceList } from '../api/events'
import { getFileExtension, getMimeTypeByExtension } from './fileUtils'

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

export async function getBinaryDocuments(
	this: IExecuteFunctions,
	containerUid: string,
	schemaName: string,
	recordUid: string,
	documentPrefix: string
): Promise<IBinaryKeyData> {
	const resources = await getRecordResourceList.call(this, containerUid, schemaName, recordUid)
	const documents = extractAllDocuments(resources || {})

	if (documents.length === 0) {
		return {}
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

	return binaryData
}
