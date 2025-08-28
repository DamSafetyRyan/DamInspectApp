/**
 * Mock Observation Repository Implementation
 * Provides mock data for development and testing
 */

import { v4 as uuidv4 } from 'uuid';
import { Observation } from '../../domain/entities/Observation';
import { IObservationRepository, CreateObservationRequest } from '../../domain/repositories/IObservationRepository';
import { Coordinates } from '../../domain/value-objects/Coordinates';
import { InspectionCategory } from '../../domain/value-objects/InspectionCategory';
import { ObservationSeverity, ObservationStatus } from '../../domain/value-objects/ObservationEnums';
import { DamType } from '../../domain/value-objects/DamEnums';

export class MockObservationRepository implements IObservationRepository {
  private mockObservations: Observation[] = [];

  constructor() {
    this.initializeMockData();
  }

  async create(request: CreateObservationRequest): Promise<Observation> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const category = InspectionCategory.create(request.category.damType, request.category.categoryName);
    
    const observation = new Observation(
      id,
      request.type,
      category,
      request.description,
      request.severity,
      request.coordinates,
      request.photos,
      request.recordedBy,
      now,
      ObservationStatus.OPEN,
      request.notes,
      request.followUpRequired
    );

    this.mockObservations.push(observation);
    return Promise.resolve(observation);
  }

  async findNearby(center: Coordinates, radiusKm: number, limit: number = 50): Promise<Observation[]> {
    const nearbyObservations = this.mockObservations
      .filter(obs => obs.coordinates.isWithinRadius(center, radiusKm))
      .sort((a, b) => a.coordinates.distanceTo(center) - b.coordinates.distanceTo(center))
      .slice(0, limit);
    
    return Promise.resolve(nearbyObservations);
  }

  async findById(id: string): Promise<Observation | null> {
    const observation = this.mockObservations.find(o => o.id === id);
    return Promise.resolve(observation || null);
  }

  async findByStatus(status: ObservationStatus): Promise<Observation[]> {
    const observations = this.mockObservations.filter(o => o.status === status);
    return Promise.resolve(observations);
  }

  async findBySeverity(severity: ObservationSeverity): Promise<Observation[]> {
    const observations = this.mockObservations.filter(o => o.severity === severity);
    return Promise.resolve(observations);
  }

  async findByRecorder(recordedBy: string): Promise<Observation[]> {
    const observations = this.mockObservations.filter(o => o.recordedBy === recordedBy);
    return Promise.resolve(observations);
  }

  async findRequiringFollowUp(): Promise<Observation[]> {
    const observations = this.mockObservations.filter(o => 
      o.followUpRequired && o.status !== ObservationStatus.RESOLVED
    );
    return Promise.resolve(observations);
  }

  async updateStatus(id: string, status: ObservationStatus, updatedBy: string): Promise<Observation> {
    const index = this.mockObservations.findIndex(o => o.id === id);
    if (index === -1) {
      throw new Error('Observation not found');
    }

    const observation = this.mockObservations[index];
    const updatedObservation = observation.updateStatus(status, updatedBy);
    this.mockObservations[index] = updatedObservation;
    
    return Promise.resolve(updatedObservation);
  }

  async resolve(id: string, resolvedBy: string, notes?: string): Promise<Observation> {
    const index = this.mockObservations.findIndex(o => o.id === id);
    if (index === -1) {
      throw new Error('Observation not found');
    }

    const observation = this.mockObservations[index];
    const resolvedObservation = observation.resolve(resolvedBy, notes);
    this.mockObservations[index] = resolvedObservation;
    
    return Promise.resolve(resolvedObservation);
  }

  async findAll(offset: number = 0, limit: number = 100): Promise<Observation[]> {
    const observations = this.mockObservations.slice(offset, offset + limit);
    return Promise.resolve(observations);
  }

  async count(): Promise<number> {
    return Promise.resolve(this.mockObservations.length);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Observation[]> {
    const observations = this.mockObservations.filter(o => {
      const recordedDate = new Date(o.recordedAt);
      return recordedDate >= startDate && recordedDate <= endDate;
    });
    return Promise.resolve(observations);
  }

  /**
   * Initialize mock data
   */
  private initializeMockData(): void {
    // No mock observations - start with empty array
    // Observations will be created by users through the app
    this.mockObservations = [];
  }
}