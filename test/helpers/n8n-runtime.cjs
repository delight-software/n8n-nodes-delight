const { createHash } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const { readFile, writeFile } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const workflow = require('n8n-workflow')

// Execute the unmodified modules shipped with n8n 2.44.5, with storage and transport
// replaced at their service boundaries. No n8n server, database, or native add-ons
// are needed. First use downloads the integrity-pinned npm archives to the OS temp dir.
const packages = {
	cli: {
		name: 'n8n',
		version: '2.44.5',
		integrity:
			'Rse1fjEC67obii8adys9mQDodzdvgWjoZvSCXjeMnXfaqYQlsvx0FpJwceY2Tp1OO/GL7T0RJ9ua7uUDOJ4AyQ=='
	},
	core: {
		name: 'n8n-core',
		version: '2.44.3',
		integrity:
			'AkYwBTHb418AzE6Hoza/BO+rRog5vKwjXdBcIq1uOc6xo9zMO3hWrn7K3WHRyknqDKKc1S9hy/dY0RNolSm4vA=='
	}
}

async function prepareArchive({ name, version, integrity }) {
	const path = join(tmpdir(), `delight-${name}-${version}.tgz`)
	let bytes
	let downloaded = false
	try {
		bytes = await readFile(path)
	} catch (error) {
		if (error.code !== 'ENOENT') throw error
		const response = await fetch(`https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`)
		if (!response.ok) throw new Error(`Unable to download ${name}@${version}: ${response.status}`)
		bytes = Buffer.from(await response.arrayBuffer())
		downloaded = true
	}
	if (createHash('sha512').update(bytes).digest('base64') !== integrity) {
		throw new Error(`Integrity mismatch for ${name}@${version}`)
	}
	if (downloaded) await writeFile(path, bytes)
	return path
}

function loadModule(archive, entry, imports) {
	const source = execFileSync('tar', ['-xOzf', archive, `package/dist/${entry}.js`], {
		encoding: 'utf8',
		maxBuffer: 8 * 1024 * 1024
	})
	const module = { exports: {} }
	new Function('require', 'module', 'exports', source)(
		(name) => {
			if (Object.hasOwn(imports, name)) return imports[name]
			throw new Error(`Unconfigured n8n test import: ${name}`)
		},
		module,
		module.exports
	)
	return module.exports
}

async function prepareN8nRuntime() {
	const [cli, core] = await Promise.all(Object.values(packages).map(prepareArchive))
	const { CredentialsHelper } = loadModule(cli, 'credentials-helper', {
		'n8n-workflow': workflow,
		'@n8n/di': { Service: () => (target) => target },
		'./credentials/mock-node-types': { createMockNodeTypes: () => ({ nodeTypes: {} }) },
		...Object.fromEntries(
			[
				'@n8n/api-types',
				'@n8n/backend-common',
				'@n8n/db',
				'n8n-core',
				'./credential-types',
				'./credentials-overwrites',
				'./oauth/dcr-managed-fields',
				'./modules/external-secrets.ee/external-secrets.config',
				'./policy/policy-enforcement.service',
				'./services/ai-gateway.service',
				'./credentials/dynamic-credentials-proxy',
				'./errors/credential-missing-id.error',
				'./errors/credential-not-found.error',
				'./errors/unsupported-end-user-credential-trigger.error'
			].map((name) => [name, {}])
		)
	})
	const helperPath = 'execution-engine/node-execution-context/utils/request-helpers'
	const oauth = loadModule(core, `${helperPath}/oauth`, {
		'n8n-workflow': workflow,
		'@n8n/backend-common': { SingleFlightLease: class {} },
		'@n8n/backend-network': require('@n8n/backend-network'),
		'@n8n/client-oauth2': {},
		'@n8n/di': {},
		'@n8n/utils/is-record': require('@n8n/utils/is-record'),
		crypto: require('node:crypto'),
		stream: require('node:stream'),
		'lodash/get': require('lodash/get'),
		'oauth-1.0a': {}
	})
	return {
		CredentialsHelper,
		createRequestHelper(transport) {
			return loadModule(core, `${helperPath}/authentication`, {
				'n8n-workflow': workflow,
				'@n8n/backend-network': {
					OutboundHttp: class {},
					removeEmptyBody: require('@n8n/backend-network').removeEmptyBody
				},
				'@n8n/di': {
					Container: { get: () => ({ requests: () => ({ request: transport }) }) }
				},
				'../../../../execution-engine/eval-mock-helpers': {},
				'./legacy-request-adapter': {},
				'./oauth': oauth
			}).httpRequestWithAuthentication
		}
	}
}

module.exports = { prepareN8nRuntime }
