# DamSafety.IO Integration Guide for DamInspect

## Overview
This document provides comprehensive technical specifications for DamInspect, a field inspection application that integrates with DamSafety.IO. DamInspect collects field data and synchronizes it with the main DamSafety.IO platform for dam safety management and regulatory compliance.

## System Context & Business Domain

### Regulatory Compliance Framework
DamSafety.IO operates within strict regulatory requirements:

1. **Federal Requirements**
   - FERC (Federal Energy Regulatory Commission) Part 12 inspections
   - USACE (US Army Corps of Engineers) ER 1110-2-1156 standards
   - National Dam Safety Program guidelines
   - FEMA Emergency Action Plan requirements

2. **State Requirements**
   - State-specific inspection frequencies (varies by hazard classification)
   - State dam safety office reporting requirements
   - Local emergency management coordination

3. **Data Retention Policies**
   - Inspection records: Minimum 10 years (some states require lifetime)
   - Instrumentation data: 5 years minimum
   - Photos/Documents: Indefinite retention
   - Emergency incidents: Permanent record

4. **Compliance Validations**
   - Inspection frequency based on hazard classification
   - Required inspector certifications
   - Mandatory reporting timelines
   - Chain of custody for critical findings

### Business Rules & Constraints

1. **Inspection Scheduling Rules**
   - HIGH hazard: Annual or bi-annual inspections
   - SIGNIFICANT hazard: Every 2-3 years
   - LOW hazard: Every 5 years
   - Special inspections after seismic events > 4.0 magnitude
   - Post-flood inspections when water level exceeds spillway crest

2. **Data Quality Requirements**
   - GPS coordinates required (accuracy < 10 meters)
   - Photos must include timestamp and geotag
   - Minimum 3 photos per identified deficiency
   - Instrumentation readings require double-entry verification for critical values
   - Weather conditions must be recorded

3. **Critical Thresholds**
   - Automatic alerts for readings > 20% deviation from baseline
   - Immediate escalation for threat level changes
   - Mandatory 24-hour reporting for POTENTIAL_FAILURE_EMERGENCY or higher

### Multi-Tenancy & Data Isolation

1. **Organization Hierarchy**
   ```
   Federal Agency
   └── State Agency
       └── Regional Office
           └── Local Organization
               └── Individual Dams
   ```

2. **Data Segregation**
   - Row-level security based on organizationId
   - No cross-organization data access except for SUPER_ADMIN
   - Separate Azure Blob containers per organization
   - API responses filtered by organization context

3. **Permission Inheritance**
   - Parent organizations can view child organization data
   - Permissions cascade down but not up
   - Dam-specific access overrides organization access

## Backend Architecture

### Technology Stack
- **Framework**: Next.js 14+ with App Router
- **API**: RESTful endpoints using Next.js Route Handlers
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Azure AD integration
- **Cloud Provider**: Microsoft Azure
- **File Storage**: Azure Blob Storage
- **Real-time Data**: WebSocket connections for sensor data

### Architecture Pattern
DamSafety.IO follows a modular monolithic architecture with:
- Domain-driven design principles
- Service layer pattern for business logic
- Repository pattern for data access
- API Gateway pattern for external integrations

### Application Structure
```
DamSafety.IO/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── api/                # API endpoints
│   │   │   ├── dams/           # Dam-related endpoints
│   │   │   ├── users/          # User management
│   │   │   ├── documents/      # Document handling
│   │   │   ├── alerts/         # Alert system
│   │   │   └── auth/           # Authentication
│   │   └── (dashboard)/        # UI pages
│   ├── lib/                    # Core libraries
│   │   ├── auth.ts            # Auth configuration
│   │   ├── prisma.ts          # Database client
│   │   └── azure-storage.ts   # Azure Blob client
│   ├── services/              # Business logic layer
│   │   ├── damService.ts      # Dam operations
│   │   ├── inspectionService.ts # Inspection logic
│   │   └── sensorService.ts   # Sensor data handling
│   └── types/                 # TypeScript definitions
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
└── public/                    # Static assets
```

### Key Service Layers

**1. API Route Handlers** (`/src/app/api/`):
- Handle HTTP requests
- Validate authentication/authorization
- Call service layer functions
- Return formatted responses

**2. Service Layer** (`/src/services/`):
- Business logic implementation
- Data validation and transformation
- Cross-entity operations
- External service integration

**3. Data Access Layer** (Prisma):
- Database queries and mutations
- Transaction management
- Data model enforcement

### Environment Configuration
```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/damsafety"

# Azure AD Authentication
AZURE_AD_CLIENT_ID="your-client-id"
AZURE_AD_CLIENT_SECRET="your-secret"
AZURE_AD_TENANT_ID="your-tenant-id"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING="your-connection-string"
AZURE_STORAGE_CONTAINER_NAME="documents"

# API Configuration
API_BASE_URL="https://api.damsafety.io"
API_VERSION="v1"
```

## Authentication & Authorization

### Authentication Flow

**IMPORTANT**: DamInspect uses the SAME user accounts as DamSafety.IO. Users do not need separate credentials.

1. **Provider**: Azure Active Directory (Azure AD) via NextAuth.js
2. **Token Type**: JWT (JSON Web Tokens)
3. **Session Strategy**: JWT-based sessions with 30-day expiration
4. **Two-Factor Authentication (2FA)**: 
   - Required for all users with ENGINEER role or higher
   - Microsoft Authenticator app preferred
   - Backup codes provided for field use
   - SMS fallback for emergency access
5. **Single Sign-On (SSO)**:
   - Users logged into DamSafety.IO can seamlessly access DamInspect
   - Shared authentication tokens between applications
   - Session synchronization across platforms

**Required Environment Variables**:
```env
AZURE_AD_CLIENT_ID=your_client_id
AZURE_AD_CLIENT_SECRET=your_client_secret
AZURE_AD_TENANT_ID=your_tenant_id
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=https://your-app-url
MFA_ENFORCEMENT=true
SESSION_SYNC_ENABLED=true
```

### User Account Synchronization
```typescript
// DamInspect must validate user against DamSafety.IO
interface UserSync {
  // Same user ID across both systems
  userId: string;
  
  // Permissions fetched from DamSafety.IO
  permissions: {
    role: UserRole;
    organizationId: string;
    damAccess: string[];
  };
  
  // Profile synchronized
  profile: {
    name: string;
    email: string;
    certifications: string[];
    lastSync: Date;
  };
}
```

### User Roles & Permissions
```typescript
enum UserRole {
  SUPER_ADMIN     // Full system access
  ADMIN           // Organization-wide admin
  MANAGER         // Management capabilities
  ENGINEER        // Engineering access
  CONSULTANT      // External consultant access
  OPERATIONS      // Operational access
  VIEWER          // Read-only access
}
```

### Authorization Headers
All API requests must include:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Access Control
- Dam-specific access is managed through `DamAccess` table
- Organization-based filtering for multi-tenant support
- Role-based endpoint restrictions

## API Endpoints

### Base URL
```
Production: https://api.damsafety.io/api
Development: http://localhost:3000/api
```

### Core Inspection Endpoints

#### 1. Get Dam Information
```http
GET /api/dams/{damId}
```
**Response**: Dam details including location, specifications, and current status

#### 2. Create Inspection
```http
POST /api/dams/{damId}/inspections
```
**Request Body**:
```json
{
  "type": "ROUTINE|SPECIAL|EMERGENCY|ANNUAL",
  "date": "2024-01-22T10:00:00Z",
  "weather": "Clear, 72°F",
  "waterLevel": 1234.5,
  "findings": "Detailed inspection findings...",
  "recommendations": "Recommended actions...",
  "rating": "GOOD|FAIR|POOR|UNSATISFACTORY",
  "followUpDate": "2024-02-22T10:00:00Z",
  "status": "DRAFT|SUBMITTED|REVIEWED|APPROVED"
}
```

#### 3. Upload Inspection Photos
```http
POST /api/documents/upload-sas
```
**Request**: Multipart form data with file and metadata
**Response**: Document ID and Azure Blob Storage URL

#### 4. Link Documents to Inspection
```http
PUT /api/dams/{damId}/inspections/{inspectionId}/documents
```
**Request Body**:
```json
{
  "documentIds": ["doc1", "doc2", "doc3"]
}
```

#### 5. Get User's Accessible Dams
```http
GET /api/dams/accessible
```
**Response**: List of dams the authenticated user can access

#### 6. Submit Sensor Readings
```http
POST /api/dams/{damId}/sensors/{sensorId}/readings
```
**Request Body**:
```json
{
  "value": 123.45,
  "timestamp": "2024-01-22T10:00:00Z",
  "quality": "GOOD|FAIR|POOR",
  "metadata": {
    "calibrated": true,
    "notes": "Manual reading"
  }
}
```

#### 7. Create Monitoring Point Measurement
```http
POST /api/dams/{damId}/monitoring-points/{pointId}/measurements
```
**Request Body**:
```json
{
  "value": 456.78,
  "unit": "feet",
  "date": "2024-01-22T10:00:00Z",
  "inspector": "Inspector Name",
  "notes": "Measurement notes"
}
```

#### 8. Report Critical Issue
```http
POST /api/dams/{damId}/alerts
```
**Request Body**:
```json
{
  "type": "STRUCTURAL|SEEPAGE|EQUIPMENT|WEATHER",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "message": "Issue description",
  "metadata": {
    "location": "Spillway Gate #3",
    "immediateAction": "Area cordoned off"
  }
}
```

