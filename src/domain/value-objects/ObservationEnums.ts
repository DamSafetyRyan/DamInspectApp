/**
 * Observation-related enumerations
 * Type-safe enums for observation properties
 */

export enum ObservationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ObservationStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

/**
 * Convert string to ObservationSeverity enum
 */
export function toObservationSeverity(value: string): ObservationSeverity {
  const lowerValue = value.toLowerCase();
  switch (lowerValue) {
    case 'low':
      return ObservationSeverity.LOW;
    case 'medium':
      return ObservationSeverity.MEDIUM;
    case 'high':
      return ObservationSeverity.HIGH;
    case 'critical':
      return ObservationSeverity.CRITICAL;
    default:
      return ObservationSeverity.LOW;
  }
}

/**
 * Convert string to ObservationStatus enum
 */
export function toObservationStatus(value: string): ObservationStatus {
  const lowerValue = value.toLowerCase();
  switch (lowerValue) {
    case 'open':
      return ObservationStatus.OPEN;
    case 'in_progress':
      return ObservationStatus.IN_PROGRESS;
    case 'resolved':
      return ObservationStatus.RESOLVED;
    case 'closed':
      return ObservationStatus.CLOSED;
    default:
      return ObservationStatus.OPEN;
  }
}

/**
 * Get color for observation severity
 */
export function getSeverityColor(severity: ObservationSeverity): string {
  switch (severity) {
    case ObservationSeverity.LOW:
      return '#059669'; // Green
    case ObservationSeverity.MEDIUM:
      return '#D97706'; // Orange
    case ObservationSeverity.HIGH:
      return '#EA580C'; // Red-Orange
    case ObservationSeverity.CRITICAL:
      return '#DC2626'; // Red
    default:
      return '#6B7280'; // Gray
  }
}