/**
 * Global Jest setup for DamInspect app tests
 * Configures testing environment and global utilities
 */

// Import testing utilities
import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Make Jest globals available
global.describe = describe;
global.test = test;
global.it = it;
global.expect = expect;
global.beforeEach = beforeEach;
global.afterEach = afterEach;
global.beforeAll = beforeAll;
global.afterAll = afterAll;
global.jest = jest;

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock React Native permissions
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
    },
    ANDROID: {
      CAMERA: 'android.permission.CAMERA',
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
  },
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve('granted')),
}));

// Mock React Native device info
jest.mock('react-native-device-info', () => ({
  getModel: jest.fn(() => 'iPhone 16 Pro'),
  getSystemVersion: jest.fn(() => '17.0'),
  getBatteryLevel: jest.fn(() => Promise.resolve(0.85)),
  isEmulator: jest.fn(() => Promise.resolve(true)),
  getUniqueId: jest.fn(() => 'test-device-id'),
  getApplicationName: jest.fn(() => 'DamInspect'),
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '5'),
}));

// Mock NetInfo for network status
jest.mock('@react-native-netinfo/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock Mapbox GL
jest.mock('@react-native-mapbox-gl/maps', () => ({
  MapView: 'MapView',
  Camera: 'Camera',
  UserLocation: 'UserLocation',
  SymbolLayer: 'SymbolLayer',
  ShapeSource: 'ShapeSource',
  Images: 'Images',
  setAccessToken: jest.fn(),
  requestAndroidLocationPermissions: jest.fn(() => Promise.resolve(true)),
}));

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn((options, callback) => {
    callback({
      assets: [{
        uri: 'file://test-photo.jpg',
        fileName: 'test-photo.jpg',
        fileSize: 1024000,
        type: 'image/jpeg',
        width: 1920,
        height: 1080,
      }]
    });
  }),
  MediaType: {
    photo: 'photo',
    video: 'video',
  },
}));

// Mock react-native-fs for file operations
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/test/documents',
  CachesDirectoryPath: '/test/cache',
  writeFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('file content')),
  exists: jest.fn(() => Promise.resolve(true)),
  unlink: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  stat: jest.fn(() => Promise.resolve({ size: 1024 })),
}));

// Mock Keychain for secure storage
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(() => Promise.resolve()),
  getInternetCredentials: jest.fn(() => Promise.resolve({
    username: 'test@example.com',
    password: 'secure-token',
  })),
  resetInternetCredentials: jest.fn(() => Promise.resolve()),
}));

// Mock SQLite for offline storage
jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((callback) => {
      callback({
        executeSql: jest.fn((sql, params, success) => {
          if (success) success([], { rows: { length: 0, item: () => ({}) } });
        }),
      });
    }),
    close: jest.fn(() => Promise.resolve()),
  })),
  enablePromise: jest.fn(),
  DEBUG: jest.fn(),
}));

// Mock Geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn((success) => {
    success({
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        altitude: 10,
        altitudeAccuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    });
  }),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
};

global.navigator.geolocation = mockGeolocation;

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Map(),
  })
);

// Mock FormData for file uploads
global.FormData = class MockFormData {
  constructor() {
    this.data = new Map();
  }
  
  append(key, value) {
    this.data.set(key, value);
  }
  
  get(key) {
    return this.data.get(key);
  }
  
  has(key) {
    return this.data.has(key);
  }
};

// Mock Blob for file handling
global.Blob = class MockBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.type = options?.type || '';
    this.size = parts.reduce((size, part) => size + part.length, 0);
  }
  
  stream() {
    return new ReadableStream();
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }
};

// Mock WebSocket for real-time updates
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
  
  send(data) {
    // Mock sending data
  }
  
  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose();
  }
};

// Global test utilities
global.testUtils = {
  // Wait for async operations
  waitFor: async (condition, timeout = 5000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },
  
  // Create mock GPS coordinates
  createMockLocation: (overrides = {}) => ({
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 10,
    ...overrides
  }),
  
  // Create mock date
  createMockDate: (daysOffset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date;
  },
  
  // Mock timer utilities
  advanceTimersByTime: (ms) => {
    jest.advanceTimersByTime(ms);
  },
  
  // Mock network conditions
  simulateOffline: () => {
    global.fetch.mockRejectedValueOnce(new Error('Network request failed'));
  },
  
  simulateSlowNetwork: (delay = 2000) => {
    global.fetch.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      }), delay))
    );
  }
};

// Console override for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  // Suppress known React Native warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
     args[0].includes('Warning: componentWillMount') ||
     args[0].includes('Animated: `useNativeDriver`'))
  ) {
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args) => {
  // Suppress known warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: componentWillReceiveProps') ||
     args[0].includes('source.uri should not be an empty string'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Error boundary for tests
class TestErrorBoundary extends Error {
  constructor(message) {
    super(message);
    this.name = 'TestErrorBoundary';
  }
}

global.TestErrorBoundary = TestErrorBoundary;

// Performance monitoring for tests
const performanceObserver = {
  marks: new Map(),
  measures: new Map(),
  
  mark: (name) => {
    performanceObserver.marks.set(name, Date.now());
  },
  
  measure: (name, startMark, endMark) => {
    const start = performanceObserver.marks.get(startMark);
    const end = performanceObserver.marks.get(endMark);
    if (start && end) {
      performanceObserver.measures.set(name, end - start);
    }
  },
  
  getEntriesByType: (type) => {
    if (type === 'measure') {
      return Array.from(performanceObserver.measures.entries()).map(([name, duration]) => ({
        name,
        duration
      }));
    }
    return [];
  }
};

global.performance = {
  ...global.performance,
  ...performanceObserver,
  now: () => Date.now()
};

// Test data cleanup
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
  
  // Clear async storage
  mockAsyncStorage.clear();
  
  // Reset fetch mock
  if (global.fetch.mockClear) {
    global.fetch.mockClear();
  }
  
  // Clear performance data
  performanceObserver.marks.clear();
  performanceObserver.measures.clear();
  
  // Clear timers
  jest.clearAllTimers();
});

// Global test setup
beforeAll(() => {
  // Use fake timers for consistent testing
  jest.useFakeTimers();
});

afterAll(() => {
  // Restore real timers
  jest.useRealTimers();
  
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
});
