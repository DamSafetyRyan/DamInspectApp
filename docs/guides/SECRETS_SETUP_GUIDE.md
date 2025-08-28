# DamInspect Secrets Configuration Guide

## Overview

This guide explains how to set up configuration secrets for the DamInspect mobile application. We'll cover development environment setup, production secrets management, and CI/CD pipeline configuration.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Environment Variables](#environment-variables)
3. [GitHub Secrets Configuration](#github-secrets-configuration)
4. [Production Secrets Management](#production-secrets-management)
5. [Mobile App Configuration](#mobile-app-configuration)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

## Development Environment Setup

### 1. Create Environment Files

Create these files in your project root (they should be in `.gitignore`):

```bash
# Create environment files
touch .env.development
touch .env.staging
touch .env.production
touch .env.local
```

### 2. Development Environment Variables (.env.development)

```bash
# API Configuration
DAMINSPECT_API_URL=https://api-dev.daminspect.com
DAMINSPECT_API_KEY=dev_api_key_here
DAMINSPECT_API_VERSION=v1

# Database Configuration
DATABASE_ENCRYPTION_KEY=your-dev-encryption-key-64-chars-long-change-this
REALM_SYNC_URL=https://realm-dev.daminspect.com

# Authentication
AUTH_DOMAIN=dev-daminspect.auth0.com
AUTH_CLIENT_ID=your-auth0-dev-client-id
AUTH_CLIENT_SECRET=your-auth0-dev-client-secret

# AWS Services (Development)
AWS_ACCESS_KEY_ID=your-dev-aws-access-key
AWS_SECRET_ACCESS_KEY=your-dev-aws-secret-key
AWS_REGION=us-west-2
AWS_S3_BUCKET=daminspect-dev-media

# Monitoring & Analytics
SENTRY_DSN=https://your-sentry-dsn-for-dev
MIXPANEL_TOKEN=your-dev-mixpanel-token
CRASHLYTICS_API_KEY=your-dev-crashlytics-key

# Feature Flags
FEATURE_OFFLINE_SYNC=true
FEATURE_VOICE_TO_TEXT=false
FEATURE_AI_DEFECT_DETECTION=false

# Logging
LOG_LEVEL=debug
LOG_TO_FILE=true

# Sync Configuration
SYNC_INTERVAL_MS=300000
OFFLINE_RETENTION_DAYS=30
MAX_RETRY_ATTEMPTS=3

# Security
BIOMETRIC_AUTH_REQUIRED=false
SESSION_TIMEOUT_MINUTES=60
```

### 3. Production Environment Variables (.env.production)

```bash
# API Configuration
DAMINSPECT_API_URL=https://api.daminspect.com
DAMINSPECT_API_KEY=prod_api_key_here
DAMINSPECT_API_VERSION=v1

# Database Configuration
DATABASE_ENCRYPTION_KEY=your-production-encryption-key-64-chars-long-secure
REALM_SYNC_URL=https://realm.daminspect.com

# Authentication
AUTH_DOMAIN=daminspect.auth0.com
AUTH_CLIENT_ID=your-auth0-prod-client-id
AUTH_CLIENT_SECRET=your-auth0-prod-client-secret

# AWS Services (Production)
AWS_ACCESS_KEY_ID=your-prod-aws-access-key
AWS_SECRET_ACCESS_KEY=your-prod-aws-secret-key
AWS_REGION=us-west-2
AWS_S3_BUCKET=daminspect-prod-media

# Monitoring & Analytics
SENTRY_DSN=https://your-sentry-dsn-for-prod
MIXPANEL_TOKEN=your-prod-mixpanel-token
CRASHLYTICS_API_KEY=your-prod-crashlytics-key

# Feature Flags
FEATURE_OFFLINE_SYNC=true
FEATURE_VOICE_TO_TEXT=true
FEATURE_AI_DEFECT_DETECTION=true

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true

# Sync Configuration
SYNC_INTERVAL_MS=180000
OFFLINE_RETENTION_DAYS=90
MAX_RETRY_ATTEMPTS=5

# Security
BIOMETRIC_AUTH_REQUIRED=true
SESSION_TIMEOUT_MINUTES=30
```

## Environment Variables

### 4. Create Environment Configuration Module

Create `src/config/environment.ts`:

```typescript
import Config from 'react-native-config';

export interface AppConfig {
  // API Configuration
  apiUrl: string;
  apiKey: string;
  apiVersion: string;
  
  // Database
  databaseEncryptionKey: string;
  realmSyncUrl: string;
  
  // Authentication
  authDomain: string;
  authClientId: string;
  authClientSecret: string;
  
  // AWS Services
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  awsS3Bucket: string;
  
  // Monitoring
  sentryDsn: string;
  mixpanelToken: string;
  crashlyticsApiKey: string;
  
  // Feature Flags
  featureOfflineSync: boolean;
  featureVoiceToText: boolean;
  featureAiDefectDetection: boolean;
  
  // Logging
  logLevel: string;
  logToFile: boolean;
  
  // Sync
  syncIntervalMs: number;
  offlineRetentionDays: number;
  maxRetryAttempts: number;
  
  // Security
  biometricAuthRequired: boolean;
  sessionTimeoutMinutes: number;
}

const parseBoolean = (value: string | undefined): boolean => {
  return value?.toLowerCase() === 'true';
};

const parseNumber = (value: string | undefined, defaultValue: number): number => {
  const parsed = parseInt(value || '', 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const config: AppConfig = {
  // API Configuration
  apiUrl: Config.DAMINSPECT_API_URL || 'https://api.daminspect.com',
  apiKey: Config.DAMINSPECT_API_KEY || '',
  apiVersion: Config.DAMINSPECT_API_VERSION || 'v1',
  
  // Database
  databaseEncryptionKey: Config.DATABASE_ENCRYPTION_KEY || '',
  realmSyncUrl: Config.REALM_SYNC_URL || '',
  
  // Authentication
  authDomain: Config.AUTH_DOMAIN || '',
  authClientId: Config.AUTH_CLIENT_ID || '',
  authClientSecret: Config.AUTH_CLIENT_SECRET || '',
  
  // AWS Services
  awsAccessKeyId: Config.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: Config.AWS_SECRET_ACCESS_KEY || '',
  awsRegion: Config.AWS_REGION || 'us-west-2',
  awsS3Bucket: Config.AWS_S3_BUCKET || '',
  
  // Monitoring
  sentryDsn: Config.SENTRY_DSN || '',
  mixpanelToken: Config.MIXPANEL_TOKEN || '',
  crashlyticsApiKey: Config.CRASHLYTICS_API_KEY || '',
  
  // Feature Flags
  featureOfflineSync: parseBoolean(Config.FEATURE_OFFLINE_SYNC),
  featureVoiceToText: parseBoolean(Config.FEATURE_VOICE_TO_TEXT),
  featureAiDefectDetection: parseBoolean(Config.FEATURE_AI_DEFECT_DETECTION),
  
  // Logging
  logLevel: Config.LOG_LEVEL || 'info',
  logToFile: parseBoolean(Config.LOG_TO_FILE),
  
  // Sync
  syncIntervalMs: parseNumber(Config.SYNC_INTERVAL_MS, 300000),
  offlineRetentionDays: parseNumber(Config.OFFLINE_RETENTION_DAYS, 30),
  maxRetryAttempts: parseNumber(Config.MAX_RETRY_ATTEMPTS, 3),
  
  // Security
  biometricAuthRequired: parseBoolean(Config.BIOMETRIC_AUTH_REQUIRED),
  sessionTimeoutMinutes: parseNumber(Config.SESSION_TIMEOUT_MINUTES, 60),
};

// Validate required configuration
export const validateConfig = (): void => {
  const requiredFields = [
    'apiUrl',
    'apiKey',
    'databaseEncryptionKey',
    'authDomain',
    'authClientId'
  ];
  
  const missingFields = requiredFields.filter(field => !config[field as keyof AppConfig]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required configuration: ${missingFields.join(', ')}`);
  }
};
```

## GitHub Secrets Configuration

### 5. Set Up GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and Variables → Actions

#### Repository Secrets (for CI/CD):

```bash
# API Configuration
DAMINSPECT_API_URL_DEV=https://api-dev.daminspect.com
DAMINSPECT_API_URL_PROD=https://api.daminspect.com
DAMINSPECT_API_KEY_DEV=your-dev-api-key
DAMINSPECT_API_KEY_PROD=your-prod-api-key

