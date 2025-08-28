/**
 * InspectionService Unit Tests
 * Tests business logic for inspection planning and analysis
 */

import { InspectionService } from '../InspectionService';
import { Dam } from '../../entities/Dam';
import { Observation } from '../../entities/Observation';
import { IDamRepository } from '../../repositories/IDamRepository';
import { IObservationRepository } from '../../repositories/IObservationRepository';
import { Coordinates } from '../../value-objects/Coordinates';
import { InspectionCategory } from '../../value-objects/InspectionCategory';
import { DamType, HazardLevel, ConditionAssessment } from '../../value-objects/DamEnums';
import { ObservationSeverity, ObservationStatus } from '../../value-objects/ObservationEnums';

// Mock repositories
class MockDamRepository implements IDamRepository {
  private dams: Dam[] = [];

  constructor(dams: Dam[] = []) {
    this.dams = dams;
  }

  async findNearby(center: Coordinates, radiusKm: number, limit?: number): Promise<Dam[]> {
    return this.dams.filter(dam => dam.coordinates.isWithinRadius(center, radiusKm)).slice(0, limit);
  }

  async findById(id: string): Promise<Dam | null> {
    return this.dams.find(dam => dam.id === id) || null;
  }

  async findByNidId(nidId: string): Promise<Dam | null> {
    return this.dams.find(dam => dam.nidId === nidId) || null;
  }

  async findByOwner(ownerName: string): Promise<Dam[]> {
    return this.dams.filter(dam => dam.ownerName.includes(ownerName));
  }

  async findRequiringInspection(): Promise<Dam[]> {
    return this.dams.filter(dam => dam.isInspectionOverdue());
  }

  async findByHazardLevel(hazardLevel: string): Promise<Dam[]> {
    return this.dams.filter(dam => dam.hazardLevel === hazardLevel);
  }

  async findAll(offset?: number, limit?: number): Promise<Dam[]> {
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return this.dams.slice(start, end);
  }

  async count(): Promise<number> {
    return this.dams.length;
  }
}

class MockObservationRepository implements IObservationRepository {
  private observations: Observation[] = [];

  constructor(observations: Observation[] = []) {
    this.observations = observations;
  }

  async create(request: any): Promise<Observation> {
    const obs = new Observation(
      'new-id',
      request.type,
      InspectionCategory.create(request.category.damType, request.category.categoryName),
      request.description,
      request.severity,
      request.coordinates,
      request.photos,
      request.recordedBy,
      new Date().toISOString(),
      ObservationStatus.OPEN,
      request.notes,
      request.followUpRequired
    );
    this.observations.push(obs);
    return obs;
  }

  async findNearby(center: Coordinates, radiusKm: number, limit?: number): Promise<Observation[]> {
    return this.observations.filter(obs => obs.coordinates.isWithinRadius(center, radiusKm)).slice(0, limit);
  }

  async findById(id: string): Promise<Observation | null> {
    return this.observations.find(obs => obs.id === id) || null;
  }

  async findByStatus(status: ObservationStatus): Promise<Observation[]> {
    return this.observations.filter(obs => obs.status === status);
  }

  async findBySeverity(severity: ObservationSeverity): Promise<Observation[]> {
    return this.observations.filter(obs => obs.severity === severity);
  }

  async findByRecorder(recordedBy: string): Promise<Observation[]> {
    return this.observations.filter(obs => obs.recordedBy === recordedBy);
  }

  async findRequiringFollowUp(): Promise<Observation[]> {
    return this.observations.filter(obs => obs.followUpRequired && obs.status !== ObservationStatus.RESOLVED);
  }

  async updateStatus(id: string, status: ObservationStatus, updatedBy: string): Promise<Observation> {
    const obs = this.observations.find(o => o.id === id);
    if (!obs) throw new Error('Observation not found');
    const updated = obs.updateStatus(status, updatedBy);
    const index = this.observations.findIndex(o => o.id === id);
    this.observations[index] = updated;
    return updated;
  }

  async resolve(id: string, resolvedBy: string, notes?: string): Promise<Observation> {
    const obs = this.observations.find(o => o.id === id);
    if (!obs) throw new Error('Observation not found');
    const resolved = obs.resolve(resolvedBy, notes);
    const index = this.observations.findIndex(o => o.id === id);
    this.observations[index] = resolved;
    return resolved;
  }

  async findAll(offset?: number, limit?: number): Promise<Observation[]> {
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return this.observations.slice(start, end);
  }

