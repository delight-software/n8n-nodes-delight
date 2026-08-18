import { IBinaryKeyData, IExecuteFunctions } from 'n8n-workflow'
import { DelightDocument, DelightQueryRecordResourceListPayload } from '../types'
import { getDocument, getRecordResourceList } from '../api/events'
import { getFileExtension, getMimeTypeByExtension } from './fileUtils'

export interface DocumentMetadata {
	property: string
	fileName: string
	path: string
}

interface BinaryDocumentsResult {
	binaryData: IBinaryKeyData
	metadata: DocumentMetadata[]
}

interface ExtractedDelightDocument extends DelightDocument {
	folderPathArray: string[]
}

export function extractAllDocuments(
	node: DelightQueryRecordResourceListPayload,
	currentPath: string[] = []
): ExtractedDelightDocument[] {
	const docs: ExtractedDelightDocument[] = []

	if (node?.documents && Array.isArray(node.documents)) {
		for (const doc of node.documents) {
			docs.push({
				...doc,
				folderPathArray: [...currentPath]
			})
		}
	}

	if (node?.directories && Array.isArray(node.directories)) {
		for (const dir of node.directories) {
			const dirName = (dir.name as string) || ''
			const newPath = dirName ? [...currentPath, dirName] : [...currentPath]

			docs.push(...extractAllDocuments(dir, newPath))
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
): Promise<BinaryDocumentsResult> {
	const resources = await getRecordResourceList.call(this, containerUid, schemaName, recordUid)
	const documents = extractAllDocuments(resources || {})

	if (documents.length === 0) {
		return { binaryData: {}, metadata: [] }
	}

	const files = await Promise.all(
		documents.map((doc) => getDocument.call(this, doc.server_uid, getFileExtension(doc.name)))
	)

	const binaryData: IBinaryKeyData = {}
	const metadata: DocumentMetadata[] = []

	for (const [index, file] of files.entries()) {
		if (file.content) {
			const fileExt = getFileExtension(file.name)
			const binaryKey = documentPrefix + String(index)

			const pathArray = documents[index].folderPathArray
			const filePath = pathArray.join(',')

			binaryData[binaryKey] = await this.helpers.prepareBinaryData(
				Buffer.from(file.content, 'base64'),
				file.name,
				getMimeTypeByExtension(fileExt)
			)

			metadata.push({
				property: binaryKey,
				fileName: file.name,
				path: filePath
			})
		}
	}

	return { binaryData, metadata }
}
