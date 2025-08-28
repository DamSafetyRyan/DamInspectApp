/**
 * Mock Dam Repository Implementation
 * Provides mock data for development and testing
 */

import { Dam } from '../../domain/entities/Dam';
import { IDamRepository } from '../../domain/repositories/IDamRepository';
import { Coordinates } from '../../domain/value-objects/Coordinates';
import { DamType, HazardLevel, ConditionAssessment } from '../../domain/value-objects/DamEnums';

// Import LADWP dam data
const ladwpDamsData = require('../../../data/ladwp-dams.json');

export class MockDamRepository implements IDamRepository {
  private mockDams: Dam[] = [];

  constructor() {
    this.initializeMockData();
  }

  async findNearby(center: Coordinates, radiusKm: number, limit: number = 50): Promise<Dam[]> {
    // Filter dams within radius and sort by distance
    const nearbyDams = this.mockDams
      .filter(dam => dam.coordinates.isWithinRadius(center, radiusKm))
      .sort((a, b) => a.coordinates.distanceTo(center) - b.coordinates.distanceTo(center))
      .slice(0, limit);
    
    return Promise.resolve(nearbyDams);
  }

  async findById(id: string): Promise<Dam | null> {
    const dam = this.mockDams.find(d => d.id === id);
    return Promise.resolve(dam || null);
  }

  async findByNidId(nidId: string): Promise<Dam | null> {
    const dam = this.mockDams.find(d => d.nidId === nidId);
    return Promise.resolve(dam || null);
  }

  async findByOwner(ownerName: string): Promise<Dam[]> {
    const dams = this.mockDams.filter(d => 
      d.ownerName.toLowerCase().includes(ownerName.toLowerCase())
    );
    return Promise.resolve(dams);
  }

  async findRequiringInspection(): Promise<Dam[]> {
    const dams = this.mockDams.filter(d => d.isInspectionOverdue());
    return Promise.resolve(dams);
  }

  async findByHazardLevel(hazardLevel: string): Promise<Dam[]> {
    const dams = this.mockDams.filter(d => d.hazardLevel === hazardLevel.toUpperCase());
    return Promise.resolve(dams);
  }

  async findAll(offset: number = 0, limit: number = 100): Promise<Dam[]> {
    const dams = this.mockDams.slice(offset, offset + limit);
    return Promise.resolve(dams);
  }

  async count(): Promise<number> {
    return Promise.resolve(this.mockDams.length);
  }

  /**
   * Initialize mock data including LADWP dams
   */
  private initializeMockData(): void {
    // Load LADWP dams from data file
    const ladwpDams = this.loadLadwpDams();
    
    this.mockDams = [
      ...ladwpDams,

    ];
  }

  /**
   * Load LADWP dams from JSON data file
   */
  private loadLadwpDams(): Dam[] {
    return ladwpDamsData.map((damData: any) => {
      // Convert string enums to proper enum values
      const damType = this.convertToDamType(damData.type);
      const hazardLevel = this.convertToHazardLevel(damData.hazardLevel);
      const conditionAssessment = this.convertToConditionAssessment(damData.conditionAssessment);
      
      return new Dam(
        damData.id,
        damData.nidId,
        damData.name,
        damType,
        damData.ownerName,
        damData.yearCompleted,
        damData.height,
        damData.capacity,
        damData.primaryPurpose,
        hazardLevel,
        conditionAssessment,
        true, // isActive
        damData.lastInspectionDate,
        new Coordinates(damData.coordinates.latitude, damData.coordinates.longitude),
        damData.county,
        damData.river,
        12, // monthsUntilNextInspection - default value
        `${damData.primaryPurpose}, Water Supply` // purposes
      );
    });
  }

  /**
   * Convert string to DamType enum
   */
  private convertToDamType(typeString: string): DamType {
    switch (typeString.toUpperCase()) {
      case 'CONCRETE ARCH':
      case 'CONCRETE':
        return DamType.CONCRETE;
      case 'EARTH FILL':
      case 'EARTHEN':
        return DamType.EARTHEN;
      case 'ROCK FILL':
      case 'ROCKFILL':
        return DamType.ROCKFILL;
      default:
        return DamType.EARTHEN;
    }
  }

  /**
   * Convert string to HazardLevel enum
   */
  private convertToHazardLevel(levelString: string): HazardLevel {
    switch (levelString.toUpperCase()) {
      case 'HIGH':
        return HazardLevel.HIGH;
      case 'SIGNIFICANT':
        return HazardLevel.SIGNIFICANT;
      case 'LOW':
        return HazardLevel.LOW;
      default:
        return HazardLevel.SIGNIFICANT;
    }
  }

  /**
   * Convert string to ConditionAssessment enum
   */
  private convertToConditionAssessment(conditionString: string): ConditionAssessment {
    switch (conditionString.toUpperCase()) {
      case 'SATISFACTORY':
        return ConditionAssessment.SATISFACTORY;
      case 'FAIR':
        return ConditionAssessment.FAIR;
      case 'POOR':
        return ConditionAssessment.POOR;
      case 'UNSATISFACTORY':
        return ConditionAssessment.UNSATISFACTORY;
      default:
        return ConditionAssessment.SATISFACTORY;
    }
  }
}