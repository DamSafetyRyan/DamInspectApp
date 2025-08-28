/**
 * Database Service
 * Handles all database interactions via HTTP API calls or mock data
 * Note: Direct PostgreSQL connections are not supported in React Native
 */

import { Dam, Asset, Instrument, Observation, NearbySearchParams, NearbySearchResult, Coordinates } from '../../shared/types/infrastructure';

// Base API URL - in production this would be your backend server
const API_BASE_URL = 'https://your-backend-api.com/api';

export class DatabaseService {
  private apiKey: string | null = null;
  private isConnected = false;

  /**
   * Set API authentication key
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Make authenticated HTTP request to backend API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      // For development, fall back to mock data
      throw error;
    }
  }

  /**
   * Initialize connection (validate API credentials)
   */
  async connect(): Promise<void> {
    try {
      // For development, we'll use mock data
      // In production, this would validate API credentials
      console.log('🔄 Using mock data for development');
      console.log('📝 Note: In production, this would connect to your backend API');
      this.isConnected = true;
    } catch (error) {
      console.error('❌ API connection failed:', error);
      throw new Error('Failed to connect to API');
    }
  }

  /**
   * Disconnect (cleanup if needed)
   */
  async disconnect(): Promise<void> {
    try {
      this.isConnected = false;
      console.log('🔌 Disconnected from API');
    } catch (error) {
      console.error('API cleanup error:', error);
      throw error;
    }
  }

  /**
   * Ensure connection is active
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  /**
   * Search for nearby infrastructure features
   */
  async searchNearby(params: NearbySearchParams): Promise<NearbySearchResult> {
    await this.ensureConnection();

    const { centerCoordinates, radiusKm, types = ['dam', 'asset', 'instrument', 'observation'], limit = 50 } = params;
    
    try {
      // In production, this would make API calls to your backend
      // For development, return mock data
      const result: NearbySearchResult = {
        dams: types.includes('dam') ? this.getMockDams(centerCoordinates, radiusKm) : [],
        assets: types.includes('asset') ? this.getMockAssets(centerCoordinates, radiusKm) : [],
        instruments: types.includes('instrument') ? this.getMockInstruments(centerCoordinates, radiusKm) : [],
        observations: types.includes('observation') ? this.getMockObservations(centerCoordinates, radiusKm) : [],
      };

      console.log(`🔍 Found ${result.dams.length} dams, ${result.assets.length} assets, ${result.instruments.length} instruments, ${result.observations.length} observations`);
      return result;
    } catch (error) {
      console.error('Error searching nearby features:', error);
      throw new Error('Failed to search nearby features');
    }
  }