#### 9. Update Dam Threat Level
```http
PUT /api/dams/{damId}/threat-level
```
**Request Body**:
```json
{
  "newLevel": "NO_THREAT|FALSE_ALARM|HIGH_FLOW_OPERATION|NON_FAILURE_EMERGENCY|POTENTIAL_FAILURE_EMERGENCY|IMMINENT_FAILURE",
  "reason": "Justification for threat level change",
  "recommendations": "Recommended actions",
  "isEapActivated": false,
  "notificationsTriggered": false
}
```

### Supporting Endpoints

#### Get Weather Data
```http
GET /api/weather?lat={latitude}&lon={longitude}
```

#### Get Organization Details
```http
GET /api/organizations/{organizationId}
```

#### Get User Profile
```http
GET /api/users/me
```

## DamSafety.IO Database Structure

### Database Architecture
DamSafety.IO uses PostgreSQL with Prisma ORM. The database follows a relational model with clear separation of concerns:

1. **Core Entities**: Organizations, Users, Dams
2. **Inspection & Monitoring**: Inspections, Sensors, Measurements
3. **Documents & Media**: Documents, Photos, Versions
4. **Risk & Safety**: Alerts, Risk Assessments, Emergency Resources
5. **Projects & Tasks**: Projects, Milestones, Tasks

### Where Inspection Data Goes

#### 1. Inspection Records → `Inspection` Table
```sql
-- Primary inspection data storage
Inspection {
  id: string (auto-generated)
  damId: string (foreign key to Dam)
  inspectorId: string (foreign key to User)
  type: string (ROUTINE|SPECIAL|EMERGENCY|ANNUAL)
  date: DateTime
  weather: string (optional)
  waterLevel: float (optional)
  findings: string (required - detailed findings)
  recommendations: string (optional)
  rating: string (GOOD|FAIR|POOR|UNSATISFACTORY)
  followUpDate: DateTime (optional)
  status: string (DRAFT|SUBMITTED|REVIEWED|APPROVED)
  reviewerId: string (optional)
  reviewDate: DateTime (optional)
}
```

#### 2. Manual Instrumentation Data → Multiple Tables

**Piezometer/Water Level Readings → `SensorReading` Table**:
```sql
SensorReading {
  id: string
  sensorId: string (link to Sensor table)
  value: float (the reading value)
  timestamp: DateTime
  quality: string (GOOD|FAIR|POOR)
  metadata: JSON {
    manualReading: true,
    instrumentType: "piezometer",
    readingMethod: "manual",
    calibrationStatus: "current"
  }
}
```

**Survey/Monitoring Points → `Measurement` Table**:
```sql
Measurement {
  id: string
  monitoringPointId: string (link to MonitoringPoint)
  value: float
  unit: string (feet|meters|inches|psi)
  date: DateTime
  inspector: string (inspector name)
  notes: string (optional observations)
}
```

**Flow/Gate Data → `FlowData` Table**:
```sql
FlowData {
  id: string
  damId: string
  date: DateTime
  inflow: float (cfs)
  outflow: float (cfs)
  reservoir: float (acre-feet)
}
```

#### 3. Photos & Documents → Related Tables

**Photos → `Photo` Table**:
```sql
Photo {
  id: string
  url: string (Azure Blob URL)
  caption: string
  location: string (location description)
  coordinates: JSON {lat, lng}
  inspectionId: string (link to Inspection)
  documentId: string (optional)
}
```

**Documents → `Document` Table**:
```sql
Document {
  id: string
  title: string
  type: string (INSPECTION|REPORT|DRAWING)
  url: string (Azure Blob URL)
  inspectionId: string (link to Inspection)
  damId: string
  uploaderId: string
  metadata: JSON (additional data)
}
```

### Where to Pull Dam Information From

#### Primary Dam Information → `Dam` Table
```typescript
// Essential fields for DamInspect
interface DamForInspection {
  // Identification
  id: string;                    // Internal ID
  nidId?: string;               // National Inventory ID
  name: string;                 // Dam name
  otherNames: string[];         // Alternative names
  
  // Location
  latitude: number;
  longitude: number;
  state: string;
  county: string;
  river: string;
  nearestCity?: string;
  distanceToCity?: number;
  
  // Specifications
  damType: string[];            // EARTHFILL, CONCRETE, etc.
  height: float;                // Structural height in feet
  length?: float;               // Crest length in feet
  crestElevation?: float;       // Elevation in feet
  maxDischarge?: float;         // Spillway capacity in cfs
  maxStorage?: float;           // Max storage in acre-feet
  normalStorage?: float;        // Normal pool in acre-feet
  
  // Safety & Compliance
  hazardClassification: string; // HIGH|SIGNIFICANT|LOW
  condition: string;            // GOOD|FAIR|POOR|UNSATISFACTORY
  lastInspectionDate: DateTime;
  nextInspectionDate?: DateTime;
  inspectionFrequency: number;  // Months between inspections
  threatLevel: ThreatLevel;     // Current threat level
  
  // Operational
  operationalStatus: string;    // OPERATIONAL|MAINTENANCE|etc
  waterLevel?: float;          // Current water level
  waterLevelUpdatedAt?: DateTime;
}
```

#### Associated Data to Retrieve

**1. Existing Sensors → `Sensor` Table**:
```sql
SELECT * FROM Sensor 
WHERE damId = {damId} 
AND status = 'ACTIVE'
```

**2. Monitoring Points → `MonitoringPoint` Table**:
```sql
SELECT * FROM MonitoringPoint 
WHERE damId = {damId}
ORDER BY name
```

**3. Recent Inspections → `Inspection` Table**:
```sql
SELECT * FROM Inspection 
WHERE damId = {damId}
ORDER BY date DESC
LIMIT 5
```

**4. Active Alerts → `Alert` Table**:
```sql
SELECT * FROM Alert 
WHERE damId = {damId} 
AND status IN ('ACTIVE', 'PENDING')
```

**5. Emergency Contacts → `EmergencyContact` Table**:
```sql
SELECT * FROM EmergencyContact 
WHERE damId = {damId}
ORDER BY order, name
```

## Data Models

### Inspection Model
```typescript
interface Inspection {
  id: string;
  damId: string;
  inspectorId: string;
  type: string;
  date: Date;
  weather?: string;
  waterLevel?: number;
  findings: string;
  recommendations?: string;
  rating: string;
  followUpDate?: Date;
  status: string;
  reviewerId?: string;
  reviewDate?: Date;
  documents: Document[];
  photos: Photo[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Dam Model (Essential Fields)
```typescript
interface Dam {
  id: string;
  nidId?: string;  // National Inventory of Dams ID
  name: string;
  organizationId: string;
  latitude: number;
  longitude: number;
  state: string;
  county: string;
  river: string;
  damType: string[];
  hazardClassification: string;
  condition: string;
  lastInspectionDate: Date;
  nextInspectionDate?: Date;
  threatLevel: ThreatLevel;
  operationalStatus: string;
  // ... additional fields
}
```

### Document Model
```typescript
interface Document {
  id: string;
  title: string;
  type: string;
  description?: string;
  url: string;
  fileSize?: string;
  fileType: string;
  tags: string[];
  damId?: string;
  uploaderId: string;
  inspectionId?: string;
  metadata?: any;
  visibility: 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC';
  status: 'AVAILABLE' | 'ARCHIVED' | 'PENDING_REVIEW';
}
```

### Sensor Reading Model
```typescript
interface SensorReading {
  id: string;
  sensorId: string;
  value: number;
  timestamp: Date;
  quality?: string;
  metadata?: any;
}
```

### MonitoringPoint Model
```typescript
interface MonitoringPoint {
  id: string;
  damId: string;
  name: string;
  type: string;  // PIEZOMETER|SURVEY|SEEPAGE|MOVEMENT
  location: string;
  coordinates: {
    lat: number;
    lng: number;
    elevation?: number;
  };
  measurements: Measurement[];
}
```

### Measurement Model
```typescript
interface Measurement {
  id: string;
  monitoringPointId: string;
  value: number;
  unit: string;
  date: Date;
  inspector: string;
  notes?: string;
}
```

## System Limitations & Constraints

### API Rate Limits & Quotas
1. **Request Limits**
   - Standard users: 10,000 requests/hour
   - Bulk operations: 100 requests/hour
   - File uploads: 100 files/hour, 50MB per file
   - Batch sync: Maximum 500 items per request

2. **Data Size Constraints**
   - Inspection findings: 50,000 characters max
   - Photo captions: 500 characters max
   - Document metadata: 5KB JSON max
   - Sensor reading batch: 1,000 readings per request

3. **Timeout Policies**
   - API request timeout: 30 seconds
   - File upload timeout: 5 minutes
   - Database query timeout: 10 seconds
   - WebSocket idle timeout: 5 minutes

### Geospatial Considerations

1. **Coordinate Systems**
   - Primary: WGS84 (EPSG:4326) for GPS coordinates
   - State Plane coordinates supported for survey data
   - Elevation: NAVD88 or NGVD29 (must specify datum)
   - All coordinates stored with 6 decimal precision

2. **Mapping Integration**
   - Base maps: OpenStreetMap, USGS Topo
   - Aerial imagery: Latest available from state sources
   - Inundation maps: FEMA flood zones overlay
   - Watershed boundaries: HUC-8 and HUC-12

3. **Location Services**
   - Nearest city calculated using USGS GNIS database
   - County boundaries from Census Bureau
   - River/stream names from NHD dataset
   - Emergency services locations from HSIP dataset

## MapBox Integration for DamInspect

### Displaying Geospatial Assets

DamSafety.IO provides geospatial asset data that DamInspect should render on MapBox maps. Here's how to fetch and display these assets:

#### 1. Fetching Geospatial Assets
```http
GET /api/dams/{damId}/geospatial-assets
```
**Response**:
```json
{
  "damProfile": {
    "type": "LineString",
    "coordinates": [[lng, lat, elevation], ...],
    "properties": {
      "name": "Dam Crest Profile",
      "color": "#FF0000",
      "width": 3
    }
  },
  "infrastructure": [
    {
      "id": "fiber-001",
      "type": "LineString",
      "coordinates": [[lng, lat], ...],
      "properties": {
        "assetType": "fiber_optic",
        "name": "Main Fiber Line",
        "installDate": "2020-05-15",
        "color": "#00FF00",
        "dashArray": "5, 5"
      }
    },
    {
      "id": "power-001",
      "type": "LineString",
      "coordinates": [[lng, lat], ...],
      "properties": {
        "assetType": "power_line",
        "name": "Primary Power Feed",
        "voltage": "13.8kV",
        "color": "#FFFF00"
      }
    }
  ],
  "monitoringPoints": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [lng, lat]
        },
        "properties": {
          "id": "pz-001",
          "type": "piezometer",
          "name": "Piezometer 1",
          "icon": "water-sensor",
          "lastReading": 125.5
        }
      }
    ]
  },
  "boundaries": {
    "propertyLine": {
      "type": "Polygon",
      "coordinates": [[[lng, lat], ...]],
      "properties": {
        "name": "Property Boundary",
        "fillColor": "rgba(0, 0, 255, 0.1)",
        "strokeColor": "#0000FF"
      }
    },
    "restrictedArea": {
      "type": "Polygon",
      "coordinates": [[[lng, lat], ...]],
      "properties": {
        "name": "Restricted Area",
        "fillColor": "rgba(255, 0, 0, 0.2)",
        "strokeColor": "#FF0000"
      }
    }
  }
}
```

#### 2. MapBox Layer Configuration
```javascript
// Add dam profile layer
map.addLayer({
  id: 'dam-profile',
  type: 'line',
  source: {
    type: 'geojson',
    data: damProfile
  },
  layout: {
    'line-join': 'round',
    'line-cap': 'round'
  },
  paint: {
    'line-color': ['get', 'color'],
    'line-width': ['get', 'width'],
    'line-opacity': 0.8
  }
});

