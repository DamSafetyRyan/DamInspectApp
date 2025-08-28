/**
 * Dam Domain Entity
 * Core business entity representing a dam with all its properties and business rules
 */

import { Coordinates } from '../value-objects/Coordinates';
import { DamType, HazardLevel, ConditionAssessment } from '../value-objects/DamEnums';

export class Dam {
  constructor(
    public readonly id: string,
    public readonly nidId: string,
    public readonly name: string,
    public readonly type: DamType,
    public readonly ownerName: string,
    public readonly yearCompleted: number,
    public readonly height: number, // feet
    public readonly storage: number, // acre-feet
    public readonly primaryPurpose: string,
    public readonly hazardLevel: HazardLevel,
    public readonly conditionAssessment: ConditionAssessment,
    public readonly hasEAP: boolean,
    public readonly lastInspectionDate: string,
    public readonly coordinates: Coordinates,
    public readonly county: string,
    public readonly river: string,
    public readonly inspectionFrequency: number, // months
    public readonly allPurposes: string
  ) {
    this.validateDam();
  }

  /**
   * Business rule: Validate dam properties
   */
  private validateDam(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Dam name is required');
    }

    if (this.height <= 0) {
      throw new Error('Dam height must be greater than 0');
    }

    if (this.yearCompleted < 1800 || this.yearCompleted > new Date().getFullYear()) {
      throw new Error('Dam completion year must be valid');
    }

    if (this.inspectionFrequency <= 0) {
      throw new Error('Inspection frequency must be greater than 0');
    }
  }

  /**
   * Business rule: Determine if dam inspection is overdue
   */
  isInspectionOverdue(): boolean {
    const lastInspection = new Date(this.lastInspectionDate);
    const now = new Date();
    const monthsSinceInspection = 
      (now.getFullYear() - lastInspection.getFullYear()) * 12 + 
      (now.getMonth() - lastInspection.getMonth());
    
    return monthsSinceInspection > this.inspectionFrequency;
  }

  /**
   * Business rule: Determine inspection priority based on hazard level and condition
   */
  getInspectionPriority(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (this.hazardLevel === HazardLevel.HIGH && this.conditionAssessment === ConditionAssessment.POOR) {
      return 'CRITICAL';
    }
    
    if (this.hazardLevel === HazardLevel.HIGH || this.conditionAssessment === ConditionAssessment.POOR) {
      return 'HIGH';
    }
    
    if (this.hazardLevel === HazardLevel.SIGNIFICANT || this.conditionAssessment === ConditionAssessment.FAIR) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  /**
   * Business rule: Check if dam requires Emergency Action Plan
   */
  requiresEAP(): boolean {
    return this.hazardLevel === HazardLevel.HIGH || this.hazardLevel === HazardLevel.SIGNIFICANT;
  }

  /**
   * Business rule: Get next inspection due date
   */
  getNextInspectionDueDate(): Date {
    const lastInspection = new Date(this.lastInspectionDate);
    const nextDue = new Date(lastInspection);
    nextDue.setMonth(nextDue.getMonth() + this.inspectionFrequency);
    return nextDue;
  }

  /**
   * Convert to plain object for serialization
   */
  toPlainObject() {
    return {
      id: this.id,
      nidId: this.nidId,
      name: this.name,
      type: this.type,
      ownerName: this.ownerName,
      yearCompleted: this.yearCompleted,
      height: this.height,
      storage: this.storage,
      primaryPurpose: this.primaryPurpose,
      hazardLevel: this.hazardLevel,
      conditionAssessment: this.conditionAssessment,
      hasEAP: this.hasEAP,
      lastInspectionDate: this.lastInspectionDate,
      coordinates: this.coordinates.toPlainObject(),
      county: this.county,
      river: this.river,
      inspectionFrequency: this.inspectionFrequency,
      allPurposes: this.allPurposes,
    };
  }
}