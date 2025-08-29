/**
 * @fileoverview Mock API server for testing DamSafety.IO integration
 * Following TDD - provides predictable API responses for tests
 */

import { EventEmitter } from 'events';

interface MockEndpoint {
  method: string;
  path: string;
  response: any;
  statusCode: number;
  delay?: number;
  requestCount: number;
}

interface MockAuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user?: any;
}

/**
 * Mock server that simulates DamSafety.IO API responses
 */
export class MockApiServer extends EventEmitter {
  private endpoints: Map<string, MockEndpoint> = new Map();
  private isOffline = false;
  private rateLimitDelay = 0;
  private requestHistory: Array<{ method: string; path: string; body: any; timestamp: Date }> = [];

  public readonly url = 'http://localhost:3001';

  async start(): Promise<void> {
    // In a real implementation, this would start an actual HTTP server
    // For testing, we just initialize the mock state
    this.endpoints.clear();
    this.requestHistory.clear();
    this.isOffline = false;
    this.rateLimitDelay = 0;
  }

  async stop(): Promise<void> {
    // Cleanup mock state
    this.endpoints.clear();
    this.requestHistory.clear();
    this.removeAllListeners();
  }

  /**
   * Mock authentication endpoints
   */
  mockAuth(path: string, response: MockAuthResponse): void {
    this.endpoints.set(`POST:${path}`, {
      method: 'POST',
      path,
      response: {
        success: true,
        data: {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken || 'refresh-token',
          expiresAt: new Date(Date.now() + response.expiresIn * 1000),
          user: response.user
        }
      },
      statusCode: 200,
      requestCount: 0
    });
  }

  mockAuthFailure(path: string, statusCode: number, message: string): void {
    this.endpoints.set(`POST:${path}`, {
      method: 'POST',
      path,
      response: {
        success: false,
        error: message,
        statusCode
      },
      statusCode,
      requestCount: 0
    });
  }

  mockTokenRefresh(path: string, response: MockAuthResponse): void {
    this.endpoints.set(`POST:${path}`, {
      method: 'POST',
      path,
      response: {
        success: true,
        data: {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken || 'new-refresh-token',
          expiresAt: new Date(Date.now() + response.expiresIn * 1000)
        }
      },
      statusCode: 200,
      requestCount: 0
    });
  }

  /**
   * Mock dam-related endpoints
   */
  mockGetDam(path: string, dam: any): void {
    this.endpoints.set(`GET:${path}`, {
      method: 'GET',
      path,
      response: {
        success: true,
        data: dam
      },
      statusCode: 200,
      requestCount: 0
    });
  }

  mockGetAccessibleDams(path: string, dams: any[]): void {
    this.endpoints.set(`GET:${path}`, {
      method: 'GET',
      path,
      response: {
        success: true,
        data: dams
      },
      statusCode: 200,
      requestCount: 0
    });
  }

  mockGetNearbyDams(path: string, dams: any[], userLocation?: { lat: number; lng: number }): void {
    // Sort dams by distance if user location provided
    let sortedDams = dams;
    if (userLocation) {
      sortedDams = [...dams].sort((a, b) => {
        const distanceA = this.calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
        const distanceB = this.calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
        return distanceA - distanceB;
      });
    }

    this.endpoints.set(`GET:${path}`, {
      method: 'GET',
      path,
      response: {
        success: true,
        data: sortedDams
      },
      statusCode: 200,
      requestCount: 0
    });
  }

  mockGetSensors(path: string, sensors: any[]): void {
    this.endpoints.set(`GET:${path}`, {
      method: 'GET',
      path,
      response: {
        success: true,
        data: sensors
      },
      statusCode: 200,
      requestCount: 0
    });
  }

  /**
   * Mock inspection endpoints
   */
  mockCreateInspection(path: string, inspection: any): void {
    this.endpoints.set(`POST:${path}`, {
      method: 'POST',
      path,
      response: {
        success: true,
        data: inspection
      },
      statusCode: 201,
      requestCount: 0
    });
  }