  /**
   * Create a new observation
   */
  async createObservation(observation: Omit<Observation, 'id'>): Promise<Observation> {
    await this.ensureConnection();

    try {
      // In production, this would make an API call to your backend
      // For development, simulate creating an observation
      const newObservation: Observation = {
        ...observation,
        id: `obs-${Date.now()}`, // Generate a mock ID
      };

      console.log('📝 Created new observation:', newObservation.type);
      return newObservation;
    } catch (error) {
      console.error('Error creating observation:', error);
      throw new Error('Failed to create observation');
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureConnection();
      return this.isConnected;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Mock data for development - nearby dams
   */
  private getMockDams(center: Coordinates, radiusKm: number): Dam[] {
    return [
      {
        id: 'mock-dam-1',
        nidId: 'CA00001',
        name: 'Oroville Dam',
        type: 'Earthen',
        ownerName: 'California Department of Water Resources',
        yearCompleted: 1968,
        height: 770,
        storage: 3537577,
        primaryPurpose: 'Flood Control',
        hazardLevel: 'HIGH',
        conditionAssessment: 'SATISFACTORY',
        hasEAP: true,
        lastInspectionDate: '2024-01-15',
        coordinates: {
          latitude: center.latitude + 0.01,
          longitude: center.longitude + 0.01,
        },
        county: 'Butte',
        river: 'Feather River',
        inspectionFrequency: 12,
        allPurposes: 'Flood Control, Water Supply, Recreation',
      },
      {
        id: 'mock-dam-2',
        nidId: 'CA00002',
        name: 'Shasta Dam',
        type: 'Concrete',
        ownerName: 'U.S. Bureau of Reclamation',
        yearCompleted: 1945,
        height: 602,
        storage: 4552000,
        primaryPurpose: 'Hydroelectric',
        hazardLevel: 'HIGH',
        conditionAssessment: 'SATISFACTORY',
        hasEAP: true,
        lastInspectionDate: '2024-02-01',
        coordinates: {
          latitude: center.latitude - 0.01,
          longitude: center.longitude - 0.01,
        },
        county: 'Shasta',
        river: 'Sacramento River',
        inspectionFrequency: 6,
        allPurposes: 'Hydroelectric, Flood Control, Water Supply, Recreation',
      },
    ];
  }

  /**
   * Mock data for development - nearby assets
   */
  private getMockAssets(center: Coordinates, radiusKm: number): Asset[] {
    return [
      {
        id: 'mock-asset-1',
        damId: 'mock-dam-1',
        name: 'Spillway Gate #1',
        type: 'Spillway',
        description: 'Primary spillway gate structure',
        coordinates: {
          latitude: center.latitude + 0.005,
          longitude: center.longitude + 0.005,
        },
        status: 'Operational',
        lastInspected: '2024-01-10',
        condition: 'Good',
      },
      {
        id: 'mock-asset-2',
        damId: 'mock-dam-2',
        name: 'Intake Tower',
        type: 'Intake',
        description: 'Water intake tower structure',
        coordinates: {
          latitude: center.latitude - 0.005,
          longitude: center.longitude - 0.005,
        },
        status: 'Operational',
        lastInspected: '2024-01-20',
        condition: 'Excellent',
      },
    ];
  }

  /**
   * Mock data for development - nearby instruments
   */
  private getMockInstruments(center: Coordinates, radiusKm: number): Instrument[] {
    return [
      {
        id: 'mock-instrument-1',
        damId: 'mock-dam-1',
        assetId: 'mock-asset-1',
        name: 'Piezometer P-101',
        type: 'Piezometer',
        coordinates: {
          latitude: center.latitude + 0.003,
          longitude: center.longitude + 0.003,
        },
        installationDate: '2020-05-15',
        lastReading: '2024-01-25',
        status: 'Active',
      },
      {
        id: 'mock-instrument-2',
        damId: 'mock-dam-2',
        assetId: 'mock-asset-2',
        name: 'Inclinometer I-201',
        type: 'Inclinometer',
        coordinates: {
          latitude: center.latitude - 0.003,
          longitude: center.longitude - 0.003,
        },
        installationDate: '2019-08-10',
        lastReading: '2024-01-22',
        status: 'Active',
      },
    ];
  }

  /**
   * Mock data for development - nearby observations
   */
  private getMockObservations(center: Coordinates, radiusKm: number): Observation[] {
    return [
      {
        id: 'mock-obs-1',
        damId: 'mock-dam-1',
        assetId: null,
        instrumentId: null,
        type: 'Seepage',
        category: 'Seepage and Drainage',
        description: 'Minor seepage observed at toe of dam',
        severity: 'Low',
        coordinates: {
          latitude: center.latitude + 0.002,
          longitude: center.longitude + 0.002,
        },
        photos: [],
        recordedBy: 'John Inspector',
        recordedAt: '2024-01-20T10:30:00Z',
        inspectionId: 'INS-2024-001',
        status: 'Open',
        notes: 'Monitor for changes',
      },
      {
        id: 'mock-obs-2',
        damId: 'mock-dam-2',
        assetId: 'mock-asset-2',
        instrumentId: null,
        type: 'Crack',
        category: 'Structural Integrity',
        description: 'Small hairline crack in concrete',
        severity: 'Medium',
        coordinates: {
          latitude: center.latitude - 0.002,
          longitude: center.longitude - 0.002,
        },
        photos: [],
        recordedBy: 'Jane Engineer',
        recordedAt: '2024-01-18T14:15:00Z',
        inspectionId: 'INS-2024-002',
        status: 'Under Review',
        notes: 'Requires structural assessment',
      },
    ];
  }
}