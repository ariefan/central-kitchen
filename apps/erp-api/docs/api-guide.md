# Simplified API Design & Response Standard

This document refines the original API Design Guide by **removing Google-specific AIP dependencies** and **unnecessary Python implementation code**, while keeping practical sections like file handling, authentication, and error structures intact.

---

## 1. Core Philosophy

**Goal:** Build predictable, resource-oriented APIs that are easy to maintain, extend, and integrate — without vendor lock-in.

### Principles

- Design around **resources (nouns)**, not verbs.
- Use standard methods: **GET**, **POST**, **PATCH**, **DELETE**.
- Responses must be **consistent**, **self-descriptive**, and **versioned** (`/v1/` prefix).
- Maintain **stability**: non-breaking changes within major versions.
- Keep APIs **framework-agnostic** (no Google-specific or gRPC syntax).

---

## 2. Resource Structure

Each resource should:

- Have a **unique name**: `/v1/users/{id}`
- Include standard fields: `id`, `createTime`, `updateTime`, `etag`, and `state`.
- Support CRUD with consistent HTTP verbs.

**Example:**

```json
{
  "id": "user-123",
  "displayName": "Jane Doe",
  "email": "jane@example.com",
  "createTime": "2025-01-15T10:30:00Z",
  "updateTime": "2025-01-15T10:35:00Z",
  "etag": "\"abc123\"",
  "state": "ACTIVE"
}
```

---

## 3. Standard Methods

| Operation | Method | Endpoint                    | Description              |
| --------- | ------ | --------------------------- | ------------------------ |
| List      | GET    | `/v1/users?page=1&limit=50` | Get paginated list       |
| Get       | GET    | `/v1/users/{id}`            | Retrieve a single record |
| Create    | POST   | `/v1/users`                 | Create new record        |
| Update    | PATCH  | `/v1/users/{id}`            | Update fields partially  |
| Delete    | DELETE | `/v1/users/{id}`            | Remove a resource        |

---

## 4. Unified Response Format

Every response should follow a unified structure for clarity.

```json
{
  "ok": true,
  "message": "User fetched successfully.",
  "data": {},
  "error": null,
  "meta": {
    "request_id": "uuid-or-snowflake",
    "timestamp": "2025-11-02T09:30:00Z",
    "duration_ms": 12
  },
  "pagination": null
}
```

### Fields

- **ok**: Boolean indicating success/failure.
- **message**: Optional human-readable text.
- **data**: Payload (object, array, or null).
- **error**: Null or structured error.
- **meta**: Request metadata (ID, timestamp, duration, etc.).
- **pagination**: Included for list endpoints.

---

## 5. Error Format

Consistent, structured error format for all endpoints.

```json
{
  "ok": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid payload",
    "fields": {
      "email": ["Invalid email format"]
    }
  },
  "meta": { "request_id": "abc123", "timestamp": "2025-11-02T09:30:00Z" }
}
```

### Common Error Codes

| Code               | HTTP | Description              |
| ------------------ | ---- | ------------------------ |
| `BAD_REQUEST`      | 400  | Malformed request        |
| `UNAUTHORIZED`     | 401  | Missing or invalid token |
| `FORBIDDEN`        | 403  | No permission            |
| `NOT_FOUND`        | 404  | Resource not found       |
| `CONFLICT`         | 409  | Resource already exists  |
| `VALIDATION_ERROR` | 422  | Field validation failed  |
| `RATE_LIMITED`     | 429  | Too many requests        |
| `INTERNAL_ERROR`   | 500  | Server error             |

---

## 6. Pagination

### Page-based

```json
"pagination": {
  "page": 1,
  "per_page": 20,
  "total": 87,
  "total_pages": 5
}
```

### Cursor-based

```json
"pagination": {
  "next_cursor": "eyJpZCI6Ijk5OTkifQ==",
  "has_next": true
}
```

---

## 7. File Handling

