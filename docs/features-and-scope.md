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

## Limitations and prerequisites

An n8n installation with the delight community nodes, a reachable delight REST API, and an authorized user are required. Webhooks additionally require notification handler configuration and a reachable receiving endpoint. The reviewed source provides building blocks, rather than a fully configured synchronization with every external system. Current platform compatibility, public availability, and production operation have not been tested.

## Sources

Functionality reviewed on 2026-09-09. Source state and SHA-256 checksums: [source-review.json](source-review.json). This functional reference was transferred from the Core documentation reviewed on the same date; no additional runtime validation was performed.

- [S1] [Record actions](../nodes/Delight/resources/dataset/execute.ts), supplemented by the implementations under `resources/dataset/actions/`.
- [S2] [Document Center upload](../nodes/Delight/resources/documents-center/actions/create.ts).
- [S3] [Linked documents](../nodes/Delight/resources/attachedDocument/execute.ts).
- [S4] [Trigger selection](../nodes/Delight/resources/trigger/fields.ts) and [webhook registration](../nodes/Delight/resources/trigger/webhookMethods.ts).
- [Setup and usage examples](../README.md).