# Database
DATABASE_ENCRYPTION_KEY_DEV=your-dev-encryption-key
DATABASE_ENCRYPTION_KEY_PROD=your-prod-encryption-key

# Authentication
AUTH_DOMAIN_DEV=dev-daminspect.auth0.com
AUTH_DOMAIN_PROD=daminspect.auth0.com
AUTH_CLIENT_ID_DEV=your-auth0-dev-client-id
AUTH_CLIENT_ID_PROD=your-auth0-prod-client-id
AUTH_CLIENT_SECRET_DEV=your-auth0-dev-client-secret
AUTH_CLIENT_SECRET_PROD=your-auth0-prod-client-secret

# AWS Services
AWS_ACCESS_KEY_ID_DEV=your-dev-aws-access-key
AWS_ACCESS_KEY_ID_PROD=your-prod-aws-access-key
AWS_SECRET_ACCESS_KEY_DEV=your-dev-aws-secret-key
AWS_SECRET_ACCESS_KEY_PROD=your-prod-aws-secret-key

# App Store & Play Store
APPLE_ID=your-apple-id
APPLE_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=your-apple-team-id
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=your-google-play-service-account-json

# Code Signing
IOS_CERTIFICATE_P12=your-ios-certificate-base64
IOS_CERTIFICATE_PASSWORD=your-certificate-password
IOS_PROVISIONING_PROFILE=your-provisioning-profile-base64
ANDROID_KEYSTORE=your-android-keystore-base64
ANDROID_KEYSTORE_PASSWORD=your-keystore-password
ANDROID_KEY_ALIAS=your-key-alias
ANDROID_KEY_PASSWORD=your-key-password

