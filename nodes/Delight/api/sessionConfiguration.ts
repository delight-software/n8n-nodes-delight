import { createHash } from 'node:crypto'
import type { ICredentialDataDecryptedObject } from 'n8n-workflow'

export function getSessionConfiguration(credentials: ICredentialDataDecryptedObject): string {
	return createHash('sha256')
		.update(JSON.stringify([credentials.restApiUrl, credentials.username, credentials.password]))
		.digest('hex')
}