  mockCreateSensorReading(path: string, reading: any): void {
    this.endpoints.set(`POST:${path}`, {
      method: 'POST',
      path,
      response: {
        success: true,
        data: reading
      },
      statusCode: 201,
      requestCount: 0
    });
  }

  mockCreateAlert(path: string, alert: any): void {
    this.endpoints.set(`POST:${path}`, {
      method: 'POST',
      path,
      response: {
        success: true,
        data: alert
      },
      statusCode: 201,
      requestCount: 0
    });
  }

  /**
   * Mock file upload endpoints
   */
  mockGetUploadSAS(path: string, response: { sasUrl: string; blobUrl: string }): void {
    this.endpoints.set(`POST:${path}`, {
      method: 'POST',
      path,
      response: {
        success: true,
        data: response
      },
      statusCode: 200,
      requestCount: 0
    });
  }

  mockBlobUpload(blobUrl: string, response: { success: boolean }): void {
    // Store blob upload separately since it's not a regular API endpoint
    this.endpoints.set(`PUT:BLOB:${blobUrl}`, {
      method: 'PUT',
      path: blobUrl,
      response,
      statusCode: response.success ? 200 : 500,
      requestCount: 0
    });
  }

  mockBlobUploadFailure(blobUrl: string, statusCode: number, message: string): void {
    this.endpoints.set(`PUT:BLOB:${blobUrl}`, {
      method: 'PUT',
      path: blobUrl,
      response: { success: false, error: message },
      statusCode,
      requestCount: 0
    });
  }

  /**
   * Mock batch operations
   */
  mockBatchSync(path: string, response: any): void {
    this.endpoints.set(`POST:${path}`, {
      method: 'POST',
      path,
      response: {
        success: true,
        data: response
      },
      statusCode: 200,
      requestCount: 0
    });
  }

  /**
   * Mock error conditions
   */
  mockNotFound(path: string, message: string): void {
    this.endpoints.set(`GET:${path}`, {
      method: 'GET',
      path,
      response: {
        success: false,
        error: message
      },
      statusCode: 404,
      requestCount: 0
    });
  }

  mockValidationError(path: string, errors: Record<string, string>): void {
    this.endpoints.set(`POST:${path}`, {
      method: 'POST',
      path,
      response: {
        success: false,
        error: 'Validation failed',
        validationErrors: errors
      },
      statusCode: 400,
      requestCount: 0
    });
  }

  mockServerError(path: string, message: string): void {
    this.endpoints.set(`GET:${path}`, {
      method: 'GET',
      path,
      response: {
        success: false,
        error: message
      },
      statusCode: 500,
      requestCount: 0
    });
  }

  mockTimeoutThenSuccess(path: string, successResponse: any, timeoutCount: number): void {
    let attemptCount = 0;
    
    this.endpoints.set(`GET:${path}`, {
      method: 'GET',
      path,
      response: () => {
        attemptCount++;
        if (attemptCount <= timeoutCount) {
          throw new Error('Request timeout');
        }
        return {
          success: true,
          data: successResponse
        };
      },
      statusCode: 200,
      requestCount: 0
    });
  }

  mockRateLimit(path: string, retryAfterSeconds: number): void {
    this.endpoints.set(`GET:${path}`, {
      method: 'GET',
      path,
      response: {
        success: false,
        error: 'Rate limited - too many requests'
      },
      statusCode: 429,
      requestCount: 0,
      delay: retryAfterSeconds * 1000
    });
  }

  /**
   * Simulate network conditions
   */
  simulateOffline(offline: boolean): void {
    this.isOffline = offline;
  }

  simulateSlowNetwork(delayMs: number): void {
    // Add delay to all responses
    this.endpoints.forEach(endpoint => {
      endpoint.delay = delayMs;
    });
  }

