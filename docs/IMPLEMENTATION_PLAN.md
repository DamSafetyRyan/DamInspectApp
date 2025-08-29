# DamInspect Mobile App - Detailed Implementation Plan (Revised)

## Executive Summary
This document outlines the complete implementation strategy for the DamInspect mobile application, with carefully selected library versions for maximum compatibility, comprehensive security measures, and production-ready architecture.

## 1. Technology Stack & Version Matrix

### Core Framework
- **React Native**: 0.73.9
  - TypeScript: 5.2.2
  - Metro bundler: 0.80.5
  - Node.js: 18.19.0 LTS or 20.10.0 LTS
  - Java: 17

### Navigation & UI
- **React Navigation**: 6.1.9
  - @react-navigation/native: 6.1.9
  - @react-navigation/bottom-tabs: 6.5.11
  - @react-navigation/stack: 6.3.20
  - react-native-screens: 3.27.0
  - react-native-safe-area-context: 4.8.2
- **UI Components**:
  - react-native-paper: 5.11.3
  - react-native-vector-icons: 10.0.3
  - react-native-gesture-handler: 2.14.0
  - react-native-reanimated: 3.5.4
  - react-native-super-grid: 5.0.0

### Maps & Location
- **Mapbox**: @rnmapbox/maps 10.1.11
- **Location Services**:
  - react-native-geolocation-service: 5.3.1
  - react-native-background-timer: 2.4.1

### Camera & Media
- **react-native-image-picker**: 7.1.0
- **Image Processing**:
  - react-native-image-resizer: 3.0.5
  - react-native-fs: 2.20.0
  - react-native-blob-util: 0.19.6
  - react-native-fast-image: 8.6.3

### Data Storage & Sync
- **Database ORM**: @nozbe/watermelondb: 0.27.1
- **Fast Storage**: react-native-mmkv: 2.11.0
- **State Management**: 
  - @tanstack/react-query: 5.17.9
  - @tanstack/query-sync-storage-persister: 5.17.9
  - @tanstack/query-async-storage-persister: 5.17.9

### Authentication & Security
- **Azure AD**: react-native-msal: 3.2.0
- **Security**:
  - react-native-keychain: 8.1.2
  - react-native-cert-pinner: 2.0.0
  - react-native-crypto-js: 1.0.0
  - react-native-config: 1.5.1

### Network & API
- **axios**: 1.6.5
- **axios-retry**: 4.0.0
- **react-native-netinfo**: 11.2.1

### Form Management & Validation
- **react-hook-form**: 7.48.2
    - Controller wrapper solves ref issues
- **yup**: 1.3.3
- **zod**: 3.22.4

### Utilities
- **date-fns**: 3.2.0
- **react-native-uuid**: 2.0.1
- **react-native-localize**: 3.0.6

### Notifications
- **@notifee/react-native**: 7.8.2

### Deep Linking
- **react-navigation deep linking**: Built into React Navigation

### Development & Testing
- **Jest**: 29.7.0
- **React Native Testing Library**: 12.4.3
- **Maestro**: 1.34.1
- **Flipper**: 0.239.0

### Analytics & Monitoring
- **@bugsnag/react-native**: 7.22.3
- **react-native-performance**: 5.1.0
- **react-native-device-info**: 10.12.0

### Version Locking Strategy
Use tilde (~) for dependencies to allow patch updates while preventing breaking changes from minor/major updates.

## 2. Architecture Design

### Layer Architecture (Hexagonal/Clean Architecture)

```
┌─────────────────────────────────────────────────┐
│                 Presentation Layer              │
│  (React Native Components, Screens, Navigation) │
├─────────────────────────────────────────────────┤
│                Application Layer                │
│      (Use Cases, React Query Mutations)         │
├─────────────────────────────────────────────────┤
│                  Domain Layer                   │
│   (Business Logic, Entities, Domain Services)   │
├─────────────────────────────────────────────────┤
│              Infrastructure Layer               │
│  (API Clients, WatermelonDB, Camera, Storage)   │
└─────────────────────────────────────────────────┘
```

### Architecture Governance & Quality Gates

