# 07 – Sync & Offline Strategy

## Overview
This document details the comprehensive synchronization and offline capabilities for the DamInspect mobile application, ensuring reliable data collection in areas with limited or no connectivity.

## Architecture Overview

### Sync Components
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Local Storage  │────▶│ Sync Engine  │────▶│  API Server │
│   (Realm DB)    │◀────│              │◀────│             │
└─────────────────┘     └──────────────┘     └─────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Change Tracker │     │ Sync Queue   │     │  S3 Storage │
└─────────────────┘     └──────────────┘     └─────────────┘
```

## Offline-First Design Principles

### 1. Local-First Data Creation
- All data created locally with client-generated IDs
- Server assigns permanent IDs during sync
- Mapping maintained between offline and server IDs

### 2. Optimistic UI Updates
- Immediate UI feedback for all actions
- Background sync with retry logic
- Visual indicators for sync status

### 3. Conflict Resolution
- Last-write-wins for simple fields
- Merge strategy for collections
- User intervention for complex conflicts

## Data Synchronization Flow

### 1. Entity Sync Order
```typescript
enum SyncPriority {
  HIGH = 1,    // Critical safety observations
  MEDIUM = 2,  // Normal inspections
  LOW = 3,     // Media files
  BACKGROUND = 4 // Reports, analytics
}

const syncOrder = [
  { entity: 'EmergencyObservations', priority: SyncPriority.HIGH },
  { entity: 'Inspections', priority: SyncPriority.MEDIUM },
  { entity: 'Observations', priority: SyncPriority.MEDIUM },
  { entity: 'MediaMetadata', priority: SyncPriority.MEDIUM },
  { entity: 'MediaFiles', priority: SyncPriority.LOW },
  { entity: 'Reports', priority: SyncPriority.BACKGROUND }
];
```

### 2. Sync State Machine
```swift
enum SyncState {
    case idle
    case checking
    case syncing(progress: Double)
    case completed(at: Date)
    case failed(error: SyncError)
    case paused(reason: PauseReason)
}

enum PauseReason {
    case noConnection
    case lowBattery
    case userRequested
    case quotaExceeded
}
```

### 3. Delta Sync Protocol
```typescript
interface SyncRequest {
  deviceId: string;
  lastSyncToken: string;
  clientChanges: ChangeSet[];
  schemaVersion: number;
}

interface ChangeSet {
  entity: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  offlineId: string;
  timestamp: string;
  checksum: string;
}

interface SyncResponse {
  syncToken: string;
  serverChanges: ChangeSet[];
  conflicts: Conflict[];
  mappings: IdMapping[];
}
```

## Change Tracking

### 1. Local Change Detection
```swift
// Core/Sync/ChangeTracker.swift
class ChangeTracker {
    private let realm: Realm
    private var notificationTokens: [NotificationToken] = []
    
    func startTracking() {
        // Track Inspection changes
        let inspections = realm.objects(InspectionRealm.self)
            .filter("isSynced == false OR hasPendingChanges == true")
        
        let token = inspections.observe { [weak self] changes in
            switch changes {
            case .initial(let collection):
                self?.queueChanges(Array(collection))
                
            case .update(let collection, let deletions, let insertions, let modifications):
                let modified = modifications.map { collection[$0] }
                let inserted = insertions.map { collection[$0] }
                self?.queueChanges(Array(modified) + Array(inserted))
                
            case .error(let error):
                Logger.error("Change tracking error: \(error)")
            }
        }
        
        notificationTokens.append(token)
    }
    
