# n8n

## Maintenance and ownership

This file is the authoritative functional reference for n8n. Features, limitations, and technical evidence are maintained here alongside relevant source changes. Documentation and recorded information do not demonstrate production runtime validation.

The [central website overview](../../../core/docs/website-modules/modules/n8n.md) derives an editorial summary from this reference under the stable ID `n8n`. Core manages categories and shared website identities. A local update does not publish a website or change license assignments.

When making changes, first update this reference and the source state actually reviewed in `source-review.json`. Then reconcile the affected central website overview or explicitly record the pending handoff. Review source changes selectively; do not refresh checksums without reviewing the relevant functionality.

## Purpose

The n8n integration connects delight data and documents with configurable automation workflows in n8n. It is intended for companies that want to process data across delight and other services.

## Features

- Read, query with filters, create, update, and delete records; use comparison fields to identify existing records and create or update them. [S1]
- Upload emails and files to the Document Center inbox, with options for replies and automatic assignment. [S2]
- Attach documents to a specific record and download documents that are already linked. [S3]
- Trigger workflows through scheduled polling for new or updated records. Webhook triggers support creation, updates, and deletion. [S4]

## Workflow and interaction

After installing the community nodes, configure delight API access and the schema. A trigger or another n8n step supplies data; the action reads or writes the corresponding delight records or documents. Other services and field mappings are configured in the individual workflow. [S1–S4]

Authentication uses the existing `delightApi` credential with REST API URL, username, and password. n8n stores a hidden, sensitive session key in the credential and sends it in the `SESSIONKEY` header. The nodes require a fresh login when any of those three inputs changes. n8n handles HTTP 401 with one session refresh and one retry; the package adds neither a retry loop nor a session TTL. Existing credential types and workflow parameters are retained. [S5]

## Limitations and prerequisites

An n8n installation with the delight community nodes, a reachable delight REST API, and an authorized user are required. Webhooks additionally require notification handler configuration and a reachable receiving endpoint. The reviewed source provides building blocks, rather than a fully configured synchronization with every external system. Current platform compatibility, public availability, and production operation have not been tested.

The authentication migration targets n8n 2.44.5; n8n 1.x compatibility is no longer a target. The credential test performs the full login and an authenticated schema query, which requires schema-query permission. Accounts requiring two-factor authentication are rejected. Concurrent login attempts are not synchronized: the product owner confirmed that Delight returns an existing valid session for the same user and does not invalidate earlier sessions. The product owner also confirmed HTTP 401 for invalid or expired sessions; these server behaviors have not been independently exercised against a live Delight API in this review. [S5]

## Sources

Functionality reviewed on 2026-09-09. Source state and SHA-256 checksums: [source-review.json](source-review.json). This functional reference was transferred from the Core documentation reviewed on the same date; no additional runtime validation was performed.

Authentication-only review on 2026-10-21: reviewed the credential, shared API wrapper, configuration fingerprint, and affected entry points. Automated tests exercise the authentication modules shipped with n8n 2.44.5 against simulated storage and transport, including operations, load options/resource mapping, polling, webhook registration/cleanup, and incoming webhook handling. This does not establish live Delight API, full n8n editor, deployment, or production validation. The earlier review dates for other capabilities remain unchanged.

Website handoff: reconciliation of authentication prerequisites and the n8n version target in the central overview is pending. Preserve stable ID `n8n`; no website publication or product/edition assignment change is authorized by this update.

- [S1] [Record actions](../nodes/Delight/resources/dataset/execute.ts), supplemented by the implementations under `resources/dataset/actions/`.
- [S2] [Document Center upload](../nodes/Delight/resources/documents-center/actions/create.ts).
- [S3] [Linked documents](../nodes/Delight/resources/attachedDocument/execute.ts).
- [S4] [Trigger selection](../nodes/Delight/resources/trigger/fields.ts) and [webhook registration](../nodes/Delight/resources/trigger/webhookMethods.ts).
- [S5] [Credential login and authentication](../credentials/DelightApi.credentials.ts), [shared API requests](../nodes/Delight/api/delightApi.ts), [session configuration binding](../nodes/Delight/api/sessionConfiguration.ts), and [authentication regression tests](../test/authentication.test.cjs).
- [Setup and usage examples](../README.md).
