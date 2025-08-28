/**
 * Dependency Injection Container
 * Manages dependencies and provides proper inversion of control
 * Note: Using mock repositories for React Native compatibility
 */

// Domain Services
import { InspectionService } from '../../domain/services/InspectionService';

// Domain Repositories (Interfaces)
import { IDamRepository } from '../../domain/repositories/IDamRepository';
import { IObservationRepository } from '../../domain/repositories/IObservationRepository';

// Mock Repositories for Development/Production
import { MockDamRepository } from '../repositories/MockDamRepository';
import { MockObservationRepository } from '../repositories/MockObservationRepository';

export class Container {
  private static instance: Container;
  private damRepository: IDamRepository | null = null;
  private observationRepository: IObservationRepository | null = null;
  private inspectionService: InspectionService | null = null;
  private useMockData: boolean = true; // Always true for React Native

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Configure container to use mock data (always true for React Native)
   */
  setUseMockData(useMock: boolean): void {
    this.useMockData = true; // Force to true for React Native compatibility
    console.log('📱 React Native app using mock data repositories');
    console.log('💡 In production, backend API would handle database operations');
    
    // Reset repositories to force recreation
    this.damRepository = null;
    this.observationRepository = null;
    this.inspectionService = null;
  }

  /**
   * Get Dam Repository
   */
  async getDamRepository(): Promise<IDamRepository> {
    if (!this.damRepository) {
      this.damRepository = new MockDamRepository();
      console.log('🏗️ Dam Repository initialized (Mock)');
    }
    return this.damRepository;
  }

  /**
   * Get Observation Repository
   */
  async getObservationRepository(): Promise<IObservationRepository> {
    if (!this.observationRepository) {
      this.observationRepository = new MockObservationRepository();
      console.log('📝 Observation Repository initialized (Mock)');
    }
    return this.observationRepository;
  }

  /**
   * Get Inspection Service
   */
  async getInspectionService(): Promise<InspectionService> {
    if (!this.inspectionService) {
      const damRepository = await this.getDamRepository();
      const observationRepository = await this.getObservationRepository();
      this.inspectionService = new InspectionService(damRepository, observationRepository);
      console.log('🔍 Inspection Service initialized');
    }
    return this.inspectionService;
  }

  /**
   * Test connection (always returns true for mock data)
   */
  async testConnection(): Promise<boolean> {
    console.log('✅ Mock data connection test: SUCCESS');
    return true;
  }

  /**
   * Disconnect (no-op for mock repositories)
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Mock repositories disconnected');
  }

  /**
   * Reset container (useful for testing)
   */
  reset(): void {
    this.damRepository = null;
    this.observationRepository = null;
    this.inspectionService = null;
    console.log('🔄 Container reset');
  }
}