```typescript
interface ArchitectureMetrics {
  modularity: {
    couplingBetweenObjects: number;      // ⚠️ WARNING if > 5
    lackOfCohesion: number;               // ⚠️ WARNING if > 0.5
    instability: number;                  // ⚠️ WARNING if outside 0.3-0.7
    abstractness: number;                 // ⚠️ WARNING if outside 0.2-0.4
  };
  
  quality: {
    cyclomaticComplexity: number;         // ⚠️ WARNING if > 10
    codeSmells: number;                   // ⚠️ WARNING if > 0
    technicalDebt: string;                // ⚠️ WARNING if > 1 day
    testCoverage: number;                 // ⚠️ WARNING if < 80%
  };
  
  drift: {
    dependencyViolations: number;         // 🚨 ERROR if > 0
    layerViolations: number;              // 🚨 ERROR if > 0
    circularDependencies: number;         // 🚨 ERROR if > 0
    moduleSize: number;                   // ⚠️ WARNING if > 500 LOC
  };
}
```

### Folder Structure (Revised for Existing Project)
```
DamInspectApp/
├── mobile/                    # React Native app in subdirectory
│   ├── src/
│   │   ├── presentation/
│   │   │   ├── screens/
│   │   │   │   ├── auth/
│   │   │   │   ├── map/
│   │   │   │   ├── inspection/
│   │   │   │   └── settings/
│   │   │   ├── components/
│   │   │   │   ├── common/
│   │   │   │   ├── forms/
│   │   │   │   └── ui/
│   │   │   └── navigation/
│   │   ├── application/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── store/
│   │   │       ├── slices/
│   │   │       └── queries/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   └── repositories/
│   │   └── infrastructure/
│   │       ├── api/
│   │       ├── database/
│   │       ├── storage/
│   │       └── device/
│   ├── ios/
│   ├── android/
│   ├── .env.example
│   ├── .env
│   └── package.json
├── __tests__/                 # Existing test suite
├── docs/                      # Documentation
├── data/                      # CSV data files
└── scripts/                   # Build and deployment scripts
```

## 3. Implementation Phases

### Phase 1: Project Setup & Core Infrastructure (Week 1-2)
1. **Initialize React Native Project in mobile/ subdirectory**
   ```bash
   cd /Users/ryangibeault/Projects/DamInspectApp
   npx react-native@0.73.2 init mobile --template react-native-template-typescript@6.13.2
   ```
2. **Configure TypeScript & ESLint**
3. **Set up folder structure following hexagonal architecture**
4. **Install and configure ALL core dependencies (ensure compatibility)**
5. **Set up Redux Toolkit + React Query for state management**
6. **Configure environment variables with react-native-config**
7. **Set up MMKV for fast key-value storage**
8. **Configure secure storage with Keychain**

### Phase 2: Authentication System (Week 2)
1. **Implement Azure MSAL integration**
   - Configure iOS Info.plist for MSAL
   - Configure Android manifest
   - Create auth service wrapper
2. **Implement secure token storage**
3. **Create login/logout flow**
4. **Add biometric authentication (optional)**
5. **Test 2FA flow**

### Phase 3: Navigation & Basic Screens (Week 3)
1. **Set up React Navigation**
   - Bottom tab navigator
   - Stack navigators for each tab
2. **Create screen templates**
3. **Implement navigation flow**
4. **Add loading states and error boundaries**

### Phase 4: Map Integration (Week 4-5)
1. **Configure Mapbox**
   - Add API key securely
   - Configure iOS/Android native modules
2. **Implement offline map downloads**
3. **Add user location tracking**
4. **Display assets from database**
5. **Implement clustering for many points**
6. **Add asset selection interaction**

### Phase 5: Database & Offline Storage (Week 6)
1. **Set up SQLite with encryption**
2. **Create database schema**
3. **Implement repository pattern**
4. **Set up data migrations**
5. **Implement sync queue logic**
6. **Test offline/online transitions**

### Phase 6: Camera & Photo Management (Week 7)
1. **Integrate react-native-image-picker**
2. **Implement photo capture with metadata**
3. **Add image compression**
4. **Create photo gallery component**
5. **Implement file system photo storage (not SQLite)**
6. **Store only photo metadata in database**
7. **Implement Azure Blob upload with file paths**
8. **Handle offline photo queue with file system**

### Phase 7: Inspection Workflow (Week 8-9)
1. **Create inspection forms**
2. **Implement observation entry**
3. **Add sensor reading forms**
4. **Implement validation logic**
5. **Create inspection summary**
6. **Add draft/submit functionality**

### Phase 8: API Integration (Week 10)
1. **Implement DamSafety.IO client**
2. **Add request/response interceptors**
3. **Implement retry logic**
4. **Add API contract validation**
5. **Test sync mechanisms**
6. **Handle conflict resolution**

