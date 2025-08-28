/**
 * Observation Entity Unit Tests
 * Tests business logic and validation rules for Observation entity
 */

import { Observation } from '../Observation';
import { Coordinates } from '../../value-objects/Coordinates';
import { InspectionCategory } from '../../value-objects/InspectionCategory';
import { ObservationSeverity, ObservationStatus } from '../../value-objects/ObservationEnums';
import { DamType } from '../../value-objects/DamEnums';

describe('Observation Entity', () => {
  const validCoordinates = new Coordinates(37.7749, -122.4194);
  const validCategory = new InspectionCategory(DamType.CONCRETE, 'Structural Integrity');
  
  const createValidObservation = (severity: ObservationSeverity = ObservationSeverity.MEDIUM) => new Observation(
    'test-obs-1',
    'Crack',
    validCategory,
    'Small crack observed in spillway',
    severity,
    validCoordinates,
    ['photo1.jpg'],
    'inspector1',
    '2024-01-01T10:00:00Z',
    ObservationStatus.OPEN,
    'Additional notes',
    true
  );

  describe('Construction and Validation', () => {
    it('should create a valid observation', () => {
      const obs = createValidObservation();
      
      expect(obs.id).toBe('test-obs-1');
      expect(obs.type).toBe('Crack');
      expect(obs.description).toBe('Small crack observed in spillway');
      expect(obs.severity).toBe(ObservationSeverity.MEDIUM);
      expect(obs.status).toBe(ObservationStatus.OPEN);
    });

    it('should throw error for empty type', () => {
      expect(() => {
        new Observation(
          'test-obs-1',
          '', // Empty type
          validCategory,
          'Description',
          ObservationSeverity.LOW,
          validCoordinates,
          [],
          'inspector1',
          '2024-01-01T10:00:00Z',
          ObservationStatus.OPEN
        );
      }).toThrow('Observation type is required');
    });

    it('should throw error for empty description', () => {
      expect(() => {
        new Observation(
          'test-obs-1',
          'Crack',
          validCategory,
          '', // Empty description
          ObservationSeverity.LOW,
          validCoordinates,
          [],
          'inspector1',
          '2024-01-01T10:00:00Z',
          ObservationStatus.OPEN
        );
      }).toThrow('Observation description is required');
    });

    it('should throw error for empty recordedBy', () => {
      expect(() => {
        new Observation(
          'test-obs-1',
          'Crack',
          validCategory,
          'Description',
          ObservationSeverity.LOW,
          validCoordinates,
          [],
          '', // Empty recordedBy
          '2024-01-01T10:00:00Z',
          ObservationStatus.OPEN
        );
      }).toThrow('Recorded by is required');
    });

    it('should throw error for too many photos', () => {
      expect(() => {
        new Observation(
          'test-obs-1',
          'Crack',
          validCategory,
          'Description',
          ObservationSeverity.LOW,
          validCoordinates,
          ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg'], // 6 photos (max 5)
          'inspector1',
          '2024-01-01T10:00:00Z',
          ObservationStatus.OPEN
        );
      }).toThrow('Maximum 5 photos allowed per observation');
    });

    it('should throw error for resolved observation without resolved date', () => {
      expect(() => {
        new Observation(
          'test-obs-1',
          'Crack',
          validCategory,
          'Description',
          ObservationSeverity.LOW,
          validCoordinates,
          [],
          'inspector1',
          '2024-01-01T10:00:00Z',
          ObservationStatus.RESOLVED, // Resolved status
          undefined,
          false,
          undefined, // No resolved date
          undefined
        );
      }).toThrow('Resolved observations must have resolved date');
    });
  });

  describe('Business Logic - Immediate Attention', () => {
    it('should require immediate attention for critical severity', () => {
      const obs = createValidObservation(ObservationSeverity.CRITICAL);
      expect(obs.requiresImmediateAttention()).toBe(true);
    });

    it('should require immediate attention for high severity', () => {
      const obs = createValidObservation(ObservationSeverity.HIGH);
      expect(obs.requiresImmediateAttention()).toBe(true);
    });

    it('should not require immediate attention for medium severity', () => {
      const obs = createValidObservation(ObservationSeverity.MEDIUM);
      expect(obs.requiresImmediateAttention()).toBe(false);
    });

    it('should not require immediate attention for low severity', () => {
      const obs = createValidObservation(ObservationSeverity.LOW);
      expect(obs.requiresImmediateAttention()).toBe(false);
    });
  });

  describe('Business Logic - Follow-up Overdue', () => {
    it('should detect overdue follow-up for critical observation after 2 days', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const obs = new Observation(
        'test-obs-1',
        'Critical Issue',
        validCategory,
        'Critical observation',
        ObservationSeverity.CRITICAL,
        validCoordinates,
        [],
        'inspector1',
        twoDaysAgo.toISOString(),
        ObservationStatus.OPEN,
        undefined,
        true // Follow-up required
      );

      expect(obs.isOverdueForFollowUp()).toBe(true);
    });

    it('should detect overdue follow-up for high observation after 8 days', () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      
      const obs = new Observation(
        'test-obs-1',
        'High Issue',
        validCategory,
        'High severity observation',
        ObservationSeverity.HIGH,
        validCoordinates,
        [],
        'inspector1',
        eightDaysAgo.toISOString(),
        ObservationStatus.OPEN,
        undefined,
        true
      );

      expect(obs.isOverdueForFollowUp()).toBe(true);
    });

    it('should not be overdue for recent critical observation', () => {
      const obs = createValidObservation(ObservationSeverity.CRITICAL);
      expect(obs.isOverdueForFollowUp()).toBe(false);
    });

    it('should not be overdue for resolved observation', () => {
      const obs = new Observation(
        'test-obs-1',
        'Resolved Issue',
        validCategory,
        'Resolved observation',
        ObservationSeverity.CRITICAL,
        validCoordinates,
        [],
        'inspector1',
        '2024-01-01T10:00:00Z',
        ObservationStatus.RESOLVED,
        undefined,
        true,
        '2024-01-02T10:00:00Z',
        'resolver1'
      );

      expect(obs.isOverdueForFollowUp()).toBe(false);
    });

    it('should not be overdue when follow-up not required', () => {
      const longAgo = new Date();
      longAgo.setDate(longAgo.getDate() - 100);
      
      const obs = new Observation(
        'test-obs-1',
        'No Follow-up Issue',
        validCategory,
        'No follow-up needed',
        ObservationSeverity.CRITICAL,
        validCoordinates,
        [],
        'inspector1',
        longAgo.toISOString(),
        ObservationStatus.OPEN,
        undefined,
        false // No follow-up required
      );

      expect(obs.isOverdueForFollowUp()).toBe(false);
    });
  });

  describe('Business Logic - Recommended Actions', () => {
    it('should provide correct action for critical severity', () => {
      const obs = createValidObservation(ObservationSeverity.CRITICAL);
      const action = obs.getRecommendedFollowUpAction();
      expect(action).toBe('Immediate engineering review and emergency response if needed');
    });

    it('should provide correct action for high severity', () => {
      const obs = createValidObservation(ObservationSeverity.HIGH);
      const action = obs.getRecommendedFollowUpAction();
      expect(action).toBe('Schedule detailed inspection within 7 days');
    });

    it('should provide correct action for medium severity', () => {
      const obs = createValidObservation(ObservationSeverity.MEDIUM);
      const action = obs.getRecommendedFollowUpAction();
      expect(action).toBe('Include in next routine inspection or schedule within 30 days');
    });

    it('should provide correct action for low severity', () => {
      const obs = createValidObservation(ObservationSeverity.LOW);
      const action = obs.getRecommendedFollowUpAction();
      expect(action).toBe('Monitor during routine inspections');
    });
  });

  describe('Business Logic - Status Updates', () => {
    it('should resolve observation correctly', () => {
      const obs = createValidObservation();
      const resolved = obs.resolve('resolver1', 'Issue fixed');

      expect(resolved.status).toBe(ObservationStatus.RESOLVED);
      expect(resolved.resolvedBy).toBe('resolver1');
      expect(resolved.notes).toBe('Issue fixed');
      expect(resolved.resolvedAt).toBeDefined();
    });

    it('should throw error when resolving already resolved observation', () => {
      const resolvedObs = new Observation(
        'test-obs-1',
        'Resolved Issue',
        validCategory,
        'Already resolved',
        ObservationSeverity.LOW,
        validCoordinates,
        [],
        'inspector1',
        '2024-01-01T10:00:00Z',
        ObservationStatus.RESOLVED,
        undefined,
        false,
        '2024-01-02T10:00:00Z',
        'resolver1'
      );

      expect(() => {
        resolvedObs.resolve('resolver2', 'Trying to resolve again');
      }).toThrow('Observation is already resolved');
    });

    it('should update status correctly', () => {
      const obs = createValidObservation();
      const updated = obs.updateStatus(ObservationStatus.IN_PROGRESS, 'updater1');

      expect(updated.status).toBe(ObservationStatus.IN_PROGRESS);
      expect(updated.id).toBe(obs.id); // Other properties should remain the same
      expect(updated.type).toBe(obs.type);
    });

    it('should throw error when changing status of resolved observation', () => {
      const resolvedObs = new Observation(
        'test-obs-1',
        'Resolved Issue',
        validCategory,
        'Already resolved',
        ObservationSeverity.LOW,
        validCoordinates,
        [],
        'inspector1',
        '2024-01-01T10:00:00Z',
        ObservationStatus.RESOLVED,
        undefined,
        false,
        '2024-01-02T10:00:00Z',
        'resolver1'
      );

      expect(() => {
        resolvedObs.updateStatus(ObservationStatus.OPEN, 'updater1');
      }).toThrow('Cannot change status of resolved observation');
    });
  });

  describe('Serialization', () => {
    it('should convert to plain object correctly', () => {
      const obs = createValidObservation();
      const plainObject = obs.toPlainObject();

      expect(plainObject.id).toBe('test-obs-1');
      expect(plainObject.type).toBe('Crack');
      expect(plainObject.severity).toBe(ObservationSeverity.MEDIUM);
      expect(plainObject.coordinates).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
      expect(plainObject.category).toEqual({
        damType: DamType.CONCRETE,
        categoryName: 'Structural Integrity',
      });
    });
  });
});