// Add infrastructure layers (fiber optic, power lines, etc.)
infrastructure.forEach(asset => {
  map.addLayer({
    id: asset.id,
    type: 'line',
    source: {
      type: 'geojson',
      data: asset
    },
    paint: {
      'line-color': asset.properties.color,
      'line-dasharray': asset.properties.dashArray || [1, 0],
      'line-width': 2
    }
  });
});

// Add monitoring points with custom icons
map.addLayer({
  id: 'monitoring-points',
  type: 'symbol',
  source: {
    type: 'geojson',
    data: monitoringPoints
  },
  layout: {
    'icon-image': ['get', 'icon'],
    'icon-size': 1.5,
    'text-field': ['get', 'name'],
    'text-offset': [0, 1.5],
    'text-anchor': 'top'
  }
});
```

#### 3. Asset Types and Styling Guidelines

| Asset Type | Color | Style | Z-Index |
|------------|--------|-------|---------|
| Dam Crest | #8B4513 | Solid, 4px | 100 |
| Spillway | #4169E1 | Solid, 3px | 99 |
| Fiber Optic | #00FF00 | Dashed | 95 |
| Power Line | #FFFF00 | Solid | 94 |
| Water Pipeline | #00CED1 | Solid | 93 |
| Access Road | #808080 | Solid | 90 |
| Piezometer | Icon: water-drop | - | 110 |
| Survey Point | Icon: marker | - | 109 |
| Gate/Valve | Icon: valve | - | 108 |

#### 4. Interactive Features
```javascript
// Click handler for asset information
map.on('click', 'monitoring-points', (e) => {
  const properties = e.features[0].properties;
  new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(`
      <h3>${properties.name}</h3>
      <p>Type: ${properties.type}</p>
      <p>Last Reading: ${properties.lastReading}</p>
      <button onclick="captureReading('${properties.id}')">
        New Reading
      </button>
    `)
    .addTo(map);
});

// Hover effects
map.on('mouseenter', 'dam-profile', () => {
  map.getCanvas().style.cursor = 'pointer';
});
```

#### 5. Offline Map Tiles
```javascript
// Cache map tiles for offline use
const offlineTiles = {
  style: 'mapbox://styles/mapbox/satellite-v9',
  bounds: [
    [dam.longitude - 0.01, dam.latitude - 0.01],
    [dam.longitude + 0.01, dam.latitude + 0.01]
  ],
  minZoom: 10,
  maxZoom: 18
};

// Download tiles when connected
await mapboxOffline.downloadTiles(offlineTiles);
```

## Notification & Alert System

### Alert Propagation Chain
```
Critical Finding → Dam Owner → State Dam Safety Office → Emergency Management
                → Engineers of Record
                → Downstream Authorities (if applicable)
```

### Notification Channels
1. **Email**: Primary channel, guaranteed delivery
2. **SMS**: Critical alerts only (requires opt-in)
3. **In-app**: Real-time via WebSocket
4. **Phone**: Automated calls for IMMINENT_FAILURE only

### Escalation Matrix
| Threat Level | Notification Timeline | Recipients | Method |
|-------------|----------------------|------------|---------|
| NO_THREAT | No notification | - | - |
| FALSE_ALARM | Within 24 hours | Dam owner | Email |
| HIGH_FLOW_OPERATION | Within 4 hours | Owner, State office | Email, In-app |
| NON_FAILURE_EMERGENCY | Within 1 hour | Owner, State, Local EM | Email, SMS |
| POTENTIAL_FAILURE_EMERGENCY | Immediate | All stakeholders | All channels |
| IMMINENT_FAILURE | Immediate + continuous | All + public warning | All + sirens |

## External System Integrations

### Third-Party Services
1. **Weather Data**: NOAA/NWS API
   - Real-time conditions
   - Precipitation forecasts
   - Historical data for analysis

2. **Seismic Data**: USGS Earthquake API
   - Real-time earthquake monitoring
   - Automatic special inspection triggers

3. **Stream Gauge Data**: USGS Water Services
   - Real-time water levels
   - Flow rates
   - Historical hydrographs

4. **Emergency Services**: IPAWS Integration
   - Emergency alert dissemination
   - Wireless Emergency Alerts (WEA)
   - Emergency Alert System (EAS)

### Data Exchange Formats
1. **Import Formats**
   - CSV for bulk dam imports
   - GeoJSON for spatial data
   - XML for USACE data exchange
   - PDF parsing for legacy reports

2. **Export Formats**
   - PDF reports for regulatory submission
   - Excel for data analysis
   - KML for Google Earth
   - GeoJSON for GIS systems
   - XML for NPDP reporting

## Change Management & Audit

### Version Control for Critical Data
1. **Tracked Entities**
   - Dam specifications (any change triggers version)
   - Inspection reports (immutable once approved)
   - Emergency Action Plans (full version history)
   - Threat level changes (complete audit trail)

2. **Change Approval Workflow**
   - Draft → Review → Approval → Published
   - Role-based approval chains
   - Comments and revision tracking
   - Rollback capabilities for non-inspection data

### Audit Requirements
1. **Mandatory Audit Events**
   - User login/logout
   - Dam data modifications
   - Inspection submissions
   - Document uploads/deletions
   - Permission changes
   - Threat level modifications

2. **Audit Data Retention**
   - User access logs: 2 years
   - Data change logs: 10 years
   - Security events: 5 years
   - System logs: 90 days

## Service Level Agreements & Reliability

### System Availability
- **Target Uptime**: 99.9% (8.76 hours downtime/year)
- **Maintenance Windows**: Sunday 2-6 AM EST
- **Disaster Recovery**: RTO 4 hours, RPO 1 hour
- **Data Backup**: Daily full, hourly incremental

### Performance Targets
- **API Response Time**: p95 < 500ms
- **File Upload**: 10 MB/s minimum
- **Search Queries**: < 2 seconds
- **Report Generation**: < 30 seconds

### Data Consistency Guarantees
- **Inspection Data**: ACID compliant transactions
- **Sensor Readings**: Eventually consistent (5-minute window)
- **Documents**: Immediate consistency after upload confirmation
- **Sync Operations**: Conflict resolution via last-write-wins

## Monitoring & Observability

### Required Telemetry from DamInspect
1. **Application Metrics**
   - API call success/failure rates
   - Sync queue depth
   - Offline duration
   - Data collection time per inspection

2. **User Analytics**
   - Feature usage patterns
   - Error encounters
   - Network connectivity issues
   - Device/OS statistics

3. **Performance Metrics**
   - API response times
   - Upload/download speeds
   - Battery consumption
   - Memory usage

### Logging Standards
```json
{
  "timestamp": "2024-01-22T10:30:00Z",
  "level": "INFO|WARN|ERROR|CRITICAL",
  "userId": "user-uuid",
  "damId": "dam-uuid",
  "action": "inspection.create",
  "metadata": {
    "deviceId": "device-uuid",
    "appVersion": "1.0.0",
    "location": {"lat": 34.5, "lng": -98.7},
    "networkType": "wifi|cellular|offline"
  }
}
```

## Inspection Workflow & Data Flow

### Typical Inspection Process

1. **Pre-Inspection Setup**
   - Fetch dam details and specifications
   - Load previous inspection reports
   - Get current sensor readings
   - Retrieve monitoring point locations
   - Download relevant documents/drawings

2. **During Inspection**
   - Create inspection record (can be draft)
   - Record visual observations
   - Take georeferenced photos
   - Collect manual instrument readings
   - Note maintenance issues
   - Identify safety concerns

3. **Post-Inspection**
   - Upload photos to Azure Blob
   - Submit inspection report
   - Create maintenance tasks if needed
   - Update dam condition rating
   - Trigger alerts for critical issues

### Critical Data Relationships

```mermaid
graph TD
    Dam --> Inspection
    Dam --> Sensor
    Dam --> MonitoringPoint
    Dam --> Alert
    Dam --> Document
    
    Inspection --> Photo
    Inspection --> Document
    
    Sensor --> SensorReading
    MonitoringPoint --> Measurement
    
    User --> Inspection
    User --> DamAccess
    Organization --> Dam