Files are treated as resources with metadata and binary content.

### File Resource Example

```json
{
  "id": "file-123",
  "displayName": "invoice.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 204800,
  "owner": "user-456",
  "createTime": "2025-01-15T10:30:00Z",
  "updateTime": "2025-01-15T10:35:00Z"
}
```

### Endpoints

| Operation       | Method | Endpoint                  |
| --------------- | ------ | ------------------------- |
| Upload          | POST   | `/v1/files`               |
| Get Metadata    | GET    | `/v1/files/{id}`          |
| Download        | GET    | `/v1/files/{id}:download` |
| Update Metadata | PATCH  | `/v1/files/{id}`          |
| Delete          | DELETE | `/v1/files/{id}`          |

### Validation

```json
{
  "allowedMimeTypes": ["image/jpeg", "image/png", "application/pdf"],
  "maxSizeBytes": 10485760
}
```

### Access Control

```json
{
  "visibility": "private",
  "allowedUsers": ["user-123"],
  "downloadRequiresAuth": true
}
```

---

## 8. Authentication & Authorization

- **Bearer Tokens (OAuth2)**

```http
Authorization: Bearer <token>
```

- **API Keys**

```http
X-API-Key: <key>
```

- **Role-based Access (RBAC)**

```json
{
  "policy": {
    "bindings": [
      { "role": "admin", "members": ["user:admin@example.com"] },
      { "role": "viewer", "members": ["user:user@example.com"] }
    ]
  }
}
```

---

## 9. Rate Limiting

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 742
X-RateLimit-Reset: 1642248000
Retry-After: 60
```

**Response Example:**

```json
{
  "ok": false,
  "message": "Rate limit exceeded",
  "error": {
    "code": "RATE_LIMITED",
    "message": "1000 requests/hour limit exceeded"
  }
}
```

---

## 10. Audit & Compliance

### Audit Event Example

```json
{
  "id": "audit-123",
  "timestamp": "2025-01-15T10:30:00Z",
  "actor": { "id": "user-456", "ip": "192.168.1.10" },
  "resource": { "type": "user", "id": "user-789" },
  "action": "UPDATE",
  "changes": {
    "before": { "displayName": "Jane Old" },
    "after": { "displayName": "Jane New" }
  }
}
```

---

## 11. Implementation Rules

- **Timestamps:** RFC 3339 UTC format.
- **IDs:** Always strings (UUID or slug).
- **Money:** Integer minor units (e.g. 25000 for IDR).
- **Empty values:** Use `[]` or `{}`, never `null` unless truly empty.
- **Versioning:** Prefix all routes with `/v{major}`.

---

## 12. Goals Summary

✅ No Google AIP dependency
✅ No unrelated code (Python, gRPC, protobuf)
✅ File handling & validation retained
✅ Practical for REST & OpenAPI usage
✅ Consistent, minimal, and production-ready

---

## 13. File Handling (Normative)

**Goal:** Treat files as first‑class resources with clear metadata, safe uploads, and predictable downloads — without any vendor voodoo.

### 13.1 Resource Schema (JSON)

```json
{
  "id": "file-123",
  "displayName": "invoice.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 204800,
  "checksum": "sha256:6ab4…",
  "ownerId": "user-456",
  "visibility": "private", // private | public | restricted
  "tags": ["project", "documentation"],
  "metadata": { "description": "Important doc" },
  "createTime": "2025-01-15T10:30:00Z",
  "updateTime": "2025-01-15T10:35:00Z",
  "etag": "\"fi_etag\""
}
```

### 13.2 Endpoints

| Operation                  | Method     | Endpoint                             | Notes                                                               |
| -------------------------- | ---------- | ------------------------------------ | ------------------------------------------------------------------- |
| Upload (multipart)         | **POST**   | `/v1/files`                          | `multipart/form-data` with `file` and optional `metadata` JSON part |
| Upload (chunked, optional) | **POST**   | `/v1/files:beginUpload`              | Returns upload URL & token for chunked PUTs                         |
| Get metadata               | **GET**    | `/v1/files/{id}`                     | Returns File resource in `data`                                     |
| Download                   | **GET**    | `/v1/files/{id}:download`            | Binary response; supports `Range`, `If-None-Match`                  |
| Update metadata            | **PATCH**  | `/v1/files/{id}`                     | Partial update of `displayName`, `visibility`, `tags`, `metadata`   |
| Delete                     | **DELETE** | `/v1/files/{id}`                     | 204 No Content                                                      |
| Generate temp URL          | **POST**   | `/v1/files/{id}:generateDownloadUrl` | Returns signed URL + expiry (if you use CDN)                        |

### 13.3 OpenAPI (Extract)

```yaml
components:
  schemas:
    File:
      type: object
      required: [id, mimeType, sizeBytes, createTime, updateTime]
      properties:
        id: { type: string }
        displayName: { type: string, maxLength: 255 }
        mimeType: { type: string }
        sizeBytes: { type: integer, minimum: 0 }
        checksum: { type: string, example: "sha256:abcdef..." }
        ownerId: { type: string }
        visibility: { type: string, enum: [private, public, restricted] }
        tags: { type: array, items: { type: string } }
        metadata: { type: object, additionalProperties: true }
        createTime: { type: string, format: date-time }
        updateTime: { type: string, format: date-time }
        etag: { type: string }
    FileCreateMultipart:
      type: object
      properties:
        metadata:
          type: object
          additionalProperties: true
    GenerateDownloadUrlResponse:
      type: object
      required: [downloadUrl, expiresAt]
      properties:
        downloadUrl: { type: string, format: uri }
        expiresAt: { type: string, format: date-time }

  responses:
    OkFileSingle:
      description: OK
      content:
        application/json:
          schema:
            allOf:
              - $ref: "#/components/schemas/ApiResponse"
              - type: object
                properties:
                  data: { $ref: "#/components/schemas/File" }