    private func queueChanges(_ objects: [Object]) {
        let changes = objects.map { object in
            ChangeRecord(
                entity: type(of: object).className(),
                objectId: object.value(forKey: "id") as! String,
                operation: object.value(forKey: "serverId") == nil ? .create : .update,
                timestamp: Date(),
                data: object.toJSON()
            )
        }
        
        SyncQueue.shared.enqueue(changes)
    }
}
```

### 2. Change Queue Management
```swift
// Core/Sync/SyncQueue.swift
actor SyncQueue {
    private var queue: [SyncItem] = []
    private let persistence = QueuePersistence()
    
    struct SyncItem {
        let id: String
        let change: ChangeRecord
        let retryCount: Int
        let priority: SyncPriority
        let addedAt: Date
    }
    
    func enqueue(_ changes: [ChangeRecord]) async {
        let items = changes.map { change in
            SyncItem(
                id: UUID().uuidString,
                change: change,
                retryCount: 0,
                priority: determinePriority(for: change),
                addedAt: Date()
            )
        }
        
        queue.append(contentsOf: items)
        queue.sort { $0.priority.rawValue < $1.priority.rawValue }
        
        await persistence.save(queue)
    }
    
    func dequeueNext(batch: Int = 10) async -> [SyncItem] {
        let items = Array(queue.prefix(batch))
        queue.removeFirst(min(batch, queue.count))
        await persistence.save(queue)
        return items
    }
    
    func requeue(_ items: [SyncItem], incrementRetry: Bool = true) async {
        let updated = items.map { item in
            SyncItem(
                id: item.id,
                change: item.change,
                retryCount: incrementRetry ? item.retryCount + 1 : item.retryCount,
                priority: item.priority,
                addedAt: item.addedAt
            )
        }
        
        queue.append(contentsOf: updated)
        queue.sort { $0.priority.rawValue < $1.priority.rawValue }
        
        await persistence.save(queue)
    }
}
```

## Conflict Resolution

### 1. Conflict Detection
```typescript
interface ConflictDetector {
  detectConflicts(
    local: ChangeSet,
    server: ChangeSet
  ): Conflict | null {
    // Version-based detection
    if (local.baseVersion !== server.version - 1) {
      return {
        type: 'version_mismatch',
        local,
        server
      };
    }
    
    // Checksum-based detection
    if (local.checksum !== server.previousChecksum) {
      return {
        type: 'concurrent_modification',
        local,
        server
      };
    }
    
    return null;
  }
}
```

### 2. Resolution Strategies
```swift
enum ConflictResolution {
    case clientWins
    case serverWins
    case merge(strategy: MergeStrategy)
    case manual
}

struct ConflictResolver {
    func resolve(
        conflict: Conflict,
        strategy: ConflictResolution = .merge(strategy: .smart)
    ) async -> Resolution {
        switch strategy {
        case .clientWins:
            return Resolution(
                action: .useLocal,
                data: conflict.localData
            )
            
        case .serverWins:
            return Resolution(
                action: .useServer,
                data: conflict.serverData
            )
            
        case .merge(let mergeStrategy):
            let merged = await performMerge(
                local: conflict.localData,
                server: conflict.serverData,
                strategy: mergeStrategy
            )
            return Resolution(action: .useMerged, data: merged)
            
        case .manual:
            return await requestUserIntervention(conflict)
        }
    }
    
    private func performMerge(
        local: InspectionData,
        server: InspectionData,
        strategy: MergeStrategy
    ) async -> InspectionData {
        var merged = server // Start with server as base
        
        switch strategy {
        case .smart:
            // Merge observations (union)
            let localObsIds = Set(local.observations.map(\.id))
            let serverObsIds = Set(server.observations.map(\.id))
            
            let uniqueLocal = local.observations.filter { 
                !serverObsIds.contains($0.id) 
            }
            merged.observations.append(contentsOf: uniqueLocal)
            
            // Merge media (union)
            let localMediaIds = Set(local.media.map(\.id))
            let serverMediaIds = Set(server.media.map(\.id))
            
            let uniqueLocalMedia = local.media.filter { 
                !serverMediaIds.contains($0.id) 
            }
            merged.media.append(contentsOf: uniqueLocalMedia)
            
            // Take latest summary if local is newer
            if local.lastModified > server.lastModified {
                merged.summary = local.summary
            }
            
        case .fields(let fieldList):
            // Merge specific fields from local
            for field in fieldList {
                merged[keyPath: field] = local[keyPath: field]
            }
        }
        
        return merged
    }
}
```

### 3. Conflict UI
```swift
struct ConflictResolutionView: View {
    let conflict: Conflict
    @State private var resolution: ConflictResolution = .merge(strategy: .smart)
    let onResolve: (Resolution) -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Sync Conflict Detected")
                .font(.headline)
            
            HStack(spacing: 20) {
                // Local version
                VStack {
                    Text("Your Version")
                        .font(.caption)
                    ConflictDataView(data: conflict.localData)
                }
                
                // Server version
                VStack {
                    Text("Server Version")
                        .font(.caption)
                    ConflictDataView(data: conflict.serverData)
                }
            }
            
