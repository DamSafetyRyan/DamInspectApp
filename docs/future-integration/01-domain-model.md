# 01 – Domain Model & Data Architecture

## Executive Summary
The inspection module introduces a comprehensive data model to support field inspections, media management, and observation tracking. This document details every aspect of the data architecture including fields, relationships, indexes, constraints, and migration strategies.

## Core Entities

### 1. Inspection Entity
The central entity that represents a dam inspection event.

```prisma
model Inspection {
  // Primary Key
  id                String      @id @default(uuid())
  
  // Foreign Keys & Relationships
  damId             String
  dam               Dam         @relation(fields: [damId], references: [id], onDelete: Cascade)
  
  inspectorId       String
  inspector         User        @relation("InspectionInspector", fields: [inspectorId], references: [id])
  
  assignedToId      String?
  assignedTo        User?       @relation("InspectionAssignedTo", fields: [assignedToId], references: [id])
  
  reviewerId        String?
  reviewer          User?       @relation("InspectionReviewer", fields: [reviewerId], references: [id])
  
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])
  
  // Core Fields
  inspectionNumber  String      @unique // Format: YYYY-DAM-XXXX
  title             String      @db.VarChar(255)
  type              InspectionType
  purpose           String?     @db.Text
  scope             String?     @db.Text
  
  // Scheduling & Timing
  scheduledDate     DateTime
  inspectedAt       DateTime
  completedAt       DateTime?
  duration          Int?        // minutes
  
  // Status & Workflow
  status            InspectionStatus @default(DRAFT)
  priority          Priority         @default(MEDIUM)
  reviewStatus      ReviewStatus?
  reviewedAt        DateTime?
  reviewNotes       String?     @db.Text
  
  // Location & Weather
  weatherConditions Json        // { temp, humidity, wind, visibility, precipitation }
  waterLevel        Float?      // feet
  location          Json        // { lat, lon, elevation, accuracy }
  accessRoute       String?
  
  // Summary & Findings
  overallCondition  ConditionRating?
  summary           String?     @db.Text
  keyFindings       String[]
  recommendations   String[]
  followUpRequired  Boolean     @default(false)
  followUpDate      DateTime?
  
  // Risk & Compliance
  riskLevel         RiskLevel?
  complianceStatus  ComplianceStatus?
  safetyHazards     String[]
  
  // Mobile App Sync
  sourceDevice      String?     // Device UUID
  offlineId         String?     // Client-generated ID for offline sync
  syncedAt          DateTime?
  syncStatus        SyncStatus  @default(PENDING)
  
  // Metadata
  tags              String[]
  customFields      Json?       // Flexible fields for organization-specific data
  signature         String?     // Base64 encoded signature image
  
  // Audit Fields
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  deletedAt         DateTime?   // Soft delete
  version           Int         @default(1)
  
  // Relationships
  observations      InspectionObservation[]
  media             InspectionMedia[]
  documents         Document[]
  statusHistory     InspectionStatusHistory[]
  
  // Indexes for Performance
  @@index([damId, status])
  @@index([inspectorId, inspectedAt])
  @@index([organizationId, status])
  @@index([scheduledDate])
  @@index([inspectionNumber])
  @@index([type, status])
  @@index([syncStatus, syncedAt])
  @@index([deletedAt])
  
  // Constraints
  @@unique([offlineId, sourceDevice])
}
```

### 2. InspectionObservation Entity
Detailed findings and observations made during inspection.

