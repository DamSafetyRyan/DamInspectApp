/**
 * Dam-related enumerations
 * Type-safe enums for dam properties
 */

export enum DamType {
  CONCRETE = 'Concrete',
  EARTHEN = 'Earthen',
  ROCKFILL = 'Rockfill',
  MASONRY = 'Masonry',
  COMPOSITE = 'Composite',
  OTHER = 'Other'
}

export enum HazardLevel {
  LOW = 'LOW',
  SIGNIFICANT = 'SIGNIFICANT', 
  HIGH = 'HIGH'
}

export enum ConditionAssessment {
  SATISFACTORY = 'SATISFACTORY',
  FAIR = 'FAIR',
  POOR = 'POOR',
  UNSATISFACTORY = 'UNSATISFACTORY',
  NOT_RATED = 'NOT_RATED'
}

/**
 * Convert string to DamType enum
 */
export function toDamType(value: string): DamType {
  const upperValue = value.toUpperCase();
  switch (upperValue) {
    case 'CONCRETE':
      return DamType.CONCRETE;
    case 'EARTHEN':
      return DamType.EARTHEN;
    case 'ROCKFILL':
      return DamType.ROCKFILL;
    case 'MASONRY':
      return DamType.MASONRY;
    case 'COMPOSITE':
      return DamType.COMPOSITE;
    default:
      return DamType.OTHER;
  }
}

/**
 * Convert string to HazardLevel enum
 */
export function toHazardLevel(value: string): HazardLevel {
  const upperValue = value.toUpperCase();
  switch (upperValue) {
    case 'LOW':
      return HazardLevel.LOW;
    case 'SIGNIFICANT':
      return HazardLevel.SIGNIFICANT;
    case 'HIGH':
      return HazardLevel.HIGH;
    default:
      return HazardLevel.LOW;
  }
}

/**
 * Convert string to ConditionAssessment enum
 */
export function toConditionAssessment(value: string): ConditionAssessment {
  const upperValue = value.toUpperCase();
  switch (upperValue) {
    case 'SATISFACTORY':
      return ConditionAssessment.SATISFACTORY;
    case 'FAIR':
      return ConditionAssessment.FAIR;
    case 'POOR':
      return ConditionAssessment.POOR;
    case 'UNSATISFACTORY':
      return ConditionAssessment.UNSATISFACTORY;
    default:
      return ConditionAssessment.NOT_RATED;
  }
}