```

### 13.4 TypeScript Types

```ts
export type FileResource = {
  id: string
  displayName?: string
  mimeType: string
  sizeBytes: number
  checksum?: string // sha256:...
  ownerId?: string
  visibility?: "private" | "public" | "restricted"
  tags?: string[]
  metadata?: Record<string, unknown>
  createTime: string
  updateTime: string
  etag?: string
}

export type GenerateDownloadUrlResponse = {
  downloadUrl: string
  expiresAt: string // ISO time
}
```

### 13.5 Golden Fixtures

**Upload (201)**

```json
{
  "ok": true,
  "message": "File uploaded",
  "data": {
    "id": "file-123",
    "displayName": "avatar.jpg",
    "mimeType": "image/jpeg",
    "sizeBytes": 102400,
    "createTime": "2025-01-15T10:30:00Z",
    "updateTime": "2025-01-15T10:30:00Z"
  },
  "error": null,
  "meta": { "request_id": "req-1", "timestamp": "2025-11-02T09:30:00Z" },
  "pagination": null
}
```

**Download (binary)** → `Content-Type: <mime>`; `ETag` set; `304` if `If-None-Match` matches.

---

## 14. Audit & Compliance (Normative)

**Goal:** Immutable, append-only audit trail covering who did what, when, to which resource — and from where.

### 14.1 AuditLog Resource Schema

```json
{
  "id": "audit-123",
  "timestamp": "2025-01-15T10:30:00Z",
  "requestId": "req-abc",
  "actor": {
    "type": "user",
    "id": "user-456",
    "ip": "192.168.1.10",
    "userAgent": "Chrome/141"
  },
  "resource": { "type": "user", "id": "user-789" },
  "action": "UPDATE", // CREATE | UPDATE | DELETE | RESTORE | LOGIN | LOGOUT | DOWNLOAD | UPLOAD
  "method": "PATCH",
  "endpoint": "/v1/users/user-789",
  "changes": {
    "before": { "displayName": "Jane Old" },
    "after": { "displayName": "Jane New" }
  },
  "metadata": { "severity": "INFO" }
}
```

### 14.2 Endpoints

| Operation            | Method   | Endpoint                                                      | Notes                                        |
| -------------------- | -------- | ------------------------------------------------------------- | -------------------------------------------- |
| List audit events    | **GET**  | `/v1/auditLogs?page=1&per_page=50&filter=actor.id:"user-456"` | Paginated; filterable                        |
| Get one              | **GET**  | `/v1/auditLogs/{id}`                                          | Single audit record                          |
| (Server-only) Append | **POST** | `/v1/auditLogs`                                               | **Not** public; created by server/middleware |

### 14.3 OpenAPI (Extract)

```yaml
components:
  schemas:
    AuditLog:
      type: object
      required: [id, timestamp, action]
      properties:
        id: { type: string }
        timestamp: { type: string, format: date-time }
        requestId: { type: string }
        actor:
          type: object
          properties:
            type: { type: string, enum: [user, service] }
            id: { type: string }
            ip: { type: string }
            userAgent: { type: string }
        resource:
          type: object
          properties:
            type: { type: string }
            id: { type: string }
        action:
          {
            type: string,
            enum:
              [
                CREATE,
                UPDATE,
                DELETE,
                RESTORE,
                LOGIN,
                LOGOUT,
                DOWNLOAD,
                UPLOAD,
              ],
          }
        method: { type: string }
        endpoint: { type: string }
        changes:
          {
            type: object,
            properties: { before: { type: object }, after: { type: object } },
          }
        metadata: { type: object, additionalProperties: true }
  responses:
    OkAuditList:
      description: OK
      content:
        application/json:
          schema:
            allOf:
              - $ref: "#/components/schemas/ApiResponse"
              - type: object
                properties:
                  data:
                    {
                      type: array,
                      items: { $ref: "#/components/schemas/AuditLog" },
                    }
                  pagination: { $ref: "#/components/schemas/PaginationPage" }
