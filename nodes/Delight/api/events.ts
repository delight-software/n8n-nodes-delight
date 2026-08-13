import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
	JsonValue
} from 'n8n-workflow'
import {
	DelightApiResponse,
	DelightCreateRecordsResponse,
	DelightQueryRecordsResponse,
	DelightSchema,
	DelightSchemaField,
	DelightSchemasResponse
} from '../types'
import { delightApiRequest } from './delightApi'
import { FORBIDDEN_NAMES, FORBIDDEN_TYPES } from '../constants/forbiddenFields'

type ThisContext = ILoadOptionsFunctions | IExecuteFunctions | IPollFunctions | IHookFunctions

export async function getSchemas(
	this: ThisContext,
	schemaNames: string[],
	includeFields: boolean = true,
	language: string = 'german'
): Promise<DelightSchema[]> {
	const response = (await delightApiRequest.call(this, 'POST', '/database/schema/QuerySchemas', [
		schemaNames,
		includeFields,
		language
	])) as DelightSchemasResponse

	return response?.result?.[1]?.schemas ?? []
}

export async function getSchemaFields(
	this: ThisContext,
	schemaName: string,
	language: string = 'german'
): Promise<DelightSchemaField[]> {
	const schemas = await getSchemas.call(this, [schemaName], true, language)
	const schema = schemas.find((s) => s.name === schemaName)

	return schema?.fields ?? []
}

export async function getFilteredSchemaFields(
	this: ThisContext,
	schemaName: string,
	language: string = 'german'
): Promise<DelightSchemaField[]> {
	const fields = await getSchemaFields.call(this, schemaName, language)

	return fields.filter(
		(field) => !FORBIDDEN_TYPES.has(field.type) && !FORBIDDEN_NAMES.has(field.name)
	)
}

export async function addRecord(
	this: ThisContext,
	schemaName: string,
	fieldValues: JsonObject[],
	fieldKeys: JsonValue[]
): Promise<DelightCreateRecordsResponse> {
	return (await delightApiRequest.call(this, 'POST', '/database/table/AddRecord', [
		schemaName,
		fieldValues,
		fieldKeys
	])) as DelightCreateRecordsResponse
}

export async function updateRecord(
	this: ThisContext,
	schemaName: string,
	guid: string,
	fieldValues: JsonObject,
	fieldKeys: string[]
): Promise<DelightCreateRecordsResponse> {
	return (await delightApiRequest.call(this, 'POST', '/database/table/UpdateRecord', [
		schemaName,
		[{ server_uid: guid, ...fieldValues }],
		fieldKeys
	])) as DelightCreateRecordsResponse
}

export async function getRecords(
	this: ThisContext,
	schemaName: string,
	filters: unknown[],
	returnFields: unknown[] = [],
	pagination: JsonObject = { start: -1, count: -1 }
): Promise<DelightQueryRecordsResponse> {
	const fieldsToReturn = [...new Set(['globalrecuid', ...returnFields])]
	const body = [schemaName, filters, fieldsToReturn, pagination]

	return (await delightApiRequest.call(
		this,
		'POST',
		`/database/table/QueryRecords`,
		body
	)) as DelightQueryRecordsResponse
}

export async function deleteRecord(
	this: ThisContext,
	schemaName: string,
	guid: string
): Promise<DelightQueryRecordsResponse> {
	const filter = {
		fieldname: 'globalrecuid',
		filtertype: '=',
		value: guid
	}
	const body = [schemaName, [filter]]

	return (await delightApiRequest.call(
		this,
		'POST',
		`/database/table/DeleteRecords`,
		body
	)) as DelightQueryRecordsResponse
}

export async function addDocument(
	this: ThisContext,
	data: JsonObject[]
): Promise<DelightApiResponse> {
	return (await delightApiRequest.call(
		this,
		'POST',
		'/documentscenter/DocumentsInbox/AddDocuments',
		data
	)) as DelightApiResponse
}