# Monitoring
SENTRY_DSN_DEV=your-sentry-dsn-dev
SENTRY_DSN_PROD=your-sentry-dsn-prod
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

### 6. Update GitHub Actions Workflow

Update `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Create test environment file
      run: |
        echo "DAMINSPECT_API_URL=${{ secrets.DAMINSPECT_API_URL_DEV }}" > .env.test
        echo "DAMINSPECT_API_KEY=${{ secrets.DAMINSPECT_API_KEY_DEV }}" >> .env.test
        echo "DATABASE_ENCRYPTION_KEY=${{ secrets.DATABASE_ENCRYPTION_KEY_DEV }}" >> .env.test
    
    - name: Run tests
      run: npm test
      env:
        NODE_ENV: test
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  build-ios:
    needs: test
    runs-on: macos-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Create production environment file
      run: |
        echo "DAMINSPECT_API_URL=${{ secrets.DAMINSPECT_API_URL_PROD }}" > .env.production
        echo "DAMINSPECT_API_KEY=${{ secrets.DAMINSPECT_API_KEY_PROD }}" >> .env.production
        echo "DATABASE_ENCRYPTION_KEY=${{ secrets.DATABASE_ENCRYPTION_KEY_PROD }}" >> .env.production
        echo "AUTH_DOMAIN=${{ secrets.AUTH_DOMAIN_PROD }}" >> .env.production
        echo "AUTH_CLIENT_ID=${{ secrets.AUTH_CLIENT_ID_PROD }}" >> .env.production
    
    - name: Setup iOS certificates
      run: |
        echo "${{ secrets.IOS_CERTIFICATE_P12 }}" | base64 --decode > certificate.p12
        echo "${{ secrets.IOS_PROVISIONING_PROFILE }}" | base64 --decode > provisioning.mobileprovision
    
    - name: Build iOS app
      run: |
        cd ios
        xcodebuild -workspace DamInspect.xcworkspace -scheme DamInspect -configuration Release archive
```

## Production Secrets Management

### 7. AWS Secrets Manager Integration

For production, use AWS Secrets Manager for sensitive data:

```typescript
// src/services/SecretsManager.ts
import AWS from 'aws-sdk';
import { config } from '../config/environment';

export class SecretsManager {
  private secretsManager: AWS.SecretsManager;
  
  constructor() {
    this.secretsManager = new AWS.SecretsManager({
      region: config.awsRegion,
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    });
  }
  
  async getSecret(secretName: string): Promise<string> {
    try {
      const result = await this.secretsManager.getSecretValue({
        SecretId: secretName
      }).promise();
      
      return result.SecretString || '';
    } catch (error) {
      console.error(`Failed to retrieve secret ${secretName}:`, error);
      throw error;
    }
  }
  
  async getDatabaseCredentials(): Promise<{
    username: string;
    password: string;
    host: string;
  }> {
    const secretString = await this.getSecret('daminspect/database/credentials');
    return JSON.parse(secretString);
  }
  
  async getApiKeys(): Promise<{
    apiKey: string;
    apiSecret: string;
  }> {
    const secretString = await this.getSecret('daminspect/api/keys');
    return JSON.parse(secretString);
  }
}
```

