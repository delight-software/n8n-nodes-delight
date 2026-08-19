# n8n-nodes-delight

This is an n8n community node. It lets you use **delight CRM** in your n8n workflows.

delight CRM is a business software platform by delight GmbH that provides flexible, all-in-one business solutions including CRM datasets, document management, and event-driven data handling.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  
[Version history](#version-history)

---

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

After installation:

1. Restart n8n if required by your setup.
2. Create a credential of type **delight API** (see [Credentials](#credentials)).
3. Add the **Delight Actions**, **Delight Polling Trigger**, or **Delight Webhook Trigger** node to a workflow.

## Operations

The package includes three node types:

- **Delight Actions**: read, create, update, and delete CRM records; upload documents to the document center inbox or to specific records.
- **Delight Polling Trigger**: poll for new or updated records on a schedule.
- **Delight Webhook Trigger**: receive instant webhook events for record changes.

### Delight Actions

#### Dataset

| Operation        | Description                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------- |
| Create           | Create a new record in a selected dataset schema.                                            |
| Create or Update | Create a record or update an existing matching record based on selected fields.              |
| Delete           | Delete a record by its `globalrecuid`.                                                       |
| Get              | Retrieve a single record by ID.                                                              |
| Get Many         | Query multiple records with optional filters, return fields, and limit/return-all behaviour. |
| Update           | Update selected fields on an existing record by ID.                                          |

Dataset operations require selecting a schema. The node loads available schemas and fields dynamically from the delight API. For **Get Many**, the node supports grouped filter conditions with logical operators (`AND` / `OR`), comparisons (`=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`), and optional result limiting.

#### Document Center Inbox

| Operation       | Description                                                        |
| --------------- | ------------------------------------------------------------------ |
| Upload Document | Upload an email or binary document to the delight Document Center. |

When uploading an email, the node normalises incoming n8n email payloads and sends them as `.eml` documents. Supports reply/archive processing, auto-assignment by sender, and configurable metadata (display name, origin, document class, message type).

#### Attached Document

| Operation | Description                                                    |
| --------- | -------------------------------------------------------------- |
| Upload    | Upload documents and attach them to a specific CRM record.     |
| Download  | Download documents that are attached to a specific CRM record. |

The Attached Document resource allows you to manage documents linked to individual records within a dataset. Upload documents to attach them to existing records, or download documents already attached to records.

### Delight Polling Trigger

| Supported events   |
| ------------------ |
| New Record Created |
| Record Updated     |

n8n checks a selected schema for new or updated records on the configured schedule.

### Delight Webhook Trigger

| Supported events   |
| ------------------ |
| New Record Created |
| Record Updated     |
| Record Deleted     |

delight pushes events to n8n instantly. The trigger registers an HTTP endpoint with the delight notification handler and cleans it up when the workflow is deactivated.

## Credentials

The node uses a credential of type **delight API**.

### Fields

| Field        | Required | Description                                |
| ------------ | -------- | ------------------------------------------ |
| REST API URL | Yes      | Base URL of the delight REST API.          |
| Username     | Yes      | delight CRM username used to authenticate. |
| Password     | Yes      | Password for the delight CRM user.         |

### Where to find these values

- **REST API URL**: provided by your delight administrator; typically your tenant-specific API base URL.
- **Username / Password**: your delight CRM user account credentials.

### Authentication behaviour

The node authenticates by calling the delight login endpoint and caches the returned session key. All subsequent API calls send this key in the `SESSIONKEY` request header. The credential test validates authentication against the delight login endpoint before the credential is saved.

## Compatibility

Tested against **n8n 1.x**. The node targets `n8nNodesApiVersion: 1` and runs in strict mode.

No minimum n8n version beyond the 1.x line is known to be required. If you encounter compatibility issues with a specific version, please open an issue in the repository.

## Usage

1. Add the **Delight Actions** node or one of the trigger nodes to a workflow.
2. Select or create a **delight API** credential.
3. For Delight Actions: choose a resource and operation.
4. Select the relevant dataset schema or document settings.
5. Map values using the field mapper or n8n expressions.

### Example: trigger a workflow on new CRM records

1. **Delight Webhook Trigger** → Event: New Record Created, Schema: select schema
2. Process or route the record data in subsequent nodes.

### Example: query and write back to a dataset

1. Any trigger (Schedule, Webhook, etc.)
2. **Delight Actions** → Dataset → Get Many → apply filters
3. Transform data in n8n
4. **Delight Actions** → Dataset → Create or Update → write results back

### Example: archive incoming emails to the Document Center Inbox

1. **Gmail** / **IMAP Email Trigger** / **Microsoft Outlook** node
2. **Delight Actions** → Document Center Inbox → Upload Document → Document Class: Email, Message Type: Automatic

The Document Center Inbox operation normalises the email payload from any supported source node automatically.

### Example: attach a document to a CRM record

1. **File trigger** or **HTTP request** to receive a document
2. **Delight Actions** → Attached Document → Upload → select schema, provide record ID
3. Map the file content to the upload operation

The attached document will be linked to the specified CRM record.

## Resources

- [delight GmbH](https://www.delight.ch/)
- [delight knowledge base](https://delight.ch/delight-knowledge-base/#/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [n8n documentation](https://docs.n8n.io/)

## Version history

See [CHANGELOG.md](CHANGELOG.md)
