import { IDataObject } from 'n8n-workflow'

type MessageType = 'inbox' | 'outbox' | null

export interface NormalizedEmail {
	subject: string
	from: string
	fromName: string
	fromFormatted: string
	to: string[]
	toNames: string[]
	cc: string[]
	ccNames: string[]
	date: string
	htmlBody: string
	textBody: string
	detectedMessageType: MessageType
}

export interface EmailAttachment {
	name: string
	content: string
	mimeType?: string
}

export function formatEmailAddress(email: string, name?: string): string {
	if (!email) return ''
	return name ? `${name} <${email}>` : email
}

function formatAddressList(emails: string[], names: string[]): string {
	return emails.map((email, i) => formatEmailAddress(email, names[i])).join(', ')
}

function isOutlookFormat(json: IDataObject): boolean {
	if (Array.isArray(json.toRecipients)) return true
	const from = json.from as IDataObject | undefined
	if (!from) return false
	return typeof from.emailAddress === 'object' && !Array.isArray(from.value)
}

function isMailparserFormat(json: IDataObject): boolean {
	const from = json.from as IDataObject | undefined
	return Array.isArray(from?.value)
}

function extractMailparserSingle(field: unknown): { email: string; name: string } {
	if (!field) return { email: '', name: '' }
	if (typeof field === 'string') return { email: field, name: '' }

	const obj = field as IDataObject
	const valueArr = obj.value as IDataObject[] | undefined
	if (Array.isArray(valueArr) && valueArr[0]) {
		return {
			email: (valueArr[0].address as string) ?? '',
			name: (valueArr[0].name as string) ?? ''
		}
	}
	// Last resort: parse "Name <email>" from the .text field
	const text = obj.text as string | undefined
	if (text) {
		const match = text.match(/<([^>]+)>/)
		return { email: match ? match[1] : text.trim(), name: '' }
	}
	return { email: '', name: '' }
}

function extractMailparserAll(field: unknown): Array<{ email: string; name: string }> {
	if (!field) return []
	if (typeof field === 'string') return [{ email: field, name: '' }]

	const obj = field as IDataObject
	const valueArr = obj.value as IDataObject[] | undefined
	if (Array.isArray(valueArr) && valueArr.length > 0) {
		return valueArr
			.map((entry) => ({
				email: (entry.address as string) ?? '',
				name: (entry.name as string) ?? ''
			}))
			.filter((r) => r.email)
	}

	// Fallback: single entry via the text/match path
	const single = extractMailparserSingle(field)
	return single.email ? [single] : []
}

function normalizeMailparserEmail(json: IDataObject): NormalizedEmail {
	const from = extractMailparserSingle(json.from)
	const toList = extractMailparserAll(json.to)
	const ccList = extractMailparserAll(json.cc)

	// Gmail exposes labelIds; IMAP trigger does not
	let detectedMessageType: 'inbox' | 'outbox' | null = null
	const labelIds = json.labelIds as string[] | undefined
	if (Array.isArray(labelIds)) {
		detectedMessageType = labelIds.includes('SENT') ? 'outbox' : 'inbox'
	}

	const date = json.date ? new Date(json.date as string).toUTCString() : new Date().toUTCString()

	return {
		subject: (json.subject as string) ?? '',
		from: from.email,
		fromName: from.name,
		fromFormatted: formatEmailAddress(from.email, from.name),
		to: toList.map((r) => r.email),
		toNames: toList.map((r) => r.name),
		cc: ccList.map((r) => r.email),
		ccNames: ccList.map((r) => r.name),
		date,
		htmlBody: (json.html as string) || (json.textAsHtml as string) || '',
		textBody: (json.text as string) ?? '',
		detectedMessageType
	}
}

function extractOutlookSingleAddress(field: unknown): { email: string; name: string } {
	if (!field || typeof field !== 'object') return { email: '', name: '' }

	const emailAddress = (field as IDataObject).emailAddress as IDataObject | undefined
	if (emailAddress) {
		return {
			email: (emailAddress.address as string) ?? '',
			name: (emailAddress.name as string) ?? ''
		}
	}

	return { email: '', name: '' }
}

function extractOutlookAllRecipients(field: unknown): Array<{ email: string; name: string }> {
	if (!Array.isArray(field) || field.length === 0) return []
	return field.map((entry) => extractOutlookSingleAddress(entry)).filter((r) => r.email)
}

function guessOutlookMessageType(json: IDataObject): MessageType {
	if (json.isDraft) return 'outbox'

	// BCC is only populated on outgoing messages
	if (json.bccRecipients && (json.bccRecipients as IDataObject[]).length > 0) return 'outbox'

	if (json.receivedDateTime && !json.sentDateTime) return 'inbox'
	if (json.sentDateTime && !json.receivedDateTime) return 'outbox'

	return null
}

