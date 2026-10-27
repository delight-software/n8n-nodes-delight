import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
	JsonValue
} from 'n8n-workflow'
import {
	DelightAddRecordsPayload,
	DelightDeleteRecordsPayload,
	DelightDownloadDocumentPayload,
	DelightQueryRecordResourceListPayload,
	DelightQueryRecordsPayload,
	DelightQuerySchemasPayload,
	DelightSchema,
	DelightSchemaField,
	DelightUpdateRecordsPayload
} from '../types'
import { delightApiRequest } from './delightApi'
import { FORBIDDEN_NAMES, FORBIDDEN_TYPES } from '../constants/forbiddenFields'

type ThisContext = ILoadOptionsFunctions | IExecuteFunctions | IPollFunctions | IHookFunctions

export async function getSchemas(
	this: ThisContext,
	schemaNames: string[],
	includeFields: boolean = true
): Promise<DelightSchema[]> {
	const credentials = await this.getCredentials('delightApi')
	const language = credentials.labelLanguage || 'english'
	const response = await delightApiRequest<DelightQuerySchemasPayload>(
		this,
		'POST',
		'/database/schema/QuerySchemas',
		[schemaNames, includeFields, language]
	)

	return response?.schemas ?? []
}

export async function getSchemaFields(
	this: ThisContext,
	schemaName: string
): Promise<DelightSchemaField[]> {
	const schemas = await getSchemas.call(this, [schemaName], true)
	const schema = schemas.find((s) => s.name === schemaName)

	return schema?.fields ?? []
}

export async function getFilteredSchemaFields(
	this: ThisContext,
	schemaName: string
): Promise<DelightSchemaField[]> {
	const fields = await getSchemaFields.call(this, schemaName)

	return fields.filter(
		(field) => !FORBIDDEN_TYPES.has(field.type) && !FORBIDDEN_NAMES.has(field.name)
	)
}

export async function addRecord(
	this: ThisContext,
	schemaName: string,
	fieldValues: JsonObject[],
	fieldKeys: JsonValue[]
): Promise<DelightAddRecordsPayload> {
	return await delightApiRequest<DelightAddRecordsPayload>(
		this,
		'POST',
		'/database/table/AddRecord',
		[schemaName, fieldValues, fieldKeys]
	)
}

export async function updateRecord(
	this: ThisContext,
	schemaName: string,
	guid: string,
	fieldValues: JsonObject,
	fieldKeys: string[]
): Promise<DelightUpdateRecordsPayload> {
	return await delightApiRequest<DelightUpdateRecordsPayload>(
		this,
		'POST',
		'/database/table/UpdateRecord',
		[schemaName, [{ server_uid: guid, ...fieldValues }], fieldKeys]
	)
}

export async function getRecords(
	this: ThisContext,
	schemaName: string,
	filters: unknown[],
	returnFields: unknown[] = [],
	pagination: JsonObject = { start: -1, count: -1 }
): Promise<DelightQueryRecordsPayload> {
	const fieldsToReturn = [...new Set(['globalrecuid', ...returnFields])]
	const body = [schemaName, filters, fieldsToReturn, pagination]

	return await delightApiRequest<DelightQueryRecordsPayload>(
		this,
		'POST',
		'/database/table/QueryRecords',
		body
	)
}

export async function deleteRecord(
	this: ThisContext,
	schemaName: string,
	guid: string
): Promise<DelightDeleteRecordsPayload> {
	const filter = {
		fieldname: 'globalrecuid',
		filtertype: '=',
		value: guid
	}
	const body = [schemaName, [filter]]

	return await delightApiRequest<DelightDeleteRecordsPayload>(
		this,
		'POST',
		'/database/table/DeleteRecords',
		body
	)
}

export async function addDocument(
	this: ThisContext,
	data: JsonObject[]
): Promise<DelightAddRecordsPayload> {
	return await delightApiRequest<DelightAddRecordsPayload>(
		this,
		'POST',
		'/documentscenter/DocumentsInbox/AddDocuments',
		data
	)
}

export async function getRecordResourceList(
	this: ThisContext,
	containerUid: string,
	schemaName: string,
	recordUid: string,
	pagination: JsonObject = { start: -1, count: -1 }
): Promise<DelightQueryRecordResourceListPayload> {
	const body = [containerUid, schemaName, recordUid, [], pagination]

	return await delightApiRequest<DelightQueryRecordResourceListPayload>(
		this,
		'POST',
		'/services/DocumentStore/QueryRecordResourceList',
		body
	)
}

export async function getDocument(
	this: ThisContext,
	documentUid: string,
	format: string
): Promise<DelightDownloadDocumentPayload> {
	const body = [documentUid, { position: -1, size: -1 }, { format }]

	return await delightApiRequest<DelightDownloadDocumentPayload>(
		this,
		'POST',
		'/services/DocumentStore/DownloadDocumentEx',
		body
	)
}