            // Resolution options
            Picker("Resolution", selection: $resolution) {
                Text("Keep Mine").tag(ConflictResolution.clientWins)
                Text("Keep Theirs").tag(ConflictResolution.serverWins)
                Text("Merge Both").tag(ConflictResolution.merge(strategy: .smart))
            }
            .pickerStyle(.segmented)
            
            Button("Resolve") {
                Task {
                    let resolved = await ConflictResolver().resolve(
                        conflict: conflict,
                        strategy: resolution
                    )
                    onResolve(resolved)
                }
            }
        }
        .padding()
    }
}
```

## Media Synchronization

### 1. Chunked Upload
```swift
class MediaUploadManager {
    private let chunkSize = 5 * 1024 * 1024 // 5MB chunks
    
    func uploadLargeFile(_ file: MediaFile) async throws {
        let fileSize = file.sizeBytes
        let totalChunks = Int(ceil(Double(fileSize) / Double(chunkSize)))
        
        // Initialize multipart upload
        let uploadId = try await api.initializeMultipartUpload(
            fileName: file.name,
            mimeType: file.mimeType,
            totalSize: fileSize
        )
        
        // Upload chunks
        var uploadedParts: [UploadPart] = []
        
        for chunkIndex in 0..<totalChunks {
            let offset = chunkIndex * chunkSize
            let size = min(chunkSize, fileSize - offset)
            
            let chunkData = try file.readChunk(offset: offset, size: size)
            
            let part = try await uploadChunk(
                data: chunkData,
                uploadId: uploadId,
                partNumber: chunkIndex + 1
            )
            
            uploadedParts.append(part)
            
            // Update progress
            let progress = Double(chunkIndex + 1) / Double(totalChunks)
            await updateProgress(file.id, progress: progress)
        }
        
        // Complete upload
        try await api.completeMultipartUpload(
            uploadId: uploadId,
            parts: uploadedParts
        )
    }
    
    private func uploadChunk(
        data: Data,
        uploadId: String,
        partNumber: Int
    ) async throws -> UploadPart {
        let maxRetries = 3
        var lastError: Error?
        
        for attempt in 0..<maxRetries {
            do {
                return try await api.uploadPart(
                    data: data,
                    uploadId: uploadId,
                    partNumber: partNumber
                )
            } catch {
                lastError = error
                if attempt < maxRetries - 1 {
                    let delay = pow(2.0, Double(attempt))
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }
            }
        }
        
        throw lastError ?? MediaError.uploadFailed
    }
}
```

### 2. Resume Capability
```swift
struct ResumableUpload {
    let uploadId: String
    let fileId: String
    let totalParts: Int
    let completedParts: Set<Int>
    let expiresAt: Date
    
    var progress: Double {
        Double(completedParts.count) / Double(totalParts)
    }
    
    var isExpired: Bool {
        Date() > expiresAt
    }
    
    var nextPartNumber: Int? {
        for i in 1...totalParts {
            if !completedParts.contains(i) {
                return i
            }
        }
        return nil
    }
}

class UploadResumer {
    func resumeUpload(_ resumable: ResumableUpload) async throws {
        guard !resumable.isExpired else {
            throw MediaError.uploadExpired
        }
        
        let file = try await MediaStore.shared.getFile(resumable.fileId)
        
        while let nextPart = resumable.nextPartNumber {
            let offset = (nextPart - 1) * chunkSize
            let size = min(chunkSize, file.sizeBytes - offset)
            let data = try file.readChunk(offset: offset, size: size)
            
            let part = try await uploadChunk(
                data: data,
                uploadId: resumable.uploadId,
                partNumber: nextPart
            )
            
            resumable.completedParts.insert(nextPart)
            await saveProgress(resumable)
        }
        
        try await completeUpload(resumable)
    }
}
```

## Network Optimization

### 1. Adaptive Sync
```swift
class AdaptiveSync {
    private var syncInterval: TimeInterval = 30
    private let minInterval: TimeInterval = 10
    private let maxInterval: TimeInterval = 300
    
    func adjustSyncInterval(based on: NetworkQuality) {
        switch on {
        case .excellent:
            syncInterval = minInterval
        case .good:
            syncInterval = 30
        case .fair:
            syncInterval = 60
        case .poor:
            syncInterval = 120
        case .offline:
            syncInterval = maxInterval
        }
    }
    