### Phase 9: Performance & Polish (Week 11)
1. **Optimize app startup time**
2. **Implement lazy loading**
3. **Add app state persistence**
4. **Optimize image loading**
5. **Add animations and transitions**
6. **Implement error tracking (Bugsnag)**

### Phase 10: Testing & Deployment (Weeks 12-13)
1. **Run comprehensive test suite**
2. **Write and run E2E tests with Maestro**
3. **Security audit**
4. **Performance profiling**
5. **Fix critical bugs from testing**
6. **Prepare App Store submission**
7. **Create distribution certificates**
8. **Beta testing with TestFlight/Play Console**

## 4. Critical Implementation Considerations

### iOS Specific Requirements
```xml
<!-- Info.plist additions -->
<key>NSCameraUsageDescription</key>
<string>DamInspect needs camera access to photograph dam conditions</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>DamInspect needs photo library access to save inspection photos</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>DamInspect saves inspection photos to your library</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>DamInspect needs location to map nearby assets</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>DamInspect tracks location during inspections</string>
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

<!-- Podfile minimum iOS version -->
```ruby
platform :ios, '13.0'
```

### Android Specific Requirements
```xml
<!-- AndroidManifest.xml permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
```

<!-- build.gradle minSdkVersion -->
```gradle
minSdkVersion = 26  // Required for modern React Native libraries
targetSdkVersion = 34
compileSdkVersion = 34
```

### Offline-First Architecture Pattern with Conflict Resolution
```typescript
interface PhotoStorage {
  id: string;
  localPath: string;
  thumbnailPath: string;
  metadata: object;
  uploadStatus: 'pending' | 'uploading' | 'complete' | 'failed';
  azureBlobUrl?: string;
}

interface SyncQueueItem {
  id: string;
  localId: string;
  serverId?: string;
  type: 'inspection' | 'observation' | 'reading' | 'photo';
  data: any;
  filePath?: string;
  version: number;
  retryCount: number;
  createdAt: Date;
  lastAttempt?: Date;
  conflictResolution?: 'local' | 'server' | 'merge';
}

interface ConflictResolver {
  resolve(local: any, server: any): Promise<any>;
}

interface PhotoStorageService {
  savePhoto(photoUri: string, metadata: any): Promise<PhotoStorage>;
  cleanupSyncedPhotos(): Promise<void>;
}

