# 11 – Implementation Guide

## Overview
This guide provides step-by-step implementation instructions for the DamSafety.IO Inspections module, with concrete code examples and best practices.

## Phase 1: Backend Foundation (Weeks 1-2)

### Step 1: Create Prisma Schema
```prisma
// prisma/schema.prisma

model Inspection {
  id                String      @id @default(cuid())
  inspectionNumber  String      @unique
  damId             String
  dam               Dam         @relation(fields: [damId], references: [id])
  
  title             String
  type              InspectionType
  purpose           String?
  scope             String?
  
  inspectorId       String
  inspector         User        @relation("InspectorInspections", fields: [inspectorId], references: [id])
  
  scheduledDate     DateTime?
  inspectedAt       DateTime
  completedAt       DateTime?
  duration          Int?        // minutes
  
  status            InspectionStatus @default(DRAFT)
  priority          Priority     @default(MEDIUM)
  
  weatherConditions Json?
  waterLevel        Float?
  location          Json?
  
  overallCondition  ConditionRating?
  summary           String?     @db.Text
  keyFindings       String[]
  recommendations   String[]
  
  followUpRequired  Boolean     @default(false)
  followUpDate      DateTime?
  
  riskLevel         RiskLevel?
  complianceStatus  ComplianceStatus?
  
  observations      InspectionObservation[]
  media             InspectionMedia[]
  statusHistory     InspectionStatusHistory[]
  
  offlineId         String?
  sourceDevice      String?
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  deletedAt         DateTime?
  
  @@index([damId, status])
  @@index([inspectorId])
  @@index([inspectedAt])
}

model InspectionObservation {
  id                String      @id @default(cuid())
  observationNumber Int
  inspectionId      String
  inspection        Inspection  @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  
  category          ObservationCategory
  component         String
  severity          ObservationSeverity
  condition         ConditionRating
  
  title             String
  description       String      @db.Text
  location          Json?
  locationDesc      String?
  
  measurements      Json?
  previousValue     Float?
  changeFromPrev    Float?
  trend             Trend?
  
  actionRequired    Boolean     @default(false)
  actionType        ActionType?
  actionPriority    Priority?
  actionDeadline    DateTime?
  
  media             InspectionMedia[]
  
  offlineId         String?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  @@index([inspectionId])
  @@index([severity])
}

enum InspectionType {
  ROUTINE
  SPECIAL
  COMPREHENSIVE
  POST_EVENT
  INITIAL
  FOLLOW_UP
}

enum InspectionStatus {
  DRAFT
  SCHEDULED
  IN_PROGRESS
  SUBMITTED
  IN_REVIEW
  APPROVED
  REJECTED
  ARCHIVED
}
```

### Step 2: Create API Routes
```typescript
// src/app/api/dams/[damId]/inspections/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';

const createInspectionSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.nativeEnum(InspectionType),
  purpose: z.string().optional(),
  scheduledDate: z.string().datetime().optional(),
  inspectedAt: z.string().datetime(),
  priority: z.nativeEnum(Priority).optional(),
  weatherConditions: z.object({
    temperature: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    conditions: z.string()
  }).optional(),
  waterLevel: z.number().optional(),
  location: z.object({
    lat: z.number(),
    lon: z.number()
  }).optional(),
  observations: z.array(z.object({
    category: z.nativeEnum(ObservationCategory),
    component: z.string(),
    severity: z.nativeEnum(ObservationSeverity),
    title: z.string(),
    description: z.string(),
    offlineId: z.string().optional()
  })).optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { damId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const status = searchParams.get('status')?.split(',') || undefined;
  const type = searchParams.get('type')?.split(',') || undefined;

  const where = {
    damId: params.damId,
    deletedAt: null,
    ...(status && { status: { in: status } }),
    ...(type && { type: { in: type } })
  };

  const [inspections, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      include: {
        inspector: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { observations: true, media: true }
        }
      },
      orderBy: { inspectedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.inspection.count({ where })
  ]);

  return Response.json({
    data: inspections.map(inspection => ({
      ...inspection,
      statistics: {
        observationCount: inspection._count.observations,
        mediaCount: inspection._count.media
      }
    })),
    pagination: {
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      totalCount: total
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { damId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!await checkPermission(session.user, 'inspection.create')) {
    return new Response('Forbidden', { status: 403 });
  }

  const body = await request.json();
  const validated = createInspectionSchema.parse(body);

  // Generate inspection number
  const year = new Date().getFullYear();
  const count = await prisma.inspection.count({
    where: {
      damId: params.damId,
      inspectionNumber: { startsWith: `${year}-${params.damId}-` }
    }
  });
  
  const inspectionNumber = `${year}-${params.damId}-${String(count + 1).padStart(4, '0')}`;

  const inspection = await prisma.inspection.create({
    data: {
      ...validated,
      damId: params.damId,
      inspectorId: session.user.id,
      inspectionNumber,
      status: 'DRAFT',
      observations: validated.observations ? {
        create: validated.observations.map((obs, index) => ({
          ...obs,
          observationNumber: index + 1
        }))
      } : undefined
    },
    include: {
      observations: true,
      media: true
    }
  });

  return Response.json(inspection, { status: 201 });
}
```