function normalizeOutlookEmail(json: IDataObject): NormalizedEmail {
	// Prefer `from`. Fall back to `sender` (they differ for shared mailboxes)
	const from = extractOutlookSingleAddress(json.from ?? json.sender)
	const toList = extractOutlookAllRecipients(json.toRecipients)
	const ccList = extractOutlookAllRecipients(json.ccRecipients)

	const body = json.body as IDataObject | undefined
	const htmlBody = body?.contentType === 'html' ? ((body.content as string) ?? '') : ''
	const textBody =
		body?.contentType === 'text'
			? ((body.content as string) ?? '')
			: ((json.bodyPreview as string) ?? '')

	const rawDate = (json.receivedDateTime ?? json.sentDateTime) as string | undefined
	const date = rawDate ? new Date(rawDate).toUTCString() : new Date().toUTCString()

	const detectedMessageType = guessOutlookMessageType(json)

	return {
		subject: (json.subject as string) ?? '',
		from: from.email,
		fromName: from.name,
		fromFormatted: formatEmailAddress(from.email, from.name),
		to: toList.map((r) => r.email),
		toNames: toList.map((r) => r.name),
		cc: ccList.map((r) => r.email),
		ccNames: ccList.map((r) => r.name),
		date,
		htmlBody,
		textBody,
		detectedMessageType
	}
}

function normalizeFallbackEmail(json: IDataObject): NormalizedEmail {
	const toRaw = typeof json.to === 'string' && json.to ? [json.to] : []
	const ccRaw = typeof json.cc === 'string' && json.cc ? [json.cc] : []
	return {
		subject: (json.subject as string) ?? '',
		from: (json.from as string) ?? '',
		fromName: '',
		fromFormatted: formatEmailAddress(json.from as string, ''),
		to: toRaw,
		toNames: toRaw.map(() => ''),
		cc: ccRaw,
		ccNames: ccRaw.map(() => ''),
		date: new Date().toUTCString(),
		htmlBody: (json.html as string) ?? (json.body as string) ?? '',
		textBody: (json.text as string) ?? '',
		detectedMessageType: null
	}
}

/**
 * Normalizes an email item from any supported n8n source into a common shape:
 * - Gmail node (uses Gmail API + mailparser)
 * - Email Trigger / IMAP node (uses mailparser)
 * - Microsoft Outlook node (uses Microsoft Graph API)
 * - Unknown formats receive best-effort field extraction
 */
export function normalizeEmail(json: IDataObject): NormalizedEmail {
	if (isOutlookFormat(json)) return normalizeOutlookEmail(json)
	if (isMailparserFormat(json)) return normalizeMailparserEmail(json)
	return normalizeFallbackEmail(json)
}

function wrapBase64(str: string): string {
	return str.match(/.{1,76}/g)?.join('\r\n') || str
}

export function createEmlBase64(
	email: NormalizedEmail,
	attachments: EmailAttachment[] = []
): string {
	const bodyContent = email.htmlBody || email.textBody
	const contentType = email.htmlBody ? 'text/html' : 'text/plain'
	const encodedSubject = `=?UTF-8?B?${Buffer.from(email.subject).toString('base64')}?=`
	const base64Body = wrapBase64(Buffer.from(bodyContent, 'utf-8').toString('base64'))

	const toHeader = formatAddressList(email.to, email.toNames)
	const ccHeader = email.cc.length > 0 ? formatAddressList(email.cc, email.ccNames) : ''

	const headers = [
		`From: ${email.fromFormatted}`,
		`To: ${toHeader}`,
		...(ccHeader ? [`Cc: ${ccHeader}`] : []),
		`Subject: ${encodedSubject}`,
		`Date: ${email.date}`,
		'MIME-Version: 1.0'
	]

	// If no attachments, output standard single-part MIME message
	if (!attachments || attachments.length === 0) {
		const lines = [
			...headers,
			`Content-Type: ${contentType}; charset=utf-8`,
			'Content-Transfer-Encoding: base64',
			'',
			base64Body
		]
		return Buffer.from(lines.join('\r\n'), 'utf-8').toString('base64')
	}

	// Construct multipart/mixed MIME message for attachments
	const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

	const lines = [
		...headers,
		`Content-Type: multipart/mixed; boundary="${boundary}"`,
		'',
		`--${boundary}`,
		`Content-Type: ${contentType}; charset=utf-8`,
		'Content-Transfer-Encoding: base64',
		'',
		base64Body
	]

	for (const att of attachments) {
		const base64Content = wrapBase64(att.content)
		const encodedFileName = `=?UTF-8?B?${Buffer.from(att.name).toString('base64')}?=`
		const mimeType = att.mimeType || 'application/octet-stream'

		lines.push(
			`--${boundary}`,
			`Content-Type: ${mimeType}; name="${encodedFileName}"`,
			'Content-Transfer-Encoding: base64',
			`Content-Disposition: attachment; filename="${encodedFileName}"`,
			'',
			base64Content
		)
	}

	lines.push(`--${boundary}--`)

	return Buffer.from(lines.join('\r\n'), 'utf-8').toString('base64')
}