interface InspectionRepository {
  save(inspection: Inspection): Promise<void>;
  find(criteria: any): Promise<Inspection[]>;
  update(id: string, data: any): Promise<void>;
}
```

### State Management Strategy
React Query handles all state management with offline-first support, optimistic updates, and MMKV persistence for UI state.

## 5. Deployment Strategy

### iOS Deployment
1. **Development**: TestFlight for internal testing
2. **Beta**: TestFlight external testing (up to 10,000 testers)
3. **Production**: App Store release
4. **Code Signing**: Automatic signing with Xcode

### Android Deployment
1. **Development**: Internal app sharing
2. **Beta**: Google Play Console closed testing
3. **Production**: Google Play Store release
4. **Signing**: Generate release keystore

### CI/CD Pipeline (Complete GitHub Actions)
```yaml
name: Build and Deploy
on:
  push:
    branches: [main, develop, release/*]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18.19.0'
  JAVA_VERSION: '17'
  RUBY_VERSION: '3.2'

jobs:
  test:
    runs-on: macos-14  # M1 Mac for faster builds
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'yarn'
      
      - name: Install dependencies
        run: |
          cd mobile
          yarn install --frozen-lockfile
      
      - name: Run tests
        run: |
          cd mobile
          yarn test --coverage
          yarn lint
          yarn type-check
      
      - name: Setup Ruby (for Fastlane)
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: ${{ env.RUBY_VERSION }}
          bundler-cache: true
      
      - name: Build iOS
        if: github.ref == 'refs/heads/main'
        run: |
          cd mobile/ios
          bundle exec fastlane ios build
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          FASTLANE_APPLE_ID: ${{ secrets.APPLE_ID }}
      
      - name: Build Android
        if: github.ref == 'refs/heads/main'
        run: |
          cd mobile/android
          bundle exec fastlane android build
        env:
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
      
      - name: Deploy to TestFlight
        if: github.ref == 'refs/heads/main' && success()
        run: |
          cd mobile/ios
          bundle exec fastlane ios beta
      
      - name: Deploy to Play Console
        if: github.ref == 'refs/heads/main' && success()
        run: |
          cd mobile/android
          bundle exec fastlane android beta
```

### Fastlane Configuration
```ruby
# mobile/fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    increment_build_number
    build_app(scheme: "DamInspect")
    upload_to_testflight
  end
end

platform :android do
  desc "Build and upload to Play Console"
  lane :beta do
    gradle(task: "clean assembleRelease")
    upload_to_play_store(track: "beta")
  end
end
```

## 6. Performance Targets (Industry Standard)

### App Performance Metrics
- **Cold Start**: < 3 seconds (industry standard)
- **Warm Start**: < 1 second
- **Time to Interactive (TTI)**: < 5 seconds
- **Photo Capture**: < 750ms (including compression)
- **Map Load**: < 2 seconds (with cached tiles)
- **Form Input Latency**: < 100ms
- **Sync Operation**: < 10 seconds for typical inspection
- **Memory Usage**: < 250MB typical, < 500MB peak
- **Battery Impact**: < 8% per hour of active use
- **Crash Rate**: < 0.1% of sessions
- **ANR Rate**: < 0.05% (Android Not Responding)

### Bundle Size Targets
- **Initial APK/IPA**: < 50MB
- **Post-install Size**: < 150MB
- **JavaScript Bundle**: < 5MB (code-split)

### Offline Capabilities
- **Offline Map Storage**: 100-500MB (configurable)
- **Photo Queue**: Up to 500 photos (auto-cleanup after sync)
- **Inspection Queue**: Max 1000 items (with pagination)
- **Sync Resume**: Automatic with exponential backoff
- **Data Retention**: 30 days offline capability
- **Cache Size**: Max 1GB total (auto-managed)

## 7. Security Implementation (Enhanced)

### Data Protection
1. **At Rest**: 
   - Selective encryption (sensitive fields only) to reduce overhead
   - MMKV encryption for credentials
   - SQLite encryption for critical tables only
2. **In Transit**: 
   - TLS 1.3 minimum
   - Certificate pinning with rotation strategy
   - Backup pins for certificate updates
3. **Authentication**: 
   - OAuth 2.0 with PKCE flow
   - Refresh token rotation
   - Session timeout after 30 minutes inactive
4. **Token Storage**: 
   - iOS Keychain Services
   - Android Keystore with hardware backing
   - Biometric-protected access
5. **API Key Management**:
   ```typescript
   // Secure configuration
   import Config from 'react-native-config';
   
   const API_CONFIG = {
     baseURL: Config.API_BASE_URL,
     mapboxToken: Config.MAPBOX_TOKEN,  // From .env file
     sentryDSN: Config.SENTRY_DSN,
   };
   ```

### Certificate Rotation Strategy
```typescript
const certificatePinner = {
  pins: [
    { pattern: '*.damsafety.io', pins: ['sha256/PRIMARY_PIN', 'sha256/BACKUP_PIN'] },
  ],
  // Fallback for certificate updates
  validateWithoutPinning: (url) => {
    // Allow unpinned requests during grace period
    return isInGracePeriod() && isKnownDomain(url);
  }
};
```

### Compliance Requirements
- **FERC**: Immutable audit trail with timestamps and user IDs
- **USACE**: 7-year retention with archival strategy
- **NIST 800-53**: Implement applicable controls
- **Privacy**: No PII in logs or analytics
- **Note**: GDPR/CCPA compliance not required (not in EU, below CCPA thresholds)
- **GDPR/CCPA**: Data export and deletion capabilities

## 8. Risk Mitigation

### Technical Risks
1. **Library Incompatibility**: Lock versions in package.json
2. **iOS/Android Divergence**: Use cross-platform libraries
3. **Performance Issues**: Profile early and often
4. **Data Loss**: Implement robust backup/sync
5. **API Changes**: Version API, maintain backwards compatibility

### Mitigation Strategies
- **Version Locking**: Use exact versions, not ranges
- **Regular Updates**: Monthly dependency updates
- **Automated Testing**: 80% code coverage minimum
- **Feature Flags**: Gradual rollout capability
- **Rollback Plan**: Keep previous version available

## 9. Success Criteria

### Technical Success
- All tests passing (100% of critical paths)
- Performance metrics met
- Security audit passed
- App Store approval achieved

### User Success
- 30-second inspection start time
- Zero data loss incidents
- 99.9% sync success rate
- Offline capability for 30+ days

## 10. Additional Considerations

### Smart Sync Queue with Priority Processing
```typescript
interface SmartSyncQueue {
  processBatch(): Promise<void>;
  addToQueue(item: any, priority: 'high' | 'medium' | 'low'): void;
  getQueueStatus(): QueueStatus;
}
```

### Modular Architecture
Break complex modules into focused, single-responsibility components coordinated by facades:
- **MapRenderer**: Map display only
- **AssetLayer**: Asset management
- **LocationTracker**: GPS handling  
- **MapDownloader**: Offline tile management
- **MapScreenFacade**: Coordination layer

### Error Boundary Implementation
```typescript
interface ErrorBoundary {
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
  handleReset(): void;
  render(): ReactNode;
}
```

### Offline Map Management with Level of Detail
```typescript
interface MapTileCache {
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  zoomLevels: { overview: number; standard: number; detailed: number };
  maxCacheSize: number;
  lastAccessed: Date;
}

interface MapCacheManager {
  downloadRegion(region: MapTileCache): Promise<void>;
  cleanupOldTiles(): Promise<void>;
  getCurrentCacheSize(): Promise<number>;
}
```

### Deep Linking Configuration
Configure React Navigation to handle:
- **URL Schemes**: `damsafety://` and `https://app.damsafety.io`
- **Routes**: `/map`, `/inspection/:id`, `/asset/:assetId`, `/new-inspection/:assetId?`
- **Notification Opens**: Handle URLs from push notifications

## 11. Additional Considerations

### Accessibility (WCAG 2.1 AA Compliance)
- **Screen Reader Support**: VoiceOver (iOS) and TalkBack (Android)
- **Touch Targets**: Minimum 44x44pt (iOS) and 48x48dp (Android)
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Focus Management**: Proper focus order and indicators
- **Announcements**: Live regions for dynamic content

### Internationalization (i18n)
Support for multiple languages using react-native-localize and i18next with fallback to English.

### App Updates Strategy
- **CodePush**: For JavaScript-only updates
- **Version Check**: API endpoint for minimum version
- **Force Update**: Modal for critical updates
- **Migration**: Database schema versioning

### Testing Device Matrix
- **iOS Devices**: iPhone 12 mini, 13, 14, 15 Pro, 15 Pro Max
- **iOS Versions**: 13.0 - 17.x
- **Android Devices**: Pixel 6, Samsung S22, OnePlus 10
- **Android Versions**: API 26-34 (Android 8-14)
- **Network Conditions**: 3G, 4G, 5G, WiFi, offline

## 11. WatermelonDB Schema
Three main tables:
- **inspections**: Core inspection data with conflict tracking
- **photo_metadata**: Photo references and upload status (files stored separately)
- **conflicts**: Conflict records for database manager review

## 12. Revised Timeline (15 Weeks)

### Phase 1: Foundation (Weeks 1-2)
- Project setup with correct dependencies
- Environment configuration
- CI/CD pipeline setup
- Basic app shell running

### Phase 2: Core Features (Weeks 3-8)
- Week 3: Authentication with Azure MSAL
- Week 4: Navigation and basic UI
- Week 5-6: Mapbox integration with offline support
- Week 7: Database setup with conflict resolution
- Week 8: Camera and photo management

### Phase 3: Business Logic (Weeks 9-11)
- Week 9-10: Inspection workflow implementation
- Week 11: API integration with sync queue

### Phase 4: Polish & Deployment (Weeks 12-15)
- Week 12: Performance optimization
- Week 13-14: Comprehensive testing with Maestro
- Week 15: Security audit and App Store/Play Store submission

## 13. Success Criteria

### Technical Metrics
- ✅ All unit tests passing (>80% coverage)
- ✅ E2E tests passing on both platforms
- ✅ Performance metrics met
- ✅ Security audit passed
- ✅ Zero critical bugs
- ✅ Accessibility audit passed

### Business Metrics
- ✅ 30-second inspection start time
- ✅ 99.9% data integrity
- ✅ 99% sync success rate
- ✅ 30-day offline capability
- ✅ <0.1% crash rate

### Deployment Readiness
- ✅ App Store approval
- ✅ Play Store approval
- ✅ TestFlight beta testing complete
- ✅ Documentation complete
- ✅ Support team trained

This revised plan addresses all identified issues with compatible library versions, comprehensive security, proper conflict resolution, and production-ready architecture.
