import type {
	Icon,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IDataObject,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INodeProperties
} from 'n8n-workflow'
import { getSessionConfiguration } from '../nodes/Delight/api/sessionConfiguration'

export class DelightApi implements ICredentialType {
	name = 'delightApi'

	icon: Icon = {
		light: 'file:../nodes/Delight/delight.svg',
		dark: 'file:../nodes/Delight/delight.dark.svg'
	}

	displayName = 'Delight API'

	documentationUrl =
		'https://delight.ch/delight-knowledge-base/#/{67804FC1-8EE3-4FFE-8F79-10ADBFDBFE18}'

	properties: INodeProperties[] = [
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: { password: true, expirable: true },
			default: ''
		},
		{
			displayName: 'Session Token Configuration Hash',
			name: 'sessionTokenConfigurationHash',
			type: 'hidden',
			typeOptions: { password: true },
			default: ''
		},
		{
			displayName: 'REST API URL',
			name: 'restApiUrl',
			type: 'string',
			default: '',
			required: true,
			description: 'Base URL of the delight REST API'
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true
		},
		{
			displayName: 'Label Language',
			name: 'labelLanguage',
			type: 'options',
			options: [
				{ name: 'English', value: 'english' },
				{ name: 'German', value: 'german' }
			],
			default: 'english',
			description:
				'Language used for schema and field labels displayed in n8n. Internal names and record values are not affected.'
		}
	]

	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject
	): Promise<IDataObject> {
		const baseUrl = (credentials.restApiUrl as string).replace(/\/$/, '')
		const sessionConfiguration = getSessionConfiguration(credentials)
		const { result } = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}/services/Authentication/Login`,
			body: [
				credentials.username,
				credentials.password,
				'n8n',
				true,
				{ deviceid: '', devicename: 'n8n' }
			],
			json: true
		})) as { result?: [string, boolean, IDataObject?] }

		if (!result?.[1] || !result?.[0]) {
			throw Object.assign(new Error('delight API Authentication failed'), {
				description: 'Invalid username or password.'
			})
		}

		const authInfo = result[2]
		if (authInfo && !authInfo.auth) {
			throw Object.assign(new Error('Two-Factor Authentication Not Supported'), {
				description:
					'This account has 2FA enabled, which is not supported by this n8n credential. Please use an account without 2FA.'
			})
		}

		return { sessionToken: result[0], sessionTokenConfigurationHash: sessionConfiguration }
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions
	): Promise<IHttpRequestOptions> {
		// Also fail closed when used outside the Delight nodes (e.g. the HTTP Request node).
		if (credentials.sessionTokenConfigurationHash !== getSessionConfiguration(credentials)) {
			throw new Error('Credential configuration changed. Test and save the Delight API credential.')
		}

		return {
			...requestOptions,
			headers: { ...requestOptions.headers, SESSIONKEY: credentials.sessionToken as string }
		}
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.restApiUrl.replace(/[/]$/, "")}}',
			url: '/database/schema/QuerySchemas',
			method: 'POST',
			body: [[], false, '={{$credentials.labelLanguage}}'],
			json: true
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'result[0]',
					value: false,
					message: 'Unable to query schemas. Please check your Delight API access and permissions.'
				}
			}
		]
	}
}
