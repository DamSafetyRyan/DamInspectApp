/**
 * Dam Entity Unit Tests
 * Tests business logic and validation rules for Dam entity
 */

import { Dam } from '../Dam';
import { Coordinates } from '../../value-objects/Coordinates';
import { DamType, HazardLevel, ConditionAssessment } from '../../value-objects/DamEnums';

describe('Dam Entity', () => {
  const validCoordinates = new Coordinates(37.7749, -122.4194);
  
  const createValidDam = () => new Dam(
    'test-dam-1',
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
    validCoordinates,
    'Test County',
    'Test River',
    12,
    'Water Supply, Recreation'
  );

  describe('Construction and Validation', () => {
    it('should create a valid dam', () => {
      const dam = createValidDam();
      
      expect(dam.id).toBe('test-dam-1');
      expect(dam.name).toBe('Test Dam');
      expect(dam.type).toBe(DamType.CONCRETE);
      expect(dam.hazardLevel).toBe(HazardLevel.HIGH);
    });

    it('should throw error for empty name', () => {
      expect(() => {
        new Dam(
          'test-dam-1',
          'CA00001',
          '',
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
          validCoordinates,
          'Test County',
          'Test River',
          12,
          'Water Supply'
        );
      }).toThrow('Dam name is required');
    });

    it('should throw error for invalid height', () => {
      expect(() => {
        new Dam(
          'test-dam-1',
          'CA00001',
          'Test Dam',
          DamType.CONCRETE,
          'Test Owner',
          1950,
          0, // Invalid height
          50000,
          'Water Supply',
          HazardLevel.HIGH,
          ConditionAssessment.SATISFACTORY,
          true,
          '2024-01-01',
          validCoordinates,
          'Test County',
          'Test River',
          12,
          'Water Supply'
        );
      }).toThrow('Dam height must be greater than 0');
    });

    it('should throw error for invalid year', () => {
      expect(() => {
        new Dam(
          'test-dam-1',
          'CA00001',
          'Test Dam',
          DamType.CONCRETE,
          'Test Owner',
          1799, // Invalid year
          100,
          50000,
          'Water Supply',
          HazardLevel.HIGH,
          ConditionAssessment.SATISFACTORY,
          true,
          '2024-01-01',
          validCoordinates,
          'Test County',
          'Test River',
          12,
          'Water Supply'
        );
      }).toThrow('Dam completion year must be valid');
    });

    it('should throw error for invalid inspection frequency', () => {
      expect(() => {
        new Dam(
          'test-dam-1',
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
          validCoordinates,
          'Test County',
          'Test River',
          0, // Invalid frequency
          'Water Supply'
        );
      }).toThrow('Inspection frequency must be greater than 0');
    });
  });

  describe('Business Logic - Inspection Overdue', () => {
    it('should detect overdue inspection', () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 24); // 24 months ago
      
      const dam = new Dam(
        'test-dam-1',
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
        oldDate.toISOString().split('T')[0], // 24 months ago
        validCoordinates,
        'Test County',
        'Test River',
        12, // 12 month frequency
        'Water Supply'
      );

      expect(dam.isInspectionOverdue()).toBe(true);
    });

    it('should detect current inspection', () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 6); // 6 months ago
      
      const dam = new Dam(
        'test-dam-1',
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
        recentDate.toISOString().split('T')[0],
        validCoordinates,
        'Test County',
        'Test River',
        12, // 12 month frequency
        'Water Supply'
      );

      expect(dam.isInspectionOverdue()).toBe(false);
    });
  });

  describe('Business Logic - Inspection Priority', () => {
    it('should return CRITICAL priority for high hazard and poor condition', () => {
      const dam = new Dam(
        'test-dam-1',
        'CA00001',
        'Test Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.HIGH,
        ConditionAssessment.POOR,
        true,
        '2024-01-01',
        validCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      expect(dam.getInspectionPriority()).toBe('CRITICAL');
    });

    it('should return HIGH priority for high hazard and satisfactory condition', () => {
      const dam = new Dam(
        'test-dam-1',
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
        validCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      expect(dam.getInspectionPriority()).toBe('HIGH');
    });

    it('should return MEDIUM priority for significant hazard', () => {
      const dam = new Dam(
        'test-dam-1',
        'CA00001',
        'Test Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.SIGNIFICANT,
        ConditionAssessment.SATISFACTORY,
        true,
        '2024-01-01',
        validCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      expect(dam.getInspectionPriority()).toBe('MEDIUM');
    });

    it('should return LOW priority for low hazard and satisfactory condition', () => {
      const dam = new Dam(
        'test-dam-1',
        'CA00001',
        'Test Dam',
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
        validCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      expect(dam.getInspectionPriority()).toBe('LOW');
    });
  });

  describe('Business Logic - EAP Requirements', () => {
    it('should require EAP for high hazard dams', () => {
      const dam = new Dam(
        'test-dam-1',
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
        false, // No EAP currently
        '2024-01-01',
        validCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      expect(dam.requiresEAP()).toBe(true);
    });

    it('should require EAP for significant hazard dams', () => {
      const dam = new Dam(
        'test-dam-1',
        'CA00001',
        'Test Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.SIGNIFICANT,
        ConditionAssessment.SATISFACTORY,
        false,
        '2024-01-01',
        validCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      expect(dam.requiresEAP()).toBe(true);
    });

    it('should not require EAP for low hazard dams', () => {
      const dam = new Dam(
        'test-dam-1',
        'CA00001',
        'Test Dam',
        DamType.CONCRETE,
        'Test Owner',
        1950,
        100,
        50000,
        'Water Supply',
        HazardLevel.LOW,
        ConditionAssessment.SATISFACTORY,
        false,
        '2024-01-01',
        validCoordinates,
        'Test County',
        'Test River',
        12,
        'Water Supply'
      );

      expect(dam.requiresEAP()).toBe(false);
    });
  });

  describe('Business Logic - Next Inspection Date', () => {
    it('should calculate correct next inspection date', () => {
      const lastInspection = new Date('2024-01-01');
      const dam = new Dam(
        'test-dam-1',
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
        validCoordinates,
        'Test County',
        'Test River',
        12, // 12 months
        'Water Supply'
      );

      const nextDue = dam.getNextInspectionDueDate();
      const expectedDate = new Date('2025-01-01');
      
      expect(nextDue.getFullYear()).toBe(expectedDate.getFullYear());
      expect(nextDue.getMonth()).toBe(expectedDate.getMonth());
    });
  });

  describe('Serialization', () => {
    it('should convert to plain object correctly', () => {
      const dam = createValidDam();
      const plainObject = dam.toPlainObject();

      expect(plainObject.id).toBe('test-dam-1');
      expect(plainObject.name).toBe('Test Dam');
      expect(plainObject.type).toBe(DamType.CONCRETE);
      expect(plainObject.coordinates).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    });
  });
});