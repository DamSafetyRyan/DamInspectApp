# DamInspect Test Suite

This directory contains focused, modular tests for the DamInspect mobile application, following Test-Driven Development (TDD) principles. All test files are kept under 200 lines for excellent readability and maintainability.

## Test Structure

```
__tests__/
├── unit/                     # Fast, isolated unit tests
│   └── domain/              # Business logic tests
│       ├── InspectionValidation.test.ts
│       ├── SensorReadingValidation.test.ts
│       ├── OfflineQueueLogic.test.ts
│       └── inspection-rules/
│           └── InspectionFrequencyLogic.test.ts
├── integration/             # Tests with dependencies
│   └── api/
│       └── BasicApiIntegration.test.ts
├── e2e/                     # End-to-end user workflows
│   └── workflows/
│       └── BasicInspectionFlow.test.ts
├── security/                # Essential security tests
│   ├── authorization/BasicAuthorization.test.ts
│   ├── input-validation/BasicInputValidation.test.ts
│   ├── session-csrf/BasicSessionCSRF.test.ts
│   └── BasicSecurityValidation.test.ts
├── performance/             # Performance requirements
│   └── AppPerformanceRequirements.test.ts
├── contract/                # API schema validation
│   └── ApiSchemaValidation.test.ts
├── fixtures/                # Test data and mocks
│   ├── factories.ts         # Test data factories
│   ├── MockApiServer.ts     # Mock DamSafety.IO API
│   ├── TestDiagnostics.ts   # Test diagnostics
│   └── PerformanceProfiler.ts
└── setup/                   # Test configuration
    ├── jest.setup.js        # Global test setup
    └── custom-matchers.js   # Domain-specific matchers
```

## Test Categories

### Unit Tests (< 10 seconds)
- **Purpose**: Test business logic and validation rules in isolation
- **Speed**: Milliseconds per test
- **Coverage**: Business rules, data validation, queue logic
- **When to run**: Every code change, pre-commit hooks

**Current Tests:**
- **InspectionValidation.test.ts**: Inspection data validation rules
- **SensorReadingValidation.test.ts**: Sensor reading validation logic  
- **OfflineQueueLogic.test.ts**: Queue priority and persistence logic
- **InspectionFrequencyLogic.test.ts**: Inspection scheduling business rules

### Integration Tests (< 2 minutes)
- **Purpose**: Test component interactions with mock services
- **Speed**: Seconds per test
- **Coverage**: API integration, basic data flow
- **When to run**: Before merging, CI pipeline

**Current Tests:**
- **BasicApiIntegration.test.ts**: Core API operations (auth, dam data, inspection submission)

### End-to-End Tests (< 5 minutes)
- **Purpose**: Test complete user workflows with simplified mock app
- **Speed**: Seconds per test
- **Coverage**: Core user journeys
- **When to run**: Before releases, nightly builds

**Current Tests:**
- **BasicInspectionFlow.test.ts**: Core inspection workflow (login → select dam → create inspection → submit)

### Performance Tests (< 5 minutes)
- **Purpose**: Validate core performance requirements for mobile app
- **Speed**: Seconds per test
- **Coverage**: App launch, photo capture, sync speed requirements
- **When to run**: Before releases, performance regression detection

**Current Tests:**
- **AppPerformanceRequirements.test.ts**: Core performance requirements (launch < 2s, photo < 1s, form response < 100ms)

### Security Tests (< 5 minutes)
- **Purpose**: Validate essential security measures for dam inspection app
- **Speed**: Seconds per test
- **Coverage**: Basic security validation without over-engineering
- **When to run**: Every security-related change, before releases

**Essential Security Tests:**
- **Basic Authorization**: Role-based access control (VIEWER, ENGINEER, MANAGER)
- **Input Validation**: SQL injection and XSS prevention in inspection forms
- **Session & CSRF**: Basic session management and form submission protection
- **Data Security**: Offline data encryption and integrity validation
- **Audit Logging**: Regulatory compliance logging for FERC/USACE requirements

### Contract Tests (< 1 minute)
- **Purpose**: Validate API data structures and compatibility
- **Speed**: Milliseconds per test
- **Coverage**: API schemas, data structure validation
- **When to run**: Before API changes, integration updates

**Current Tests:**
- **ApiSchemaValidation.test.ts**: Request/response structure validation, data format consistency

## Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit           # Fast unit tests only
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end tests
npm run test:security      # Essential security tests
npm run test:performance   # Performance benchmarks
npm run test:contract      # API contract validation

# Run specific modules
npm run test:unit -- --testPathPattern=inspection-rules
npm run test:e2e -- --testPathPattern=workflows/RoutineInspection
npm run test:performance -- --testPathPattern=queue/QueueVolume
npm run test:contract -- --testPathPattern=auth/Authentication

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode (no watch, coverage required)
npm run test:ci
```

## Test Data Management

### Factories
Use test data factories to create consistent, realistic test objects:

```typescript
// Create a standard dam
const dam = DamFactory.create();

// Create a high-hazard concrete dam
const highHazardDam = DamFactory.createConcrete({ 
  hazardClassification: 'HIGH' 
});

