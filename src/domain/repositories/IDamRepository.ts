/**
 * Dam Repository Interface (Port)
 * Defines the contract for dam data access without specifying implementation
 */

import { Dam } from '../entities/Dam';
import { Coordinates } from '../value-objects/Coordinates';

export interface IDamRepository {
  /**
   * Find dams near a given location
   */
  findNearby(center: Coordinates, radiusKm: number, limit?: number): Promise<Dam[]>;

  /**
   * Find dam by ID
   */
  findById(id: string): Promise<Dam | null>;

  /**
   * Find dam by NID ID
   */
  findByNidId(nidId: string): Promise<Dam | null>;

  /**
   * Find dams by owner
   */
  findByOwner(ownerName: string): Promise<Dam[]>;

  /**
   * Find dams requiring inspection
   */
  findRequiringInspection(): Promise<Dam[]>;

  /**
   * Find dams by hazard level
   */
  findByHazardLevel(hazardLevel: string): Promise<Dam[]>;

  /**
   * Get all dams (with pagination)
   */
  findAll(offset?: number, limit?: number): Promise<Dam[]>;

  /**
   * Get total count of dams
   */
  count(): Promise<number>;
}