```

### Data Input Workflow

#### Step 1: Authenticate & Get Permissions
```javascript
// Get user's accessible dams
const response = await fetch('/api/dams/accessible', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const accessibleDams = await response.json();
```

#### Step 2: Load Dam Context
```javascript
// Get dam details with related data
const damData = await fetch(`/api/dams/${damId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get monitoring points for manual readings
const monitoringPoints = await fetch(`/api/dams/${damId}/monitoring-points`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get active sensors
const sensors = await fetch(`/api/dams/${damId}/sensors`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Step 3: Create/Update Inspection
```javascript
// Create new inspection (initially as DRAFT)
const inspection = await fetch(`/api/dams/${damId}/inspections`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'ROUTINE',
    date: new Date().toISOString(),
    status: 'DRAFT',
    findings: '',
    rating: 'GOOD'
  })
});
```

#### Step 4: Submit Instrumentation Data
```javascript
// Manual piezometer reading
await fetch(`/api/dams/${damId}/sensors/${sensorId}/readings`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    value: 125.5,
    timestamp: new Date().toISOString(),
    quality: 'GOOD',
    metadata: {
      manualReading: true,
      instrumentType: 'piezometer',
      readingMethod: 'manual'
    }
  })
});

// Survey monitoring point
await fetch(`/api/dams/${damId}/monitoring-points/${pointId}/measurements`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    value: 1234.56,
    unit: 'feet',
    date: new Date().toISOString(),
    inspector: 'John Doe',
    notes: 'No movement detected'
  })
});
```

#### Step 5: Upload Media & Documents
```javascript
// Get SAS token for upload
const sasResponse = await fetch('/api/documents/upload-sas', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { sasUrl } = await sasResponse.json();

// Upload to Azure
await fetch(sasUrl, {
  method: 'PUT',
  headers: {
    'x-ms-blob-type': 'BlockBlob',
    'Content-Type': file.type
  },
  body: file
});

// Link to inspection
await fetch(`/api/dams/${damId}/inspections/${inspectionId}/documents`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    documentIds: [documentId]
  })
});
```

### Important Database Constraints

1. **User Permissions**: Check `DamAccess` table for user-dam relationships
2. **Organization Scope**: Users can only access dams within their organization
3. **Role Restrictions**: Some operations require ENGINEER role or higher
4. **Data Validation**: 
   - Inspection dates cannot be future dates
   - Sensor readings must be within threshold ranges
   - Photos must have geolocation when possible
5. **Audit Trail**: All changes tracked in respective history tables

### Field Data Priority

**Critical Data (Must Sync Immediately)**:
- Threat level changes
- Critical alerts
- Emergency findings
- Safety hazards
- Seepage observations exceeding thresholds
- Structural movement detected

**High Priority (Sync Within Hour)**:
- Inspection submissions
- Abnormal sensor readings
- Maintenance issues
- New cracks or deterioration
- Gate/valve malfunctions

**Normal Priority (Sync When Connected)**:
- Routine measurements
- Photos and documents
- Draft inspections
- Vegetation observations
- Minor maintenance notes

## Critical Business Logic for DamInspect

### Inspection State Machine
```
DRAFT → SUBMITTED → IN_REVIEW → APPROVED → PUBLISHED
         ↓           ↓            ↓
      REJECTED ← REVISION_REQUESTED
```

### Automatic Triggers in DamSafety.IO
1. **Inspection Due Alerts**: 30, 60, 90 days before due date
2. **Overdue Escalation**: Daily alerts after due date
3. **Weather-Based Triggers**: 
   - Rainfall > 5 inches in 24 hours
   - Earthquake > 4.0 magnitude within 50 miles
   - Rapid snowmelt conditions
4. **Sensor-Based Triggers**:
   - Piezometer readings > action levels
   - Seepage flow > 20% increase
   - Movement > 0.1 inches/month

### Data Validation Rules
1. **Numeric Ranges**
   - Water level: Cannot exceed dam crest elevation
   - Flow rates: Must be positive values
   - Dates: Cannot be future dates for completed actions
2. **Required Relationships**
   - Every measurement must link to valid monitoring point
   - Photos must associate with inspection or document
   - All readings must have inspector identification
3. **Business Logic Validations**
   - Cannot approve own inspection (requires different reviewer)
   - Cannot downgrade threat level without justification
   - Special inspections cannot close routine inspection requirements

## Event-Driven Architecture & Real-time Updates

### Event Bus Implementation
DamSafety.IO uses an event-driven architecture for real-time updates. DamInspect should subscribe to these events:

```typescript
// Event types emitted by DamSafety.IO
enum SystemEvents {
  // Dam Events
  DAM_UPDATED = 'dam.updated',
  DAM_STATUS_CHANGED = 'dam.status.changed',
  DAM_THREAT_LEVEL_CHANGED = 'dam.threat.changed',
  
  // Inspection Events
  INSPECTION_SUBMITTED = 'inspection.submitted',
  INSPECTION_APPROVED = 'inspection.approved',
  INSPECTION_REJECTED = 'inspection.rejected',
  
  // Sensor Events
  SENSOR_THRESHOLD_EXCEEDED = 'sensor.threshold.exceeded',
  SENSOR_OFFLINE = 'sensor.offline',
  SENSOR_DATA_RECEIVED = 'sensor.data.received',
  
  // Alert Events
  ALERT_CREATED = 'alert.created',
  ALERT_ACKNOWLEDGED = 'alert.acknowledged',
  EMERGENCY_DECLARED = 'emergency.declared',
  
  // System Events
  MAINTENANCE_SCHEDULED = 'system.maintenance.scheduled',
  API_VERSION_DEPRECATED = 'api.version.deprecated'
}

// WebSocket connection for real-time events
class DamSafetyEventBus {
  private ws: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  connect(token: string) {
    this.ws = new WebSocket('wss://api.damsafety.io/events');
    
    this.ws.onopen = () => {
      // Authenticate
      this.ws.send(JSON.stringify({
        type: 'auth',
        token: token
      }));
      
      // Subscribe to relevant events
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        events: [
          SystemEvents.DAM_THREAT_LEVEL_CHANGED,
          SystemEvents.ALERT_CREATED,
          SystemEvents.INSPECTION_APPROVED
        ]
      }));
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent(data);
    };
    
    this.ws.onerror = () => {
      this.reconnect();
    };
  }
  
  private handleEvent(event: any) {
    switch(event.type) {
      case SystemEvents.DAM_THREAT_LEVEL_CHANGED:
        // Update local UI immediately
        updateDamThreatLevel(event.damId, event.newLevel);
        // Show notification to user
        showCriticalNotification(event.message);
        break;
        
      case SystemEvents.ALERT_CREATED:
        // Add to local alert queue
        addToAlertQueue(event.alert);
        // Trigger sound/vibration if critical
        if (event.severity === 'CRITICAL') {
          triggerEmergencyAlert();
        }
        break;
    }
  }
  
  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(getStoredToken());
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }
}
```

## Data Conflict Resolution Strategy

### Handling Concurrent Edits
When multiple users or systems modify data simultaneously:

```typescript
interface ConflictResolution {
  // Version tracking for optimistic locking
  version: number;
  lastModified: Date;
  modifiedBy: string;
  
  // Conflict detection
  detectConflict(local: any, remote: any): boolean {
    return local.version !== remote.version;
  }
  
  // Resolution strategies
  resolveConflict(local: any, remote: any, strategy: 'LOCAL_WINS' | 'REMOTE_WINS' | 'MERGE'): any {
    switch(strategy) {
      case 'LOCAL_WINS':
        return { ...remote, ...local, version: remote.version + 1 };
      
      case 'REMOTE_WINS':
        return remote;
      
      case 'MERGE':
        // For inspections, merge non-conflicting fields
        return {
          ...remote,
          findings: local.findings || remote.findings,
          photos: [...(remote.photos || []), ...(local.photos || [])],
          measurements: this.mergeMeasurements(local.measurements, remote.measurements),
          version: remote.version + 1
        };
    }
  }
  
