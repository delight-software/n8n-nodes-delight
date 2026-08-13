import { IDataObject, JsonObject } from 'n8n-workflow'

type DelightSchemaFieldType =
	| 'String'
	| 'Integer'
	| 'Float'
	| 'DateTime'
	| 'Date'
	| 'Memo'
	| 'Image'
	| 'AutoInc'
	| 'Blob'

interface DelightApiError extends JsonObject {
	class: string
	message: string
}

interface DelightRecordsetInfo {
	recordcount: number
}

interface DelightRecordInfo {
	remote_uid: string
	server_uid: string
	server_dbid: number
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

export interface DelightQueryRecordsPayload extends IDataObject {
	records: JsonObject[]
	recordset_info: DelightRecordsetInfo
}

export interface DelightSchemasPayload extends IDataObject {
	schemas: DelightSchema[]
}

export type DelightApiResponse<T = IDataObject> =
	| { result: [true, T] }
	| { result: [false, T & { error: DelightApiError }] }

export type DelightSchemasResponse = DelightApiResponse<DelightSchemasPayload>
export type DelightQueryRecordsResponse = DelightApiResponse<DelightQueryRecordsPayload>
export type DelightCreateRecordsResponse = DelightApiResponse<{ record_info: DelightRecordInfo[] }>
