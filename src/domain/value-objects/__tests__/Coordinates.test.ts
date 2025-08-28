/**
 * Coordinates Value Object Unit Tests
 * Tests validation and distance calculations
 */

import { Coordinates } from '../Coordinates';

describe('Coordinates Value Object', () => {
  describe('Construction and Validation', () => {
    it('should create valid coordinates', () => {
      const coords = new Coordinates(37.7749, -122.4194);
      expect(coords.latitude).toBe(37.7749);
      expect(coords.longitude).toBe(-122.4194);
    });

    it('should throw error for invalid latitude (too high)', () => {
      expect(() => {
        new Coordinates(91, -122.4194);
      }).toThrow('Latitude must be between -90 and 90 degrees');
    });

    it('should throw error for invalid latitude (too low)', () => {
      expect(() => {
        new Coordinates(-91, -122.4194);
      }).toThrow('Latitude must be between -90 and 90 degrees');
    });

    it('should throw error for invalid longitude (too high)', () => {
      expect(() => {
        new Coordinates(37.7749, 181);
      }).toThrow('Longitude must be between -180 and 180 degrees');
    });

    it('should throw error for invalid longitude (too low)', () => {
      expect(() => {
        new Coordinates(37.7749, -181);
      }).toThrow('Longitude must be between -180 and 180 degrees');
    });

    it('should accept boundary values', () => {
      expect(() => new Coordinates(90, 180)).not.toThrow();
      expect(() => new Coordinates(-90, -180)).not.toThrow();
    });
  });

  describe('Distance Calculations', () => {
    it('should calculate distance between San Francisco and Los Angeles correctly', () => {
      const sanFrancisco = new Coordinates(37.7749, -122.4194);
      const losAngeles = new Coordinates(34.0522, -118.2437);
      
      const distance = sanFrancisco.distanceTo(losAngeles);
      
      // Distance should be approximately 559 km
      expect(distance).toBeGreaterThan(550);
      expect(distance).toBeLessThan(570);
    });

    it('should return 0 distance for same coordinates', () => {
      const coords1 = new Coordinates(37.7749, -122.4194);
      const coords2 = new Coordinates(37.7749, -122.4194);
      
      const distance = coords1.distanceTo(coords2);
      expect(distance).toBeCloseTo(0, 1);
    });

    it('should calculate distance to nearby location correctly', () => {
      const coords1 = new Coordinates(37.7749, -122.4194);
      const coords2 = new Coordinates(37.7849, -122.4094); // ~1.5 km away
      
      const distance = coords1.distanceTo(coords2);
      expect(distance).toBeGreaterThan(1);
      expect(distance).toBeLessThan(2);
    });
  });

  describe('Radius Checking', () => {
    it('should detect coordinates within radius', () => {
      const center = new Coordinates(37.7749, -122.4194);
      const nearby = new Coordinates(37.7849, -122.4094); // ~1.5 km away
      
      expect(nearby.isWithinRadius(center, 2)).toBe(true);
      expect(nearby.isWithinRadius(center, 1)).toBe(false);
    });

    it('should handle exact radius boundary', () => {
      const center = new Coordinates(37.7749, -122.4194);
      const point = new Coordinates(37.7849, -122.4094);
      
      const exactDistance = point.distanceTo(center);
      expect(point.isWithinRadius(center, exactDistance)).toBe(true);
      expect(point.isWithinRadius(center, exactDistance - 0.001)).toBe(false);
    });
  });

  describe('String Formatting', () => {
    it('should format coordinates correctly', () => {
      const coords = new Coordinates(37.774929, -122.419416);
      const formatted = coords.toString();
      
      expect(formatted).toBe('37.774929, -122.419416');
    });

    it('should format with 6 decimal places', () => {
      const coords = new Coordinates(37.1, -122.1);
      const formatted = coords.toString();
      
      expect(formatted).toBe('37.100000, -122.100000');
    });
  });

  describe('Equality', () => {
    it('should detect equal coordinates', () => {
      const coords1 = new Coordinates(37.7749, -122.4194);
      const coords2 = new Coordinates(37.7749, -122.4194);
      
      expect(coords1.equals(coords2)).toBe(true);
    });

    it('should detect different coordinates', () => {
      const coords1 = new Coordinates(37.7749, -122.4194);
      const coords2 = new Coordinates(37.7750, -122.4194);
      
      expect(coords1.equals(coords2)).toBe(false);
    });

    it('should handle small floating point differences', () => {
      const coords1 = new Coordinates(37.7749, -122.4194);
      const coords2 = new Coordinates(37.7749 + 0.0000001, -122.4194);
      
      expect(coords1.equals(coords2)).toBe(true); // Within tolerance
    });
  });

  describe('Serialization', () => {
    it('should convert to plain object correctly', () => {
      const coords = new Coordinates(37.7749, -122.4194);
      const plainObject = coords.toPlainObject();
      
      expect(plainObject).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    });

    it('should create from plain object correctly', () => {
      const plainObject = { latitude: 37.7749, longitude: -122.4194 };
      const coords = Coordinates.fromPlainObject(plainObject);
      
      expect(coords.latitude).toBe(37.7749);
      expect(coords.longitude).toBe(-122.4194);
    });

    it('should round-trip serialize correctly', () => {
      const original = new Coordinates(37.7749, -122.4194);
      const plainObject = original.toPlainObject();
      const restored = Coordinates.fromPlainObject(plainObject);
      
      expect(original.equals(restored)).toBe(true);
    });
  });
});