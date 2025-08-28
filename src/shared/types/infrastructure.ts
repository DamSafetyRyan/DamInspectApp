export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Dam {
  id: string;
  nidId?: string;
  name: string;
  type: 'Concrete' | 'Earthen' | 'Other';
  ownerName?: string;
  yearCompleted?: number;
  height?: number; // in feet
  storage?: number; // acre-feet
  primaryPurpose?: string;
  hazardLevel?: 'LOW' | 'SIGNIFICANT' | 'HIGH';
  conditionAssessment?: 'POOR' | 'FAIR' | 'SATISFACTORY' | 'NOT_RATED';
  hasEAP?: boolean; // Emergency Action Plan
  lastInspectionDate?: string;
  coordinates: Coordinates;
  county?: string;
  river?: string;
  inspectionFrequency?: number; // months
  allPurposes?: string;
}

export interface Asset {
  id: string;
  damId: string;
  name: string;
  type: 'spillway' | 'outlet' | 'gate' | 'valve' | 'structure' | 'other';
  description?: string;
  coordinates: Coordinates;
  status: 'operational' | 'maintenance_required' | 'out_of_service';
  lastInspected?: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface Instrument {
  id: string;
  damId: string;
  assetId?: string;
  name: string;
  type: 'piezometer' | 'inclinometer' | 'strain_gauge' | 'settlement_plate' | 'other';
  coordinates: Coordinates;
  installationDate?: string;
  lastReading?: string;
  status: 'active' | 'inactive' | 'maintenance_required';
  readings?: InstrumentReading[];
}

export interface InstrumentReading {
  id: string;
  instrumentId: string;
  value: number;
  unit: string;
  timestamp: string;
  recordedBy?: string;
}

export interface Observation {
  id: string;
  damId?: string;
  assetId?: string;
  instrumentId?: string;
  type: string; // From inspection categories
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  coordinates: Coordinates;
  photos?: string[]; // URLs or file paths
  recordedBy: string;
  recordedAt: string;
  inspectionId?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  notes?: string;
}

export interface Inspection {
  id: string;
  damId: string;
  type: 'ROUTINE' | 'FERC_PART_12D' | 'USACE_PERIODIC' | 'DSOD' | 'POST_EARTHQUAKE' | 'POST_FLOOD' | 'CUSTOM';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  assignedTo: string;
  purpose?: string;
  scope?: string;
  observations: Observation[];
  summary?: string;
  recommendations?: string;
  nextInspectionDate?: string;
}

// Geospatial query parameters
export interface NearbySearchParams {
  centerCoordinates: Coordinates;
  radiusKm: number;
  types?: ('dam' | 'asset' | 'instrument' | 'observation')[];
  limit?: number;
}

export interface NearbySearchResult {
  dams: Dam[];
  assets: Asset[];
  instruments: Instrument[];
  observations: Observation[];
}