  // Special handling for measurements
  mergeMeasurements(local: any[], remote: any[]): any[] {
    const merged = new Map();
    
    // Add all remote measurements
    remote.forEach(m => merged.set(`${m.pointId}_${m.timestamp}`, m));
    
    // Override or add local measurements
    local.forEach(m => {
      const key = `${m.pointId}_${m.timestamp}`;
      if (!merged.has(key) || m.modifiedAt > merged.get(key).modifiedAt) {
        merged.set(key, m);
      }
    });
    
    return Array.from(merged.values());
  }
}
```

## Transaction Management & Data Integrity

### Distributed Transaction Pattern
For operations that span multiple services:

```typescript
class DistributedTransaction {
  private transactionId: string;
  private operations: Operation[] = [];
  private completedOps: string[] = [];
  
  async execute(): Promise<void> {
    this.transactionId = generateUUID();
    
    try {
      // Phase 1: Prepare all operations
      for (const op of this.operations) {
        await this.prepare(op);
      }
      
      // Phase 2: Commit all operations
      for (const op of this.operations) {
        await this.commit(op);
        this.completedOps.push(op.id);
      }
    } catch (error) {
      // Rollback completed operations
      await this.rollback();
      throw error;
    }
  }
  
  private async prepare(op: Operation): Promise<void> {
    // Validate operation can be performed
    const response = await fetch(`${op.endpoint}/prepare`, {
      method: 'POST',
      headers: {
        'X-Transaction-ID': this.transactionId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(op.data)
    });
    
    if (!response.ok) {
      throw new Error(`Prepare failed for ${op.id}`);
    }
  }
  
  private async commit(op: Operation): Promise<void> {
    await fetch(`${op.endpoint}/commit`, {
      method: 'POST',
      headers: {
        'X-Transaction-ID': this.transactionId
      }
    });
  }
  
  private async rollback(): Promise<void> {
    for (const opId of this.completedOps) {
      await fetch(`${this.operations.find(o => o.id === opId)?.endpoint}/rollback`, {
        method: 'POST',
        headers: {
          'X-Transaction-ID': this.transactionId
        }
      });
    }
  }
}

// Example: Creating inspection with multiple related entities
const createInspectionTransaction = new DistributedTransaction();
createInspectionTransaction.addOperation({
  id: 'create-inspection',
  endpoint: '/api/inspections',
  data: inspectionData
});
createInspectionTransaction.addOperation({
  id: 'update-dam-status',
  endpoint: '/api/dams/status',
  data: { damId, status: 'INSPECTED' }
});
createInspectionTransaction.addOperation({
  id: 'create-tasks',
  endpoint: '/api/maintenance/tasks',
  data: maintenanceTasks
});
await createInspectionTransaction.execute();
```

## Database Connection Pooling & Optimization

### Connection Management for Mobile
```typescript
interface DatabaseConfig {
  // Connection pool settings optimized for mobile
  pool: {
    min: 1,              // Minimum connections (battery saving)
    max: 5,              // Maximum connections (limited by mobile OS)
    idle: 10000,         // Release idle connections after 10 seconds
    acquire: 30000,      // Timeout for acquiring connection
    evict: 1000          // Check for idle connections every second
  },
  
  // Retry configuration
  retry: {
    max: 3,
    backoff: 'exponential',
    delay: 1000
  },
  
  // Query optimization
  query: {
    timeout: 5000,       // 5 second query timeout
    cache: true,         // Enable query result caching
    cacheTime: 300000    // Cache for 5 minutes
  }
}

// Singleton connection manager
class ConnectionManager {
  private static instance: ConnectionManager;
  private pool: any;
  private activeConnections = 0;
  
  static getInstance(): ConnectionManager {
    if (!this.instance) {
      this.instance = new ConnectionManager();
    }
    return this.instance;
  }
  
  async getConnection(): Promise<Connection> {
    // Check if we're approaching mobile connection limits
    if (this.activeConnections >= 5) {
      await this.waitForAvailableConnection();
    }
    
    const conn = await this.pool.acquire();
    this.activeConnections++;
    
    // Auto-release after timeout
    setTimeout(() => this.releaseConnection(conn), 30000);
    
    return conn;
  }
  
  private async waitForAvailableConnection(): Promise<void> {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.activeConnections < 5) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
}
```

## API Response Caching Strategy

### Intelligent Cache Management
```typescript
class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private cacheRules: CacheRule[] = [
    // Dam data - cache for 1 hour
    { pattern: /^\/api\/dams\/[^\/]+$/, ttl: 3600000, strategy: 'STALE_WHILE_REVALIDATE' },
    
    // Monitoring points - cache indefinitely (rarely change)
    { pattern: /^\/api\/dams\/[^\/]+\/monitoring-points$/, ttl: Infinity, strategy: 'CACHE_FIRST' },
    
    // Sensor readings - cache for 5 minutes
    { pattern: /^\/api\/sensors\/.*\/readings$/, ttl: 300000, strategy: 'NETWORK_FIRST' },
    
    // User profile - cache for 30 minutes
    { pattern: /^\/api\/users\/me$/, ttl: 1800000, strategy: 'STALE_WHILE_REVALIDATE' }
  ];
  
  async fetch(url: string, options: RequestInit): Promise<Response> {
    const cacheKey = this.getCacheKey(url, options);
    const rule = this.getCacheRule(url);
    
    if (!rule) {
      // No caching for this endpoint
      return fetch(url, options);
    }
    
    switch (rule.strategy) {
      case 'CACHE_FIRST':
        return this.cacheFirst(cacheKey, url, options, rule.ttl);
      
      case 'NETWORK_FIRST':
        return this.networkFirst(cacheKey, url, options, rule.ttl);
      
      case 'STALE_WHILE_REVALIDATE':
        return this.staleWhileRevalidate(cacheKey, url, options, rule.ttl);
    }
  }
  
  private async staleWhileRevalidate(key: string, url: string, options: RequestInit, ttl: number): Promise<Response> {
    const cached = this.cache.get(key);
    
    if (cached && !this.isExpired(cached)) {
      // Return cached immediately
      return cached.response.clone();
    }
    
    if (cached) {
      // Return stale cache and revalidate in background
      this.revalidateInBackground(key, url, options, ttl);
      return cached.response.clone();
    }
    
    // No cache, fetch from network
    const response = await fetch(url, options);
    this.cache.set(key, {
      response: response.clone(),
      timestamp: Date.now(),
      ttl
    });
    return response;
  }
  
  private revalidateInBackground(key: string, url: string, options: RequestInit, ttl: number): void {
    fetch(url, options)
      .then(response => {
        this.cache.set(key, {
          response: response.clone(),
          timestamp: Date.now(),
          ttl
        });
      })
      .catch(error => {
        console.error('Background revalidation failed:', error);
      });
  }
}
```

## Field Data Validation & Sanitization

### Input Validation Rules
```typescript
class FieldDataValidator {
  // Validation rules specific to dam safety domain
  private rules = {
    waterLevel: {
      type: 'number',
      min: 0,
      max: (dam: Dam) => dam.crestElevation + 10, // Can't exceed crest by more than 10 feet
      precision: 2
    },
    seepageRate: {
      type: 'number',
      min: 0,
      max: 10000, // gallons per minute
      warningThreshold: 100,
      criticalThreshold: 500
    },
    piezometerReading: {
      type: 'number',
      validator: (value: number, historicalData: number[]) => {
        const avg = historicalData.reduce((a, b) => a + b, 0) / historicalData.length;
        const deviation = Math.abs(value - avg) / avg;
        
        if (deviation > 0.5) {
          return {
            valid: true,
            warning: 'Reading deviates >50% from historical average',
            requiresConfirmation: true
          };
        }
        return { valid: true };
      }
    },
    gpsCoordinates: {
      validator: (lat: number, lng: number, damLat: number, damLng: number) => {
        const distance = calculateDistance(lat, lng, damLat, damLng);
        
        if (distance > 5) { // More than 5 miles from dam
          return {
            valid: false,
            error: 'GPS coordinates too far from dam location'
          };
        }
        return { valid: true };
      }
    }
  };
  
