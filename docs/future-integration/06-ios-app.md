# 06 – DamInspect iOS App Architecture

## Overview
DamInspect is a native iOS application built with SwiftUI for conducting dam safety inspections in the field, with robust offline capabilities and seamless synchronization with the DamSafety.IO platform.

## Technical Stack

### Core Technologies
- **Language**: Swift 5.10
- **UI Framework**: SwiftUI 4.0
- **Minimum iOS Version**: iOS 16.0
- **Architecture**: MVVM-C (Model-View-ViewModel-Coordinator)
- **Dependency Management**: Swift Package Manager

### Key Dependencies
```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.8.0"),
    .package(url: "https://github.com/realm/realm-swift.git", from: "10.45.0"),
    .package(url: "https://github.com/mapbox/mapbox-maps-ios.git", from: "10.16.0"),
    .package(url: "https://github.com/pointfreeco/swift-composable-architecture", from: "1.5.0"),
    .package(url: "https://github.com/kishikawakatsumi/KeychainAccess.git", from: "4.2.0"),
    .package(url: "https://github.com/SDWebImage/SDWebImageSwiftUI.git", from: "2.2.0"),
    .package(url: "https://github.com/AliSoftware/Reachability.swift", from: "5.1.0")
]
```

## App Architecture

### Layer Architecture
```
DamInspect/
├── App/
│   ├── DamInspectApp.swift
│   ├── AppDelegate.swift
│   └── SceneDelegate.swift
├── Core/
│   ├── Models/
│   ├── Database/
│   ├── Networking/
│   ├── Services/
│   └── Extensions/
├── Features/
│   ├── Authentication/
│   ├── DamList/
│   ├── Inspection/
│   ├── Sync/
│   └── Settings/
├── Shared/
│   ├── UI/
│   ├── Utils/
│   └── Resources/
└── Tests/
```

### Dependency Injection
```swift
// Core/DI/AppContainer.swift
@MainActor
final class AppContainer: ObservableObject {
    // Services
    let authService: AuthService
    let syncService: SyncService
    let databaseService: DatabaseService
    let mediaService: MediaService
    let locationService: LocationService
    
    // Repositories
    let damRepository: DamRepository
    let inspectionRepository: InspectionRepository
    let mediaRepository: MediaRepository
    
    init() {
        // Initialize services
        self.authService = AuthService()
        self.databaseService = DatabaseService()
        self.syncService = SyncService(database: databaseService)
        self.mediaService = MediaService()
        self.locationService = LocationService()
        
        // Initialize repositories
        self.damRepository = DamRepository(
            database: databaseService,
            network: NetworkService()
        )
        self.inspectionRepository = InspectionRepository(
            database: databaseService,
            network: NetworkService()
        )
        self.mediaRepository = MediaRepository(
            database: databaseService,
            mediaService: mediaService
        )
    }
}
```

## Core Components

### 1. Authentication Module
```swift
// Features/Authentication/AuthViewModel.swift
@MainActor
class AuthViewModel: ObservableObject {
    @Published var authState: AuthState = .unauthenticated
    @Published var error: AuthError?
    
    private let authService: AuthService
    private let keychainService: KeychainService
    
    enum AuthState {
        case unauthenticated
        case authenticating
        case authenticated(user: User)
        case deviceActivation(qrData: String)
    }
    
    func scanQRCode(_ qrData: String) async {
        authState = .deviceActivation(qrData)
        
        do {
            let tokens = try await authService.activateDevice(qrData: qrData)
            keychainService.saveTokens(tokens)
            
            let user = try await authService.getCurrentUser()
            authState = .authenticated(user: user)
        } catch {
            self.error = AuthError.activationFailed(error)
        }
    }
    
    func refreshToken() async throws {
        guard let refreshToken = keychainService.getRefreshToken() else {
            throw AuthError.noRefreshToken
        }
        
        let tokens = try await authService.refreshTokens(refreshToken: refreshToken)
        keychainService.saveTokens(tokens)
    }
}
```

