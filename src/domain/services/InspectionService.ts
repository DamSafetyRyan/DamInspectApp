/**
 * Inspection Domain Service
 * Contains business logic for inspection-related operations
 */

import { Dam } from '../entities/Dam';
import { Observation } from '../entities/Observation';
import { IDamRepository } from '../repositories/IDamRepository';
import { IObservationRepository } from '../repositories/IObservationRepository';
import { Coordinates } from '../value-objects/Coordinates';
import { ObservationSeverity } from '../value-objects/ObservationEnums';

export interface InspectionPlan {
  dam: Dam;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate: Date;
  overdue: boolean;
  recentObservations: Observation[];
  recommendedActions: string[];
}

export interface NearbyFeatures {
  dams: Dam[];
  observations: Observation[];
  totalCount: number;
}

export class InspectionService {
  constructor(
    private damRepository: IDamRepository,
    private observationRepository: IObservationRepository
  ) {}

  /**
   * Business Logic: Get nearby features for inspection
   */
  async getNearbyFeatures(
    userLocation: Coordinates,
    radiusKm: number = 10,
    limit: number = 50
  ): Promise<NearbyFeatures> {
    const [dams, observations] = await Promise.all([
      this.damRepository.findNearby(userLocation, radiusKm, limit),
      this.observationRepository.findNearby(userLocation, radiusKm, limit),
    ]);

    return {
      dams,
      observations,
      totalCount: dams.length + observations.length,
    };
  }

  /**
   * Business Logic: Create inspection plan for a dam
   */
  async createInspectionPlan(damId: string): Promise<InspectionPlan | null> {
    const dam = await this.damRepository.findById(damId);
    if (!dam) {
      return null;
    }

    // Get recent observations for this dam
    const recentObservations = await this.observationRepository.findNearby(
      dam.coordinates,
      0.1, // 100m radius around dam
      10
    );

    // Filter observations from last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const filteredObservations = recentObservations.filter(obs => 
      new Date(obs.recordedAt) >= sixMonthsAgo
    );

    // Generate recommended actions based on dam condition and observations
    const recommendedActions = this.generateRecommendedActions(dam, filteredObservations);

    return {
      dam,
      priority: dam.getInspectionPriority(),
      dueDate: dam.getNextInspectionDueDate(),
      overdue: dam.isInspectionOverdue(),
      recentObservations: filteredObservations,
      recommendedActions,
    };
  }

  /**
   * Business Logic: Get dams requiring urgent inspection
   */
  async getDamsRequiringUrgentInspection(): Promise<Dam[]> {
    const allDams = await this.damRepository.findRequiringInspection();
    
    return allDams.filter(dam => {
      const priority = dam.getInspectionPriority();
      return priority === 'HIGH' || priority === 'CRITICAL' || dam.isInspectionOverdue();
    });
  }

  /**
   * Business Logic: Get critical observations requiring immediate attention
   */
  async getCriticalObservations(): Promise<Observation[]> {
    const [criticalObs, highObs] = await Promise.all([
      this.observationRepository.findBySeverity(ObservationSeverity.CRITICAL),
      this.observationRepository.findBySeverity(ObservationSeverity.HIGH),
    ]);

    return [...criticalObs, ...highObs].filter(obs => 
      obs.requiresImmediateAttention()
    );
  }

  /**
   * Business Logic: Get observations requiring follow-up
   */
  async getObservationsRequiringFollowUp(): Promise<Observation[]> {
    const observations = await this.observationRepository.findRequiringFollowUp();
    
    return observations.filter(obs => obs.isOverdueForFollowUp());
  }

  /**
   * Business Logic: Generate inspection statistics
   */
  async getInspectionStatistics(): Promise<{
    totalDams: number;
    overdueInspections: number;
    criticalObservations: number;
    openObservations: number;
    inspectionsThisMonth: number;
  }> {
    const [
      totalDams,
      allDams,
      criticalObs,
      allObservations,
    ] = await Promise.all([
      this.damRepository.count(),
      this.damRepository.findAll(),
      this.getCriticalObservations(),
      this.observationRepository.findAll(),
    ]);

    const overdueInspections = allDams.filter(dam => dam.isInspectionOverdue()).length;
    const openObservations = allObservations.filter(obs => obs.status === 'open').length;

    // Count inspections this month (observations created this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const thisMonthObservations = await this.observationRepository.findByDateRange(
      startOfMonth,
      endOfMonth
    );

    return {
      totalDams,
      overdueInspections,
      criticalObservations: criticalObs.length,
      openObservations,
      inspectionsThisMonth: thisMonthObservations.length,
    };
  }

  /**
   * Private: Generate recommended actions based on dam and observations
   */
  private generateRecommendedActions(dam: Dam, observations: Observation[]): string[] {
    const actions: string[] = [];

    // Actions based on dam condition
    if (dam.isInspectionOverdue()) {
      actions.push('Schedule immediate routine inspection');
    }

    if (!dam.hasEAP && dam.requiresEAP()) {
      actions.push('Develop Emergency Action Plan (EAP)');
    }

    // Actions based on recent observations
    const criticalObs = observations.filter(obs => obs.severity === ObservationSeverity.CRITICAL);
    const highObs = observations.filter(obs => obs.severity === ObservationSeverity.HIGH);

    if (criticalObs.length > 0) {
      actions.push('Address critical safety observations immediately');
    }

    if (highObs.length > 2) {
      actions.push('Conduct detailed engineering assessment');
    }

    // Seepage-related observations
    const seepageObs = observations.filter(obs => 
      obs.type.toLowerCase().includes('seepage') || 
      obs.description.toLowerCase().includes('seepage')
    );
    
    if (seepageObs.length > 0) {
      actions.push('Monitor seepage conditions and consider piezometer installation');
    }

    // Default action if no specific issues
    if (actions.length === 0) {
      actions.push('Continue routine monitoring and maintenance');
    }

    return actions;
  }
}