/**
 * @fileoverview Test data factories for creating realistic test objects
 * Following TDD - these factories create consistent, valid test data
 */

import type { 
  Dam, 
  Inspection, 
  SensorReading, 
  Sensor, 
  User, 
  Photo,
  Observation,
  MonitoringPoint
} from '../../src/domain/types';

/**
 * Factory for creating Dam test objects
 */
export class DamFactory {
  static create(overrides: Partial<Dam> = {}): Dam {
    const defaults: Dam = {
      id: `dam-${Math.random().toString(36).substr(2, 9)}`,
      nidId: `US-${Math.floor(Math.random() * 90000) + 10000}`,
      name: `Test Dam ${Math.floor(Math.random() * 1000)}`,
      organizationId: 'org-test-123',
      latitude: 40.7128 + (Math.random() - 0.5) * 0.1, // Around NYC
      longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
      state: 'NY',
      county: 'Test County',
      river: 'Test River',
      damType: ['earthfill'],
      height: Math.floor(Math.random() * 200) + 20, // 20-220 feet
      length: Math.floor(Math.random() * 1000) + 100, // 100-1100 feet
      crestElevation: Math.floor(Math.random() * 500) + 100, // 100-600 feet
      maxDischarge: Math.floor(Math.random() * 10000) + 1000, // 1000-11000 cfs
      maxStorage: Math.floor(Math.random() * 50000) + 5000, // 5000-55000 acre-feet
      normalStorage: Math.floor(Math.random() * 30000) + 3000, // 3000-33000 acre-feet
      hazardClassification: 'HIGH',
      condition: 'GOOD',
      lastInspectionDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Within last year
      nextInspectionDate: new Date(Date.now() + Math.random() * 180 * 24 * 60 * 60 * 1000), // Next 6 months
      inspectionFrequency: 12, // months
      threatLevel: 'NO_THREAT',
      operationalStatus: 'OPERATIONAL',
      waterLevel: Math.floor(Math.random() * 50) + 50, // 50-100 feet
      waterLevelUpdatedAt: new Date(),
      createdAt: new Date(Date.now() - Math.random() * 1000 * 24 * 60 * 60 * 1000), // Within last ~3 years
      updatedAt: new Date()
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create a concrete dam with concrete-specific properties
   */
  static createConcrete(overrides: Partial<Dam> = {}): Dam {
    return this.create({
      damType: ['concrete'],
      height: Math.floor(Math.random() * 400) + 100, // Concrete dams tend to be taller
      ...overrides
    });
  }

  /**
   * Create an earthen dam with earthen-specific properties
   */
  static createEarthen(overrides: Partial<Dam> = {}): Dam {
    return this.create({
      damType: ['earthfill'],
      height: Math.floor(Math.random() * 150) + 30, // Earthen dams tend to be shorter
      ...overrides
    });
  }

  /**
   * Create a high hazard dam that requires more frequent inspections
   */
  static createHighHazard(overrides: Partial<Dam> = {}): Dam {
    return this.create({
      hazardClassification: 'HIGH',
      inspectionFrequency: 6, // Every 6 months
      ...overrides
    });
  }
}

/**
 * Factory for creating Inspection test objects
 */
export class InspectionFactory {
  static create(overrides: Partial<Inspection> = {}): Inspection {
    const defaults: Inspection = {
      id: `inspection-${Math.random().toString(36).substr(2, 9)}`,
      damId: `dam-${Math.random().toString(36).substr(2, 9)}`,
      inspectorId: `inspector-${Math.random().toString(36).substr(2, 9)}`,
      type: 'ROUTINE',
      date: new Date(),
      weather: 'Clear, 72°F, light winds',
      waterLevel: Math.floor(Math.random() * 50) + 50,
      findings: 'Dam inspected and found to be in good condition. No significant issues observed.',
      recommendations: 'Continue routine maintenance schedule.',
      rating: 'GOOD',
      followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'DRAFT',
      reviewerId: null,
      reviewDate: null,
      observations: [],
      photos: [],
      sensorReadings: [],
      gpsCoordinates: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.01,
        lng: -74.0060 + (Math.random() - 0.5) * 0.01
      },
      criticalIssue: false,
      syncStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create a FERC Part 12D inspection with regulatory requirements
   */
  static createFERC(overrides: Partial<Inspection> = {}): Inspection {
    return this.create({
      type: 'FERC_PART_12D',
      findings: 'Comprehensive FERC Part 12D inspection completed. All structural components assessed and found to be in satisfactory condition. Instrumentation functioning properly. Emergency procedures current and adequate.',
      regulatoryCompliance: {
        fercChecklist: {
          structuralIntegrity: true,
          spillwayFunctionality: true,
          instrumentationReview: true,
          emergencyProcedures: true
        }
      },
      ...overrides
    });
  }

  /**
   * Create a critical inspection with safety issues
   */
  static createCritical(overrides: Partial<Inspection> = {}): Inspection {
    return this.create({
      rating: 'UNSATISFACTORY',
      findings: 'CRITICAL ISSUE: Significant seepage observed with increasing flow rate and sediment transport.',
      criticalIssue: true,
      requiresImmediateSync: true,
      escalationLevel: 'EMERGENCY',
      ...overrides
    });
  }
}

/**
 * Factory for creating SensorReading test objects
 */
export class SensorReadingFactory {
  static create(overrides: Partial<SensorReading> = {}): SensorReading {
    const defaults: SensorReading = {
      id: `reading-${Math.random().toString(36).substr(2, 9)}`,
      sensorId: `sensor-${Math.random().toString(36).substr(2, 9)}`,
      value: Math.floor(Math.random() * 50) + 10, // 10-60
      unit: 'feet',
      timestamp: new Date(),
      quality: 'GOOD',
      readingMethod: 'manual',
      inspectorId: `inspector-${Math.random().toString(36).substr(2, 9)}`,
      gpsCoordinates: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.01,
        lng: -74.0060 + (Math.random() - 0.5) * 0.01
      },
      notes: 'Normal reading, instrument functioning properly',
      calibrationStatus: 'current',
      metadata: {
        manualReading: true,
        instrumentType: 'piezometer',
        weatherConditions: 'clear'
      },
      syncStatus: 'pending',
      createdAt: new Date()
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create a piezometer reading
   */
  static createPiezometer(overrides: Partial<SensorReading> = {}): SensorReading {
    return this.create({
      value: Math.floor(Math.random() * 40) + 15, // 15-55 feet typical for piezometer
      unit: 'feet',
      metadata: {
        manualReading: true,
        instrumentType: 'piezometer',
        readingType: 'depth_to_water'
      },
      ...overrides
    });
  }

  /**
   * Create a flow meter reading
   */
  static createFlowMeter(overrides: Partial<SensorReading> = {}): SensorReading {
    return this.create({
      value: Math.floor(Math.random() * 500) + 50, // 50-550 cfs
      unit: 'cfs',
      metadata: {
        manualReading: true,
        instrumentType: 'flow_meter',
        readingType: 'flow_rate'
      },
      ...overrides
    });
  }

  /**
   * Create a critical reading that exceeds thresholds
   */
  static createCritical(overrides: Partial<SensorReading> = {}): SensorReading {
    return this.create({
      value: 75, // High value
      quality: 'POOR',
      isCritical: true,
      requiresImmediateAlert: true,
      notes: 'Reading exceeds critical threshold - immediate attention required',
      ...overrides
    });
  }
}

/**
 * Factory for creating Sensor test objects
 */
export class SensorFactory {
  static create(overrides: Partial<Sensor> = {}): Sensor {
    const defaults: Sensor = {
      id: `sensor-${Math.random().toString(36).substr(2, 9)}`,
      damId: `dam-${Math.random().toString(36).substr(2, 9)}`,
      name: `Test Sensor ${Math.floor(Math.random() * 100)}`,
      type: 'piezometer',
      unit: 'feet',
      location: 'Dam toe area',
      latitude: 40.7128 + (Math.random() - 0.5) * 0.01,
      longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
      elevation: Math.floor(Math.random() * 100) + 50,
      installDate: new Date(Date.now() - Math.random() * 1000 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      normalRange: {
        min: 10,
        max: 50
      },
      criticalThresholds: {
        low: 5,
        high: 60
      },
      historicalReadings: [25.5, 26.1, 24.8, 25.9, 26.3, 25.7, 26.0],
      lastReading: {
        value: 25.8,
        timestamp: new Date(),
        quality: 'GOOD'
      },
      calibrationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      nextCalibrationDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000), // ~11 months from now
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create a piezometer sensor
   */
  static createPiezometer(overrides: Partial<Sensor> = {}): Sensor {
    return this.create({
      type: 'piezometer',
      unit: 'feet',
      name: `Piezometer ${Math.floor(Math.random() * 20) + 1}`,
      normalRange: { min: 10, max: 50 },
      criticalThresholds: { low: 5, high: 60 },
      ...overrides
    });
  }

  /**
   * Create a flow meter sensor
   */
  static createFlowMeter(overrides: Partial<Sensor> = {}): Sensor {
    return this.create({
      type: 'flow_meter',
      unit: 'cfs',
      name: `Flow Meter ${Math.floor(Math.random() * 10) + 1}`,
      normalRange: { min: 0, max: 1000 },
      criticalThresholds: { low: 0, high: 1500 },
      ...overrides
    });
  }
}

/**
 * Factory for creating User test objects
 */
export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    const defaults: User = {
      id: `user-${Math.random().toString(36).substr(2, 9)}`,
      email: `test.user.${Math.floor(Math.random() * 1000)}@test.damsafety.io`,
      name: `Test User ${Math.floor(Math.random() * 1000)}`,
      role: 'ENGINEER',
      organizationId: 'org-test-123',
      certifications: ['Professional Engineer', 'Dam Safety Inspector'],
      permissions: {
        canCreateInspections: true,
        canSubmitInspections: true,
        canViewAllDams: false,
        canApproveInspections: false
      },
      damAccess: [`dam-${Math.random().toString(36).substr(2, 9)}`],
      lastLogin: new Date(),
      isActive: true,
      twoFactorEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create an admin user with elevated permissions
   */
  static createAdmin(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'ADMIN',
      permissions: {
        canCreateInspections: true,
        canSubmitInspections: true,
        canViewAllDams: true,
        canApproveInspections: true,
        canManageUsers: true
      },
      ...overrides
    });
  }

  /**
   * Create a viewer user with limited permissions
   */
  static createViewer(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'VIEWER',
      permissions: {
        canCreateInspections: false,
        canSubmitInspections: false,
        canViewAllDams: false,
        canApproveInspections: false
      },
      ...overrides
    });
  }
}

/**
 * Factory for creating Photo test objects
 */
export class PhotoFactory {
  static create(overrides: Partial<Photo> = {}): Photo {
    const defaults: Photo = {
      id: `photo-${Math.random().toString(36).substr(2, 9)}`,
      filename: `inspection-photo-${Date.now()}.jpg`,
      url: `https://storage.azure.com/photos/photo-${Math.random().toString(36).substr(2, 9)}.jpg`,
      caption: 'Inspection photo',
      location: 'Dam structure',
      coordinates: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.01,
        lng: -74.0060 + (Math.random() - 0.5) * 0.01
      },
      inspectionId: `inspection-${Math.random().toString(36).substr(2, 9)}`,
      fileSize: Math.floor(Math.random() * 3000000) + 500000, // 0.5-3.5MB
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      takenAt: new Date(),
      uploadedAt: new Date(),
      syncStatus: 'pending'
    };

    return { ...defaults, ...overrides };
  }
}

/**
 * Factory for creating Observation test objects
 */
export class ObservationFactory {
  static create(overrides: Partial<Observation> = {}): Observation {
    const defaults: Observation = {
      id: `obs-${Math.random().toString(36).substr(2, 9)}`,
      category: 'Structural Integrity',
      description: 'Minor surface wear observed on concrete spillway',
      rating: 'GOOD',
      notes: 'No immediate action required',
      recommendation: 'Monitor during next inspection',
      photoRequired: false,
      photos: [],
      gpsCoordinates: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.01,
        lng: -74.0060 + (Math.random() - 0.5) * 0.01
      },
      timestamp: new Date(),
      inspectorId: `inspector-${Math.random().toString(36).substr(2, 9)}`,
      criticalIssue: false
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create a critical observation requiring immediate attention
   */
  static createCritical(overrides: Partial<Observation> = {}): Observation {
    return this.create({
      category: 'Seepage and Drainage',
      description: 'Significant seepage with sediment transport observed',
      rating: 'UNSATISFACTORY',
      notes: 'Immediate attention required - potential safety hazard',
      recommendation: 'Emergency assessment and remediation needed',
      photoRequired: true,
      criticalIssue: true,
      ...overrides
    });
  }
}

/**
 * Factory for creating MonitoringPoint test objects
 */
export class MonitoringPointFactory {
  static create(overrides: Partial<MonitoringPoint> = {}): MonitoringPoint {
    const defaults: MonitoringPoint = {
      id: `mp-${Math.random().toString(36).substr(2, 9)}`,
      damId: `dam-${Math.random().toString(36).substr(2, 9)}`,
      name: `Monitoring Point ${Math.floor(Math.random() * 50) + 1}`,
      type: 'SURVEY',
      location: 'Dam crest',
      coordinates: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.01,
        lng: -74.0060 + (Math.random() - 0.5) * 0.01,
        elevation: Math.floor(Math.random() * 100) + 100
      },
      description: 'Survey monument for monitoring structural movement',
      installDate: new Date(Date.now() - Math.random() * 1000 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      measurements: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { ...defaults, ...overrides };
  }
}
