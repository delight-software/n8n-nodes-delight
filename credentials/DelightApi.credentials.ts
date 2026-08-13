import type { Icon, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow'

export class DelightApi implements ICredentialType {
	name = 'delightApi'

	icon: Icon = {
		light: 'file:../nodes/Delight/delight.svg',
		dark: 'file:../nodes/Delight/delight.dark.svg'
	}

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-display-name-miscased
	displayName = 'delight API'

	documentationUrl =
		'https://delight.ch/delight-knowledge-base/#/{67804FC1-8EE3-4FFE-8F79-10ADBFDBFE18}'

	properties: INodeProperties[] = [
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
		}
	]

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.restApiUrl}}',
			url: '/services/Authentication/Login',
			method: 'POST',
			body: ['{{$credentials.username}}', '{{$credentials.password}}']
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'result[1]',
					value: true,
					message: 'Authentication failed. Please check your username and password.'
				}
			}
		]
	}
}