### 2. Dam List & Map View
```swift
// Features/DamList/DamMapView.swift
struct DamMapView: View {
    @StateObject private var viewModel: DamMapViewModel
    @State private var selectedDam: Dam?
    @State private var mapRegion = MKCoordinateRegion()
    
    var body: some View {
        ZStack {
            MapboxMap(
                region: $mapRegion,
                annotations: viewModel.damAnnotations
            )
            .onTapAnnotation { annotation in
                selectedDam = viewModel.getDam(for: annotation)
            }
            .overlay(alignment: .bottom) {
                if let dam = selectedDam {
                    DamInfoCard(dam: dam) {
                        viewModel.navigateToInspection(dam: dam)
                    }
                    .transition(.move(edge: .bottom))
                }
            }
            
            VStack {
                SearchBar(text: $viewModel.searchText)
                    .padding()
                
                Spacer()
                
                HStack {
                    FilterButton(filters: $viewModel.filters)
                    
                    Spacer()
                    
                    LocationButton {
                        viewModel.centerOnUserLocation()
                    }
                }
                .padding()
            }
        }
        .navigationTitle("Select Dam")
        .navigationBarTitleDisplayMode(.inline)
    }
}
```

### 3. Inspection Form
```swift
// Features/Inspection/InspectionFormView.swift
struct InspectionFormView: View {
    @StateObject private var viewModel: InspectionFormViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            Form {
                // Basic Information
                Section("Inspection Details") {
                    TextField("Title", text: $viewModel.inspection.title)
                    
                    DatePicker(
                        "Inspection Date",
                        selection: $viewModel.inspection.inspectedAt,
                        displayedComponents: [.date, .hourAndMinute]
                    )
                    
                    Picker("Type", selection: $viewModel.inspection.type) {
                        ForEach(InspectionType.allCases) { type in
                            Text(type.displayName).tag(type)
                        }
                    }
                }
                
                // Weather Conditions
                Section("Weather Conditions") {
                    WeatherInputView(weather: $viewModel.inspection.weatherConditions)
                }
                
                // Water Level
                Section("Water Level") {
                    HStack {
                        TextField("Water Level", value: $viewModel.inspection.waterLevel, format: .number)
                            .keyboardType(.decimalPad)
                        Text("ft")
                    }
                }
                
                // Overall Assessment
                Section("Overall Assessment") {
                    Picker("Condition", selection: $viewModel.inspection.overallCondition) {
                        Text("Select").tag(nil as ConditionRating?)
                        ForEach(ConditionRating.allCases) { rating in
                            Text(rating.displayName).tag(rating as ConditionRating?)
                        }
                    }
                    
                    TextEditor(text: $viewModel.inspection.summary)
                        .frame(minHeight: 100)
                }
                
                // Observations
                Section("Observations (\(viewModel.observations.count))") {
                    ForEach(viewModel.observations) { observation in
                        ObservationRow(observation: observation)
                    }
                    
                    Button {
                        viewModel.addObservation()
                    } label: {
                        Label("Add Observation", systemImage: "plus.circle")
                    }
                }
                
                // Media
                Section("Photos & Videos (\(viewModel.mediaItems.count))") {
                    MediaGrid(items: viewModel.mediaItems)
                    
                    MediaPickerButton { items in
                        viewModel.addMedia(items)
                    }
                }
            }
            .navigationTitle(viewModel.isNewInspection ? "New Inspection" : "Edit Inspection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: dismiss.callAsFunction)
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await viewModel.save()
                            dismiss()
                        }
                    }
                    .disabled(!viewModel.canSave)
                }
            }
        }
    }
}
```

### 4. Observation Detail
```swift
// Features/Inspection/ObservationDetailView.swift
struct ObservationDetailView: View {
    @Binding var observation: InspectionObservation
    @State private var showLocationPicker = false
    @State private var showCamera = false
    
    var body: some View {
        Form {
            Section("Classification") {
                Picker("Category", selection: $observation.category) {
                    ForEach(ObservationCategory.allCases) { category in
                        Text(category.displayName).tag(category)
                    }
                }
                
                Picker("Component", selection: $observation.component) {
                    ForEach(damComponents(for: observation.category)) { component in
                        Text(component).tag(component)
                    }
                }
                
                Picker("Severity", selection: $observation.severity) {
                    ForEach(ObservationSeverity.allCases) { severity in
                        HStack {
                            SeverityIcon(severity: severity)
                            Text(severity.displayName)
                        }
                        .tag(severity)
                    }
                }
            }
            
            Section("Details") {
                TextField("Title", text: $observation.title)
                
                TextEditor(text: $observation.description)
                    .frame(minHeight: 100)
                
                TextField("Location Description", text: $observation.locationDesc)
                
                Button {
                    showLocationPicker = true
                } label: {
                    HStack {
                        Image(systemName: "location")
                        Text(observation.hasLocation ? "Update Location" : "Set Location")
                        Spacer()
                        if observation.hasLocation {
                            Text("Set")
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            
            Section("Action Required") {
                Toggle("Action Required", isOn: $observation.actionRequired)
                
                if observation.actionRequired {
                    Picker("Action Type", selection: $observation.actionType) {
                        Text("Select").tag(nil as ActionType?)
                        ForEach(ActionType.allCases) { type in
                            Text(type.displayName).tag(type as ActionType?)
                        }
                    }
                    
                    Picker("Priority", selection: $observation.actionPriority) {
                        Text("Select").tag(nil as Priority?)
                        ForEach(Priority.allCases) { priority in
                            Text(priority.displayName).tag(priority as Priority?)
                        }
                    }
                    
                    DatePicker(
                        "Deadline",
                        selection: Binding(
                            get: { observation.actionDeadline ?? Date() },
                            set: { observation.actionDeadline = $0 }
                        ),
                        displayedComponents: .date
                    )
                }
            }
            
            Section("Photos") {
                PhotoGrid(photos: observation.photos)
                
                Button {
                    showCamera = true
                } label: {
                    Label("Take Photo", systemImage: "camera")
                }
            }
        }
        .sheet(isPresented: $showLocationPicker) {
            LocationPickerView(location: $observation.location)
        }
        .sheet(isPresented: $showCamera) {
            CameraView { image in
                observation.addPhoto(image)
            }
        }
    }
}
```

