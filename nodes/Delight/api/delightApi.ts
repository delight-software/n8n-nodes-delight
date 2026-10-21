import type {
	IExecuteFunctions,
	IDataObject,
	IHttpRequestOptions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	GenericValue,
	INode,
	JsonObject,
	IPollFunctions,
	IHookFunctions
} from 'n8n-workflow'

import { DelightApiError, DelightApiResult } from '../types'
import { NodeApiError } from 'n8n-workflow'
import { getSessionConfiguration } from './sessionConfiguration'

type ThisContext = ILoadOptionsFunctions | IExecuteFunctions | IPollFunctions | IHookFunctions

function getValidatedPayload<T = IDataObject>(node: INode, response: DelightApiResult<T>): T {
	const result = response?.result
	if (!result) {
		throw new NodeApiError(
			node,
			{ message: 'Invalid Response' },
			{
				message: 'InvalidResponse',
				description: 'An invalid response was received'
			}
		)
	}

	if (!result?.[0]) {
		const error = result?.[1]?.error
		if (error) {
			throw new NodeApiError(node, error, {
				message: error.class || 'API Error',
				description: error.message || 'An unknown error occurred'
			})
		}

		throw new NodeApiError(
			node,
			{ message: 'Something went wrong' },
			{
				message: 'Something went wrong',
				description: 'Something went wrong. Please try later again.'
			}
		)
	}

	const payload = result?.[1] as T & {
		record_info?: Array<{ error?: DelightApiError }>
	}

	if (!payload) {
		throw new NodeApiError(
			node,
			{ message: 'Something went wrong' },
			{
				message: 'Something went wrong',
				description: 'Something went wrong. Please try later again.'
			}
		)
	}

	const recordInfo = payload.record_info

	if (recordInfo && Array.isArray(recordInfo) && recordInfo.length > 0) {
		const error = recordInfo[0]?.error

		if (error) {
			throw new NodeApiError(node, error, {
				message: error.class || 'API Error',
				description: error.message || ' An unkown error occurred'
			})
		}
	}

	return result?.[1]
}

export async function delightApiRequest<T = IDataObject>(
	context: ThisContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: FormData | GenericValue | GenericValue[] | Buffer | URLSearchParams,
	qs: IDataObject = {}
): Promise<T> {
	const credentials = { ...(await context.getCredentials('delightApi')) }
	const baseUrl = (credentials.restApiUrl as string).replace(/\/$/, '')
	const nodeCredentials = context.getNode().credentials?.delightApi

	// n8n refreshes empty/expired sessions; edits must invalidate a token before it is sent.
	if (credentials.sessionTokenConfigurationHash !== getSessionConfiguration(credentials)) {
		credentials.sessionToken = ''
	}

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		body,
		qs,
		json: true
	}

	try {
		const response = await context.helpers.httpRequestWithAuthentication.call(
			context,
			'delightApi',
			options,
			{
				credentialsDecrypted: {
					id: nodeCredentials?.id ?? '',
					name: nodeCredentials?.name ?? '',
					type: 'delightApi',
					data: credentials
				}
			}
		)
		return getValidatedPayload(context.getNode(), response)
	} catch (error) {
		throw new NodeApiError(context.getNode(), error as JsonObject)
	}
}