### Step 3: Implement File Storage
```typescript
// src/lib/storage/s3-service.ts
import { S3Client, PutObjectCommand, CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export class S3Service {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
    this.bucket = process.env.S3_BUCKET_NAME!;
  }

  async generateUploadUrl(params: {
    damId: string;
    inspectionId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }): Promise<{
    uploadUrl: string;
    storageKey: string;
    mediaId: string;
  }> {
    const mediaId = uuidv4();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const extension = params.fileName.split('.').pop();
    const storageKey = `${params.damId}/inspections/${params.inspectionId}/media/${year}/${month}/${day}/${mediaId}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: params.mimeType,
      ContentLength: params.fileSize,
      Metadata: {
        'inspection-id': params.inspectionId,
        'media-id': mediaId,
        'original-name': params.fileName
      }
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: 900 // 15 minutes
    });

    return { uploadUrl, storageKey, mediaId };
  }

  async initializeMultipartUpload(params: {
    storageKey: string;
    mimeType: string;
  }): Promise<string> {
    const command = new CreateMultipartUploadCommand({
      Bucket: this.bucket,
      Key: params.storageKey,
      ContentType: params.mimeType
    });

    const response = await this.client.send(command);
    return response.UploadId!;
  }
}
```

## Phase 2: Web Frontend (Weeks 3-5)

### Step 1: Create Inspections Tab
```typescript
// src/components/dams/DamDetailTabs.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InspectionsTab } from '@/components/inspections/InspectionsTab';

export function DamDetailTabs({ dam }: { dam: Dam }) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="instrumentation">Instrumentation</TabsTrigger>
        <TabsTrigger value="inspections">Inspections</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      
      <TabsContent value="inspections">
        <InspectionsTab 
          damId={dam.id} 
          damName={dam.name}
          damLocation={{ lat: dam.latitude, lon: dam.longitude }}
        />
      </TabsContent>
      
      {/* Other tabs */}
    </Tabs>
  );
}
```

### Step 2: Implement Data Hooks
```typescript
// src/hooks/useInspections.ts
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