## Data Persistence

### 1. Realm Database Schema
```swift
// Core/Database/Models/InspectionRealm.swift
import RealmSwift

class InspectionRealm: Object {
    @Persisted var id = UUID().uuidString
    @Persisted var offlineId = UUID().uuidString
    @Persisted var serverId: String?
    @Persisted var damId: String = ""
    @Persisted var title: String = ""
    @Persisted var type: String = ""
    @Persisted var inspectedAt = Date()
    @Persisted var status: String = "DRAFT"
    @Persisted var weatherConditions: Data?
    @Persisted var waterLevel: Double?
    @Persisted var location: Data?
    @Persisted var summary: String?
    @Persisted var overallCondition: String?
    @Persisted var observations = List<ObservationRealm>()
    @Persisted var media = List<MediaRealm>()
    @Persisted var isSynced = false
    @Persisted var syncError: String?
    @Persisted var lastModified = Date()
    @Persisted var createdAt = Date()
    
    override static func primaryKey() -> String? {
        return "id"
    }
    
    override static func indexedProperties() -> [String] {
        return ["damId", "status", "isSynced", "inspectedAt"]
    }
}
```

### 2. Migration Manager
```swift
// Core/Database/MigrationManager.swift
class MigrationManager {
    static func performMigrations() {
        let config = Realm.Configuration(
            schemaVersion: 3,
            migrationBlock: { migration, oldSchemaVersion in
                if oldSchemaVersion < 2 {
                    // Added offline support fields
                    migration.enumerateObjects(ofType: InspectionRealm.className()) { _, newObject in
                        newObject?["offlineId"] = UUID().uuidString
                        newObject?["isSynced"] = false
                    }
                }
                
                if oldSchemaVersion < 3 {
                    // Added media processing status
                    migration.enumerateObjects(ofType: MediaRealm.className()) { _, newObject in
                        newObject?["processingStatus"] = "pending"
                    }
                }
            }
        )
        
        Realm.Configuration.defaultConfiguration = config
    }
}
```

## Offline Synchronization

### 1. Sync Engine
```swift
// Core/Services/SyncEngine.swift
actor SyncEngine {
    private let database: DatabaseService
    private let network: NetworkService
    private let mediaUploader: MediaUploadService
    
    private var syncTask: Task<Void, Never>?
    private let syncQueue = AsyncQueue()
    
    func startSync() {
        syncTask = Task {
            while !Task.isCancelled {
                await performSync()
                try? await Task.sleep(nanoseconds: 30_000_000_000) // 30 seconds
            }
        }
    }
    
    private func performSync() async {
        guard NetworkMonitor.shared.isConnected else { return }
        
        // 1. Upload pending media
        await uploadPendingMedia()
        
        // 2. Sync inspections
        await syncInspections()
        
        // 3. Download updates
        await downloadUpdates()
    }
    
    private func uploadPendingMedia() async {
        let pendingMedia = database.getPendingMedia()
        
        await withTaskGroup(of: Void.self) { group in
            for media in pendingMedia {
                group.addTask {
                    await self.uploadMedia(media)
                }
            }
        }
    }
    
    private func syncInspections() async {
        let unsyncedInspections = database.getUnsyncedInspections()
        
        for inspection in unsyncedInspections {
            do {
                let syncData = prepareSyncData(for: inspection)
                let response = try await network.syncInspection(syncData)
                
                database.updateSyncStatus(
                    offlineId: inspection.offlineId,
                    serverId: response.serverId,
                    synced: true
                )
            } catch {
                database.updateSyncError(
                    offlineId: inspection.offlineId,
                    error: error.localizedDescription
                )
            }
        }
    }
}
```

