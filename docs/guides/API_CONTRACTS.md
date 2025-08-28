# DamInspect API Contracts

## Overview

This document defines the API contracts between the DamInspect mobile application and the backend services. All contracts follow RESTful principles and use JSON for data exchange.

## Base Configuration

### Base URL
```
Production: https://api.daminspect.com/v1
Staging: https://api-staging.daminspect.com/v1
Development: http://localhost:3000/v1
```

### Authentication
All requests require authentication using Bearer tokens:
```
Authorization: Bearer <device-token>
```

### Common Headers
```
Content-Type: application/json
Accept: application/json
X-Device-ID: <device-uuid>
X-App-Version: <app-version>
X-Platform: ios|android
```

## API Endpoints

### 1. Inspection Management

#### Create Inspection
```typescript
POST /inspections

Request:
{
  "damId": "string",
  "type": "ROUTINE" | "FERC_PART_12D" | "USACE_PERIODIC" | "POST_EARTHQUAKE" | "POST_FLOOD",
  "scheduledDate": "2024-01-15T08:00:00Z",
  "assignedToId": "string?",
  "purpose": "string?",
  "scope": "string?"
}

Response: 201 Created
{
  "id": "string",
  "inspectionNumber": "2024-DAM-0001",
  "damId": "string",
  "type": "string",
  "status": "DRAFT",
  "scheduledDate": "2024-01-15T08:00:00Z",
  "createdAt": "2024-01-10T10:00:00Z",
  "syncStatus": "SYNCED"
}

Errors:
- 400: Invalid request data
- 401: Unauthorized
- 403: No permission to create inspection
- 404: Dam not found
```

#### Get Inspection
```typescript
GET /inspections/:id

Response: 200 OK
{
  "id": "string",
  "inspectionNumber": "2024-DAM-0001",
  "dam": {
    "id": "string",
    "name": "string",
    "type": "string",
    "location": {
      "lat": number,
      "lon": number
    }
  },
  "type": "string",
  "status": "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "REVIEWED",
  "inspector": {
    "id": "string",
    "name": "string",
    "email": "string"
  },
  "scheduledDate": "2024-01-15T08:00:00Z",
  "inspectedAt": "2024-01-15T09:00:00Z",
  "completedAt": "2024-01-15T12:00:00Z",
  "weatherConditions": {
    "temperature": number,
    "humidity": number,
    "windSpeed": number,
    "visibility": "CLEAR" | "PARTLY_CLOUDY" | "CLOUDY" | "RAIN" | "SNOW",
    "precipitation": boolean
  },
  "overallCondition": "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "CRITICAL",
  "observations": [
    {
      "id": "string",
      "observationNumber": number,
      "category": "string",
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "title": "string",
      "description": "string"
    }
  ],
  "media": [
    {
      "id": "string",
      "type": "PHOTO" | "VIDEO",
      "url": "string",
      "thumbnailUrl": "string",
      "caption": "string"
    }
  ],
  "createdAt": "2024-01-10T10:00:00Z",
  "updatedAt": "2024-01-15T12:00:00Z"
}

Errors:
- 401: Unauthorized
- 403: No permission to view inspection
- 404: Inspection not found
```

#### Update Inspection
```typescript
PUT /inspections/:id

Request:
{
  "status": "IN_PROGRESS" | "COMPLETED",
  "weatherConditions": {
    "temperature": number,
    "humidity": number,
    "windSpeed": number,
    "visibility": "string",
    "precipitation": boolean
  },
  "waterLevel": number?,
  "overallCondition": "string?",
  "summary": "string?",
  "keyFindings": ["string"],
  "recommendations": ["string"],
  "followUpRequired": boolean,
  "followUpDate": "2024-02-15T08:00:00Z"
}

Response: 200 OK
{
  // Same as GET response
}

Errors:
- 400: Invalid request data
- 401: Unauthorized
- 403: No permission to update inspection
- 404: Inspection not found
- 409: Conflict (concurrent modification)
```

