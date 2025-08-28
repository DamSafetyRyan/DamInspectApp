# 08 – CI/CD & Infrastructure

## Backend
* **GitHub Actions** workflow `backend.yml`:
  * On push to `main` or PR.
  * Steps: `npm ci` → `npm test` → `prisma migrate deploy` (shadow DB) → build → deploy to Azure Web App via Oryx.
  * Secrets: `AZURE_CREDENTIALS`, `DATABASE_URL`.

## iOS
* **Xcode Cloud**:
  * Branch trigger: `ios/**`.
  * Jobs: Build → Unit Tests (simulator) → Upload dSYM → TestFlight.
  * Environment variables: `API_BASE_URL_PROD`, `API_BASE_URL_STAGING`.

## Infrastructure as Code
* Terraform module `iac/inspections` provisions:
  * S3 bucket + IAM policy.
  * Cognito (if we move off B2C in future).
  * CloudWatch alarms for error rate.

## Database Migrations
* Convention: timestamped folder `prisma/migrations/YYYYMMDDHHMM-domain-inspections`.
* `postDeploy` script runs smoke tests + seeds. 