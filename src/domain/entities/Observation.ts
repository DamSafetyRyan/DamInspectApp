/**
 * Observation Domain Entity
 * Core business entity representing an inspection observation with business rules
 */

import { Coordinates } from '../value-objects/Coordinates';
import { ObservationSeverity, ObservationStatus } from '../value-objects/ObservationEnums';
import { InspectionCategory } from '../value-objects/InspectionCategory';

export class Observation {
  constructor(
    public readonly id: string,
    public readonly type: string,
    public readonly category: InspectionCategory,
    public readonly description: string,
    public readonly severity: ObservationSeverity,
    public readonly coordinates: Coordinates,
    public readonly photos: string[],
    public readonly recordedBy: string,
    public readonly recordedAt: string,
    public readonly status: ObservationStatus,
    public readonly notes?: string,
    public readonly followUpRequired?: boolean,
    public readonly resolvedAt?: string,
    public readonly resolvedBy?: string
  ) {
    this.validateObservation();
  }

  /**
   * Business rule: Validate observation properties
   */
  private validateObservation(): void {
    if (!this.type || this.type.trim().length === 0) {
      throw new Error('Observation type is required');
    }

    if (!this.description || this.description.trim().length === 0) {
      throw new Error('Observation description is required');
    }

    if (!this.recordedBy || this.recordedBy.trim().length === 0) {
      throw new Error('Recorded by is required');
    }

    if (this.photos.length > 5) {
      throw new Error('Maximum 5 photos allowed per observation');
    }

    if (this.status === ObservationStatus.RESOLVED && !this.resolvedAt) {
      throw new Error('Resolved observations must have resolved date');
    }
  }

  /**
   * Business rule: Determine if observation requires immediate attention
   */
  requiresImmediateAttention(): boolean {
    return this.severity === ObservationSeverity.CRITICAL || 
           this.severity === ObservationSeverity.HIGH;
  }

  /**
   * Business rule: Determine if observation is overdue for follow-up
   */
  isOverdueForFollowUp(): boolean {
    if (!this.followUpRequired || this.status === ObservationStatus.RESOLVED) {
      return false;
    }

    const recordedDate = new Date(this.recordedAt);
    const now = new Date();
    const daysSinceRecorded = Math.floor((now.getTime() - recordedDate.getTime()) / (1000 * 60 * 60 * 24));

    // Business rule: Follow-up timeframes based on severity
    switch (this.severity) {
      case ObservationSeverity.CRITICAL:
        return daysSinceRecorded > 1; // 1 day
      case ObservationSeverity.HIGH:
        return daysSinceRecorded > 7; // 1 week
      case ObservationSeverity.MEDIUM:
        return daysSinceRecorded > 30; // 1 month
      case ObservationSeverity.LOW:
        return daysSinceRecorded > 90; // 3 months
      default:
        return false;
    }
  }

  /**
   * Business rule: Get recommended follow-up action based on severity
   */
  getRecommendedFollowUpAction(): string {
    switch (this.severity) {
      case ObservationSeverity.CRITICAL:
        return 'Immediate engineering review and emergency response if needed';
      case ObservationSeverity.HIGH:
        return 'Schedule detailed inspection within 7 days';
      case ObservationSeverity.MEDIUM:
        return 'Include in next routine inspection or schedule within 30 days';
      case ObservationSeverity.LOW:
        return 'Monitor during routine inspections';
      default:
        return 'No specific action required';
    }
  }

  /**
   * Business rule: Resolve observation
   */
  resolve(resolvedBy: string, notes?: string): Observation {
    if (this.status === ObservationStatus.RESOLVED) {
      throw new Error('Observation is already resolved');
    }

    return new Observation(
      this.id,
      this.type,
      this.category,
      this.description,
      this.severity,
      this.coordinates,
      this.photos,
      this.recordedBy,
      this.recordedAt,
      ObservationStatus.RESOLVED,
      notes || this.notes,
      this.followUpRequired,
      new Date().toISOString(),
      resolvedBy
    );
  }

  /**
   * Business rule: Update observation status
   */
  updateStatus(newStatus: ObservationStatus, updatedBy: string): Observation {
    if (this.status === ObservationStatus.RESOLVED && newStatus !== ObservationStatus.RESOLVED) {
      throw new Error('Cannot change status of resolved observation');
    }

    return new Observation(
      this.id,
      this.type,
      this.category,
      this.description,
      this.severity,
      this.coordinates,
      this.photos,
      this.recordedBy,
      this.recordedAt,
      newStatus,
      this.notes,
      this.followUpRequired,
      this.resolvedAt,
      this.resolvedBy
    );
  }

  /**
   * Convert to plain object for serialization
   */
  toPlainObject() {
    return {
      id: this.id,
      type: this.type,
      category: this.category.toPlainObject(),
      description: this.description,
      severity: this.severity,
      coordinates: this.coordinates.toPlainObject(),
      photos: this.photos,
      recordedBy: this.recordedBy,
      recordedAt: this.recordedAt,
      status: this.status,
      notes: this.notes,
      followUpRequired: this.followUpRequired,
      resolvedAt: this.resolvedAt,
      resolvedBy: this.resolvedBy,
    };
  }
}