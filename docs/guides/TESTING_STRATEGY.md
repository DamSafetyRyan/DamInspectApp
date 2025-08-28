# DamInspect Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for DamInspect, following Test-Driven Development (TDD) principles to ensure high quality, reliability, and maintainability of the codebase.

## Testing Philosophy

### Test-Driven Development (TDD)
1. **Red**: Write a failing test for the desired behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code quality while keeping tests green

### Testing Principles
- Tests are first-class citizens, not an afterthought
- Tests document the expected behavior
- Tests enable confident refactoring
- Tests catch regressions early
- Tests drive better design decisions

## Test Pyramid

```
         /\
        /  \  E2E Tests (5%)
       /----\
      /      \  Integration Tests (15%)
     /--------\
    /          \  Unit Tests (80%)
   /____________\
```

### Distribution
- **Unit Tests**: 80% - Fast, isolated, numerous
- **Integration Tests**: 15% - Test component interactions
- **E2E Tests**: 5% - Critical user journeys only

## Testing Layers

### 1. Domain Layer Testing (Pure Unit Tests)

#### Characteristics
- No external dependencies
- No mocks required
- Test business logic only
- 100% coverage target

#### Example
```typescript
// domain/entities/inspection/Inspection.spec.ts
describe('Inspection Entity', () => {
  describe('create', () => {
    it('should create inspection with valid data', () => {
      const result = Inspection.create({
        damId: new DamId('DAM-001'),
        type: InspectionType.FERC_PART_12D,
        scheduledDate: new Date('2024-01-15')
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().status).toBe(InspectionStatus.DRAFT);
    });

    it('should enforce business rule: FERC inspections only for FERC-regulated dams', () => {
      const result = Inspection.create({
        damId: new DamId('DAM-001'),
        type: InspectionType.FERC_PART_12D,
        damType: DamType.STATE_REGULATED
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('FERC Part 12D inspection not applicable');
    });
  });

  describe('addObservation', () => {
    it('should add observation to in-progress inspection', () => {
      const inspection = createTestInspection({ status: InspectionStatus.IN_PROGRESS });
      const observation = createTestObservation();

      const result = inspection.addObservation(observation);

      expect(result.isSuccess).toBe(true);
      expect(inspection.observations).toContain(observation);
    });

    it('should not add observation to completed inspection', () => {
      const inspection = createTestInspection({ status: InspectionStatus.COMPLETED });
      const observation = createTestObservation();

      const result = inspection.addObservation(observation);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot modify completed inspection');
    });
  });
});
```

### 2. Application Layer Testing (Integration with Mocks)

#### Characteristics
- Mock infrastructure dependencies
- Test use case orchestration
- Verify correct port usage
- 90% coverage target

#### Example
```typescript
// application/use-cases/inspection/CreateInspectionUseCase.spec.ts
describe('CreateInspectionUseCase', () => {
  let useCase: CreateInspectionUseCase;
  let mockInspectionRepo: MockInspectionRepository;
  let mockEventBus: MockEventBus;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockInspectionRepo = new MockInspectionRepository();
    mockEventBus = new MockEventBus();
    mockLogger = new MockLogger();
    
    useCase = new CreateInspectionUseCase(
      mockInspectionRepo,
      mockEventBus,
      mockLogger
    );
  });

  it('should create and persist inspection', async () => {
    // Arrange
    const request: CreateInspectionDTO = {
      damId: 'DAM-001',
      type: 'FERC_PART_12D',
      scheduledDate: '2024-01-15'
    };

    // Act
    const result = await useCase.execute(request);

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(mockInspectionRepo.saved).toHaveLength(1);
    expect(mockEventBus.published).toHaveLength(1);
    expect(mockEventBus.published[0]).toBeInstanceOf(InspectionCreatedEvent);
  });

  it('should handle repository failure gracefully', async () => {
    // Arrange
    mockInspectionRepo.shouldFailOnSave = true;
    const request = createValidRequest();

    // Act
    const result = await useCase.execute(request);

    // Assert
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('Failed to save inspection');
    expect(mockLogger.errors).toHaveLength(1);
  });
});
```

### 3. Infrastructure Layer Testing

#### Characteristics
- Test adapters with real dependencies where possible
- Use test containers for databases
- Mock external APIs
- 80% coverage target

#### Example
```typescript
// infrastructure/persistence/realm/repositories/RealmInspectionRepository.spec.ts
describe('RealmInspectionRepository', () => {
  let realm: Realm;
  let repository: RealmInspectionRepository;

  beforeEach(async () => {
    realm = await Realm.open({
      path: 'test.realm',
      schema: [InspectionSchema],
      inMemory: true
    });
    repository = new RealmInspectionRepository(realm);
  });

  afterEach(() => {
    realm.close();
  });

  it('should save and retrieve inspection', async () => {
    // Arrange
    const inspection = createTestInspection();

    // Act
    await repository.save(inspection);
    const retrieved = await repository.findById(inspection.id);

    // Assert
    expect(retrieved).toBeDefined();
    expect(retrieved?.id.equals(inspection.id)).toBe(true);
    expect(retrieved?.type).toBe(inspection.type);
  });

  it('should handle concurrent modifications', async () => {
    // Test conflict resolution
  });
});
```

### 4. Presentation Layer Testing

