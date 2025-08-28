/**
 * MockObservationRepository Integration Tests
 * Tests the mock repository implementation and CRUD operations
 */

import { MockObservationRepository } from '../MockObservationRepository';
import { Observation } from '../../../domain/entities/Observation';
import { Coordinates } from '../../../domain/value-objects/Coordinates';
import { InspectionCategory } from '../../../domain/value-objects/InspectionCategory';
import { ObservationSeverity, ObservationStatus } from '../../../domain/value-objects/ObservationEnums';
import { DamType } from '../../../domain/value-objects/DamEnums';

describe('MockObservationRepository Integration', () => {
  let repository: MockObservationRepository;
  const testCoordinates = new Coordinates(37.7749, -122.4194);
  const testCategory = new InspectionCategory(DamType.CONCRETE, 'Structural Integrity');

  beforeEach(() => {
    repository = new MockObservationRepository();
  });

  describe('CRUD Operations', () => {
    it('should create new observation', async () => {
      const createRequest = {
        type: 'Test Crack',
        category: testCategory,
        description: 'Test observation description',
        severity: ObservationSeverity.MEDIUM,
        coordinates: testCoordinates,
        photos: ['test-photo.jpg'],
        recordedBy: 'test-inspector',
        notes: 'Test notes',
        followUpRequired: true,
      };

      const created = await repository.create(createRequest);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.type).toBe('Test Crack');
      expect(created.description).toBe('Test observation description');
      expect(created.severity).toBe(ObservationSeverity.MEDIUM);
      expect(created.recordedBy).toBe('test-inspector');
      expect(created.status).toBe(ObservationStatus.OPEN);
      expect(created.followUpRequired).toBe(true);
    });

    it('should find observation by ID after creation', async () => {
      const createRequest = {
        type: 'Findable Observation',
        category: testCategory,
        description: 'Test description',
        severity: ObservationSeverity.LOW,
        coordinates: testCoordinates,
        photos: [],
        recordedBy: 'test-inspector',
      };

      const created = await repository.create(createRequest);
      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.type).toBe('Findable Observation');
    });

    it('should update observation status', async () => {
      const createRequest = {
        type: 'Status Update Test',
        category: testCategory,
        description: 'Test description',
        severity: ObservationSeverity.HIGH,
        coordinates: testCoordinates,
        photos: [],
        recordedBy: 'test-inspector',
      };

      const created = await repository.create(createRequest);
      const updated = await repository.updateStatus(created.id, ObservationStatus.IN_PROGRESS, 'updater');

      expect(updated.status).toBe(ObservationStatus.IN_PROGRESS);
      expect(updated.id).toBe(created.id);
    });

    it('should resolve observation', async () => {
      const createRequest = {
        type: 'Resolution Test',
        category: testCategory,
        description: 'Test description',
        severity: ObservationSeverity.CRITICAL,
        coordinates: testCoordinates,
        photos: [],
        recordedBy: 'test-inspector',
      };

      const created = await repository.create(createRequest);
      const resolved = await repository.resolve(created.id, 'resolver', 'Issue fixed');

      expect(resolved.status).toBe(ObservationStatus.RESOLVED);
      expect(resolved.resolvedBy).toBe('resolver');
      expect(resolved.notes).toBe('Issue fixed');
      expect(resolved.resolvedAt).toBeDefined();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create test data
      await repository.create({
        type: 'Critical Issue',
        category: testCategory,
        description: 'Critical observation',
        severity: ObservationSeverity.CRITICAL,
        coordinates: testCoordinates,
        photos: [],
        recordedBy: 'inspector1',
      });

      await repository.create({
        type: 'High Issue',
        category: testCategory,
        description: 'High severity observation',
        severity: ObservationSeverity.HIGH,
        coordinates: new Coordinates(37.7850, -122.4100), // Different location
        photos: [],
        recordedBy: 'inspector2',
      });

      await repository.create({
        type: 'Low Issue',
        category: testCategory,
        description: 'Low severity observation',
        severity: ObservationSeverity.LOW,
        coordinates: new Coordinates(40.7128, -74.0060), // NYC - far away
        photos: [],
        recordedBy: 'inspector1',
      });
    });

    it('should find observations by status', async () => {
      const openObs = await repository.findByStatus(ObservationStatus.OPEN);
      
      expect(openObs.length).toBeGreaterThanOrEqual(3);
      openObs.forEach(obs => {
        expect(obs.status).toBe(ObservationStatus.OPEN);
      });
    });

    it('should find observations by severity', async () => {
      const criticalObs = await repository.findBySeverity(ObservationSeverity.CRITICAL);
      
      expect(criticalObs.length).toBeGreaterThanOrEqual(1);
      criticalObs.forEach(obs => {
        expect(obs.severity).toBe(ObservationSeverity.CRITICAL);
      });
    });

    it('should find observations by recorder', async () => {
      const inspector1Obs = await repository.findByRecorder('inspector1');
      
      expect(inspector1Obs.length).toBeGreaterThanOrEqual(2);
      inspector1Obs.forEach(obs => {
        expect(obs.recordedBy).toBe('inspector1');
      });
    });

    it('should find observations requiring follow-up', async () => {
      // Create an observation that requires follow-up
      await repository.create({
        type: 'Follow-up Required',
        category: testCategory,
        description: 'Needs follow-up',
        severity: ObservationSeverity.HIGH,
        coordinates: testCoordinates,
        photos: [],
        recordedBy: 'inspector3',
        followUpRequired: true,
      });

      const followUpObs = await repository.findRequiringFollowUp();
      
      expect(followUpObs.length).toBeGreaterThan(0);
      followUpObs.forEach(obs => {
        expect(obs.followUpRequired).toBe(true);
        expect(obs.status).not.toBe(ObservationStatus.RESOLVED);
      });
    });
  });

  describe('Geospatial Queries', () => {
    it('should find nearby observations', async () => {
      const center = new Coordinates(37.7749, -122.4194);
      const nearbyObs = await repository.findNearby(center, 10); // 10km radius
      
      expect(nearbyObs.length).toBeGreaterThan(0);
      
      // Verify all returned observations are within radius
      nearbyObs.forEach(obs => {
        const distance = obs.coordinates.distanceTo(center);
        expect(distance).toBeLessThanOrEqual(10);
      });
    });

    it('should respect radius limits in nearby search', async () => {
      const center = new Coordinates(37.7749, -122.4194);
      
      const nearObs = await repository.findNearby(center, 1);
      const farObs = await repository.findNearby(center, 100);
      
      expect(farObs.length).toBeGreaterThanOrEqual(nearObs.length);
    });

    it('should respect limit parameter in nearby search', async () => {
      const center = new Coordinates(37.7749, -122.4194);
      
      const limitedObs = await repository.findNearby(center, 1000, 2);
      expect(limitedObs.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Date Range Queries', () => {
    it('should find observations by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1); // Tomorrow
      
      const recentObs = await repository.findByDateRange(startDate, endDate);
      
      expect(recentObs.length).toBeGreaterThan(0);
      
      recentObs.forEach(obs => {
        const recordedDate = new Date(obs.recordedAt);
        expect(recordedDate).toBeGreaterThanOrEqual(startDate);
        expect(recordedDate).toBeLessThanOrEqual(endDate);
      });
    });

    it('should return empty array for future date range', async () => {
      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 10);
      
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 20);
      
      const futureObs = await repository.findByDateRange(futureStart, futureEnd);
      expect(futureObs.length).toBe(0);
    });
  });

  describe('Pagination and Counting', () => {
    it('should support pagination', async () => {
      const page1 = await repository.findAll(0, 2);
      const page2 = await repository.findAll(2, 2);
      
      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);
      
      // Pages should not overlap
      const page1Ids = page1.map(obs => obs.id);
      const page2Ids = page2.map(obs => obs.id);
      const overlap = page1Ids.filter(id => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('should return correct count', async () => {
      const initialCount = await repository.count();
      
      await repository.create({
        type: 'Count Test',
        category: testCategory,
        description: 'Test description',
        severity: ObservationSeverity.LOW,
        coordinates: testCoordinates,
        photos: [],
        recordedBy: 'counter',
      });
      
      const newCount = await repository.count();
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when updating non-existent observation', async () => {
      await expect(
        repository.updateStatus('non-existent-id', ObservationStatus.RESOLVED, 'updater')
      ).rejects.toThrow('Observation not found');
    });

    it('should throw error when resolving non-existent observation', async () => {
      await expect(
        repository.resolve('non-existent-id', 'resolver')
      ).rejects.toThrow('Observation not found');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data integrity after operations', async () => {
      const createRequest = {
        type: 'Integrity Test',
        category: testCategory,
        description: 'Test description',
        severity: ObservationSeverity.MEDIUM,
        coordinates: testCoordinates,
        photos: ['photo1.jpg', 'photo2.jpg'],
        recordedBy: 'integrity-tester',
        notes: 'Original notes',
      };

      const created = await repository.create(createRequest);
      const updated = await repository.updateStatus(created.id, ObservationStatus.IN_PROGRESS, 'updater');
      
      // Verify that update preserved original data
      expect(updated.type).toBe(created.type);
      expect(updated.description).toBe(created.description);
      expect(updated.severity).toBe(created.severity);
      expect(updated.recordedBy).toBe(created.recordedBy);
      expect(updated.photos).toEqual(created.photos);
      expect(updated.notes).toBe(created.notes);
      
      // Only status should have changed
      expect(updated.status).toBe(ObservationStatus.IN_PROGRESS);
      expect(updated.status).not.toBe(created.status);
    });
  });
});