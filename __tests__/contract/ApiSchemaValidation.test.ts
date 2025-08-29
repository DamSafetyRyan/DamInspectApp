/**
 * @fileoverview API Schema Validation Tests
 * Focus: Validate expected API request/response structures
 */

/// <reference path="../types/jest.d.ts" />

import { DamFactory, InspectionFactory } from '../fixtures/factories';

describe('ApiSchemaValidation', () => {
  describe('Authentication Schema', () => {
    test('SHOULD validate login request format', () => {
      // GIVEN login request structure
      const loginRequest = {
        email: 'inspector@test.com',
        password: 'password123',
        rememberMe: false
      };

      // THEN should have required fields
      expect(loginRequest.email).toBeDefined();
      expect(loginRequest.password).toBeDefined();
      expect(typeof loginRequest.email).toBe('string');
      expect(typeof loginRequest.password).toBe('string');
      expect(loginRequest.email).toContain('@');
    });

    test('SHOULD validate login response format', () => {
      // GIVEN expected login response
      const loginResponse = {
        success: true,
        data: {
          accessToken: 'jwt.token.here',
          refreshToken: 'refresh.token.here', 
          expiresAt: '2024-01-01T12:00:00Z',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'user@test.com',
            name: 'Test User',
            role: 'ENGINEER'
          }
        }
      };

      // THEN should have expected structure
      expect(loginResponse.success).toBe(true);
      expect(loginResponse.data.accessToken).toBeDefined();
      expect(loginResponse.data.user.id).toBeDefined();
      expect(['VIEWER', 'ENGINEER', 'MANAGER', 'ADMIN'].includes(loginResponse.data.user.role)).toBe(true);
    });
  });

  describe('Dam Data Schema', () => {
    test('SHOULD validate dam data structure', () => {
      // GIVEN dam data from factory
      const dam = DamFactory.create();

      // THEN should have required dam fields
      expect(dam.id).toBeDefined();
      expect(dam.name).toBeDefined();
      expect(typeof dam.latitude).toBe('number');
      expect(typeof dam.longitude).toBe('number');
      expect(['LOW', 'SIGNIFICANT', 'HIGH'].includes(dam.hazardClassification)).toBe(true);
      expect(['GOOD', 'FAIR', 'POOR', 'UNSATISFACTORY'].includes(dam.condition)).toBe(true);
    });

    test('SHOULD validate GPS coordinate ranges', () => {
      // GIVEN dam with GPS coordinates
      const dam = DamFactory.create();

      // THEN coordinates should be within valid ranges
      expect(dam.latitude).toBeGreaterThanOrEqual(-90);
      expect(dam.latitude).toBeLessThanOrEqual(90);
      expect(dam.longitude).toBeGreaterThanOrEqual(-180);
      expect(dam.longitude).toBeLessThanOrEqual(180);
    });
  });

  describe('Inspection Schema', () => {
    test('SHOULD validate inspection data structure', () => {
      // GIVEN inspection data from factory
      const inspection = InspectionFactory.create();

      // THEN should have required inspection fields
      expect(inspection.id).toBeDefined();
      expect(inspection.damId).toBeDefined();
      expect(inspection.inspectorId).toBeDefined();
      expect(['ROUTINE', 'ANNUAL', 'SPECIAL', 'EMERGENCY', 'FERC_PART_12D'].includes(inspection.type)).toBe(true);
      expect(['GOOD', 'FAIR', 'POOR', 'UNSATISFACTORY'].includes(inspection.rating)).toBe(true);
      expect(inspection.findings).toBeDefined();
      expect(inspection.date).toBeInstanceOf(Date);
    });

    test('SHOULD validate FERC inspection requirements', () => {
      // GIVEN FERC inspection
      const fercInspection = InspectionFactory.createFERC();

      // THEN should meet FERC requirements
      expect(fercInspection.type).toBe('FERC_PART_12D');
      expect(fercInspection.findings.length).toBeGreaterThanOrEqual(50); // Minimum detail requirement
      expect(fercInspection.regulatoryCompliance).toBeDefined();
    });
  });

  describe('Error Response Schema', () => {
    test('SHOULD validate error response format', () => {
      // GIVEN error response structure
      const errorResponse = {
        success: false,
        error: 'Validation failed',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        requestId: '123e4567-e89b-12d3-a456-426614174000'
      };

      // THEN should have consistent error format
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
      expect(typeof errorResponse.error).toBe('string');
      expect(errorResponse.statusCode).toBeGreaterThanOrEqual(400);
      expect(errorResponse.statusCode).toBeLessThan(600);
      expect(errorResponse.timestamp).toBeDefined();
    });
  });
});