```prisma
model InspectionObservation {
  // Primary Key
  id                String      @id @default(uuid())
  
  // Foreign Keys
  inspectionId      String
  inspection        Inspection  @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  
  // Observation Details
  observationNumber Int         // Sequential within inspection
  category          ObservationCategory
  subCategory       String?
  component         String      // Dam component (spillway, outlet, embankment, etc.)
  
  // Finding Details
  severity          ObservationSeverity
  condition         ConditionRating
  title             String      @db.VarChar(255)
  description       String      @db.Text
  
  // Location
  location          Json?       // { lat, lon, elevation, chainage, offset }
  locationDesc      String?     // Human readable location
  
  // Measurements
  measurements      Json?       // { type, value, unit, instrument }
  previousValue     Float?
  changeFromPrev    Float?
  trend             TrendDirection?
  
  // Actions & Follow-up
  actionRequired    Boolean     @default(false)
  actionType        ActionType?
  actionPriority    Priority?
  actionDeadline    DateTime?
  actionNotes       String?
  
  // Risk Assessment
  riskProbability   Int?        // 1-5 scale
  riskConsequence   Int?        // 1-5 scale
  riskScore         Int?        // Computed: probability * consequence
  
  // Metadata
  tags              String[]
  linkedPfmId       String?     // Link to Probable Failure Mode
  previousObsId     String?     // Link to observation from previous inspection
  
  // Mobile Sync
  offlineId         String?
  photoReferences   String[]    // Offline photo IDs
  
  // Audit
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  createdBy         String?
  
  // Indexes
  @@index([inspectionId, observationNumber])
  @@index([category, severity])
  @@index([component])
  @@index([actionRequired, actionDeadline])
  @@index([riskScore])
  
  // Constraints
  @@unique([inspectionId, observationNumber])
  @@unique([inspectionId, offlineId])
}
```

### 3. InspectionMedia Entity
Photos, videos, and other media captured during inspection.

```prisma
model InspectionMedia {
  // Primary Key
  id                String      @id @default(uuid())
  
  // Foreign Keys
  inspectionId      String
  inspection        Inspection  @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  
  observationId     String?
  observation       InspectionObservation? @relation(fields: [observationId], references: [id])
  
  // Media Details
  type              MediaType   // PHOTO, VIDEO, AUDIO, DRAWING
  category          MediaCategory
  title             String      @db.VarChar(255)
  caption           String?     @db.Text
  
  // Storage
  storageKey        String      @unique // S3 object key
  thumbnailKey      String?     // S3 key for thumbnail
  url               String?     // Cached signed URL
  thumbnailUrl      String?     // Cached thumbnail URL
  urlExpiry         DateTime?   // When URLs expire
  
  // File Details
  fileName          String
  mimeType          String
  sizeBytes         BigInt
  dimensions        Json?       // { width, height } for images/video
  duration          Int?        // seconds for video/audio
  
  // Location & Context
  location          Json?       // { lat, lon, elevation, accuracy, bearing }
  capturedAt        DateTime
  deviceInfo        Json?       // { model, os, app_version }
  
  // Processing
  processingStatus  ProcessingStatus @default(PENDING)
  processedAt       DateTime?
  processingError   String?
  
  // Analysis Results (AI/ML)
  analysisResults   Json?       // { detected_issues, confidence_scores }
  ocrText           String?     // Extracted text from images
  
  // Metadata
  exifData          Json?
  tags              String[]
  isAnnotated       Boolean     @default(false)
  annotations       Json?       // Drawing/markup data
  
  // Mobile Sync
  offlineId         String?
  localPath         String?     // Device local file path
  uploadStatus      UploadStatus @default(PENDING)
  uploadAttempts    Int         @default(0)
  lastUploadError   String?
  
  // Audit
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  uploadedBy        String
  
  // Indexes
  @@index([inspectionId, type])
  @@index([observationId])
  @@index([uploadStatus, uploadAttempts])
  @@index([processingStatus])
  @@index([capturedAt])
  
  // Constraints
  @@unique([inspectionId, offlineId])
}
```

### 4. InspectionStatusHistory
Audit trail for inspection status changes.

```prisma
model InspectionStatusHistory {
  id              String           @id @default(uuid())
  inspectionId    String
  inspection      Inspection       @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  
  fromStatus      InspectionStatus
  toStatus        InspectionStatus
  changedBy       String
  changedAt       DateTime         @default(now())
  reason          String?
  metadata        Json?            // Additional context
  
  user            User             @relation(fields: [changedBy], references: [id])
  
  @@index([inspectionId, changedAt])
  @@index([changedBy])
}
```