  /**
   * Request simulation and tracking
   */
  async simulateRequest(method: string, path: string, body?: any): Promise<any> {
    // Track request
    this.requestHistory.push({
      method,
      path,
      body,
      timestamp: new Date()
    });

    // Check if offline
    if (this.isOffline) {
      throw new Error('Network unavailable');
    }

    // Apply rate limiting delay if set
    if (this.rateLimitDelay > 0) {
      await this.delay(this.rateLimitDelay);
    }

    // Find matching endpoint
    const key = `${method}:${path}`;
    const blobKey = `${method}:BLOB:${path}`;
    const endpoint = this.endpoints.get(key) || this.endpoints.get(blobKey);

    if (!endpoint) {
      throw new Error(`No mock endpoint found for ${method} ${path}`);
    }

    // Increment request count
    endpoint.requestCount++;

    // Apply endpoint-specific delay
    if (endpoint.delay) {
      await this.delay(endpoint.delay);
    }

    // Handle function responses (for dynamic behavior)
    let response = endpoint.response;
    if (typeof response === 'function') {
      response = response();
    }

    // Simulate error conditions
    if (endpoint.statusCode >= 400) {
      const error = new Error(response.error || 'Request failed');
      (error as any).statusCode = endpoint.statusCode;
      (error as any).response = response;
      throw error;
    }

    return response;
  }

  /**
   * Test utilities
   */
  getRequestCount(path: string): number {
    const getEndpoint = this.endpoints.get(`GET:${path}`);
    const postEndpoint = this.endpoints.get(`POST:${path}`);
    const putEndpoint = this.endpoints.get(`PUT:${path}`);
    
    return (getEndpoint?.requestCount || 0) + 
           (postEndpoint?.requestCount || 0) + 
           (putEndpoint?.requestCount || 0);
  }

  getBlobUploadCount(): number {
    let count = 0;
    this.endpoints.forEach((endpoint, key) => {
      if (key.includes('BLOB:') && endpoint.method === 'PUT') {
        count += endpoint.requestCount;
      }
    });
    return count;
  }

  getLastRequest(path: string): { method: string; path: string; body: any; timestamp: Date } | null {
    const requests = this.requestHistory.filter(req => req.path === path);
    return requests.length > 0 ? requests[requests.length - 1] : null;
  }

  getAllRequests(): Array<{ method: string; path: string; body: any; timestamp: Date }> {
    return [...this.requestHistory];
  }

  clearRequestHistory(): void {
    this.requestHistory = [];
    this.endpoints.forEach(endpoint => {
      endpoint.requestCount = 0;
    });
  }

  /**
   * Utility methods
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Advanced mocking features
   */
  mockSequentialResponses(path: string, responses: Array<{ response: any; statusCode: number }>): void {
    let callCount = 0;
    
    this.endpoints.set(`GET:${path}`, {
      method: 'GET',
      path,
      response: () => {
        const responseConfig = responses[Math.min(callCount, responses.length - 1)];
        callCount++;
        
        if (responseConfig.statusCode >= 400) {
          const error = new Error(responseConfig.response.error || 'Request failed');
          (error as any).statusCode = responseConfig.statusCode;
          throw error;
        }
        
        return responseConfig.response;
      },
      statusCode: 200, // Will be overridden by function
      requestCount: 0
    });
  }

  mockConditionalResponse(path: string, condition: (body: any) => boolean, 
                         successResponse: any, failureResponse: any): void {
    this.endpoints.set(`POST:${path}`, {
      method: 'POST',
      path,
      response: (body: any) => {
        if (condition(body)) {
          return {
            success: true,
            data: successResponse
          };
        } else {
          return {
            success: false,
            error: failureResponse.error || 'Condition not met',
            validationErrors: failureResponse.validationErrors
          };
        }
      },
      statusCode: 200,
      requestCount: 0
    });
  }

  /**
   * WebSocket simulation (for real-time updates)
   */
  simulateWebSocketMessage(event: string, data: any): void {
    this.emit('websocket-message', { event, data });
  }

  simulateWebSocketConnection(): void {
    this.emit('websocket-connected');
  }

  simulateWebSocketDisconnection(): void {
    this.emit('websocket-disconnected');
  }
}
