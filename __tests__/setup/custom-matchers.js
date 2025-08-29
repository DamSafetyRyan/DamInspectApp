/**
 * Custom Jest matchers for DamInspect-specific testing
 * Provides domain-specific assertions for better test readability
 */

// Custom matchers for dam safety domain
expect.extend({
  /**
   * Test if inspection has valid rating
   */
  toHaveValidRating(received) {
    const validRatings = ['GOOD', 'FAIR', 'POOR', 'UNSATISFACTORY'];
    const pass = validRatings.includes(received.rating);
    
    return {
      pass,
      message: () => pass
        ? `Expected inspection not to have valid rating ${received.rating}`
        : `Expected inspection to have valid rating, got ${received.rating}. Valid ratings: ${validRatings.join(', ')}`
    };
  },

  /**
   * Test if inspection is critical
   */
  toBeCriticalInspection(received) {
    const isCritical = received.rating === 'UNSATISFACTORY' || 
                      received.criticalIssue === true ||
                      received.requiresImmediateSync === true;
    
    return {
      pass: isCritical,
      message: () => isCritical
        ? `Expected inspection not to be critical`
        : `Expected inspection to be critical (UNSATISFACTORY rating, criticalIssue=true, or requiresImmediateSync=true)`
    };
  },

  /**
   * Test if sensor reading is within normal range
   */
  toBeWithinNormalRange(received, sensor) {
    const value = received.value;
    const { min, max } = sensor.normalRange;
    const pass = value >= min && value <= max;
    
    return {
      pass,
      message: () => pass
        ? `Expected reading ${value} not to be within normal range ${min}-${max}`
        : `Expected reading ${value} to be within normal range ${min}-${max} for sensor ${sensor.name}`
    };
  },

  /**
   * Test if GPS coordinates are near a location
   */
  toBeNearLocation(received, expectedLocation, maxDistanceMiles = 1) {
    const distance = calculateDistance(
      received.lat, received.lng,
      expectedLocation.lat, expectedLocation.lng
    );
    const pass = distance <= maxDistanceMiles;
    
    return {
      pass,
      message: () => pass
        ? `Expected coordinates (${received.lat}, ${received.lng}) not to be within ${maxDistanceMiles} miles of (${expectedLocation.lat}, ${expectedLocation.lng})`
        : `Expected coordinates (${received.lat}, ${received.lng}) to be within ${maxDistanceMiles} miles of (${expectedLocation.lat}, ${expectedLocation.lng}), but distance is ${distance.toFixed(2)} miles`
    };
  },

  /**
   * Test if photo has required metadata
   */
  toHaveRequiredPhotoMetadata(received) {
    const requiredFields = ['url', 'coordinates', 'takenAt', 'fileSize'];
    const missingFields = requiredFields.filter(field => !received[field]);
    const pass = missingFields.length === 0;
    
    return {
      pass,
      message: () => pass
        ? `Expected photo not to have all required metadata`
        : `Expected photo to have required metadata. Missing: ${missingFields.join(', ')}`
    };
  },

  /**
   * Test if validation result has specific error
   */
  toHaveValidationError(received, expectedError) {
    const hasError = received.errors && received.errors.includes(expectedError);
    
    return {
      pass: hasError,
      message: () => hasError
        ? `Expected validation not to have error: ${expectedError}`
        : `Expected validation to have error: ${expectedError}. Got errors: ${received.errors?.join(', ') || 'none'}`
    };
  },

  /**
   * Test if queue operation has correct priority
   */
  toHaveCorrectPriority(received, expectedPriority) {
    const pass = received.priority === expectedPriority;
    
    return {
      pass,
      message: () => pass
        ? `Expected operation not to have priority ${expectedPriority}`
        : `Expected operation to have priority ${expectedPriority}, got ${received.priority}`
    };
  },

  /**
   * Test if sync status is as expected
   */
  toHaveSyncStatus(received, expectedStatus) {
    const pass = received.syncStatus === expectedStatus;
    
    return {
      pass,
      message: () => pass
        ? `Expected item not to have sync status ${expectedStatus}`
        : `Expected item to have sync status ${expectedStatus}, got ${received.syncStatus}`
    };
  },

  /**
   * Test if API response is successful
   */
  toBeSuccessfulApiResponse(received) {
    const pass = received.success === true && received.data !== undefined;
    
    return {
      pass,
      message: () => pass
        ? `Expected API response not to be successful`
        : `Expected API response to be successful. Got: success=${received.success}, error=${received.error}`
    };
  },

  /**
   * Test if API response has specific error
   */
  toHaveApiError(received, expectedError) {
    const hasExpectedError = received.success === false && 
                            received.error === expectedError;
    
    return {
      pass: hasExpectedError,
      message: () => hasExpectedError
        ? `Expected API response not to have error: ${expectedError}`
        : `Expected API response to have error: ${expectedError}. Got: success=${received.success}, error=${received.error}`
    };
  },

  /**
   * Test if inspection meets FERC requirements
   */
  toMeetFERCRequirements(received) {
    const requirements = [
      received.type === 'FERC_PART_12D',
      received.findings && received.findings.length >= 50,
      received.regulatoryCompliance?.fercChecklist,
      Object.values(received.regulatoryCompliance?.fercChecklist || {}).every(Boolean)
    ];
    
    const pass = requirements.every(Boolean);
    const failedRequirements = [];
    
    if (received.type !== 'FERC_PART_12D') failedRequirements.push('Must be FERC_PART_12D type');
    if (!received.findings || received.findings.length < 50) failedRequirements.push('Findings must be at least 50 characters');
    if (!received.regulatoryCompliance?.fercChecklist) failedRequirements.push('Must have FERC checklist');
    if (!Object.values(received.regulatoryCompliance?.fercChecklist || {}).every(Boolean)) {
      failedRequirements.push('All FERC checklist items must be completed');
    }
    
    return {
      pass,
      message: () => pass
        ? `Expected inspection not to meet FERC requirements`
        : `Expected inspection to meet FERC requirements. Failed: ${failedRequirements.join(', ')}`
    };
  },

  /**
   * Test if user has permission for action
   */
  toHavePermission(received, action) {
    const permissionMap = {
      'create_inspection': 'canCreateInspections',
      'submit_inspection': 'canSubmitInspections',
      'approve_inspection': 'canApproveInspections',
      'view_all_dams': 'canViewAllDams'
    };
    
    const permissionKey = permissionMap[action];
    const pass = received.permissions?.[permissionKey] === true;
    
    return {
      pass,
      message: () => pass
        ? `Expected user not to have permission for ${action}`
        : `Expected user to have permission for ${action}. User permissions: ${JSON.stringify(received.permissions)}`
    };
  },

  /**
   * Test if dam is high hazard
   */
  toBeHighHazardDam(received) {
    const pass = received.hazardClassification === 'HIGH';
    
    return {
      pass,
      message: () => pass
        ? `Expected dam not to be high hazard`
        : `Expected dam to be high hazard, got ${received.hazardClassification}`
    };
  },

  /**
   * Test if reading requires confirmation due to deviation
   */
  toRequireConfirmation(received) {
    const pass = received.requiresConfirmation === true;
    
    return {
      pass,
      message: () => pass
        ? `Expected reading not to require confirmation`
        : `Expected reading to require confirmation due to significant deviation from normal`
    };
  },

  /**
   * Test if operation is queued for immediate sync
   */
  toBeQueuedForImmediateSync(received) {
    const pass = received.priority === 'CRITICAL' && received.requiresImmediateSync === true;
    
    return {
      pass,
      message: () => pass
        ? `Expected operation not to be queued for immediate sync`
        : `Expected operation to be queued for immediate sync (CRITICAL priority and requiresImmediateSync=true)`
    };
  }
});