## Enumerations

```prisma
enum InspectionType {
  ROUTINE              // Regular scheduled inspection
  SPECIAL              // Triggered by event or concern
  COMPREHENSIVE        // Full formal inspection
  UNDERWATER           // Dive inspection
  POST_EVENT           // After earthquake, flood, etc.
  PRE_STORM           // Pre-emptive storm inspection
  INSTRUMENTATION     // Instrument reading inspection
  CONSTRUCTION        // During construction/repairs
}

enum InspectionStatus {
  DRAFT               // Being created
  SCHEDULED           // Planned but not started
  IN_PROGRESS         // Currently being conducted
  SUBMITTED           // Completed, awaiting review
  IN_REVIEW           // Under review
  APPROVED            // Reviewed and approved
  REJECTED            // Needs revision
  ARCHIVED            // Historical record
}

enum ReviewStatus {
  PENDING
  IN_PROGRESS
  APPROVED
  REJECTED
  REVISION_REQUESTED
}

enum ObservationCategory {
  STRUCTURAL          // Cracks, deformation, deterioration
  HYDRAULIC           // Seepage, leakage, erosion
  MECHANICAL          // Gates, valves, equipment
  ELECTRICAL          // Power, controls, lighting
  INSTRUMENTATION     // Monitoring equipment
  OPERATIONAL         // Procedures, access, signage
  ENVIRONMENTAL       // Vegetation, wildlife, water quality
  SECURITY            // Fencing, cameras, access control
}

enum ObservationSeverity {
  INFO                // Informational only
  MINOR               // Cosmetic or very minor issue
  MODERATE            // Needs attention but not urgent
  MAJOR               // Significant issue requiring action
  CRITICAL            // Immediate action required
  EMERGENCY           // Safety threat
}

enum ConditionRating {
  EXCELLENT           // Like new
  GOOD                // Minor wear, fully functional
  FAIR                // Moderate wear, functional
  POOR                // Significant wear, impaired function
  CRITICAL            // Failed or imminent failure
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
  EMERGENCY
}

enum ActionType {
  MAINTENANCE         // Routine maintenance needed
  REPAIR              // Repair required
  REPLACEMENT         // Component replacement
  MONITORING          // Increased monitoring
  ENGINEERING_REVIEW  // Engineering assessment needed
  OPERATIONAL_CHANGE  // Change in operations
}

enum MediaType {
  PHOTO
  VIDEO
  AUDIO
  DRAWING
  DOCUMENT
}

enum MediaCategory {
  OVERVIEW            // General dam views
  DETAIL              // Close-up of specific issue
  INSTRUMENT          // Instrument readings
  MEASUREMENT         // Measurement documentation
  BEFORE_AFTER        // Comparison shots
  PANORAMIC           // 360 or wide angle
  THERMAL             // Thermal imaging
  UNDERWATER          // Underwater footage
}

enum SyncStatus {
  PENDING             // Not yet synced
  IN_PROGRESS         // Currently syncing
  COMPLETED           // Successfully synced
  FAILED              // Sync failed
  CONFLICT            // Merge conflict
}

enum UploadStatus {
  PENDING
  UPLOADING
  COMPLETED
  FAILED
  CANCELLED
}

enum ProcessingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  SKIPPED
}

enum TrendDirection {
  IMPROVING
  STABLE
  DEGRADING
  RAPID_DEGRADATION
}

enum RiskLevel {
  VERY_LOW
  LOW
  MODERATE
  HIGH
  VERY_HIGH
  EXTREME
}

enum ComplianceStatus {
  COMPLIANT
  NON_COMPLIANT
  PARTIALLY_COMPLIANT
  UNDER_REVIEW
}
```

## Database Indexes Strategy