#### React Component Testing
```typescript
// presentation/screens/inspection/CreateInspectionScreen.spec.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';

describe('CreateInspectionScreen', () => {
  it('should create inspection on form submission', async () => {
    // Arrange
    const mockCreateInspection = jest.fn().mockResolvedValue(Result.ok({ id: '123' }));
    const { getByText, getByTestId } = render(
      <CreateInspectionScreen createInspection={mockCreateInspection} />
    );

    // Act
    fireEvent.changeText(getByTestId('dam-select'), 'DAM-001');
    fireEvent.changeText(getByTestId('type-select'), 'FERC_PART_12D');
    fireEvent.press(getByText('Create Inspection'));

    // Assert
    await waitFor(() => {
      expect(mockCreateInspection).toHaveBeenCalledWith({
        damId: 'DAM-001',
        type: 'FERC_PART_12D'
      });
    });
  });
});
```

### 5. End-to-End Testing

#### Detox Configuration
```javascript
// e2e/inspection-flow.e2e.ts
describe('Inspection Creation Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should create inspection offline and sync when online', async () => {
    // Go offline
    await device.setURLBlacklist(['.*']);

    // Create inspection
    await element(by.id('create-inspection-button')).tap();
    await element(by.id('dam-select')).tap();
    await element(by.text('Hoover Dam')).tap();
    await element(by.id('type-select')).tap();
    await element(by.text('FERC Part 12D')).tap();
    await element(by.id('submit-button')).tap();

    // Verify created locally
    await expect(element(by.text('Inspection created (offline)'))).toBeVisible();

    // Go online
    await device.clearURLBlacklist();

    // Verify sync
    await waitFor(element(by.text('Synced')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
```

## Testing Tools & Frameworks

### Unit Testing
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing
- **MSW**: Mock Service Worker for API mocking

### Integration Testing
- **Jest**: With longer timeouts
- **Supertest**: HTTP assertion library
- **Test Containers**: Database testing

### E2E Testing
- **Detox**: React Native E2E testing
- **Appium**: Alternative for cross-platform

### Code Quality
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **SonarQube**: Code quality metrics

## Test Data Management

### Fixtures
```typescript
// __tests__/fixtures/inspections.ts
export const createTestInspection = (overrides?: Partial<InspectionProps>) => {
  return Inspection.create({
    damId: new DamId('DAM-TEST-001'),
    type: InspectionType.ROUTINE,
    scheduledDate: new Date('2024-01-15'),
    ...overrides
  }).getValue();
};
```

### Builders
```typescript
// __tests__/builders/InspectionBuilder.ts
export class InspectionBuilder {
  private props: InspectionProps = {
    damId: new DamId('DAM-001'),
    type: InspectionType.ROUTINE,
    scheduledDate: new Date()
  };

  withType(type: InspectionType): this {
    this.props.type = type;
    return this;
  }

  withStatus(status: InspectionStatus): this {
    this.props.status = status;
    return this;
  }

  build(): Inspection {
    return Inspection.create(this.props).getValue();
  }
}
```

## Continuous Integration

### Pre-commit Hooks
```json
// .husky/pre-commit
#!/bin/sh
npm run lint
npm run type-check
npm run test:unit -- --changedSince=main
```

### CI Pipeline Stages
1. **Lint & Format**: Ensure code quality
2. **Type Check**: TypeScript compilation
3. **Unit Tests**: Fast feedback
4. **Integration Tests**: Component interaction
5. **Build**: Ensure buildability
6. **E2E Tests**: Critical paths only

## Coverage Requirements

### Targets by Layer
- **Domain Layer**: 100% coverage
- **Application Layer**: 90% coverage
- **Infrastructure Layer**: 80% coverage
- **Presentation Layer**: 70% coverage
- **Overall**: 85% coverage

### Coverage Configuration
```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/domain/**/*.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
```

## Performance Testing

### Benchmarks
```typescript
// __tests__/performance/inspection-creation.perf.ts
describe('Inspection Creation Performance', () => {
  it('should create inspection in under 100ms', async () => {
    const start = performance.now();
    
    await createInspectionUseCase.execute({
      damId: 'DAM-001',
      type: 'ROUTINE'
    });
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

## Security Testing

### Input Validation
```typescript
describe('Input Validation', () => {
  it('should sanitize user input', () => {
    const maliciousInput = '<script>alert("XSS")</script>';
    const result = sanitizeInput(maliciousInput);
    expect(result).not.toContain('<script>');
  });
});
```

## Accessibility Testing

### React Native Testing
```typescript
describe('Accessibility', () => {
  it('should have proper accessibility labels', () => {
    const { getByLabelText } = render(<InspectionForm />);
    expect(getByLabelText('Dam selection')).toBeDefined();
    expect(getByLabelText('Inspection type')).toBeDefined();
  });
});
```

## Test Execution Strategy

### Local Development
```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test -- Inspection.spec.ts

# Run with coverage
npm test -- --coverage
```

### CI/CD Pipeline
- Run unit tests on every commit
- Run integration tests on PR
- Run E2E tests on merge to develop
- Run full suite before release

## Test Maintenance

### Best Practices
1. Keep tests simple and focused
2. Use descriptive test names
3. Follow AAA pattern (Arrange, Act, Assert)
4. Avoid testing implementation details
5. Maintain test data builders
6. Regular test refactoring

### Test Review Checklist
- [ ] Does the test have a clear purpose?
- [ ] Is the test independent?
- [ ] Does it follow naming conventions?
- [ ] Is it maintainable?
- [ ] Does it test behavior, not implementation?

## Monitoring & Reporting

### Metrics to Track
- Test execution time
- Test flakiness rate
- Coverage trends
- Test maintenance cost

### Reporting Tools
- Jest HTML Reporter
- Codecov for coverage tracking
- Test results in PR comments
- Slack notifications for failures

## Conclusion

This testing strategy ensures DamInspect maintains high quality standards through comprehensive testing at all levels. By following TDD principles and maintaining high coverage targets, we build confidence in the system's reliability and make it easier to evolve the codebase over time. 