export function useInspections(damId: string, filters?: InspectionFilters) {
  const params = new URLSearchParams();
  
  if (filters?.status?.length) {
    params.set('status', filters.status.join(','));
  }
  if (filters?.type?.length) {
    params.set('type', filters.type.join(','));
  }
  if (filters?.page) {
    params.set('page', filters.page.toString());
  }

  const { data, error, mutate } = useSWR(
    `/api/dams/${damId}/inspections?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  );

  return {
    inspections: data?.data || [],
    pagination: data?.pagination,
    loading: !data && !error,
    error,
    refresh: mutate
  };
}
```

### Step 3: Create Timeline Component
```typescript
// src/components/inspections/InspectionTimeline.tsx
import { TimelineComponent } from '@/components/Timeline/TimelineComponent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InspectionTimeline({ 
  inspections, 
  onInspectionSelect 
}: {
  inspections: Inspection[];
  onInspectionSelect: (id: string) => void;
}) {
  const timelineData = inspections.map(inspection => ({
    id: inspection.id,
    date: new Date(inspection.inspectedAt),
    title: inspection.title,
    type: getTimelineType(inspection.type),
    description: inspection.summary || 'No summary available',
    metadata: {
      status: inspection.status,
      inspector: inspection.inspector.name,
      observationCount: inspection.statistics.observationCount,
      severity: getMaxSeverity(inspection)
    },
    color: getStatusColor(inspection.status)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspection Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <TimelineComponent
          data={timelineData}
          onItemClick={(item) => onInspectionSelect(item.id)}
          showYearMarkers
          interactive
          height={400}
        />
      </CardContent>
    </Card>
  );
}

function getTimelineType(type: InspectionType): string {
  const typeMap = {
    ROUTINE: 'routine',
    SPECIAL: 'special',
    COMPREHENSIVE: 'major',
    POST_EVENT: 'emergency'
  };
  return typeMap[type] || 'routine';
}

function getStatusColor(status: InspectionStatus): string {
  const colorMap = {
    DRAFT: '#6b7280',
    IN_PROGRESS: '#3b82f6',
    SUBMITTED: '#eab308',
    APPROVED: '#22c55e',
    REJECTED: '#ef4444'
  };
  return colorMap[status] || '#6b7280';
}
```

## Phase 3: iOS App Foundation (Weeks 5-8)

### Step 1: Set Up Project Structure
```swift
// DamInspect/App/DamInspectApp.swift
import SwiftUI

@main
struct DamInspectApp: App {
    @StateObject private var appContainer = AppContainer()
    @StateObject private var authViewModel = AuthViewModel()
    
    init() {
        // Configure app
        MigrationManager.performMigrations()
        NetworkMonitor.shared.startMonitoring()
        LocationService.shared.requestPermission()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appContainer)
                .environmentObject(authViewModel)
                .onAppear {
                    Task {
                        await authViewModel.checkAuthStatus()
                    }
                }
        }
    }
}
```

### Step 2: Implement Authentication
```swift
// DamInspect/Features/Authentication/QRScannerView.swift
import SwiftUI
import AVFoundation

struct QRScannerView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var isScanning = true
    
    var body: some View {
        ZStack {
            QRCodeScanner { code in
                isScanning = false
                Task {
                    await authViewModel.activateDevice(qrCode: code)
                }
            }
            
            VStack {
                Text("Scan QR Code")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding()
                
                Spacer()
                
                Text("Point your camera at the QR code displayed in the web dashboard")
                    .multilineTextAlignment(.center)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(10)
                    .padding()
            }
        }
        .edgesIgnoringSafeArea(.all)
    }
}
```

### Step 3: Create Dam List View
```swift
// DamInspect/Features/DamList/DamListView.swift
import SwiftUI
import MapKit

struct DamListView: View {
    @StateObject private var viewModel = DamListViewModel()
    @State private var showMap = true
    @State private var selectedDam: Dam?
    
    var body: some View {
        NavigationStack {
            ZStack {
                if showMap {
                    DamMapView(
                        dams: viewModel.dams,
                        selectedDam: $selectedDam
                    )
                    .edgesIgnoringSafeArea(.all)
                } else {
                    DamListContent(
                        dams: viewModel.filteredDams,
                        onDamSelected: { dam in
                            selectedDam = dam
                        }
                    )
                }
                
                VStack {
                    SearchBar(text: $viewModel.searchText)
                        .padding()
                    
                    Spacer()
                    
                    if let dam = selectedDam {
                        DamInfoCard(dam: dam) {
                            viewModel.startInspection(for: dam)
                        }
                        .transition(.move(edge: .bottom))
                        .padding()
                    }
                }
            }
            .navigationTitle("Select Dam")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        withAnimation {
                            showMap.toggle()
                        }
                    } label: {
                        Image(systemName: showMap ? "list.bullet" : "map")
                    }
                }
            }
            .task {
                await viewModel.loadDams()
            }
        }
    }
}
```

## Phase 4: Sync Implementation (Weeks 8-10)

### Step 1: Implement Sync Service
```typescript
// src/app/api/dams/[damId]/inspections/sync/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { damId: string } }
) {
  const deviceId = request.headers.get('X-Device-ID');
  const syncToken = request.headers.get('X-Sync-Token');
  
  if (!deviceId) {
    return new Response('Device ID required', { status: 400 });
  }

  const body = await request.json();
  const { inspections, observations, media, deletions } = body;

  const results = {
    inspections: [],
    observations: [],
    media: []
  };

  // Process inspections
  for (const item of inspections || []) {
    try {
      if (item.action === 'create') {
        const created = await prisma.inspection.create({
          data: {
            ...item.data,
            offlineId: item.offlineId,
            sourceDevice: deviceId
          }
        });
        
        results.inspections.push({
          offlineId: item.offlineId,
          serverId: created.id,
          status: 'synced'
        });
      }
    } catch (error) {
      results.inspections.push({
        offlineId: item.offlineId,
        status: 'error',
        error: error.message
      });
    }
  }

  // Generate new sync token
  const newSyncToken = generateSyncToken();
  
  return Response.json({
    syncToken: newSyncToken,
    serverTimestamp: new Date().toISOString(),
    results,
    conflicts: [],
    serverUpdates: []
  });
}
```

### Step 2: iOS Sync Implementation
```swift
// DamInspect/Core/Services/SyncService.swift
class SyncService: ObservableObject {
    @Published var syncState: SyncState = .idle
    @Published var lastSyncDate: Date?
    
    private let api: APIService
    private let database: DatabaseService
    private let syncQueue = DispatchQueue(label: "sync.queue")
    
    func performSync() async {
        await MainActor.run {
            self.syncState = .syncing(progress: 0)
        }
        
        do {
            // 1. Gather local changes
            let changes = await gatherLocalChanges()
            
            // 2. Send to server
            let response = try await api.syncData(changes)
            
            // 3. Process response
            await processServerResponse(response)
            
            // 4. Update local state
            await updateLocalSyncState(response)
            
            await MainActor.run {
                self.syncState = .completed(at: Date())
                self.lastSyncDate = Date()
            }
        } catch {
            await MainActor.run {
                self.syncState = .failed(error: error as? SyncError ?? .unknown)
            }
        }
    }
    
    private func gatherLocalChanges() async -> SyncChanges {
        let unsyncedInspections = database.getUnsyncedInspections()
        let unsyncedObservations = database.getUnsyncedObservations()
        let unsyncedMedia = database.getUnsyncedMedia()
        
        return SyncChanges(
            inspections: unsyncedInspections.map { inspection in
                SyncItem(
                    offlineId: inspection.offlineId,
                    action: inspection.serverId == nil ? .create : .update,
                    data: inspection.toJSON(),
                    timestamp: inspection.lastModified
                )
            },
            observations: unsyncedObservations.map { /* ... */ },
            media: unsyncedMedia.map { /* ... */ }
        )
    }
}
```

## Testing & Deployment

### Backend Testing
```typescript
// src/__tests__/api/inspections.test.ts
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/dams/[damId]/inspections/route';

describe('/api/dams/[damId]/inspections', () => {
  it('should create inspection', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: {
        title: 'Test Inspection',
        type: 'ROUTINE',
        inspectedAt: new Date().toISOString()
      }
    });

    await POST(req as any, { params: { damId: 'dam-123' } });

    expect(res._getStatusCode()).toBe(201);
    const json = JSON.parse(res._getData());
    expect(json.title).toBe('Test Inspection');
    expect(json.inspectionNumber).toMatch(/^\d{4}-dam-123-\d{4}$/);
  });
});
```

### iOS Testing
```swift
// DamInspectTests/SyncServiceTests.swift
import XCTest
@testable import DamInspect

class SyncServiceTests: XCTestCase {
    var syncService: SyncService!
    var mockAPI: MockAPIService!
    var mockDatabase: MockDatabaseService!
    
    override func setUp() {
        super.setUp()
        mockAPI = MockAPIService()
        mockDatabase = MockDatabaseService()
        syncService = SyncService(api: mockAPI, database: mockDatabase)
    }
    
    func testSuccessfulSync() async throws {
        // Arrange
        let inspection = TestData.mockInspection()
        mockDatabase.unsyncedInspections = [inspection]
        mockAPI.syncResponse = .success(TestData.mockSyncResponse())
        
        // Act
        await syncService.performSync()
        
        // Assert
        XCTAssertEqual(syncService.syncState, .completed)
        XCTAssertTrue(mockDatabase.markedAsSynced.contains(inspection.id))
    }
}
```

## Deployment Checklist

### Backend
- [ ] Run database migrations
- [ ] Set up S3 bucket and IAM policies
- [ ] Configure environment variables
- [ ] Deploy to staging environment
- [ ] Run integration tests
- [ ] Deploy to production

### iOS
- [ ] Configure code signing
- [ ] Set up TestFlight
- [ ] Submit for App Store review
- [ ] Prepare release notes
- [ ] Plan phased rollout

### Monitoring
- [ ] Set up CloudWatch alarms
- [ ] Configure error tracking (Sentry)
- [ ] Set up analytics (Mixpanel)
- [ ] Create operational dashboard 