#### List Inspections
```typescript
GET /inspections

Query Parameters:
- damId: string (filter by dam)
- type: string (filter by type)
- status: string (filter by status)
- inspectorId: string (filter by inspector)
- startDate: ISO8601 (filter by date range)
- endDate: ISO8601
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- sort: "scheduledDate" | "createdAt" | "inspectionNumber"
- order: "asc" | "desc"

Response: 200 OK
{
  "data": [
    {
      // Inspection summary objects
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

### 2. Observation Management

#### Add Observation
```typescript
POST /inspections/:inspectionId/observations

Request:
{
  "category": "SPILLWAY" | "OUTLET" | "EMBANKMENT" | "FOUNDATION" | "OTHER",
  "subCategory": "string?",
  "component": "string",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "condition": "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "CRITICAL",
  "title": "string",
  "description": "string",
  "location": {
    "lat": number,
    "lon": number,
    "elevation": number?,
    "accuracy": number?
  },
  "locationDescription": "string?",
  "measurements": {
    "type": "string",
    "value": number,
    "unit": "string",
    "instrument": "string?"
  },
  "actionRequired": boolean,
  "actionType": "IMMEDIATE" | "SCHEDULED" | "MONITOR",
  "actionPriority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "actionDeadline": "2024-02-01T08:00:00Z",
  "tags": ["string"]
}

Response: 201 Created
{
  "id": "string",
  "observationNumber": number,
  // ... rest of observation data
}

Errors:
- 400: Invalid request data
- 401: Unauthorized
- 403: Cannot modify completed inspection
- 404: Inspection not found
```

#### Update Observation
```typescript
PUT /observations/:id

Request:
{
  // Same fields as create, all optional
}

Response: 200 OK
{
  // Updated observation data
}
```

### 3. Media Management

#### Upload Media
```typescript
POST /inspections/:inspectionId/media

Request: multipart/form-data
{
  "file": binary,
  "type": "PHOTO" | "VIDEO",
  "observationId": "string?",
  "caption": "string?",
  "location": {
    "lat": number,
    "lon": number
  },
  "capturedAt": "2024-01-15T10:30:00Z"
}

Response: 201 Created
{
  "id": "string",
  "uploadUrl": "string", // Pre-signed S3 URL
  "thumbnailUrl": "string",
  "expiresAt": "2024-01-15T11:30:00Z"
}

Errors:
- 400: Invalid file type or size
- 401: Unauthorized
- 413: File too large (max 100MB)
```

#### Get Upload URL
```typescript
POST /media/upload-url

Request:
{
  "fileName": "string",
  "fileType": "image/jpeg" | "image/png" | "video/mp4",
  "fileSize": number
}

Response: 200 OK
{
  "uploadUrl": "string", // Pre-signed S3 URL
  "uploadId": "string",
  "expiresAt": "2024-01-15T11:00:00Z"
}
```

### 4. Synchronization

#### Sync Batch
```typescript
POST /sync/batch

Request:
{
  "operations": [
    {
      "id": "string", // Client-side ID
      "type": "CREATE" | "UPDATE" | "DELETE",
      "entity": "inspection" | "observation" | "media",
      "data": object,
      "timestamp": "2024-01-15T10:00:00Z",
      "version": number
    }
  ],
  "lastSyncTimestamp": "2024-01-15T09:00:00Z"
}