    func handleSyncResult(_ result: SyncResult) {
        switch result {
        case .success:
            // Decrease interval on success
            syncInterval = max(minInterval, syncInterval * 0.8)
            
        case .failure(let error):
            // Increase interval on failure
            if case SyncError.networkError = error {
                syncInterval = min(maxInterval, syncInterval * 1.5)
            }
            
        case .partial:
            // Keep current interval
            break
        }
    }
}
```

### 2. Bandwidth Management
```swift
struct BandwidthManager {
    private let monitor = NetworkMonitor()
    
    func shouldSyncMedia() -> Bool {
        let connection = monitor.currentConnection
        let settings = UserSettings.shared.syncSettings
        
        switch connection {
        case .wifi:
            return true
        case .cellular:
            return settings.allowCellularSync
        case .none:
            return false
        }
    }
    
    func getOptimalBatchSize() -> Int {
        let connection = monitor.currentConnection
        let batteryLevel = UIDevice.current.batteryLevel
        
        switch (connection, batteryLevel) {
        case (.wifi, let battery) where battery > 0.2:
            return 50
        case (.cellular, let battery) where battery > 0.5:
            return 10
        default:
            return 5
        }
    }
}
```

## Error Handling & Recovery

### 1. Retry Logic
```swift
struct RetryPolicy {
    let maxAttempts: Int
    let backoffMultiplier: Double
    let maxDelay: TimeInterval
    
    static let `default` = RetryPolicy(
        maxAttempts: 5,
        backoffMultiplier: 2.0,
        maxDelay: 300
    )
    
    func delay(for attempt: Int) -> TimeInterval {
        let exponentialDelay = pow(backoffMultiplier, Double(attempt - 1))
        return min(exponentialDelay, maxDelay)
    }
    
    func shouldRetry(attempt: Int, error: Error) -> Bool {
        guard attempt < maxAttempts else { return false }
        
        if let syncError = error as? SyncError {
            switch syncError {
            case .networkError, .timeout, .serverError(500...599):
                return true
            case .authenticationError, .quotaExceeded:
                return false
            default:
                return attempt < 2
            }
        }
        
        return true
    }
}
```

### 2. Data Integrity
```swift
extension SyncableObject {
    func validateIntegrity() throws {
        // Check required fields
        guard !id.isEmpty else {
            throw IntegrityError.missingId
        }
        
        // Verify checksum
        let currentChecksum = calculateChecksum()
        guard currentChecksum == storedChecksum else {
            throw IntegrityError.checksumMismatch
        }
        
        // Validate relationships
        try validateRelationships()
    }
    
    private func calculateChecksum() -> String {
        let data = try! JSONEncoder().encode(self)
        return SHA256.hash(data: data).compactMap { 
            String(format: "%02x", $0) 
        }.joined()
    }
}
```

## Monitoring & Analytics

### 1. Sync Metrics
```swift
struct SyncMetrics {
    let startTime: Date
    let endTime: Date
    let itemsSynced: Int
    let bytesUploaded: Int64
    let bytesDownloaded: Int64
    let conflicts: Int
    let errors: [SyncError]
    
    var duration: TimeInterval {
        endTime.timeIntervalSince(startTime)
    }
    
    var throughput: Double {
        let totalBytes = Double(bytesUploaded + bytesDownloaded)
        return totalBytes / duration
    }
    
    func report() {
        Analytics.track("sync_completed", properties: [
            "duration": duration,
            "items": itemsSynced,
            "upload_bytes": bytesUploaded,
            "download_bytes": bytesDownloaded,
            "conflicts": conflicts,
            "errors": errors.count,
            "throughput": throughput
        ])
    }
}
```

### 2. Debug Tools
```swift
#if DEBUG
class SyncDebugger {
    static let shared = SyncDebugger()
    
    private var syncLog: [SyncLogEntry] = []
    
    func log(_ event: SyncEvent) {
        let entry = SyncLogEntry(
            timestamp: Date(),
            event: event,
            metadata: Thread.current.threadDictionary
        )
        
        syncLog.append(entry)
        
        if syncLog.count > 1000 {
            syncLog.removeFirst(100)
        }
    }
    
    func exportLog() -> URL {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        encoder.dateEncodingStrategy = .iso8601
        
        let data = try! encoder.encode(syncLog)
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("sync_log_\(Date().timeIntervalSince1970).json")
        
        try! data.write(to: url)
        return url
    }
}
#endif
``` 