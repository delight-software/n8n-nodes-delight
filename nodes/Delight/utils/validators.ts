import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow'

const GLOBAL_REC_UID_REGEX =
	/^\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}$/

export function isValidGlobalRecUid(value: string): boolean {
	return GLOBAL_REC_UID_REGEX.test(value.trim())
}

export function getValidatedGlobalRecUid(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number
): string {
	const value = context.getNodeParameter(parameterName, itemIndex) as string
	const guid = value.trim()

	if (!isValidGlobalRecUid(guid)) {
		throw new NodeOperationError(
			context.getNode(),
			`Invalid format for "${parameterName}" (Value: "${guid}"). Expected a valid Globalrecuid format like {B74046D1-96A1-41B5-9B52-F8266DE1D6DA}.`,
			{ itemIndex }
		)
	}

	return guid
}
