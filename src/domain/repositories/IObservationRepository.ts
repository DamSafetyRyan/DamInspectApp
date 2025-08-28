/**
 * Observation Repository Interface (Port)
 * Defines the contract for observation data access without specifying implementation
 */

import { Observation } from '../entities/Observation';
import { Coordinates } from '../value-objects/Coordinates';
import { ObservationSeverity, ObservationStatus } from '../value-objects/ObservationEnums';

export interface CreateObservationRequest {
  type: string;
  category: {
    damType: string;
    categoryName: string;
  };
  description: string;
  severity: ObservationSeverity;
  coordinates: Coordinates;
  photos: string[];
  recordedBy: string;
  notes?: string;
  followUpRequired?: boolean;
}

export interface IObservationRepository {
  /**
   * Create a new observation
   */
  create(request: CreateObservationRequest): Promise<Observation>;

  /**
   * Find observations near a given location
   */
  findNearby(center: Coordinates, radiusKm: number, limit?: number): Promise<Observation[]>;

  /**
   * Find observation by ID
   */
  findById(id: string): Promise<Observation | null>;

  /**
   * Find observations by status
   */
  findByStatus(status: ObservationStatus): Promise<Observation[]>;

  /**
   * Find observations by severity
   */
  findBySeverity(severity: ObservationSeverity): Promise<Observation[]>;

  /**
   * Find observations by recorder
   */
  findByRecorder(recordedBy: string): Promise<Observation[]>;

  /**
   * Find observations requiring follow-up
   */
  findRequiringFollowUp(): Promise<Observation[]>;

  /**
   * Update observation status
   */
  updateStatus(id: string, status: ObservationStatus, updatedBy: string): Promise<Observation>;

  /**
   * Resolve observation
   */
  resolve(id: string, resolvedBy: string, notes?: string): Promise<Observation>;

  /**
   * Get all observations (with pagination)
   */
  findAll(offset?: number, limit?: number): Promise<Observation[]>;

  /**
   * Get total count of observations
   */
  count(): Promise<number>;

  /**
   * Get observations by date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Observation[]>;
}