  async count(): Promise<number> {
    return this.observations.length;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Observation[]> {
    return this.observations.filter(obs => {
      const recordedDate = new Date(obs.recordedAt);
      return recordedDate >= startDate && recordedDate <= endDate;
    });
  }
}

describe('InspectionService', () => {
  let inspectionService: InspectionService;
  let mockDamRepo: MockDamRepository;
  let mockObsRepo: MockObservationRepository;

  const testCoordinates = new Coordinates(37.7749, -122.4194);
  const testCategory = new InspectionCategory(DamType.CONCRETE, 'Structural Integrity');

  beforeEach(() => {
    mockDamRepo = new MockDamRepository();
    mockObsRepo = new MockObservationRepository();
    inspectionService = new InspectionService(mockDamRepo, mockObsRepo);
  });

  describe('getNearbyFeatures', () => {
    it('should return nearby dams and observations', async () => {
      // Setup test data
      const dam = new Dam(
        'dam-1',
        'CA00001',
        'Test Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.HIGH,
        ConditionAssessment.SATISFACTORY,
        true,
        '2024-01-01',
        testCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      const observation = new Observation(
        'obs-1',
        'Crack',
        testCategory,
        'Test observation',
        ObservationSeverity.MEDIUM,
        testCoordinates,
        [],
        'inspector1',
        '2024-01-01T10:00:00Z',
        ObservationStatus.OPEN
      );

      mockDamRepo = new MockDamRepository([dam]);
      mockObsRepo = new MockObservationRepository([observation]);
      inspectionService = new InspectionService(mockDamRepo, mockObsRepo);

      const result = await inspectionService.getNearbyFeatures(testCoordinates, 10);

      expect(result.dams).toHaveLength(1);
      expect(result.observations).toHaveLength(1);
      expect(result.totalCount).toBe(2);
      expect(result.dams[0].id).toBe('dam-1');
      expect(result.observations[0].id).toBe('obs-1');
    });

    it('should respect radius limits', async () => {
      const nearCoords = new Coordinates(37.7750, -122.4194); // Very close
      const farCoords = new Coordinates(38.0000, -122.0000); // Far away

      const nearDam = new Dam(
        'near-dam',
        'CA00001',
        'Near Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.HIGH,
        ConditionAssessment.SATISFACTORY,
        true,
        '2024-01-01',
        nearCoords,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      const farDam = new Dam(
        'far-dam',
        'CA00002',
        'Far Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.HIGH,
        ConditionAssessment.SATISFACTORY,
        true,
        '2024-01-01',
        farCoords,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      mockDamRepo = new MockDamRepository([nearDam, farDam]);
      inspectionService = new InspectionService(mockDamRepo, mockObsRepo);

      const result = await inspectionService.getNearbyFeatures(testCoordinates, 1); // 1km radius

      expect(result.dams).toHaveLength(1);
      expect(result.dams[0].id).toBe('near-dam');
    });
  });

  describe('createInspectionPlan', () => {
    it('should create inspection plan for existing dam', async () => {
      const dam = new Dam(
        'dam-1',
        'CA00001',
        'Test Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.HIGH,
        ConditionAssessment.POOR, // Poor condition for critical priority
        true,
        '2024-01-01',
        testCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      const observation = new Observation(
        'obs-1',
        'Seepage',
        testCategory,
        'Seepage observed',
        ObservationSeverity.HIGH,
        testCoordinates,
        [],
        'inspector1',
        '2024-02-01T10:00:00Z',
        ObservationStatus.OPEN
      );

      mockDamRepo = new MockDamRepository([dam]);
      mockObsRepo = new MockObservationRepository([observation]);
      inspectionService = new InspectionService(mockDamRepo, mockObsRepo);

      const plan = await inspectionService.createInspectionPlan('dam-1');

      expect(plan).toBeDefined();
      expect(plan!.dam.id).toBe('dam-1');
      expect(plan!.priority).toBe('CRITICAL');
      expect(plan!.recentObservations).toHaveLength(1);
      expect(plan!.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent dam', async () => {
      const plan = await inspectionService.createInspectionPlan('non-existent');
      expect(plan).toBeNull();
    });

    it('should generate appropriate recommended actions', async () => {
      // Dam without EAP but requiring one
      const dam = new Dam(
        'dam-1',
        'CA00001',
        'Test Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.HIGH,
        ConditionAssessment.SATISFACTORY,
        false, // No EAP
        '2023-01-01', // Overdue inspection
        testCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      const criticalObs = new Observation(
        'obs-1',
        'Critical Issue',
        testCategory,
        'Critical observation',
        ObservationSeverity.CRITICAL,
        testCoordinates,
        [],
        'inspector1',
        '2024-02-01T10:00:00Z',
        ObservationStatus.OPEN
      );

      mockDamRepo = new MockDamRepository([dam]);
      mockObsRepo = new MockObservationRepository([criticalObs]);
      inspectionService = new InspectionService(mockDamRepo, mockObsRepo);

      const plan = await inspectionService.createInspectionPlan('dam-1');

      expect(plan!.recommendedActions).toContain('Schedule immediate routine inspection');
      expect(plan!.recommendedActions).toContain('Develop Emergency Action Plan (EAP)');
      expect(plan!.recommendedActions).toContain('Address critical safety observations immediately');
    });
  });

  describe('getDamsRequiringUrgentInspection', () => {
    it('should return dams with high/critical priority or overdue inspections', async () => {
      const urgentDam = new Dam(
        'urgent-dam',
        'CA00001',
        'Urgent Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.HIGH,
        ConditionAssessment.POOR, // Critical priority
        true,
        '2024-01-01',
        testCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      const overdueDam = new Dam(
        'overdue-dam',
        'CA00002',
        'Overdue Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.LOW,
        ConditionAssessment.SATISFACTORY,
        true,
        '2022-01-01', // Very overdue
        testCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      const normalDam = new Dam(
        'normal-dam',
        'CA00003',
        'Normal Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.LOW,
        ConditionAssessment.SATISFACTORY,
        true,
        '2024-01-01',
        testCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      mockDamRepo = new MockDamRepository([urgentDam, overdueDam, normalDam]);
      inspectionService = new InspectionService(mockDamRepo, mockObsRepo);

      const urgentDams = await inspectionService.getDamsRequiringUrgentInspection();

      expect(urgentDams).toHaveLength(2);
      expect(urgentDams.map(d => d.id)).toContain('urgent-dam');
      expect(urgentDams.map(d => d.id)).toContain('overdue-dam');
      expect(urgentDams.map(d => d.id)).not.toContain('normal-dam');
    });
  });

  describe('getCriticalObservations', () => {
    it('should return critical and high severity observations requiring immediate attention', async () => {
      const criticalObs = new Observation(
        'critical-obs',
        'Critical Issue',
        testCategory,
        'Critical observation',
        ObservationSeverity.CRITICAL,
        testCoordinates,
        [],
        'inspector1',
        '2024-01-01T10:00:00Z',
        ObservationStatus.OPEN
      );

      const highObs = new Observation(
        'high-obs',
        'High Issue',
        testCategory,
        'High severity observation',
        ObservationSeverity.HIGH,
        testCoordinates,
        [],
        'inspector1',
        '2024-01-01T10:00:00Z',
        ObservationStatus.OPEN
      );

      const mediumObs = new Observation(
        'medium-obs',
        'Medium Issue',
        testCategory,
        'Medium severity observation',
        ObservationSeverity.MEDIUM,
        testCoordinates,
        [],
        'inspector1',
        '2024-01-01T10:00:00Z',
        ObservationStatus.OPEN
      );

      mockObsRepo = new MockObservationRepository([criticalObs, highObs, mediumObs]);
      inspectionService = new InspectionService(mockDamRepo, mockObsRepo);

      const criticalObservations = await inspectionService.getCriticalObservations();

      expect(criticalObservations).toHaveLength(2);
      expect(criticalObservations.map(o => o.id)).toContain('critical-obs');
      expect(criticalObservations.map(o => o.id)).toContain('high-obs');
      expect(criticalObservations.map(o => o.id)).not.toContain('medium-obs');
    });
  });

  describe('getInspectionStatistics', () => {
    it('should calculate inspection statistics correctly', async () => {
      // Create test dams
      const overdueDam = new Dam(
        'overdue-dam',
        'CA00001',
        'Overdue Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.HIGH,
        ConditionAssessment.SATISFACTORY,
        true,
        '2022-01-01', // Very overdue
        testCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      const currentDam = new Dam(
        'current-dam',
        'CA00002',
        'Current Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.LOW,
        ConditionAssessment.SATISFACTORY,
        true,
        '2024-01-01',
        testCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      // Create test observations
      const criticalObs = new Observation(
        'critical-obs',
        'Critical Issue',
        testCategory,
        'Critical observation',
        ObservationSeverity.CRITICAL,
        testCoordinates,
        [],
        'inspector1',
        '2024-01-01T10:00:00Z',
        ObservationStatus.OPEN
      );

      const openObs = new Observation(
        'open-obs',
        'Open Issue',
        testCategory,
        'Open observation',
        ObservationSeverity.MEDIUM,
        testCoordinates,
        [],
        'inspector1',
        '2024-01-01T10:00:00Z',
        ObservationStatus.OPEN
      );

      const thisMonthObs = new Observation(
        'this-month-obs',
        'This Month Issue',
        testCategory,
        'This month observation',
        ObservationSeverity.LOW,
        testCoordinates,
        [],
        'inspector1',
        new Date().toISOString(), // This month
        ObservationStatus.OPEN
      );

      mockDamRepo = new MockDamRepository([overdueDam, currentDam]);
      mockObsRepo = new MockObservationRepository([criticalObs, openObs, thisMonthObs]);
      inspectionService = new InspectionService(mockDamRepo, mockObsRepo);

      const stats = await inspectionService.getInspectionStatistics();

      expect(stats.totalDams).toBe(2);
      expect(stats.overdueInspections).toBe(1);
      expect(stats.criticalObservations).toBe(1);
      expect(stats.openObservations).toBe(3);
      expect(stats.inspectionsThisMonth).toBe(1);
    });
  });
});