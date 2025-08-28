# 02 – REST API Specification

## Overview
This document provides complete API specifications for the DamSafety.IO Inspections module, covering both web dashboard and mobile app endpoints. All endpoints follow RESTful conventions and return JSON responses.

## Base URLs
- Production: `https://api.damsafety.io/v1`
- Staging: `https://api-staging.damsafety.io/v1`
- Local Development: `http://localhost:3000/api`

## Authentication

### Web Dashboard
Uses existing JWT session cookies from Azure AD B2C authentication.

```http
Cookie: next-auth.session-token=<jwt-token>
```

### Mobile App (DamInspect)
Uses device-specific bearer tokens with longer expiration.

```http
Authorization: Bearer <device-token>
X-Device-ID: <device-uuid>
X-App-Version: 1.0.0
```

### API Key (Server-to-Server)
For automated imports and integrations.

```http
X-API-Key: <api-key>
X-API-Secret: <api-secret>
```

## Common Headers

### Request Headers
```http
Content-Type: application/json
Accept: application/json
X-Client-Version: 1.0.0
X-Request-ID: <uuid>
```

### Response Headers
```http
X-Request-ID: <uuid>
X-Response-Time: 145ms
X-API-Version: 1.0.0
X-Rate-Limit-Remaining: 4999
X-Rate-Limit-Reset: 1640995200
```

## Error Response Format
All errors follow a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "inspectedAt",
        "message": "Date cannot be in the future"
      }
    ],
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Endpoints

### 1. List Inspections
Retrieve paginated list of inspections for a specific dam with powerful filtering options.

**Endpoint:** `GET /api/dams/:damId/inspections`

**Path Parameters:**
- `damId` (string, required) - Dam ID or NID ID

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number (1-based) |
| pageSize | integer | 20 | Items per page (max 100) |
| status | string[] | - | Filter by status (multiple allowed) |
| type | string[] | - | Filter by inspection type |
| inspectorId | string | - | Filter by inspector user ID |
| dateFrom | ISO 8601 | - | Start date for inspectedAt |
| dateTo | ISO 8601 | - | End date for inspectedAt |
| severity | string[] | - | Filter by max observation severity |
| hasIssues | boolean | - | Only inspections with action items |
| search | string | - | Full-text search in title/summary |
| sortBy | string | inspectedAt | Sort field |
| sortOrder | string | desc | Sort direction (asc/desc) |
| includeArchived | boolean | false | Include archived inspections |

**Example Request:**
```http
GET /api/dams/dam-123/inspections?page=1&pageSize=10&status=APPROVED,IN_REVIEW&dateFrom=2024-01-01
```

