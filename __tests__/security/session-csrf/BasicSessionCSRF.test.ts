/**
 * @fileoverview Basic Session and CSRF Protection Testing
 * Purpose: Essential session security and CSRF protection for form submissions
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { SessionManager } from '../../../src/infrastructure/auth/SessionManager';
import { CSRFProtection } from '../../../src/infrastructure/security/CSRFProtection';
import { UserFactory } from '../../fixtures/factories';

describe('Basic Session and CSRF Security Tests', () => {
  let sessionManager: SessionManager;
  let csrfProtection: CSRFProtection;

  beforeEach(() => {
    sessionManager = new SessionManager();
    csrfProtection = new CSRFProtection();
  });

  describe('Session Management', () => {
    test('SHOULD create secure session tokens', async () => {
      const user = UserFactory.create();
      const session = await sessionManager.createSession(user);

      // Should generate unique, non-predictable session ID
      expect(session.sessionId).toBeDefined();
      expect(session.sessionId.length).toBeGreaterThan(16);
      expect(session.sessionId).not.toMatch(/^[0-9]+$/); // Not just sequential numbers
    });

    test('SHOULD handle session timeout', async () => {
      const user = UserFactory.create();
      const session = await sessionManager.createSession(user, { 
        timeout: 30 * 60 * 1000 // 30 minutes
      });

      // Should be valid initially
      const initialCheck = await sessionManager.validateSession(session.sessionId);
      expect(initialCheck.isValid).toBe(true);

      // Should expire after timeout
      await sessionManager.simulateTimeElapse(session.sessionId, 31 * 60 * 1000); // 31 minutes
      const expiredCheck = await sessionManager.validateSession(session.sessionId);
      expect(expiredCheck.isValid).toBe(false);
    });

    test('SHOULD invalidate sessions on logout', async () => {
      const user = UserFactory.create();
      const session = await sessionManager.createSession(user);

      // Should be valid before logout
      const beforeLogout = await sessionManager.validateSession(session.sessionId);
      expect(beforeLogout.isValid).toBe(true);

      // Should be invalid after logout
      await sessionManager.logout(session.sessionId);
      const afterLogout = await sessionManager.validateSession(session.sessionId);
      expect(afterLogout.isValid).toBe(false);
    });
  });

  describe('CSRF Protection', () => {
    test('SHOULD require CSRF token for inspection submissions', async () => {
      const user = UserFactory.create();
      const inspectionData = {
        damId: 'dam-123',
        findings: 'Dam in good condition',
        rating: 'GOOD'
      };

      // Should fail without CSRF token
      const withoutToken = await csrfProtection.validateSubmission(inspectionData, {
        headers: { 'Content-Type': 'application/json' }
      });
      expect(withoutToken.isValid).toBe(false);

      // Should succeed with valid CSRF token
      const csrfToken = await csrfProtection.generateToken(user.id);
      const withToken = await csrfProtection.validateSubmission(inspectionData, {
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        }
      });
      expect(withToken.isValid).toBe(true);
    });

    test('SHOULD prevent CSRF token reuse', async () => {
      const user = UserFactory.create();
      const token = await csrfProtection.generateToken(user.id);
      
      // First use should work
      const firstUse = await csrfProtection.validateToken(token, user.id);
      expect(firstUse.isValid).toBe(true);

      // Second use should fail
      const secondUse = await csrfProtection.validateToken(token, user.id);
      expect(secondUse.isValid).toBe(false);
    });
  });
});