  // Sanitize data before sending to API
  sanitize(data: any): any {
    // Remove null/undefined values
    const cleaned = Object.entries(data)
      .filter(([_, v]) => v != null)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
    
    // Trim strings
    Object.keys(cleaned).forEach(key => {
      if (typeof cleaned[key] === 'string') {
        cleaned[key] = cleaned[key].trim();
      }
    });
    
    // Round numbers to appropriate precision
    if (cleaned.waterLevel) {
      cleaned.waterLevel = Math.round(cleaned.waterLevel * 100) / 100;
    }
    
    // Ensure arrays are not empty
    if (cleaned.photos && cleaned.photos.length === 0) {
      delete cleaned.photos;
    }
    
    return cleaned;
  }
}
```

## Offline Capability & Sync Strategy

### Recommended Approach
1. **Local Storage**: Use SQLite or IndexedDB for offline data storage
2. **Queue System**: Implement a sync queue for pending operations
3. **Conflict Resolution**: Last-write-wins with version tracking
4. **Sync Protocol**:
   - Check connectivity status
   - Queue operations when offline
   - Batch sync when connection restored
   - Handle conflicts with user notification

### Sync Endpoints
```http
POST /api/sync/batch
```
**Request Body**:
```json
{
  "operations": [
    {
      "type": "CREATE|UPDATE|DELETE",
      "entity": "inspection|measurement|photo",
      "data": {},
      "timestamp": "2024-01-22T10:00:00Z",
      "clientId": "unique-client-operation-id"
    }
  ],
  "lastSyncTimestamp": "2024-01-21T10:00:00Z"
}
```

## File Upload Strategy

### Azure Blob Storage Integration
1. **Get SAS Token**:
```http
POST /api/documents/upload-sas
```
Response includes temporary upload URL with SAS token

2. **Upload to Azure Blob**:
```javascript
const uploadToBlob = async (file, sasUrl) => {
  const response = await fetch(sasUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type
    },
    body: file
  });
  return response.ok;
};
```

3. **Register Document**:
```http
POST /api/documents
```
Register the uploaded file in the database

## Error Handling

### Standard Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional context"
    }
  },
  "timestamp": "2024-01-22T10:00:00Z",
  "requestId": "unique-request-id"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

### Default Limits
- **Authenticated Users**: 10,000 requests/hour
- **Per Endpoint**: Varies (heavy operations limited to 100/hour)
- **File Uploads**: 50 MB max file size, 100 files/hour

### Rate Limit Headers
```http
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9950
X-RateLimit-Reset: 1705928400
```

## Security Requirements

### Required Security Headers
```http
X-Request-ID: unique-request-id
X-API-Version: v1
User-Agent: InspectionApp/1.0
```

### Data Encryption
- All API communication over HTTPS/TLS 1.2+
- Sensitive data encrypted at rest
- PII fields encrypted in database

### API Key Management
- JWT tokens expire after 30 days
- Refresh token rotation implemented
- Token revocation on security events

## WebSocket Integration (Real-time Updates)

### Connection Endpoint
```
wss://api.damsafety.io/ws
```

### Authentication
```javascript
const ws = new WebSocket('wss://api.damsafety.io/ws', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Event Types
```javascript
// Subscribe to dam updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'dam-updates',
  damId: 'dam-id'
}));

// Receive updates
ws.on('message', (data) => {
  const event = JSON.parse(data);
  // Handle: sensor-update, alert-created, inspection-submitted
});
```

## Development & Testing

### Local Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up PostgreSQL database
4. Configure environment variables
5. Run migrations: `npx prisma migrate dev`
6. Start development server: `npm run dev`

### API Testing Tools
- **Postman Collection**: Available on request
- **OpenAPI/Swagger**: `/api/docs` (development only)
- **GraphQL Playground**: Not currently implemented

### Test Credentials
Contact the DamSafety.IO team for sandbox access credentials.

## Testing Integration with DamSafety.IO

### 1. Authentication Testing
```javascript
// Test: Verify same credentials work for both systems
describe('Authentication Integration', () => {
  test('Should authenticate with DamSafety.IO credentials', async () => {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    expect(response.status).toBe(200);
    const { token } = await response.json();
    expect(token).toBeDefined();
    
    // Verify token works with DamSafety.IO API
    const damSafetyResponse = await fetch('https://api.damsafety.io/api/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    expect(damSafetyResponse.status).toBe(200);
  });
  
  test('Should enforce 2FA when enabled', async () => {
    // Test 2FA flow
    const mfaResponse = await fetch('/api/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({
        code: '123456',
        userId: testUser.id
      })
    });
    expect(mfaResponse.status).toBe(200);
  });
});
```

### 2. Data Synchronization Testing
```javascript
// Test: Verify data consistency between systems
describe('Data Synchronization', () => {
  test('Should fetch same dam data as DamSafety.IO', async () => {
    const damId = 'test-dam-id';
    
    // Fetch from DamInspect
    const inspectData = await fetchDamData(damId);
    
    // Fetch from DamSafety.IO
    const damSafetyData = await fetch(`https://api.damsafety.io/api/dams/${damId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
    
    // Compare critical fields
    expect(inspectData.id).toBe(damSafetyData.id);
    expect(inspectData.name).toBe(damSafetyData.name);
    expect(inspectData.latitude).toBe(damSafetyData.latitude);
    expect(inspectData.longitude).toBe(damSafetyData.longitude);
    expect(inspectData.hazardClassification).toBe(damSafetyData.hazardClassification);
  });
  
  test('Should sync inspection data to DamSafety.IO', async () => {
    const inspection = createTestInspection();
    
    // Submit through DamInspect
    const submitResponse = await submitInspection(inspection);
    expect(submitResponse.status).toBe(201);
    
    // Verify appears in DamSafety.IO
    await waitFor(async () => {
      const damSafetyInspection = await fetch(
        `https://api.damsafety.io/api/dams/${inspection.damId}/inspections/${inspection.id}`,
        { headers: { 'Authorization': `Bearer ${token}` }}
      ).then(res => res.json());
      
      expect(damSafetyInspection).toBeDefined();
      expect(damSafetyInspection.findings).toBe(inspection.findings);
    }, { timeout: 10000 });
  });
});
```

### 3. Offline/Online Testing
```javascript
// Test: Verify offline capability and sync
describe('Offline Functionality', () => {
  test('Should queue operations when offline', async () => {
    // Simulate offline
    await setNetworkStatus('offline');
    
    // Create inspection offline
    const inspection = await createInspectionOffline();
    expect(inspection.syncStatus).toBe('pending');
    
    // Verify stored locally
    const localData = await getLocalStorage('inspections');
    expect(localData).toContainEqual(inspection);
    
    // Simulate coming online
    await setNetworkStatus('online');
    
    // Wait for sync
    await waitFor(async () => {
      const syncStatus = await getSyncStatus(inspection.id);
      expect(syncStatus).toBe('synced');
    });
    
    // Verify in DamSafety.IO
    const serverInspection = await fetchFromDamSafety(inspection.id);
    expect(serverInspection).toBeDefined();
  });
});
```

### 4. Permission Testing
```javascript
// Test: Verify permission enforcement
describe('Permission Enforcement', () => {
  test('Should respect dam access permissions', async () => {
    const restrictedDamId = 'restricted-dam';
    
    // Attempt to access restricted dam
    const response = await fetch(`/api/dams/${restrictedDamId}`, {
      headers: { 'Authorization': `Bearer ${limitedUserToken}` }
    });
    
    expect(response.status).toBe(403);
  });
  
  test('Should enforce role-based access', async () => {
    // Test viewer cannot submit inspection
    const viewerResponse = await fetch('/api/dams/test/inspections', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${viewerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testInspection)
    });
    
    expect(viewerResponse.status).toBe(403);
  });
});
```

### 5. Integration Health Checks
```javascript
// Continuous health monitoring
const healthChecks = {
  // Check API connectivity
  async checkAPIConnection() {
    const response = await fetch('https://api.damsafety.io/api/health');
    return response.status === 200;
  },
  
  // Check authentication service
  async checkAuthService() {
    const response = await fetch('/api/auth/session');
    return response.status === 200;
  },
  
  // Check data sync queue
  async checkSyncQueue() {
    const queueDepth = await getSyncQueueDepth();
    return queueDepth < 100; // Alert if queue backs up
  },
  
  // Check storage availability
  async checkStorage() {
    const available = await getAvailableStorage();
    return available > 100 * 1024 * 1024; // 100MB minimum
  }
};

// Run health checks periodically
setInterval(async () => {
  const results = await Promise.all([
    healthChecks.checkAPIConnection(),
    healthChecks.checkAuthService(),
    healthChecks.checkSyncQueue(),
    healthChecks.checkStorage()
  ]);
  
  if (results.some(r => !r)) {
    await notifyUser('System health check failed');
  }
}, 60000); // Every minute
```

### 6. Test Data Sets
```javascript
// Sandbox test data available in DamSafety.IO
const testData = {
  dams: [
    {
      id: 'test-dam-001',
      name: 'Test Dam Alpha',
      hazardClass: 'HIGH',
      inspectionDue: '2024-06-01'
    },
    {
      id: 'test-dam-002', 
      name: 'Test Dam Beta',
      hazardClass: 'LOW',
      inspectionDue: '2024-12-01'
    }
  ],
  users: [
    {
      email: 'inspector@test.damsafety.io',
      role: 'ENGINEER',
      password: 'provided-on-request'
    },
    {
      email: 'viewer@test.damsafety.io',
      role: 'VIEWER',
      password: 'provided-on-request'
    }
  ],
  monitoringPoints: [
    {
      id: 'test-pz-001',
      damId: 'test-dam-001',
      type: 'piezometer'
    }
  ]
};
```

### 7. Automated Test Suite
```bash
# Run full integration test suite
npm run test:integration

