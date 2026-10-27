import { dlbModules } from './modules'

// Maps schemas supporting document operations to their standard delight CRM module UIDs.
// Multiple schemas can belong to the same module.
export const SCHEMA_MODULE_UIDS_WITH_DOCUMENTS: Record<string, string> = {
	'@table:nwm_products': dlbModules.POLICY,
	'@table:nwm_claims': dlbModules.POLICY,
	'@table:crm_actions': dlbModules.CRM_ACTION,
	'@table:article_article': dlbModules.ARTICLES
}

export const SCHEMAS_WITH_DOCUMENTS = Object.keys(SCHEMA_MODULE_UIDS_WITH_DOCUMENTS)