Response: 200 OK
{
  "results": [
    {
      "clientId": "string",
      "serverId": "string",
      "status": "SUCCESS" | "CONFLICT" | "ERROR",
      "error": "string?",
      "conflictResolution": {
        "strategy": "CLIENT_WINS" | "SERVER_WINS" | "MERGE",
        "mergedData": object?
      }
    }
  ],
  "serverChanges": [
    {
      "id": "string",
      "type": "CREATE" | "UPDATE" | "DELETE",
      "entity": "string",
      "data": object,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "syncTimestamp": "2024-01-15T10:30:00Z"
}

Errors:
- 400: Invalid sync data
- 401: Unauthorized
- 409: Sync conflict requiring manual resolution
```

#### Get Sync Status
```typescript
GET /sync/status

Response: 200 OK
{
  "lastSyncTimestamp": "2024-01-15T10:30:00Z",
  "pendingUploads": number,
  "pendingDownloads": number,
  "conflicts": number,
  "syncEnabled": boolean
}
```

### 5. Reference Data

#### Get Dam List
```typescript
GET /dams

Query Parameters:
- organizationId: string
- search: string (search by name)
- type: string (filter by dam type)
- page: number
- limit: number

Response: 200 OK
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "type": "EARTH" | "CONCRETE" | "ROCKFILL" | "OTHER",
      "location": {
        "lat": number,
        "lon": number
      },
      "regulatoryAgency": "FERC" | "USACE" | "STATE" | "OTHER",
      "lastInspectionDate": "2023-12-01T00:00:00Z",
      "nextInspectionDue": "2024-06-01T00:00:00Z"
    }
  ],
  "pagination": {
    // Standard pagination
  }
}
```

#### Get Inspection Templates
```typescript
GET /templates/inspections

Query Parameters:
- type: string (filter by inspection type)
- organizationId: string

Response: 200 OK
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "sections": [
        {
          "id": "string",
          "name": "string",
          "order": number,
          "fields": [
            {
              "id": "string",
              "name": "string",
              "type": "TEXT" | "NUMBER" | "SELECT" | "MULTISELECT" | "DATE" | "PHOTO",
              "required": boolean,
              "options": ["string"]?,
              "validation": object?
            }
          ]
        }
      ]
    }
  ]
}
```

## WebSocket Events

### Connection
```typescript
ws://api.daminspect.com/v1/ws

Authentication:
{
  "type": "AUTH",
  "token": "Bearer <device-token>"
}
```

### Events

#### Sync Progress
```typescript
Server → Client:
{
  "type": "SYNC_PROGRESS",
  "data": {
    "operation": "UPLOAD" | "DOWNLOAD",
    "entity": "string",
    "current": number,
    "total": number,
    "percentage": number
  }
}
```

#### Inspection Updated
```typescript
Server → Client:
{
  "type": "INSPECTION_UPDATED",
  "data": {
    "inspectionId": "string",
    "updatedBy": "string",
    "updatedAt": "2024-01-15T10:30:00Z",
    "changes": ["status", "observations"]
  }
}
```

#### Conflict Detected
```typescript
Server → Client:
{
  "type": "CONFLICT_DETECTED",
  "data": {
    "entity": "string",
    "entityId": "string",
    "localVersion": object,
    "serverVersion": object,
    "conflictId": "string"
  }
}
```

## Error Response Format

All error responses follow this format:
```typescript
{
  "error": {
    "code": "string", // e.g., "VALIDATION_ERROR", "NOT_FOUND"
    "message": "string", // Human-readable message
    "details": object?, // Additional error details
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "string" // For debugging
  }
}
```

## Rate Limiting

API implements rate limiting:
- 1000 requests per hour per device
- 100 requests per minute for sync operations
- Headers included in response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Versioning

API uses URL versioning:
- Current version: v1
- Deprecated versions supported for 6 months
- Breaking changes require new version
- Non-breaking changes added to current version

## Security

### Encryption
- All traffic over HTTPS/WSS
- TLS 1.3 minimum
- Certificate pinning on mobile apps

### Authentication
- Device tokens expire after 90 days
- Refresh tokens provided for seamless re-authentication
- Biometric authentication required for sensitive operations

### Data Privacy
- PII encrypted at rest
- GDPR compliant data handling
- Audit logs for all data access

## Performance SLAs

- API response time: < 200ms (p95)
- Upload bandwidth: Support 10 Mbps
- Sync operation: < 5 seconds for typical batch
- WebSocket latency: < 100ms 