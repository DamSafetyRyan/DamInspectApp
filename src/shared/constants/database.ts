/**
 * Database and external service configuration constants
 */

// Backend API configuration
export const API_CONFIG = {
  BASE_URL: "https://your-backend-api.com/api",
  TIMEOUT: 30000, // 30 seconds
  // Note: In production, the backend API would handle PostgreSQL connections
  // Connection string: postgresql://damsafety:Nibbles123@damsafety-db.postgres.database.azure.com:5432/inspection?sslmode=require
} as const;

export const MAPBOX_CONFIG = {
  API_KEY: "pk.eyJ1IjoicmdpYmVhdWx0IiwiYSI6ImNtMmRzNW0wdTFkbDQyaXB5ZXhtZGIwYjEifQ.hnCCexBkqrDUuQC_braCrQ",
  STYLE_URL: "mapbox://styles/mapbox/satellite-v9",
  DEFAULT_ZOOM: 15.5, // Shows approximately 1000 foot radius (17.5 was 250ft, so ~15.5 for 1000ft)
} as const;