### 2. Conflict Resolution
```swift
// Core/Services/ConflictResolver.swift
struct ConflictResolver {
    enum Resolution {
        case useLocal
        case useServer
        case merge(Inspection)
    }
    
    static func resolve(
        local: Inspection,
        server: Inspection,
        strategy: ConflictStrategy = .lastWriteWins
    ) -> Resolution {
        switch strategy {
        case .lastWriteWins:
            return local.lastModified > server.lastModified ? .useLocal : .useServer
            
        case .serverWins:
            return .useServer
            
        case .merge:
            return .merge(mergeInspections(local: local, server: server))
        }
    }
    
    private static func mergeInspections(local: Inspection, server: Inspection) -> Inspection {
        var merged = server
        
        // Merge observations (union of both sets)
        let localObsIds = Set(local.observations.map(\.offlineId))
        let serverObsIds = Set(server.observations.map(\.offlineId))
        
        let uniqueLocalObs = local.observations.filter { !serverObsIds.contains($0.offlineId) }
        merged.observations.append(contentsOf: uniqueLocalObs)
        
        // Merge media (union of both sets)
        let localMediaIds = Set(local.media.map(\.offlineId))
        let serverMediaIds = Set(server.media.map(\.offlineId))
        
        let uniqueLocalMedia = local.media.filter { !serverMediaIds.contains($0.offlineId) }
        merged.media.append(contentsOf: uniqueLocalMedia)
        
        return merged
    }
}
```

## Media Handling

### 1. Camera Integration
```swift
// Features/Media/CameraView.swift
struct CameraView: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    let onCapture: (UIImage) -> Void
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        picker.allowsEditing = false
        
        // Add overlay for alignment guides
        let overlay = CameraOverlayView()
        picker.cameraOverlayView = overlay
        
        return picker
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraView
        
        init(_ parent: CameraView) {
            self.parent = parent
        }
        
        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]
        ) {
            if let image = info[.originalImage] as? UIImage {
                // Add metadata
                let processedImage = ImageProcessor.addMetadata(
                    to: image,
                    location: LocationService.shared.currentLocation,
                    timestamp: Date()
                )
                
                parent.onCapture(processedImage)
            }
            
            parent.dismiss()
        }
    }
}
```

### 2. Media Compression
```swift
// Core/Services/MediaCompressor.swift
struct MediaCompressor {
    static func compressImage(
        _ image: UIImage,
        maxSize: CGSize = CGSize(width: 2048, height: 2048),
        quality: CGFloat = 0.8
    ) -> Data? {
        let resized = image.resized(to: maxSize, maintainingAspectRatio: true)
        return resized.jpegData(compressionQuality: quality)
    }
    
    static func compressVideo(at url: URL) async throws -> URL {
        let asset = AVAsset(url: url)
        let preset = AVAssetExportPreset1280x720
        
        guard let exporter = AVAssetExportSession(asset: asset, presetName: preset) else {
            throw MediaError.compressionFailed
        }
        
        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("mp4")
        
        exporter.outputURL = outputURL
        exporter.outputFileType = .mp4
        
        await exporter.export()
        
        guard exporter.status == .completed else {
            throw MediaError.compressionFailed
        }
        
        return outputURL
    }
}
```

## Security

### 1. Keychain Storage
```swift
// Core/Security/KeychainManager.swift
import KeychainAccess

class KeychainManager {
    private let keychain = Keychain(service: "io.damsafety.inspect")
        .accessibility(.whenUnlockedThisDeviceOnly)
    
    private enum Keys {
        static let accessToken = "access_token"
        static let refreshToken = "refresh_token"
        static let deviceId = "device_id"
        static let biometricEnabled = "biometric_enabled"
    }
    
    func saveTokens(_ tokens: TokenPair) throws {
        try keychain.set(tokens.accessToken, key: Keys.accessToken)
        try keychain.set(tokens.refreshToken, key: Keys.refreshToken)
    }
    
    func getAccessToken() -> String? {
        try? keychain.getString(Keys.accessToken)
    }
    
    func clearAll() throws {
        try keychain.removeAll()
    }
}
```

### 2. Biometric Authentication
```swift
// Core/Security/BiometricAuth.swift
import LocalAuthentication

class BiometricAuth {
    static func authenticate(
        reason: String,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            completion(.failure(error ?? BiometricError.notAvailable))
            return
        }
        
        context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: reason
        ) { success, error in
            DispatchQueue.main.async {
                if success {
                    completion(.success(()))
                } else {
                    completion(.failure(error ?? BiometricError.authenticationFailed))
                }
            }
        }
    }
}
```