# Test specific features
npm run test:auth           # Authentication tests
npm run test:sync           # Data sync tests
npm run test:offline        # Offline functionality
npm run test:permissions    # Permission tests
npm run test:performance    # Performance benchmarks
```

### 8. Performance Benchmarks
```javascript
// Expected performance metrics
const benchmarks = {
  apiResponseTime: {
    p50: 200,  // ms
    p95: 500,  // ms
    p99: 1000  // ms
  },
  syncTime: {
    singleInspection: 5000,     // ms
    batchOf10: 15000,           // ms
    withPhotos: 30000           // ms
  },
  offlineCapability: {
    maxOfflineDays: 7,
    maxQueuedOperations: 1000,
    maxCachedPhotos: 500
  }
};
```

## Migration & Deployment Considerations

### Data Migration from Legacy Systems
1. **Common Source Systems**
   - Excel spreadsheets with inspection history
   - PDF reports requiring OCR and parsing
   - Legacy Access databases
   - Paper records requiring digitization

2. **Migration Validation**
   - Checksum verification for all migrated records
   - Parallel run period with legacy system
   - Audit reports comparing old vs new data
   - User acceptance testing by inspectors

### Deployment Architecture
1. **Production Environment**
   - Azure App Service (Linux containers)
   - Azure Database for PostgreSQL
   - Azure Blob Storage with CDN
   - Azure Application Gateway with WAF

2. **Staging Environment**
   - Mirrors production with reduced resources
   - Used for user acceptance testing
   - Data refresh from production weekly

3. **Development Environment**
   - Local Docker containers
   - Seed data for testing
   - Mock external services

## Known Limitations & Workarounds

### Current System Limitations
1. **Offline Limitations**
   - Maximum 7 days of offline operation before forced sync
   - Limited to 1000 photos in offline storage
   - Complex calculations require online connection

2. **Platform-Specific Issues**
   - iOS: Background sync limited by iOS restrictions
   - Android: Battery optimization may interrupt long syncs
   - Web: Limited offline capability in browsers

3. **Data Constraints**
   - Cannot delete approved inspections (regulatory requirement)
   - Cannot modify sensor data after 24 hours
   - Photos cannot be removed once linked to findings

### Recommended Workarounds
1. **For Large Inspections**
   - Break into multiple partial inspections
   - Sync photos immediately after capture
   - Use progressive upload for documents

2. **For Poor Connectivity**
   - Pre-download dam data when connected
   - Use low-resolution photo mode
   - Queue non-critical data for later sync

## Integration Checklist for DamInspect

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Azure AD app registration
- [ ] Configure authentication flow
- [ ] Implement JWT token management
- [ ] Set up development environment
- [ ] Create basic API client with proper headers
- [ ] Implement error handling framework

### Phase 2: Core Functionality (Week 3-4)
- [ ] Implement dam data retrieval
- [ ] Create inspection submission workflow
- [ ] Add photo capture and upload
- [ ] Implement manual instrumentation input
- [ ] Add basic offline data storage
- [ ] Create sync queue mechanism

### Phase 3: Advanced Features (Week 5-6)
- [ ] Handle file uploads to Azure Blob
- [ ] Implement conflict resolution
- [ ] Add rate limit handling
- [ ] Set up WebSocket connection for real-time updates
- [ ] Implement comprehensive data validation
- [ ] Add GPS and mapping features

### Phase 4: Polish & Testing (Week 7-8)
- [ ] Add logging and monitoring
- [ ] Implement telemetry collection
- [ ] Test offline/online transitions
- [ ] Add user feedback for sync status
- [ ] Performance optimization
- [ ] Security audit

### Phase 5: Compliance & Documentation (Week 9-10)
- [ ] Regulatory compliance validation
- [ ] Create user documentation
- [ ] Inspector training materials
- [ ] Deployment procedures
- [ ] Disaster recovery testing

## Implementation Best Practices

### Data Collection Guidelines

1. **GPS Accuracy**
   - Always capture GPS coordinates for photos and observations
   - Include accuracy radius in metadata
   - Fall back to dam coordinates if GPS unavailable

2. **Photo Management**
   - Compress images before upload (max 5MB recommended)
   - Include EXIF data when possible
   - Use descriptive captions with location context
   - Tag photos with relevant categories

3. **Instrumentation Readings**
   - Validate readings against historical ranges
   - Flag anomalous values for review
   - Include calibration status in metadata
   - Record environmental conditions

4. **Offline Data Integrity**
   - Generate client-side UUIDs for records
   - Timestamp all operations locally
   - Queue critical data separately
   - Implement retry logic with exponential backoff

### API Integration Tips

1. **Authentication**
   - Cache JWT tokens securely
   - Implement token refresh 5 minutes before expiry
   - Handle 401 responses gracefully
   - Store refresh tokens in secure storage

2. **Error Handling**
   ```javascript
   const apiCall = async (url, options, retries = 3) => {
     for (let i = 0; i < retries; i++) {
       try {
         const response = await fetch(url, options);
         if (response.ok) return await response.json();
         
         if (response.status === 401) {
           await refreshToken();
           options.headers.Authorization = `Bearer ${newToken}`;
         } else if (response.status === 429) {
           const retryAfter = response.headers.get('Retry-After');
           await sleep(retryAfter * 1000);
         } else if (response.status >= 500) {
           await sleep(Math.pow(2, i) * 1000); // Exponential backoff
         } else {
           throw new Error(`API Error: ${response.status}`);
         }
       } catch (error) {
         if (i === retries - 1) throw error;
       }
     }
   };
   ```

3. **Data Batching**
   - Group related operations in single requests
   - Use transactions for multi-table updates
   - Limit batch sizes to 100 items
   - Implement pagination for large datasets

### Security Considerations

1. **Data Protection**
   - Never store credentials in code
   - Encrypt sensitive data at rest
   - Use HTTPS for all communications
   - Implement certificate pinning for mobile apps

2. **Access Control**
   - Verify dam access before operations
   - Check role permissions client-side and server-side
   - Log all data modifications
   - Implement session timeout

3. **Audit Trail**
   - Track all user actions
   - Include device/app information
   - Record GPS location for field activities
   - Maintain change history

### Performance Optimization

1. **Caching Strategy**
   - Cache dam details for 24 hours
   - Cache monitoring points indefinitely
   - Refresh sensor list every hour
   - Store documents locally after first download

2. **Network Efficiency**
   - Use compression for API requests
   - Implement delta sync for large datasets
   - Prioritize critical data transmission
   - Use WebSocket for real-time updates

3. **Battery Optimization**
   - Batch GPS requests
   - Defer non-critical syncs
   - Use job scheduling for background tasks
   - Minimize wake locks

## Future Roadmap & Planned Features

### Known Integration Partners
- **USACE CorpsMap**: Water level data exchange
- **FEMA HAZUS**: Risk assessment integration
- **State Dam Safety Offices**: Direct submission APIs
- **Engineering Firms**: CAD/BIM integration

## Critical Success Factors for DamInspect

### Must-Have Features
1. **100% offline capability** - Inspectors often work in remote areas
2. **Photo geotagging** - Required for regulatory compliance
3. **Digital signatures** - Legal requirement for reports
4. **Barcode/QR scanning** - For equipment and sensor identification
5. **Voice recording** - For detailed observations

### Performance Requirements
1. **App launch**: < 3 seconds
2. **Photo capture**: < 1 second
3. **Data sync**: Background without user intervention
4. **Battery life**: 8+ hours of continuous use
5. **Storage**: Handle 10,000+ photos offline

### User Experience Priorities
1. **One-handed operation** for most tasks
2. **High contrast UI** for bright sunlight
3. **Large touch targets** for gloved hands
4. **Automatic save** every 30 seconds
5. **Undo/redo** for last 10 actions

## Regulatory Reporting Templates

### FERC Part 12D Report Structure
```
1. Project Description
2. Surveillance and Monitoring
3. Condition Assessment
4. Analyses Required
5. Recommendations
6. Appendices (Photos, Data, Drawings)
```

### State Dam Safety Report Requirements
- Executive Summary
- Dam Identification
- Inspection Findings
- Risk Classification
- Recommended Actions
- Timeline for Remediation
- Inspector Certification

### Emergency Action Plan Updates
- Notification flowchart changes
- Inundation map updates
- Contact information verification
- Evacuation route modifications
- Annual drill documentation

## Contact & Support

### For DamInspect Development
- **Technical Lead**: api-support@damsafetyservices.com
- **API Documentation**: https://docs.damsafety.io
- **Status Page**: https://status.damsafety.io
- **Developer Portal**: https://developers.damsafety.io

### For DamSafety.IO Platform
- **Support Tickets**: support@damsafetyservices.com
- **Phone**: 1-800-DAM-SAFE (business hours)
- **Emergency**: 24/7 hotline for critical issues

### Integration Support Levels
1. **Basic**: Email support, 48-hour response
2. **Professional**: Priority support, 4-hour response
3. **Enterprise**: Dedicated support engineer, 1-hour response

## Version History

- **v1.0** - Current stable version
- **v1.1** - Planned Q2 2024 (GraphQL support)
- **v2.0** - Planned Q4 2024 (Major UI refresh)
- API versioning follows semantic versioning
- Breaking changes announced 90 days in advance
- Deprecation notices provided in response headers

## Error Recovery & Resilience Patterns

### Automatic Retry with Circuit Breaker
```typescript
class ResilientAPIClient {
  private circuitBreaker = new Map<string, CircuitState>();
  
  async callAPI(endpoint: string, options: RequestInit, config: RetryConfig = {}): Promise<Response> {
    const circuit = this.getCircuit(endpoint);
    
    if (circuit.state === 'OPEN') {
      if (Date.now() - circuit.lastFailure < circuit.cooldownPeriod) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Try half-open
      circuit.state = 'HALF_OPEN';
    }
    
    try {
      const response = await this.executeWithRetry(endpoint, options, config);
      
      if (circuit.state === 'HALF_OPEN') {
        circuit.state = 'CLOSED';
        circuit.failureCount = 0;
      }
      
      return response;
    } catch (error) {
      circuit.failureCount++;
      circuit.lastFailure = Date.now();
      
      if (circuit.failureCount >= 5) {
        circuit.state = 'OPEN';
        circuit.cooldownPeriod = Math.min(circuit.cooldownPeriod * 2, 60000); // Max 1 minute
      }
      
      throw error;
    }
  }
  
