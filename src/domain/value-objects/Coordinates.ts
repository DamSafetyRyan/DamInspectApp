/**
 * Coordinates Value Object
 * Immutable value object representing geographic coordinates with validation
 */

export class Coordinates {
  constructor(
    public readonly latitude: number,
    public readonly longitude: number
  ) {
    this.validateCoordinates();
  }

  /**
   * Validate coordinate values
   */
  private validateCoordinates(): void {
    if (this.latitude < -90 || this.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    if (this.longitude < -180 || this.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }
  }

  /**
   * Calculate distance to another coordinate in kilometers using Haversine formula
   */
  distanceTo(other: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(other.latitude - this.latitude);
    const dLon = this.toRadians(other.longitude - this.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(this.latitude)) * Math.cos(this.toRadians(other.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if coordinates are within a given radius of another point
   */
  isWithinRadius(center: Coordinates, radiusKm: number): boolean {
    return this.distanceTo(center) <= radiusKm;
  }

  /**
   * Format coordinates for display
   */
  toString(): string {
    return `${this.latitude.toFixed(6)}, ${this.longitude.toFixed(6)}`;
  }

  /**
   * Check equality with another Coordinates object
   */
  equals(other: Coordinates): boolean {
    return Math.abs(this.latitude - other.latitude) < 0.000001 &&
           Math.abs(this.longitude - other.longitude) < 0.000001;
  }

  /**
   * Convert to plain object for serialization
   */
  toPlainObject() {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }

  /**
   * Create from plain object
   */
  static fromPlainObject(obj: { latitude: number; longitude: number }): Coordinates {
    return new Coordinates(obj.latitude, obj.longitude);
  }
}