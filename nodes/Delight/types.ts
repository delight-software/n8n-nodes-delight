import { IDataObject, JsonObject } from 'n8n-workflow'

type DelightSchemaFieldType =
	'String' | 'Integer' | 'Float' | 'DateTime' | 'Date' | 'Memo' | 'Image' | 'AutoInc' | 'Blob'

interface DelightApiError extends JsonObject {
	class: string
	message: string
}

interface DelightRecordsetInfo {
	recordcount: number
}

export interface DelightSchemaField {
	name: string
	title: string
	type: DelightSchemaFieldType
	style?: string
	length?: number
	lookupschema?: string
}

export interface DelightSchema {
	name: string
	title: string
	lookupfields: string
	metaid: number
	fields?: DelightSchemaField[]
}

export type DelightApiResult<T = IDataObject> =
	{ result: [true, T] } | { result: [false, T & { error: DelightApiError }] }

export interface DelightQueryRecordsPayload extends IDataObject {
	records: JsonObject[]
	recordset_info: DelightRecordsetInfo
}

export type DelightQueryRecordsResponse = DelightApiResult<DelightQueryRecordsPayload>

export interface DelightQuerySchemasPayload extends IDataObject {
	schemas: DelightSchema[]
}

export type DelightQuerySchemasResponse = DelightApiResult<DelightQuerySchemasPayload>

export interface DelightAddRecordInfo {
	server_uid: string
	server_dbid: number
}

export interface DelightAddRecordsPayload extends IDataObject {
	record_info: DelightAddRecordInfo[]
}

export type DelightAddRecordsResponse = DelightApiResult<DelightAddRecordsPayload>

export interface DelightUpdateRecordInfo {
	result: boolean
}

export interface DelightUpdateRecordsPayload extends IDataObject {
	record_info: DelightUpdateRecordInfo[]
}

export type DelightUpdateRecordsResponse = DelightApiResult<DelightUpdateRecordsPayload>

export interface DelightDeleteResultInfo {
	affectedcount: number
}

export interface DelightDeleteRecordsPayload extends IDataObject {
	result_info: DelightDeleteResultInfo
}

export type DelightDeleteRecordsResponse = DelightApiResult<DelightDeleteRecordsPayload>

export interface DelightQueryRecordResourceListPayload extends IDataObject {
	documents?: JsonObject[]
	directories?: JsonObject[]
}