// Create a critical inspection
const criticalInspection = InspectionFactory.createCritical();
```

### Mock Services
Mock external services for predictable testing:

```typescript
// Mock DamSafety.IO API
const mockServer = new MockApiServer();
mockServer.mockAuth('/api/auth/signin', { accessToken: 'token' });
mockServer.mockGetDam('/api/dams/123', dam);

// Mock GPS location
mockLocation.setCurrentLocation({ lat: 40.7128, lng: -74.0060 });

// Mock camera
mockCamera.simulatePhotoCapture('test-photo.jpg');
```

## Custom Matchers

Domain-specific Jest matchers for readable assertions:

```typescript
// Test inspection validity
expect(inspection).toHaveValidRating();
expect(inspection).toBeCriticalInspection();

// Test sensor readings
expect(reading).toBeWithinNormalRange(sensor);
expect(reading).toRequireConfirmation();

// Test GPS coordinates
expect(coordinates).toBeNearLocation(damLocation, 1); // Within 1 mile

// Test API responses
expect(response).toBeSuccessfulApiResponse();
expect(response).toHaveApiError('Invalid credentials');

// Test FERC compliance
expect(inspection).toMeetFERCRequirements();
```

## Performance Testing

Monitor test performance and app performance:

```typescript
// Measure operation timing
performance.mark('start-sync');
await syncManager.processQueue();
performance.mark('end-sync');
performance.measure('sync-duration', 'start-sync', 'end-sync');

// Assert performance requirements
const syncTime = performance.getEntriesByType('measure')[0].duration;
expect(syncTime).toBeLessThan(5000); // < 5 seconds
```

## Error Simulation

Test error conditions and edge cases:

```typescript
// Network failures
mockServer.simulateOffline(true);
mockServer.mockTimeoutThenSuccess('/api/dams/123', dam, 2);

// Device limitations
mockCamera.simulateFailure('Camera permission denied');
mockLocation.simulateFailure('GPS unavailable');

// Storage constraints
mockStorage.simulateFullStorage();
```

## Continuous Integration

Tests run automatically on:
- **Every commit**: Unit tests (< 30s)
- **Pull requests**: Unit + Integration tests (< 3min)
- **Nightly builds**: Full test suite including E2E (< 10min)
- **Pre-release**: Full suite + performance benchmarks

### Coverage Requirements
- **Overall**: 80% minimum
- **Critical paths**: 95% minimum (validators, safety logic)
- **Domain logic**: 90% minimum

### Quality Gates
Tests must pass these gates before code can be merged:
- All tests pass
- Coverage thresholds met
- No performance regressions
- No accessibility violations
- TypeScript compilation succeeds
- Linting passes

## Debugging Tests

### Common Issues

**Test timeouts:**
```typescript
// Increase timeout for slow operations
test('should sync large queue', async () => {
  // Test implementation
}, 30000); // 30 second timeout
```

**Async operations:**
```typescript
// Wait for async operations to complete
await testUtils.waitFor(() => syncQueue.isEmpty());
```

**Mock issues:**
```typescript
// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
  mockServer.clearRequestHistory();
});
```

### Test Debugging Tools

```bash
# Run specific test file
npm test InspectionValidator.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="critical"

# Debug mode with Chrome DevTools
node --inspect-brk node_modules/.bin/jest --runInBand

# Verbose output
npm test -- --verbose
```

## Best Practices

### 1. Test Structure (AAA Pattern)
```typescript
test('should validate inspection with valid data', () => {
  // ARRANGE (Given)
  const inspection = InspectionFactory.create({ rating: 'GOOD' });
  const validator = new InspectionValidator();
  
  // ACT (When)
  const result = validator.validate(inspection);
  
  // ASSERT (Then)
  expect(result.isValid).toBe(true);
  expect(result.errors).toHaveLength(0);
});
```

### 2. Descriptive Test Names
- Use "should" statements: `should validate inspection with valid data`
- Include context: `should reject reading when GPS is too far from sensor`
- Be specific: `should queue critical inspection for immediate sync`

### 3. Test Independence
- Each test should be able to run in isolation
- No shared state between tests
- Clean setup and teardown

### 4. Mock Strategy
- Mock external dependencies (APIs, hardware)
- Don't mock business logic under test
- Use factories for consistent test data

### 5. Performance Considerations
- Keep unit tests fast (< 100ms each)
- Use `beforeAll` for expensive setup when possible
- Clean up resources in `afterEach`

## Safety-Critical Testing

Since DamInspect deals with critical infrastructure safety:

### 1. Data Integrity Tests
- Test that no data is lost during offline operations
- Verify critical issues trigger immediate alerts
- Ensure GPS coordinates are always captured

### 2. Regulatory Compliance Tests
- FERC Part 12D requirement validation
- Mandatory photo documentation for deficiencies
- Proper audit trail maintenance

### 3. Error Recovery Tests
- App crash during inspection
- Network failure mid-sync
- Device storage full
- Camera/GPS hardware failure

### 4. Edge Case Testing
- Extreme sensor readings
- Very old or future dates
- Invalid GPS coordinates
- Corrupted local data

Remember: **In safety-critical applications, comprehensive testing isn't optional—it's essential for protecting lives and infrastructure.**