// Utility functions for custom matchers
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Additional test utilities
global.testMatchers = {
  /**
   * Create a matcher for testing async operations with timeout
   */
  toResolveWithin: (promise, timeout = 5000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Operation did not complete within ${timeout}ms`)), timeout)
      )
    ]);
  },

  /**
   * Create a matcher for testing queue order
   */
  toBeInCorrectPriorityOrder: (operations) => {
    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'NORMAL': 2, 'LOW': 3 };
    
    for (let i = 0; i < operations.length - 1; i++) {
      const currentPriority = priorityOrder[operations[i].priority];
      const nextPriority = priorityOrder[operations[i + 1].priority];
      
      if (currentPriority > nextPriority) {
        throw new Error(`Operations not in correct priority order at index ${i}: ${operations[i].priority} should come after ${operations[i + 1].priority}`);
      }
    }
    
    return true;
  },

  /**
   * Validate inspection workflow state transitions
   */
  toAllowStateTransition: (fromState, toState) => {
    const validTransitions = {
      'DRAFT': ['SUBMITTED', 'CANCELLED'],
      'SUBMITTED': ['IN_REVIEW', 'REJECTED'],
      'IN_REVIEW': ['APPROVED', 'REVISION_REQUESTED'],
      'REVISION_REQUESTED': ['SUBMITTED', 'CANCELLED'],
      'APPROVED': ['PUBLISHED'],
      'REJECTED': ['SUBMITTED'],
      'CANCELLED': [],
      'PUBLISHED': []
    };
    
    const allowed = validTransitions[fromState]?.includes(toState) || false;
    
    if (!allowed) {
      throw new Error(`Invalid state transition from ${fromState} to ${toState}. Valid transitions from ${fromState}: ${validTransitions[fromState]?.join(', ') || 'none'}`);
    }
    
    return true;
  }
};

// Export for use in other test files
module.exports = {
  calculateDistance,
  toRadians
};