  private async executeWithRetry(endpoint: string, options: RequestInit, config: RetryConfig): Promise<Response> {
    const maxRetries = config.maxRetries || 3;
    const baseDelay = config.baseDelay || 1000;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          ...options,
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        
        if (response.ok || !this.shouldRetry(response.status)) {
          return response;
        }
        
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await this.sleep(delay);
      }
    }
    
    throw new Error('Max retries exceeded');
  }
  
  private shouldRetry(status: number): boolean {
    // Retry on server errors and rate limiting
    return status >= 500 || status === 429 || status === 408;
  }
}
```

## Data Compression & Bandwidth Optimization

### Payload Compression for Mobile Networks
```typescript
class DataCompressor {
  // Compress large payloads before sending
  async compressRequest(data: any): Promise<ArrayBuffer> {
    const json = JSON.stringify(data);
    
    // Use CompressionStream API if available
    if ('CompressionStream' in window) {
      const stream = new Blob([json]).stream();
      const compressed = stream.pipeThrough(new CompressionStream('gzip'));
      return new Response(compressed).arrayBuffer();
    }
    
    // Fallback to pako library
    return pako.gzip(json);
  }
  
  // Optimize images before upload
  async optimizeImage(file: File, maxWidth: number = 1920): Promise<Blob> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => resolve(blob!),
            'image/jpeg',
            0.85 // 85% quality
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
  
  // Delta sync for large datasets
  createDelta(oldData: any[], newData: any[]): Delta {
    const changes = {
      added: [] as any[],
      modified: [] as any[],
      deleted: [] as string[]
    };
    
    const oldMap = new Map(oldData.map(item => [item.id, item]));
    const newMap = new Map(newData.map(item => [item.id, item]));
    
    // Find added and modified
    newMap.forEach((item, id) => {
      const oldItem = oldMap.get(id);
      if (!oldItem) {
        changes.added.push(item);
      } else if (JSON.stringify(oldItem) !== JSON.stringify(item)) {
        changes.modified.push({
          id,
          changes: this.diffObjects(oldItem, item)
        });
      }
    });
    
    // Find deleted
    oldMap.forEach((_, id) => {
      if (!newMap.has(id)) {
        changes.deleted.push(id);
      }
    });
    
    return changes;
  }
}
```

## State Management & Data Flow

### Redux-Style State Management for DamInspect
```typescript
// Global state structure
interface AppState {
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
  };
  dams: {
    entities: Record<string, Dam>;
    selectedId: string | null;
    loading: boolean;
  };
  inspections: {
    current: Inspection | null;
    draft: Partial<Inspection> | null;
    queue: QueuedInspection[];
  };
  sync: {
    status: 'idle' | 'syncing' | 'error';
    pendingOperations: number;
    lastSync: Date | null;
  };
  offline: {
    isOffline: boolean;
    cachedData: CachedData;
  };
}

// Action creators
const actions = {
  // Dam actions
  loadDam: (damId: string) => async (dispatch: Dispatch) => {
    dispatch({ type: 'LOAD_DAM_START' });
    
    try {
      // Try cache first
      const cached = await getCachedDam(damId);
      if (cached) {
        dispatch({ type: 'LOAD_DAM_SUCCESS', payload: cached });
      }
      
      // Fetch fresh data
      const dam = await api.getDam(damId);
      dispatch({ type: 'LOAD_DAM_SUCCESS', payload: dam });
      
      // Update cache
      await cacheDam(dam);
    } catch (error) {
      dispatch({ type: 'LOAD_DAM_ERROR', payload: error });
    }
  },
  
  // Inspection actions
  saveInspectionDraft: (data: Partial<Inspection>) => ({
    type: 'SAVE_INSPECTION_DRAFT',
    payload: data
  }),
  
  submitInspection: (inspection: Inspection) => async (dispatch: Dispatch, getState: () => AppState) => {
    const state = getState();
    
    if (state.offline.isOffline) {
      // Queue for later
      dispatch({
        type: 'QUEUE_INSPECTION',
        payload: { ...inspection, syncStatus: 'pending' }
      });
      return;
    }
    
    try {
      const result = await api.submitInspection(inspection);
      dispatch({ type: 'SUBMIT_INSPECTION_SUCCESS', payload: result });
    } catch (error) {
      dispatch({ type: 'SUBMIT_INSPECTION_ERROR', payload: error });
      // Queue for retry
      dispatch({
        type: 'QUEUE_INSPECTION',
        payload: { ...inspection, syncStatus: 'failed' }
      });
    }
  }
};

// Middleware for offline detection
const offlineMiddleware: Middleware = store => next => action => {
  // Update offline status
  if (action.type === 'SET_OFFLINE_STATUS') {
    const wasOffline = store.getState().offline.isOffline;
    const isOffline = action.payload;
    
    if (wasOffline && !isOffline) {
      // Coming back online - trigger sync
      store.dispatch(actions.syncPendingData());
    }
  }
  
  return next(action);
};
```

## Security & Encryption

### End-to-End Encryption for Sensitive Data
```typescript
class SecurityManager {
  private encryptionKey: CryptoKey | null = null;
  
  // Initialize encryption with user's derived key
  async initialize(password: string, salt: Uint8Array): Promise<void> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  // Encrypt sensitive inspection data
  async encryptData(data: any): Promise<EncryptedData> {
    if (!this.encryptionKey) throw new Error('Encryption not initialized');
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encoded
    );
    
    return {
      data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    };
  }
  
  // Secure storage for offline data
  async secureStore(key: string, value: any): Promise<void> {
    const encrypted = await this.encryptData(value);
    
    // Store in IndexedDB
    const db = await openDB('SecureStorage', 1);
    const tx = db.transaction('data', 'readwrite');
    await tx.objectStore('data').put({
      key,
      value: encrypted,
      timestamp: Date.now()
    });
  }
  
  // Certificate pinning for API calls
  async verifyServerCertificate(response: Response): Promise<boolean> {
    const expectedFingerprints = [
      'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='
    ];
    
    // Get certificate from response
    const cert = response.headers.get('X-Certificate-Fingerprint');
    
    if (!cert || !expectedFingerprints.includes(cert)) {
      throw new Error('Certificate verification failed');
    }
    
    return true;
  }
}
```

## Performance Monitoring & Analytics

### Application Performance Tracking
```typescript
class PerformanceMonitor {
  private metrics: Map<string, Metric[]> = new Map();
  
  // Track API call performance
  async trackAPICall(endpoint: string, operation: () => Promise<any>): Promise<any> {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize;
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      const memoryDelta = (performance as any).memory?.usedJSHeapSize - startMemory;
      
      this.recordMetric('api_call', {
        endpoint,
        duration,
        memoryDelta,
        success: true,
        timestamp: Date.now()
      });
      
      // Alert if slow
      if (duration > 5000) {
        this.alertSlowOperation(endpoint, duration);
      }
      
      return result;
    } catch (error) {
      this.recordMetric('api_call', {
        endpoint,
        duration: performance.now() - startTime,
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }
  
  // Track offline queue performance
  trackSyncPerformance(): SyncMetrics {
    const queueDepth = this.getQueueDepth();
    const oldestItem = this.getOldestQueueItem();
    const syncRate = this.calculateSyncRate();
    
    return {
      queueDepth,
      queueAge: oldestItem ? Date.now() - oldestItem.timestamp : 0,
      syncRate,
      estimatedSyncTime: queueDepth / syncRate
    };
  }
  
  // Send telemetry to DamSafety.IO
  async sendTelemetry(): Promise<void> {
    const telemetry = {
      appVersion: APP_VERSION,
      platform: getPlatform(),
      metrics: Array.from(this.metrics.entries()).map(([key, values]) => ({
        metric: key,
        aggregates: this.aggregateMetrics(values)
      })),
      deviceInfo: {
        model: getDeviceModel(),
        os: getOSVersion(),
        networkType: getNetworkType(),
        batteryLevel: getBatteryLevel()
      }
    };
    
    // Send in background
    await fetch('/api/telemetry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telemetry-Version': '1.0'
      },
      body: JSON.stringify(telemetry)
    });
  }
}
```

## Appendix: Common Integration Patterns

### Pattern 1: Batch Inspection Upload
Best for: Organizations migrating from paper-based systems
```
1. Collect multiple inspections offline
2. Return to office with connectivity
3. Batch upload all inspections
4. Receive consolidated compliance report
```

### Pattern 2: Real-time Critical Monitoring
Best for: High-hazard dams during flood season
```
1. Continuous sensor monitoring
2. Threshold exceedance triggers alert
3. Inspector dispatched with DamInspect
4. Real-time updates during inspection
5. Immediate notification to stakeholders
```

### Pattern 3: Regulatory Compliance Workflow
Best for: Scheduled regulatory inspections
```
1. Pre-inspection checklist generation
2. Field data collection with DamInspect
3. Supervisor review in DamSafety.IO
4. Automated report generation
5. Direct submission to regulatory agency
```