### Performance Indexes
```sql
-- Inspection queries by dam and status
CREATE INDEX idx_inspection_dam_status ON "Inspection"("damId", "status");

-- Date range queries
CREATE INDEX idx_inspection_dates ON "Inspection"("inspectedAt", "scheduledDate");

-- Mobile sync queries
CREATE INDEX idx_inspection_sync ON "Inspection"("syncStatus", "syncedAt", "sourceDevice");

-- Observation severity queries
CREATE INDEX idx_observation_severity ON "InspectionObservation"("severity", "actionRequired");

-- Media upload status
CREATE INDEX idx_media_upload ON "InspectionMedia"("uploadStatus", "uploadAttempts");

-- Full text search
CREATE INDEX idx_inspection_search ON "Inspection" USING gin(
  to_tsvector('english', "title" || ' ' || COALESCE("summary", '') || ' ' || COALESCE("purpose", ''))
);
```

### Constraints
```sql
-- Ensure inspection numbers are unique and follow format
ALTER TABLE "Inspection" ADD CONSTRAINT chk_inspection_number 
  CHECK ("inspectionNumber" ~ '^[0-9]{4}-[A-Z0-9]+-[0-9]{4}$');

-- Ensure valid risk scores
ALTER TABLE "InspectionObservation" ADD CONSTRAINT chk_risk_score
  CHECK ("riskScore" IS NULL OR ("riskScore" >= 1 AND "riskScore" <= 25));

-- Ensure media size is positive
ALTER TABLE "InspectionMedia" ADD CONSTRAINT chk_file_size
  CHECK ("sizeBytes" > 0);
```

## Data Migration Strategy

### Phase 1: Schema Creation
```typescript
// Migration: 001_create_inspection_tables.ts
export async function up(prisma: PrismaClient) {
  // Create enums
  await prisma.$executeRaw`CREATE TYPE "InspectionType" AS ENUM (...)`;
  
  // Create tables
  await prisma.$executeRaw`CREATE TABLE "Inspection" (...)`;
  
  // Create indexes
  await prisma.$executeRaw`CREATE INDEX ...`;
}
```

### Phase 2: Historical Data Import
```typescript
// Migration: 002_import_historical_inspections.ts
export async function importHistoricalInspections() {
  // 1. Identify existing inspection PDFs in Document table
  const inspectionDocs = await prisma.document.findMany({
    where: {
      type: { in: ['inspection', 'inspection_report'] }
    }
  });
  
  // 2. Create Inspection records from documents
  for (const doc of inspectionDocs) {
    await prisma.inspection.create({
      data: {
        damId: doc.damId,
        title: doc.title,
        inspectedAt: doc.createdAt,
        status: 'ARCHIVED',
        media: {
          create: {
            type: 'DOCUMENT',
            storageKey: doc.url,
            fileName: doc.title,
            mimeType: 'application/pdf',
            sizeBytes: BigInt(doc.fileSize || 0)
          }
        }
      }
    });
  }
}
```

### Phase 3: Data Validation
```typescript
// Migration: 003_validate_inspection_data.ts
export async function validateInspectionData() {
  // Check for orphaned records
  const orphanedObs = await prisma.$queryRaw`
    SELECT COUNT(*) FROM "InspectionObservation" o
    LEFT JOIN "Inspection" i ON o."inspectionId" = i.id
    WHERE i.id IS NULL
  `;
  
  // Validate inspection numbers are unique
  const duplicates = await prisma.$queryRaw`
    SELECT "inspectionNumber", COUNT(*) 
    FROM "Inspection" 
    GROUP BY "inspectionNumber" 
    HAVING COUNT(*) > 1
  `;
}
```

## Performance Considerations

### Expected Data Volumes
- Inspections: 10-50 per dam per year
- Observations: 20-200 per inspection
- Media: 50-500 items per inspection
- Total annual growth: ~1TB of media files

### Query Optimization
1. **Partition Strategy**: Consider partitioning InspectionMedia by year
2. **Materialized Views**: For dashboard aggregations
3. **Read Replicas**: For reporting queries
4. **Archive Strategy**: Move completed inspections >5 years to archive tables

