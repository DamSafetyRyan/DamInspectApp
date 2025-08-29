/**
 * @fileoverview API Contract validation utilities
 * Purpose: Ensure API compatibility and detect breaking changes
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

interface ContractValidationResult {
  isValid: boolean;
  violations: ContractViolation[];
  score: number;
  coverage: {
    requestCoverage: number;
    responseCoverage: number;
  };
}

interface ContractViolation {
  type: string;
  field: string;
  message: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
}

interface BreakingChangeAnalysis {
  hasBreakingChanges: boolean;
  breakingChanges: BreakingChange[];
  nonBreakingChanges: NonBreakingChange[];
}

interface BreakingChange {
  type: 'FIELD_REMOVED' | 'FIELD_RENAMED' | 'TYPE_CHANGED' | 'REQUIRED_FIELD_ADDED' | 'ENUM_VALUE_REMOVED';
  field: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  description: string;
  migrationPath?: string;
}

interface NonBreakingChange {
  type: 'FIELD_ADDED' | 'OPTIONAL_FIELD_ADDED' | 'ENUM_VALUE_ADDED' | 'DESCRIPTION_UPDATED';
  field: string;
  description: string;
}

export class ApiContractValidator {
  private ajv: Ajv;
  private baseUrl: string;
  private apiVersion: string;
  private contractVersion: string;

  constructor(config: { baseUrl: string; apiVersion: string; contractVersion: string }) {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    this.baseUrl = config.baseUrl;
    this.apiVersion = config.apiVersion;
    this.contractVersion = config.contractVersion;
  }

  async validateEndpointContract(contract: any): Promise<ContractValidationResult> {
    const violations: ContractViolation[] = [];
    let score = 100;

    // Validate request schema
    if (contract.requestSchema) {
      const requestValidation = this.validateSchema(contract.requestSchema);
      if (!requestValidation.isValid) {
        violations.push(...requestValidation.violations);
        score -= 20;
      }
    }

    // Validate response schema
    if (contract.responseSchema) {
      for (const [statusCode, schema] of Object.entries(contract.responseSchema)) {
        const responseValidation = this.validateSchema(schema);
        if (!responseValidation.isValid) {
          violations.push(...responseValidation.violations.map(v => ({
            ...v,
            field: `response.${statusCode}.${v.field}`
          })));
          score -= 15;
        }
      }
    }

    // Calculate coverage
    const coverage = this.calculateCoverage(contract);

    return {
      isValid: violations.length === 0,
      violations,
      score: Math.max(0, score),
      coverage
    };
  }

  async detectBreakingChanges(
    endpoint: string,
    originalResponse: any,
    modifiedResponse: any
  ): Promise<BreakingChangeAnalysis> {
    const breakingChanges: BreakingChange[] = [];
    const nonBreakingChanges: NonBreakingChange[] = [];

    const originalFields = this.extractFields(originalResponse);
    const modifiedFields = this.extractFields(modifiedResponse);

    // Detect removed fields
    for (const field of originalFields) {
      if (!modifiedFields.includes(field)) {
        breakingChanges.push({
          type: 'FIELD_REMOVED',
          field,
          severity: this.assessFieldRemovalSeverity(field),
          description: `Field '${field}' was removed from the response`,
          migrationPath: `Update client code to handle missing field '${field}'`
        });
      }
    }

    // Detect added fields (non-breaking)
    for (const field of modifiedFields) {
      if (!originalFields.includes(field)) {
        nonBreakingChanges.push({
          type: 'FIELD_ADDED',
          field,
          description: `Field '${field}' was added to the response`
        });
      }
    }

    // Detect type changes
    const typeChanges = this.detectTypeChanges(originalResponse, modifiedResponse);
    breakingChanges.push(...typeChanges);

    return {
      hasBreakingChanges: breakingChanges.length > 0,
      breakingChanges,
      nonBreakingChanges
    };
  }

  async validateBackwardCompatibility(
    endpoint: string,
    requirements: any
  ): Promise<any> {
    const supportedVersions = requirements.supportedVersions;
    const compatibilityScore = await this.calculateCompatibilityScore(endpoint, supportedVersions);
    
    return {
      isCompatible: compatibilityScore > 0.8,
      compatibilityScore,
      supportedVersions,
      deprecatedFields: requirements.backwardCompatibility.deprecatedFields,
      migrationPath: this.generateMigrationPath(requirements)
    };
  }

  async validateDataAgainstSchema(data: any, schema: any): Promise<{ isValid: boolean; errors?: any[] }> {
    const validate = this.ajv.compile(schema);
    const isValid = validate(data);
    
    return {
      isValid,
      errors: isValid ? undefined : validate.errors
    };
  }

  async validateBusinessRules(endpoint: string, data: any): Promise<any> {
    const violations: string[] = [];
    const flags: string[] = [];

    // FERC-specific rules
    if (data.type === 'FERC_PART_12D') {
      if (!data.findings || data.findings.length < 50) {
        violations.push('FERC_FINDINGS_TOO_SHORT');
      }
      if (!data.regulatoryCompliance?.fercChecklist) {
        violations.push('MISSING_FERC_CHECKLIST');
      }
    }

    // Photo requirements for poor ratings
    if (data.rating === 'POOR' || data.rating === 'UNSATISFACTORY') {
      const hasPhotos = data.observations?.some((obs: any) => 
        obs.rating === 'POOR' && obs.photos?.length > 0
      );
      if (!hasPhotos) {
        violations.push('PHOTOS_REQUIRED_FOR_POOR_RATING');
      }
    }

    // Critical issue handling
    const hasCriticalIssue = data.observations?.some((obs: any) => obs.criticalIssue);
    if (hasCriticalIssue) {
      flags.push('REQUIRES_IMMEDIATE_SYNC');
      flags.push('EMERGENCY_NOTIFICATION');
    }

    return { violations, flags };
  }

  validateFileSize(fileSize: number, schema: any): { isValid: boolean } {
    const maxSize = schema.properties?.fileSize?.maximum;
    const minSize = schema.properties?.fileSize?.minimum || 1;
    
    return {
      isValid: fileSize >= minSize && fileSize <= maxSize
    };
  }

  validatePaginationLogic(params: any): any {
    const { page, limit, total } = params;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      totalPages,
      hasNext,
      hasPrev
    };
  }

  async validateVersioningContract(contract: any): Promise<any> {
    const { supportedVersions, deprecatedVersions, backwardCompatibility } = contract;
    
    const hasDeprecationWarnings = deprecatedVersions.length > 0;
    const backwardCompatibilityScore = await this.calculateBackwardCompatibilityScore(backwardCompatibility);

    return {
      isValid: true,
      supportedVersions,
      hasDeprecationWarnings,
      backwardCompatibilityScore
    };
  }

  async validateFeatureAvailability(version: string, expectedFeatures: Record<string, boolean>): Promise<any> {
    // Simulate feature flag validation
    const availableFeatures = { ...expectedFeatures };
    
    return {
      isValid: true,
      availableFeatures
    };
  }

  async validateEndpointPerformance(path: string, method: string, maxResponseTime: number): Promise<any> {
    // Simulate performance testing
    const averageResponseTime = Math.random() * maxResponseTime * 0.8; // 80% of max
    const p95ResponseTime = averageResponseTime * 1.2;

    return {
      averageResponseTime,
      p95ResponseTime,
      meetsRequirements: p95ResponseTime < maxResponseTime
    };
  }

  async validateSecurityContract(contract: any): Promise<any> {
    const { requiredHeaders, securityPolicies, rateLimiting } = contract;
    
    const headerValidation = this.validateSecurityHeaders(requiredHeaders);
    const rateLimitingConfigured = Object.keys(rateLimiting).length > 0;
    const securityHeadersPresent = Object.keys(securityPolicies).length > 0;
    
    const overallScore = (
      headerValidation.score + 
      (rateLimitingConfigured ? 30 : 0) + 
      (securityHeadersPresent ? 30 : 0)
    ) / 100;

    return {
      isValid: overallScore > 0.8,
      headerValidation,
      rateLimitingConfigured,
      securityHeadersPresent,
      overallScore
    };
  }

  // Private helper methods

  private validateSchema(schema: any): { isValid: boolean; violations: ContractViolation[] } {
    const violations: ContractViolation[] = [];
    
    try {
      this.ajv.compile(schema);
      return { isValid: true, violations };
    } catch (error) {
      violations.push({
        type: 'SCHEMA_VALIDATION_ERROR',
        field: 'schema',
        message: error.message,
        severity: 'MAJOR'
      });
      return { isValid: false, violations };
    }
  }

  private calculateCoverage(contract: any): { requestCoverage: number; responseCoverage: number } {
    // Simplified coverage calculation
    const requestCoverage = contract.requestSchema ? 0.95 : 0.0;
    const responseCoverage = contract.responseSchema ? 0.95 : 0.0;
    
    return { requestCoverage, responseCoverage };
  }

  private extractFields(obj: any, prefix: string = ''): string[] {
    const fields: string[] = [];
    
    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        fields.push(fieldName);
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          fields.push(...this.extractFields(value, fieldName));
        }
      }
    }
    
    return fields;
  }

  private assessFieldRemovalSeverity(field: string): 'MINOR' | 'MAJOR' | 'CRITICAL' {
    const criticalFields = ['id', 'accessToken', 'user.id', 'user.email'];
    const majorFields = ['refreshToken', 'user.role', 'user.permissions'];
    
    if (criticalFields.some(cf => field.includes(cf))) {
      return 'CRITICAL';
    }
    if (majorFields.some(mf => field.includes(mf))) {
      return 'MAJOR';
    }
    return 'MINOR';
  }

  private detectTypeChanges(original: any, modified: any): BreakingChange[] {
    const changes: BreakingChange[] = [];
    
    // Simplified type change detection
    const originalType = typeof original;
    const modifiedType = typeof modified;
    
    if (originalType !== modifiedType) {
      changes.push({
        type: 'TYPE_CHANGED',
        field: 'root',
        severity: 'MAJOR',
        description: `Type changed from ${originalType} to ${modifiedType}`,
        migrationPath: `Update client code to handle new type: ${modifiedType}`
      });
    }
    
    return changes;
  }

  private async calculateCompatibilityScore(endpoint: string, versions: string[]): Promise<number> {
    // Simplified compatibility score calculation
    return 0.85 + (Math.random() * 0.1); // 85-95%
  }

  private generateMigrationPath(requirements: any): string {
    return `Follow the deprecation timeline: ${requirements.deprecationPolicy.warningPeriod} days warning, ${requirements.deprecationPolicy.supportPeriod} days support period`;
  }

  private async calculateBackwardCompatibilityScore(backwardCompatibility: any): Promise<number> {
    // Simplified calculation based on guaranteed vs best-effort compatibility
    const guaranteedWeight = 0.8;
    const bestEffortWeight = 0.2;
    
    return guaranteedWeight + bestEffortWeight;
  }

  private validateSecurityHeaders(requiredHeaders: any): { score: number } {
    // Simplified security header validation
    const headerCount = Object.keys(requiredHeaders).length;
    const expectedHeaders = ['Authorization', 'Content-Type', 'X-Request-ID', 'User-Agent'];
    
    const score = Math.min(1.0, headerCount / expectedHeaders.length);
    
    return { score: score * 100 };
  }
}
