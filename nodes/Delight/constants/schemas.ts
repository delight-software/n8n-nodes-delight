interface SchemaConfig {
	uid: string
	supportsDocuments: boolean
}

const SCHEMA_REGISTRY: Record<string, SchemaConfig> = {
	'@table:nwm_products': {
		uid: '{14003704-5069-4B18-AA23-A71F76B231C2}',
		supportsDocuments: true
	},
	'@table:nwm_claims': {
		uid: '{14003704-5069-4B18-AA23-A71F76B231C2}',
		supportsDocuments: true
	},
	'@table:crm_actions': {
		uid: '{A48847CA-33D3-4EB0-A586-E316EA2E5322}',
		supportsDocuments: true
	},
	'@table:article_article': {
		uid: '{28FFFE04-66C0-4F03-BB58-92B5D6F2D78E}',
		supportsDocuments: true
	}
}

export const schemaUidMap = Object.fromEntries(
	Object.entries(SCHEMA_REGISTRY).map(([key, config]) => [key, config.uid])
)

export const SCHEMAS_WITH_DOCUMENTS = Object.keys(SCHEMA_REGISTRY).filter(
	(key) => SCHEMA_REGISTRY[key].supportsDocuments
)

export const SCHEMAS_WITH_DOCUMENTS_SET = new Set(SCHEMAS_WITH_DOCUMENTS)
