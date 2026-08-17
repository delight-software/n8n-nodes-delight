export function getMimeTypeByExtension(extension: string): string {
	const ext = extension.toLowerCase().replace(/^\./, '')
	const mimeTypes: Record<string, string> = {
		pdf: 'application/pdf',
		doc: 'application/msword',
		docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		xls: 'application/vnd.ms-excel',
		xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		ppt: 'application/vnd.ms-powerpoint',
		pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		bmp: 'image/bmp',
		tiff: 'image/tiff',
		svg: 'image/svg+xml',
		txt: 'text/plain',
		csv: 'text/csv',
		html: 'text/html',
		xml: 'application/xml',
		json: 'application/json',
		zip: 'application/zip',
		rar: 'application/x-rar-compressed',
		'7z': 'application/x-7z-compressed',
		msg: 'application/vnd.ms-outlook'
	}
	return mimeTypes[ext] ?? 'application/octet-stream'
}

export function getFileExtension(filename: string): string {
	const name = filename.split(/[\\/]/).pop() ?? ''
	const dotIndex = name.lastIndexOf('.')

	if (dotIndex <= 0) {
		return ''
	}

	return name.slice(dotIndex + 1).toLowerCase()
}