**Success Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "insp_abc123",
      "inspectionNumber": "2024-DAM123-0042",
      "title": "Q1 2024 Routine Inspection",
      "type": "ROUTINE",
      "status": "APPROVED",
      "priority": "MEDIUM",
      "inspectedAt": "2024-03-15T09:30:00Z",
      "completedAt": "2024-03-15T14:45:00Z",
      "duration": 315,
      "inspector": {
        "id": "user_123",
        "name": "John Smith",
        "email": "john.smith@example.com"
      },
      "reviewer": {
        "id": "user_456",
        "name": "Jane Doe",
        "reviewedAt": "2024-03-16T10:00:00Z"
      },
      "overallCondition": "GOOD",
      "summary": "Dam is in good condition with minor maintenance items identified.",
      "keyFindings": [
        "Minor vegetation growth on downstream face",
        "Toe drain flowing clear at 15 gpm"
      ],
      "weatherConditions": {
        "temperature": 72,
        "humidity": 45,
        "windSpeed": 8,
        "conditions": "Partly cloudy"
      },
      "waterLevel": 1245.5,
      "statistics": {
        "observationCount": 23,
        "criticalCount": 0,
        "majorCount": 2,
        "moderateCount": 5,
        "minorCount": 16,
        "actionItemCount": 7,
        "mediaCount": 45,
        "photoCount": 42,
        "videoCount": 3
      },
      "links": {
        "self": "/api/dams/dam-123/inspections/insp_abc123",
        "observations": "/api/dams/dam-123/inspections/insp_abc123/observations",
        "media": "/api/dams/dam-123/inspections/insp_abc123/media",
        "report": "/api/dams/dam-123/inspections/insp_abc123/report"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalPages": 8,
    "totalCount": 76,
    "hasNext": true,
    "hasPrevious": false
  },
  "filters": {
    "applied": {
      "status": ["APPROVED", "IN_REVIEW"],
      "dateFrom": "2024-01-01T00:00:00Z"
    },
    "available": {
      "statuses": ["DRAFT", "SCHEDULED", "IN_PROGRESS", "SUBMITTED", "IN_REVIEW", "APPROVED", "ARCHIVED"],
      "types": ["ROUTINE", "SPECIAL", "COMPREHENSIVE", "POST_EVENT"],
      "severities": ["CRITICAL", "MAJOR", "MODERATE", "MINOR", "INFO"],
      "inspectors": [
        {"id": "user_123", "name": "John Smith", "count": 45},
        {"id": "user_789", "name": "Bob Johnson", "count": 31}
      ]
    }
  },
  "summary": {
    "averageDuration": 285,
    "completionRate": 0.95,
    "criticalFindingsCount": 2,
    "overdueCount": 1
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User lacks permission to view dam
- `404 Not Found` - Dam not found

### 2. Create Inspection
Create a new inspection record. Can be created as draft from mobile or scheduled from web.

**Endpoint:** `POST /api/dams/:damId/inspections`

**Path Parameters:**
- `damId` (string, required) - Dam ID or NID ID

**Request Body:**
```json
{
  "title": "Q2 2024 Routine Inspection",
  "type": "ROUTINE",
  "purpose": "Quarterly visual inspection per O&M manual requirements",
  "scope": "Complete visual inspection of all accessible areas including spillway, embankments, and outlet works",
  "scheduledDate": "2024-06-15T09:00:00Z",
  "inspectedAt": "2024-06-15T09:30:00Z",
  "assignedToId": "user_123",
  "priority": "MEDIUM",
  "weatherConditions": {
    "temperature": 75,
    "humidity": 60,
    "windSpeed": 5,
    "windDirection": "NW",
    "visibility": "Clear",
    "precipitation": "None",
    "conditions": "Sunny"
  },
  "waterLevel": 1248.3,
  "location": {
    "lat": 37.123456,
    "lon": -119.654321,
    "elevation": 1250.5,
    "accuracy": 5.2
  },
  "accessRoute": "Main access road from Highway 395",
  "offlineId": "mobile_uuid_12345",
  "sourceDevice": "device_abc123",
  "observations": [
    {
      "category": "STRUCTURAL",
      "component": "Downstream Embankment",
      "severity": "MINOR",
      "condition": "GOOD",
      "title": "Vegetation growth",
      "description": "Minor grass and weed growth observed on lower third of downstream slope",
      "location": {
        "lat": 37.123789,
        "lon": -119.654123
      },
      "locationDesc": "Station 2+50, 20 feet from toe",
      "actionRequired": true,
      "actionType": "MAINTENANCE",
      "actionPriority": "LOW",
      "tags": ["vegetation", "maintenance"],
      "offlineId": "obs_mobile_001"
    }
  ],
  "media": [
    {
      "offlineId": "media_001",
      "type": "PHOTO",
      "category": "OVERVIEW",
      "fileName": "downstream_face_overview.jpg",
      "mimeType": "image/jpeg",
      "sizeBytes": 2458624,
      "capturedAt": "2024-06-15T09:45:00Z",
      "location": {
        "lat": 37.123456,
        "lon": -119.654321
      },
      "deviceInfo": {
        "model": "iPhone 14 Pro",
        "os": "iOS 17.5",
        "appVersion": "1.2.0"
      }
    }
  ],
  "tags": ["routine", "quarterly", "2024-Q2"],
  "customFields": {
    "inspectionTeam": ["John Smith", "Jane Doe"],
    "vehicleMileage": 156
  }
}
```

**Success Response:** `201 Created`
```json
{
  "id": "insp_def456",
  "inspectionNumber": "2024-DAM123-0043",
  "status": "DRAFT",
  "createdAt": "2024-06-15T15:30:00Z",
  "syncStatus": "COMPLETED",
  "mediaUploadUrls": [
    {
      "offlineId": "media_001",
      "uploadUrl": "https://s3.amazonaws.com/damsafety-inspections/...",
      "storageKey": "dam-123/insp_def456/media_001.jpg",
      "expiresAt": "2024-06-15T16:30:00Z"
    }
  ],
  "links": {
    "self": "/api/dams/dam-123/inspections/insp_def456",
    "edit": "/api/dams/dam-123/inspections/insp_def456",
    "submit": "/api/dams/dam-123/inspections/insp_def456/submit"
  }
}
```

**Validation Rules:**
- `title` - Required, max 255 characters
- `type` - Required, must be valid enum value
- `inspectedAt` - Cannot be more than 7 days in the future
- `scheduledDate` - Required for status SCHEDULED
- `waterLevel` - Must be positive number
- `observations` - Each must have unique offlineId if provided
- `media` - Each must have unique offlineId if provided

**Business Rules:**
- Inspector must have INSPECTOR role or higher
- Dam must have inspections feature enabled
- Only one inspection can be IN_PROGRESS per dam
- Inspection number auto-generated using pattern YYYY-DAMID-XXXX

**Error Responses:**
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User lacks inspector permissions
- `409 Conflict` - Another inspection already in progress

### 3. Get Media Upload URL
Request a pre-signed URL for uploading media files directly to S3.

**Endpoint:** `POST /api/dams/:damId/inspections/:inspectionId/media/upload-url`

**Path Parameters:**
- `damId` (string, required) - Dam ID or NID ID
- `inspectionId` (string, required) - Inspection ID

**Request Body:**
```json
{
  "fileName": "spillway_overview_001.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 3456789,
  "type": "PHOTO",
  "category": "DETAIL",
  "observationId": "obs_123",
  "metadata": {
    "capturedAt": "2024-06-15T10:30:00Z",
    "location": {
      "lat": 37.123456,
      "lon": -119.654321
    },
    "deviceInfo": {
      "model": "iPhone 14 Pro",
      "cameraSettings": {
        "iso": 100,
        "aperture": 2.8,
        "shutterSpeed": "1/500"
      }
    }
  }
}
```

**Success Response:** `200 OK`
```json
{
  "uploadUrl": "https://damsafety-inspections.s3.amazonaws.com/dam-123/insp_def456/2024/06/15/abc123_spillway_overview_001.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "storageKey": "dam-123/insp_def456/2024/06/15/abc123_spillway_overview_001.jpg",
  "mediaId": "media_xyz789",
  "expiresAt": "2024-06-15T11:00:00Z",
  "uploadHeaders": {
    "Content-Type": "image/jpeg",
    "Content-Length": "3456789",
    "x-amz-meta-inspection-id": "insp_def456",
    "x-amz-meta-media-id": "media_xyz789"
  },
  "maxSize": 104857600
}
```

**Upload Instructions:**
```http
PUT <uploadUrl>
Content-Type: image/jpeg
Content-Length: 3456789
x-amz-meta-inspection-id: insp_def456
x-amz-meta-media-id: media_xyz789

[Binary file data]
```

**Validation Rules:**
- `mimeType` must be supported: image/*, video/mp4, video/quicktime, application/pdf
- `fileSize` must not exceed 100MB for images, 500MB for videos
- Inspection must be in DRAFT, IN_PROGRESS, or SUBMITTED status

### 4. Confirm Media Upload
Confirm successful upload and create media record in database.

**Endpoint:** `POST /api/dams/:damId/inspections/:inspectionId/media`

**Request Body:**
```json
{
  "mediaId": "media_xyz789",
  "storageKey": "dam-123/insp_def456/2024/06/15/abc123_spillway_overview_001.jpg",
  "type": "PHOTO",
  "category": "DETAIL",
  "title": "Spillway concrete spalling",
  "caption": "Minor spalling observed on spillway chute at station 1+50",
  "fileName": "spillway_overview_001.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 3456789,
  "dimensions": {
    "width": 4032,
    "height": 3024
  },
  "location": {
    "lat": 37.123456,
    "lon": -119.654321,
    "elevation": 1235.5,
    "accuracy": 3.2,
    "bearing": 45
  },
  "capturedAt": "2024-06-15T10:30:00Z",
  "observationId": "obs_123",
  "offlineId": "media_mobile_001",
  "exifData": {
    "make": "Apple",
    "model": "iPhone 14 Pro",
    "dateTime": "2024-06-15T10:30:00Z",
    "gps": {
      "latitude": 37.123456,
      "longitude": -119.654321
    }
  },
  "tags": ["spillway", "concrete", "spalling"]
}
```

**Success Response:** `201 Created`
```json
{
  "id": "media_xyz789",
  "inspectionId": "insp_def456",
  "storageKey": "dam-123/insp_def456/2024/06/15/abc123_spillway_overview_001.jpg",
  "url": "https://damsafety-inspections.s3.amazonaws.com/dam-123/insp_def456/2024/06/15/abc123_spillway_overview_001.jpg",
  "thumbnailUrl": "https://damsafety-inspections.s3.amazonaws.com/dam-123/insp_def456/2024/06/15/abc123_spillway_overview_001_thumb.jpg",
  "processingStatus": "PENDING",
  "uploadStatus": "COMPLETED",
  "createdAt": "2024-06-15T10:35:00Z",
  "links": {
    "self": "/api/dams/dam-123/inspections/insp_def456/media/media_xyz789",
    "download": "/api/dams/dam-123/inspections/insp_def456/media/media_xyz789/download",
    "thumbnail": "/api/dams/dam-123/inspections/insp_def456/media/media_xyz789/thumbnail"
  }
}
```

**Background Processing:**
After confirmation, the following happens asynchronously:
1. Thumbnail generation for images
2. Video transcoding to web formats
3. EXIF data extraction
4. AI analysis for defect detection (if enabled)
5. OCR for text extraction

### 5. Get Inspection Detail
Retrieve complete inspection details including observations and media.

**Endpoint:** `GET /api/dams/:damId/inspections/:inspectionId`

**Path Parameters:**
- `damId` (string, required) - Dam ID or NID ID
- `inspectionId` (string, required) - Inspection ID

**Query Parameters:**
- `include` (string[]) - Include related data: observations, media, statusHistory
- `mediaLimit` (integer) - Limit media items returned (default: 50)

**Success Response:** `200 OK`
```json
{
  "id": "insp_def456",
  "inspectionNumber": "2024-DAM123-0043",
  "damId": "dam-123",
  "dam": {
    "id": "dam-123",
    "name": "Pine Valley Dam",
    "nidId": "CA00123"
  },
  "title": "Q2 2024 Routine Inspection",
  "type": "ROUTINE",
  "purpose": "Quarterly visual inspection per O&M manual",
  "scope": "Complete visual inspection of all accessible areas",
  "status": "IN_REVIEW",
  "priority": "MEDIUM",
  "scheduledDate": "2024-06-15T09:00:00Z",
  "inspectedAt": "2024-06-15T09:30:00Z",
  "completedAt": "2024-06-15T14:45:00Z",
  "duration": 315,
  "inspector": {
    "id": "user_123",
    "name": "John Smith",
    "email": "john.smith@example.com",
    "jobTitle": "Senior Dam Safety Engineer"
  },
  "assignedTo": {
    "id": "user_123",
    "name": "John Smith"
  },
  "reviewer": {
    "id": "user_456",
    "name": "Jane Doe",
    "reviewedAt": "2024-06-16T10:00:00Z"
  },
  "weatherConditions": {
    "temperature": 75,
    "humidity": 60,
    "windSpeed": 5,
    "windDirection": "NW",
    "visibility": "Clear",
    "precipitation": "None",
    "conditions": "Sunny"
  },
  "waterLevel": 1248.3,
  "location": {
    "lat": 37.123456,
    "lon": -119.654321,
    "elevation": 1250.5,
    "accuracy": 5.2
  },
  "accessRoute": "Main access road from Highway 395",
  "overallCondition": "GOOD",
  "summary": "Dam is in good overall condition. Minor maintenance items identified.",
  "keyFindings": [
    "Minor vegetation growth on downstream embankment",
    "Spillway concrete showing early signs of ASR",
    "Toe drain flows clear at normal rate"
  ],
  "recommendations": [
    "Schedule vegetation removal within 30 days",
    "Monitor spillway concrete deterioration",
    "Continue monthly toe drain monitoring"
  ],
  "followUpRequired": true,
  "followUpDate": "2024-07-15T00:00:00Z",
  "riskLevel": "LOW",
  "complianceStatus": "COMPLIANT",
  "safetyHazards": ["Steep embankment slopes", "Slippery spillway surface"],
  "observations": [
    {
      "id": "obs_123",
      "observationNumber": 1,
      "category": "STRUCTURAL",
      "subCategory": "Concrete",
      "component": "Spillway Chute",
      "severity": "MODERATE",
      "condition": "FAIR",
      "title": "Early stage ASR cracking",
      "description": "Map cracking pattern observed on spillway chute walls...",
      "location": {
        "lat": 37.123789,
        "lon": -119.654123
      },
      "locationDesc": "Spillway station 1+00 to 2+50",
      "measurements": {
        "crackWidth": {
          "value": 0.5,
          "unit": "mm",
          "instrument": "Crack gauge"
        }
      },
      "previousValue": 0.3,
      "changeFromPrev": 0.2,
      "trend": "DEGRADING",
      "actionRequired": true,
      "actionType": "MONITORING",
      "actionPriority": "MEDIUM",
      "actionDeadline": "2024-09-15T00:00:00Z",
      "riskScore": 9,
      "mediaCount": 3,
      "createdAt": "2024-06-15T10:30:00Z"
    }
  ],
  "media": [
    {
      "id": "media_xyz789",
      "type": "PHOTO",
      "category": "DETAIL",
      "title": "Spillway ASR cracking",
      "caption": "Close-up of map cracking pattern",
      "url": "https://cdn.damsafety.io/signed-url...",
      "thumbnailUrl": "https://cdn.damsafety.io/thumb-signed-url...",
      "observationId": "obs_123",
      "capturedAt": "2024-06-15T10:30:00Z"
    }
  ],
  "statistics": {
    "observationCount": 23,
    "byCategory": {
      "STRUCTURAL": 8,
      "HYDRAULIC": 5,
      "MECHANICAL": 4,
      "OPERATIONAL": 6
    },
    "bySeverity": {
      "CRITICAL": 0,
      "MAJOR": 2,
      "MODERATE": 5,
      "MINOR": 16
    },
    "actionItemCount": 7,
    "overdueActionCount": 0,
    "mediaCount": 45,
    "mediaByType": {
      "PHOTO": 42,
      "VIDEO": 3
    }
  },
  "statusHistory": [
    {
      "fromStatus": "DRAFT",
      "toStatus": "IN_PROGRESS",
      "changedAt": "2024-06-15T09:30:00Z",
      "changedBy": "John Smith"
    },
    {
      "fromStatus": "IN_PROGRESS",
      "toStatus": "SUBMITTED",
      "changedAt": "2024-06-15T14:45:00Z",
      "changedBy": "John Smith"
    }
  ],
  "metadata": {
    "version": 2,
    "createdAt": "2024-06-15T09:00:00Z",
    "updatedAt": "2024-06-16T10:00:00Z",
    "syncedAt": "2024-06-15T14:50:00Z",
    "sourceDevice": "device_abc123"
  },
  "links": {
    "self": "/api/dams/dam-123/inspections/insp_def456",
    "observations": "/api/dams/dam-123/inspections/insp_def456/observations",
    "media": "/api/dams/dam-123/inspections/insp_def456/media",
    "report": "/api/dams/dam-123/inspections/insp_def456/report",
    "statusHistory": "/api/dams/dam-123/inspections/insp_def456/status-history"
  }
}
```

### 6. Update Inspection
Update inspection details, status, or add observations.

**Endpoint:** `PATCH /api/dams/:damId/inspections/:inspectionId`

**Request Body:** (partial update)
```json
{
  "status": "SUBMITTED",
  "completedAt": "2024-06-15T14:45:00Z",
  "summary": "Updated summary with final findings",
  "overallCondition": "FAIR",
  "recommendations": [
    "Immediate vegetation removal required",
    "Engineering assessment of spillway ASR"
  ],
  "followUpRequired": true,
  "followUpDate": "2024-07-01T00:00:00Z"
}
```

**Status Transition Rules:**
- DRAFT → IN_PROGRESS, SCHEDULED
- SCHEDULED → IN_PROGRESS, DRAFT
- IN_PROGRESS → SUBMITTED, DRAFT
- SUBMITTED → IN_REVIEW, IN_PROGRESS
- IN_REVIEW → APPROVED, REJECTED
- REJECTED → IN_PROGRESS
- APPROVED → ARCHIVED

### 7. Submit Inspection for Review
Special endpoint to submit inspection with validation.

**Endpoint:** `POST /api/dams/:damId/inspections/:inspectionId/submit`

**Request Body:**
```json
{
  "signature": "data:image/png;base64,iVBORw0KG...",
  "certificationStatement": "I certify that this inspection was conducted in accordance with applicable standards.",
  "finalNotes": "All areas were accessible. No immediate safety concerns identified."
}
```

**Validation on Submit:**
- At least one observation required
- Overall condition must be set
- Summary must be provided
- Inspector signature required
- All critical observations must have action items

### 8. Add Observation
Add a new observation to an existing inspection.

**Endpoint:** `POST /api/dams/:damId/inspections/:inspectionId/observations`

**Request Body:**
```json
{
  "category": "HYDRAULIC",
  "component": "Toe Drain",
  "severity": "INFO",
  "condition": "GOOD",
  "title": "Toe drain flow measurement",
  "description": "Toe drain flowing clear at measured rate of 15 gpm",
  "location": {
    "lat": 37.123456,
    "lon": -119.654789
  },
  "locationDesc": "Toe drain outlet #3",
  "measurements": {
    "flowRate": {
      "value": 15,
      "unit": "gpm",
      "instrument": "Bucket test"
    },
    "turbidity": {
      "value": 2,
      "unit": "NTU",
      "instrument": "Turbidity meter"
    }
  },
  "previousValue": 14,
  "trend": "STABLE",
  "actionRequired": false,
  "tags": ["toe-drain", "seepage", "monitoring"]
}
```

### 9. Mobile Device Sync
Sync inspection data from offline mobile device.

**Endpoint:** `POST /api/dams/:damId/inspections/sync`

**Request Headers:**
```http
X-Device-ID: device_abc123
X-Sync-Token: sync_token_xyz
X-Last-Sync: 2024-06-14T08:00:00Z
```

**Request Body:**
```json
{
  "inspections": [
    {
      "offlineId": "mobile_insp_001",
      "action": "create",
      "data": { /* Full inspection object */ },
      "clientTimestamp": "2024-06-15T14:45:00Z"
    }
  ],
  "observations": [
    {
      "offlineId": "mobile_obs_001",
      "inspectionOfflineId": "mobile_insp_001",
      "action": "create",
      "data": { /* Observation object */ }
    }
  ],
  "media": [
    {
      "offlineId": "mobile_media_001",
      "inspectionOfflineId": "mobile_insp_001",
      "action": "upload_pending",
      "metadata": { /* Media metadata */ }
    }
  ],
  "deletions": []
}
```

**Success Response:** `200 OK`
```json
{
  "syncToken": "new_sync_token_abc",
  "serverTimestamp": "2024-06-15T14:50:00Z",
  "results": {
    "inspections": [
      {
        "offlineId": "mobile_insp_001",
        "serverId": "insp_def456",
        "status": "synced"
      }
    ],
    "observations": [
      {
        "offlineId": "mobile_obs_001",
        "serverId": "obs_123",
        "status": "synced"
      }
    ],
    "media": [
      {
        "offlineId": "mobile_media_001",
        "serverId": "media_xyz789",
        "status": "upload_url_generated",
        "uploadUrl": "https://s3.amazonaws.com/...",
        "expiresAt": "2024-06-15T15:50:00Z"
      }
    ]
  },
  "conflicts": [],
  "serverUpdates": []
}
```

### 10. Generate Inspection Report
Generate PDF report from inspection data.

**Endpoint:** `POST /api/dams/:damId/inspections/:inspectionId/generate-report`

**Request Body:**
```json
{
  "template": "standard",
  "includePhotos": true,
  "photoQuality": "high",
  "includeAppendices": ["observations", "photos", "measurements"],
  "watermark": false,
  "signatureBlock": true
}
```

**Success Response:** `202 Accepted`
```json
{
  "jobId": "job_report_123",
  "status": "processing",
  "estimatedCompletionTime": "2024-06-15T15:00:00Z",
  "pollUrl": "/api/jobs/job_report_123"
}
```

**Poll for Completion:** `GET /api/jobs/job_report_123`
```json
{
  "jobId": "job_report_123",
  "status": "completed",
  "result": {
    "reportUrl": "https://cdn.damsafety.io/reports/inspection_2024_DAM123_0043.pdf",
    "expiresAt": "2024-06-22T15:00:00Z",
    "pages": 24,
    "fileSize": 15678901
  }
}
```

## WebSocket Events

### Connection
```javascript
const ws = new WebSocket('wss://api.damsafety.io/ws');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'bearer_token',
    subscribe: ['inspection:dam-123', 'sync:device_abc123']
  }));
};
```

### Event Types

**Inspection Updated**
```json
{
  "type": "inspection.updated",
  "damId": "dam-123",
  "inspectionId": "insp_def456",
  "changes": ["status", "summary"],
  "updatedBy": "user_456",
  "timestamp": "2024-06-15T15:00:00Z"
}
```

**Media Processing Complete**
```json
{
  "type": "media.processed",
  "inspectionId": "insp_def456",
  "mediaId": "media_xyz789",
  "results": {
    "thumbnail": "generated",
    "ocr": "completed",
    "defectDetection": {
      "detected": true,
      "confidence": 0.89,
      "defects": ["cracking", "spalling"]
    }
  }
}
```

**Sync Conflict**
```json
{
  "type": "sync.conflict",
  "deviceId": "device_abc123",
  "entityType": "observation",
  "entityId": "obs_123",
  "conflict": {
    "field": "severity",
    "localValue": "MAJOR",
    "serverValue": "MODERATE"
  }
}
```

## Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| List endpoints | 100 requests | 1 minute |
| Create/Update | 50 requests | 1 minute |
| Media upload URL | 20 requests | 1 minute |
| Report generation | 5 requests | 10 minutes |
| Sync endpoint | 10 requests | 1 minute |

Exceeded limits return `429 Too Many Requests` with `Retry-After` header.

## Error Codes
| Code | Meaning |
|------|---------|
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Dam or Inspection not found |
| 409 | Conflict (e.g., status transition not allowed) |
| 500 | Internal server error |

## Versioning Strategy
The `/v1` prefix will be introduced once the API stabilises; for now we remain under the default path but use semantic version tags in response headers `X-API-Version`. 