```

### 14.4 TypeScript Types

```ts
export type AuditActor = {
  type: "user" | "service"
  id?: string
  ip?: string
  userAgent?: string
}
export type AuditResourceRef = { type: string; id?: string }
export type AuditLog = {
  id: string
  timestamp: string // ISO UTC
  requestId?: string
  actor?: AuditActor
  resource?: AuditResourceRef
  action:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "RESTORE"
    | "LOGIN"
    | "LOGOUT"
    | "DOWNLOAD"
    | "UPLOAD"
  method?: string
  endpoint?: string
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }
  metadata?: Record<string, unknown>
}
```

### 14.5 Golden Fixtures

**List (200)**

```json
{
  "ok": true,
  "message": "Audit logs fetched",
  "data": [
    {
      "id": "audit-1",
      "timestamp": "2025-11-02T09:25:00Z",
      "action": "DOWNLOAD",
      "actor": { "type": "user", "id": "user-456" },
      "resource": { "type": "files", "id": "file-123" },
      "method": "GET",
      "endpoint": "/v1/files/file-123:download"
    }
  ],
  "error": null,
  "meta": { "request_id": "req-9", "timestamp": "2025-11-02T09:30:00Z" },
  "pagination": { "page": 1, "per_page": 50, "total": 1, "total_pages": 1 }
}
```

---

## 15. Agent Conformance Rules (Hard Requirements)

- If `ok:false` ⇒ `data:null` and `error` **must** be present. If `ok:true` ⇒ `error:null`.
- `pagination` **only** when `data` is an array.
- File downloads **must** set `ETag` and support `If-None-Match`.
- Audit events are **append-only**; no updates; deletes only via retention policy.
- Timestamps are RFC 3339 UTC; IDs are strings; empty lists = `[]`, empty objects = `{}`.