### Caching Strategy
```typescript
// Redis cache keys
`inspection:${damId}:latest` // Latest inspection
`inspection:${id}:summary` // Inspection summary
`dam:${damId}:inspection:count` // Total inspections
`dam:${damId}:issues:open` // Open issues count
```

## Security & Privacy

### Data Classification
- **Public**: Inspection summaries, overall ratings
- **Internal**: Detailed observations, measurements
- **Confidential**: Security-related findings, vulnerability assessments
- **PII**: Inspector names, signatures

### Encryption Requirements
```typescript
// Encrypted fields
interface EncryptedFields {
  signature: string; // AES-256 encrypted
  securityFindings: string[]; // Encrypted array
  locationData: string; // Encrypted JSON
}
```

### Audit Requirements
- All status changes logged in StatusHistory
- Media deletions soft-deleted with reason
- API access logged with user, timestamp, action

## Integration Points

### With Existing Models
```prisma
// Extend existing Dam model
model Dam {
  // ... existing fields
  inspections       Inspection[]
  
  // Computed fields for dashboard
  lastInspectionDate DateTime?
  nextInspectionDue  DateTime?
  openIssuesCount    Int?
}

// Extend existing User model  
model User {
  // ... existing fields
  conductedInspections Inspection[] @relation("InspectionInspector")
  assignedInspections  Inspection[] @relation("InspectionAssignedTo")
  reviewedInspections  Inspection[] @relation("InspectionReviewer")
}
```

### With External Systems
1. **Document Management**: Link to existing Document model
2. **Risk Management**: Link observations to ProbableFailureMode
3. **Work Orders**: Generate MaintenanceTask from observations
4. **Notifications**: Trigger alerts for critical findings

## Reporting Requirements

### Key Metrics
```sql
-- Inspection completion rate
SELECT 
  DATE_TRUNC('month', "scheduledDate") as month,
  COUNT(*) FILTER (WHERE "status" = 'APPROVED') as completed,
  COUNT(*) as scheduled,
  ROUND(100.0 * COUNT(*) FILTER (WHERE "status" = 'APPROVED') / COUNT(*), 2) as completion_rate
FROM "Inspection"
GROUP BY month;

-- Issue severity distribution
SELECT 
  "severity",
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM "InspectionObservation"
WHERE "inspectionId" IN (
  SELECT id FROM "Inspection" 
  WHERE "inspectedAt" > NOW() - INTERVAL '1 year'
)
GROUP BY "severity";
```

### Compliance Tracking
```sql
-- Overdue inspections
SELECT 
  d.id, d.name, d."nextInspectionDue",
  NOW() - d."nextInspectionDue" as overdue_days
FROM "Dam" d
WHERE d."nextInspectionDue" < NOW()
AND NOT EXISTS (
  SELECT 1 FROM "Inspection" i 
  WHERE i."damId" = d.id 
  AND i."status" = 'APPROVED'
  AND i."inspectedAt" > d."nextInspectionDue"
);
```

## Future Enhancements

### Phase 2 Features
1. **AI/ML Integration**
   - Automatic defect detection in photos
   - Predictive maintenance recommendations
   - Anomaly detection in measurements

2. **Advanced Analytics**
   - Deterioration rate modeling
   - Cost prediction for repairs
   - Risk trend analysis

3. **Integration Features**
   - Direct instrument data import
   - Weather service integration
   - Regulatory reporting automation

### Schema Extensions
```prisma
// Future: Inspection Templates
model InspectionTemplate {
  id          String @id @default(uuid())
  name        String
  type        InspectionType
  sections    Json   // Structured checklist
  damType     String?
  isActive    Boolean @default(true)
}

// Future: Automated Findings
model AutomatedFinding {
  id            String @id @default(uuid())
  mediaId       String
  findingType   String
  confidence    Float
  boundingBox   Json
  verified      Boolean @default(false)
}
``` 