## Performance Optimization

### 1. Image Caching
```swift
// Core/Cache/ImageCache.swift
actor ImageCache {
    private let cache = NSCache<NSString, UIImage>()
    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    
    init() {
        let paths = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
        cacheDirectory = paths[0].appendingPathComponent("ImageCache")
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        
        cache.countLimit = 100
        cache.totalCostLimit = 100 * 1024 * 1024 // 100 MB
    }
    
    func image(for key: String) async -> UIImage? {
        // Check memory cache
        if let cached = cache.object(forKey: key as NSString) {
            return cached
        }
        
        // Check disk cache
        let fileURL = cacheDirectory.appendingPathComponent(key)
        if let data = try? Data(contentsOf: fileURL),
           let image = UIImage(data: data) {
            cache.setObject(image, forKey: key as NSString)
            return image
        }
        
        return nil
    }
    
    func store(_ image: UIImage, for key: String) async {
        cache.setObject(image, forKey: key as NSString)
        
        // Save to disk
        if let data = image.jpegData(compressionQuality: 0.8) {
            let fileURL = cacheDirectory.appendingPathComponent(key)
            try? data.write(to: fileURL)
        }
    }
}
```

### 2. Lazy Loading
```swift
// Shared/UI/LazyView.swift
struct LazyView<Content: View>: View {
    let build: () -> Content
    
    init(_ build: @autoclosure @escaping () -> Content) {
        self.build = build
    }
    
    var body: Content {
        build()
    }
}

// Usage in navigation
NavigationLink {
    LazyView(InspectionDetailView(inspection: inspection))
} label: {
    InspectionRow(inspection: inspection)
}
```

## Testing

### 1. Unit Tests
```swift
// Tests/ViewModels/InspectionFormViewModelTests.swift
@MainActor
class InspectionFormViewModelTests: XCTestCase {
    var viewModel: InspectionFormViewModel!
    var mockRepository: MockInspectionRepository!
    
    override func setUp() {
        super.setUp()
        mockRepository = MockInspectionRepository()
        viewModel = InspectionFormViewModel(repository: mockRepository)
    }
    
    func testSaveInspection() async throws {
        // Arrange
        viewModel.inspection.title = "Test Inspection"
        viewModel.inspection.type = .routine
        viewModel.inspection.overallCondition = .good
        
        // Act
        await viewModel.save()
        
        // Assert
        XCTAssertEqual(mockRepository.savedInspections.count, 1)
        XCTAssertEqual(mockRepository.savedInspections.first?.title, "Test Inspection")
    }
}
```

### 2. UI Tests
```swift
// UITests/InspectionFlowUITests.swift
class InspectionFlowUITests: XCTestCase {
    let app = XCUIApplication()
    
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app.launchArguments = ["--uitesting"]
        app.launch()
    }
    
    func testCreateInspection() {
        // Navigate to dam
        app.maps.element.tap()
        app.otherElements["Pine Valley Dam"].tap()
        
        // Start inspection
        app.buttons["Start Inspection"].tap()
        
        // Fill form
        app.textFields["Title"].tap()
        app.textFields["Title"].typeText("UI Test Inspection")
        
        app.pickers["Type"].tap()
        app.pickerWheels.element.adjust(toPickerWheelValue: "Routine")
        
        // Add observation
        app.buttons["Add Observation"].tap()
        app.textFields["Observation Title"].typeText("Test Finding")
        
        // Save
        app.buttons["Save"].tap()
        
        // Verify
        XCTAssertTrue(app.staticTexts["UI Test Inspection"].exists)
    }
}
```

## App Configuration

### 1. Info.plist
```xml
<key>NSCameraUsageDescription</key>
<string>DamInspect needs camera access to capture inspection photos</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>DamInspect needs location access to record inspection locations</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>DamInspect needs photo library access to select existing photos</string>
<key>UIBackgroundModes</key>
<array>
    <string>fetch</string>
    <string>processing</string>
</array>
```

### 2. Build Settings
```
PRODUCT_NAME = DamInspect
PRODUCT_BUNDLE_IDENTIFIER = io.damsafety.inspect
DEVELOPMENT_TEAM = ABC123XYZ
TARGETED_DEVICE_FAMILY = 1,2
IPHONEOS_DEPLOYMENT_TARGET = 16.0
SWIFT_VERSION = 5.10
``` 