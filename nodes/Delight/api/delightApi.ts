/* eslint-disable @n8n/community-nodes/no-http-request-with-manual-auth */
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

import { DelightApiResult } from '../types'
import { NodeApiError } from 'n8n-workflow'

interface CachedSession {
	key: string
	timestamp: number
}

type ThisContext = ILoadOptionsFunctions | IExecuteFunctions | IPollFunctions | IHookFunctions

const sessionCache = new Map<string, CachedSession>()

export async function getSessionKey(
	this: ThisContext,
	forceRefresh: boolean = false
): Promise<string> {
	const credentials = await this.getCredentials('delightApi')
	const baseUrl = (credentials.restApiUrl as string).replace(/\/$/, '')
	const username = credentials.username as string

	const cacheKey = `${baseUrl}_${username}`

	if (forceRefresh) {
		sessionCache.delete(cacheKey)
	}

	const cachedSession = sessionCache.get(cacheKey)

	if (cachedSession) {
		return cachedSession.key
	}

	const loginOptions: IHttpRequestOptions = {
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
	}

	const { result } = await this.helpers.httpRequest(loginOptions)

	if (!result?.[1] || !result?.[0]) {
		throw new NodeApiError(
			this.getNode(),
			{ message: 'Authentication failed' },
			{
				message: 'delight API Authentication failed',
				description: 'Invalid username or password.'
			}
		)
	}

	const newSessionKey = result[0] as string

	const authInfo = result[2] as IDataObject | undefined
	if (authInfo && !authInfo.auth) {
		throw new NodeApiError(
			this.getNode(),
			{ message: '2FA Not Supported' },
			{
				message: 'Two-Factor Authentication Not Supported',
				description:
					'This account has 2FA enabled, which is not supported by this n8n credential. Please use an account without 2FA.'
			}
		)
	}

	sessionCache.set(cacheKey, {
		key: newSessionKey,
		timestamp: Date.now()
	})

	return newSessionKey
}

function validateApiResponse(node: INode, response: DelightApiResult): boolean {
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

	return true
}

export async function delightApiRequest<T = IDataObject>(
	context: ThisContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: FormData | GenericValue | GenericValue[] | Buffer | URLSearchParams,
	qs: IDataObject = {}
): Promise<T> {
	const credentials = await context.getCredentials('delightApi')
	const baseUrl = (credentials.restApiUrl as string).replace(/\/$/, '')

	const makeRequest = async (forceRefresh: boolean): Promise<T> => {
		const sessionKey = await getSessionKey.call(context, forceRefresh)

		const options: IHttpRequestOptions = {
			method,
			url: `${baseUrl}${endpoint}`,
			headers: {
				SESSIONKEY: sessionKey
			},
			body,
			qs,
			json: true
		}

		try {
			const response = await context.helpers.httpRequest(options)
			validateApiResponse(context.getNode(), response)

			return response.result[1]
		} catch (error) {
			const errorData = error?.response?.data

			const statusCode = error?.response?.status || error?.httpCode || errorData?.errorCode

			if (!forceRefresh && statusCode === 401) {
				return await makeRequest(true)
			}

			throw new NodeApiError(context.getNode(), error as JsonObject)
		}
	}

	return makeRequest(false)
}
