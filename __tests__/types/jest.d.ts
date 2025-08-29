/**
 * Jest type declarations for test files
 */

declare global {
  const describe: jest.Describe;
  const test: jest.It;
  const it: jest.It;
  const expect: jest.Expect;
  const beforeEach: jest.Lifecycle;
  const afterEach: jest.Lifecycle;
  const beforeAll: jest.Lifecycle;
  const afterAll: jest.Lifecycle;
  
  namespace jest {
    interface Matchers<R> {
      toHaveValidRating(): R;
      toBeCriticalInspection(): R;
      toBeWithinNormalRange(sensor: any): R;
      toBeNearLocation(location: any, maxDistance?: number): R;
      toHaveRequiredPhotoMetadata(): R;
      toHaveValidationError(expectedError: string): R;
      toHaveCorrectPriority(expectedPriority: string): R;
      toHaveSyncStatus(expectedStatus: string): R;
      toBeSuccessfulApiResponse(): R;
      toHaveApiError(expectedError: string): R;
      toMeetFERCRequirements(): R;
      toHavePermission(action: string): R;
      toBeHighHazardDam(): R;
      toRequireConfirmation(): R;
      toBeQueuedForImmediateSync(): R;
    }
  }
}

export {};