### 8. Environment-Specific Configuration

Create `src/config/index.ts`:

```typescript
import { config as devConfig } from './environment.development';
import { config as prodConfig } from './environment.production';
import { config as testConfig } from './environment.test';

const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return prodConfig;
    case 'test':
      return testConfig;
    default:
      return devConfig;
  }
};

export const config = getConfig();
export { validateConfig } from './environment';
```

## Mobile App Configuration

### 9. React Native Config Setup

Install react-native-config:

```bash
npm install react-native-config
cd ios && pod install
```

### 10. iOS Configuration

Add to `ios/DamInspect/Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
  <key>NSExceptionDomains</key>
  <dict>
    <key>$(DAMINSPECT_API_URL)</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <false/>
      <key>NSExceptionMinimumTLSVersion</key>
      <string>TLSv1.2</string>
    </dict>
  </dict>
</dict>
```

### 11. Android Configuration

Add to `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        resValue "string", "build_config_package", "com.daminspect"
    }
}

apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"
```

## Security Best Practices

### 12. Encryption for Sensitive Data

```typescript
// src/utils/encryption.ts
import CryptoJS from 'crypto-js';
import { config } from '../config';

export class EncryptionService {
  private static readonly ALGORITHM = 'AES';
  
  static encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, config.databaseEncryptionKey).toString();
  }
  
  static decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, config.databaseEncryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
  
  static hashPassword(password: string): string {
    return CryptoJS.SHA256(password).toString();
  }
}
```

### 13. Runtime Configuration Validation

```typescript
// src/config/validator.ts
import { config } from './environment';

export class ConfigValidator {
  static validate(): void {
    const errors: string[] = [];
    
    // Required fields
    if (!config.apiUrl) errors.push('API_URL is required');
    if (!config.apiKey) errors.push('API_KEY is required');
    if (!config.databaseEncryptionKey) errors.push('DATABASE_ENCRYPTION_KEY is required');
    
    // Format validation
    if (config.apiUrl && !config.apiUrl.startsWith('https://')) {
      errors.push('API_URL must use HTTPS');
    }
    
    if (config.databaseEncryptionKey && config.databaseEncryptionKey.length < 32) {
      errors.push('DATABASE_ENCRYPTION_KEY must be at least 32 characters');
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }
}
```

## Troubleshooting

### Common Issues and Solutions

1. **Environment variables not loading**
   - Check file naming (`.env.development`, not `.env.dev`)
   - Verify react-native-config installation
   - Restart Metro bundler after changes

2. **iOS build failing with missing certificates**
   - Ensure certificates are base64 encoded in GitHub secrets
   - Check certificate expiration dates
   - Verify provisioning profile matches app identifier

3. **Android build failing with keystore issues**
   - Ensure keystore is base64 encoded
   - Check password and alias configuration
   - Verify keystore file integrity

4. **API calls failing in production**
   - Check network security configuration
   - Verify SSL/TLS certificates
   - Ensure production API endpoints are accessible

### Debug Commands

```bash
# Check environment variables
npx react-native-config

# Validate configuration
npm run validate-config

# Test API connectivity
npm run test:api

# Check certificate validity
openssl x509 -in certificate.pem -text -noout
```

## Next Steps

1. **Set up development environment**:
   - Copy `.env.development` template
   - Fill in your development values
   - Test local app launch

2. **Configure GitHub secrets**:
   - Add all required secrets to repository
   - Test CI/CD pipeline
   - Verify builds complete successfully

3. **Set up production environment**:
   - Configure AWS Secrets Manager
   - Set up production API endpoints
   - Configure monitoring and logging

4. **Security review**:
   - Audit all secret values
   - Implement key rotation
   - Set up security monitoring

For additional help, refer to the [Architecture Decisions](../architecture/ARCHITECTURE_DECISIONS.md) document or contact the development team. 