import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, PermissionsAndroid, Platform, ActivityIndicator } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import Geolocation from '@react-native-community/geolocation';
import { useAuth } from '../contexts/AuthContext';
import { MAPBOX_CONFIG } from '../../shared/constants/database';
import { Container } from '../../infrastructure/di/Container';
import { InspectionService } from '../../domain/services/InspectionService';
import { Dam } from '../../domain/entities/Dam';
import { Observation } from '../../domain/entities/Observation';
import { Coordinates } from '../../domain/value-objects/Coordinates';
import { getSeverityColor } from '../../domain/value-objects/ObservationEnums';
import { CreateObservationScreen } from './CreateObservationScreen';

// Set Mapbox access token
Mapbox.setAccessToken(MAPBOX_CONFIG.API_KEY);

interface UserLocation {
  latitude: number;
  longitude: number;
}

export function MapScreen() {
  const { state, logout } = useAuth();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [nearbyFeatures, setNearbyFeatures] = useState<{
    dams: Dam[];
    observations: Observation[];
  }>({ dams: [], observations: [] });

  // COMPREHENSIVE LIFECYCLE LOGGING
  useEffect(() => {
    console.log('🔄 MAPSCREEN MOUNTED at', new Date().toISOString());
    return () => {
      console.log('🔄 MAPSCREEN UNMOUNTING at', new Date().toISOString());
    };
  }, []);

  // Debug: Track nearbyFeatures changes
  useEffect(() => {
    console.log(`📊 NEARBY FEATURES STATE CHANGED at ${new Date().toISOString()}: ${nearbyFeatures.dams.length} dams, ${nearbyFeatures.observations.length} observations`);
    nearbyFeatures.dams.forEach((dam, index) => {
      console.log(`   Dam ${index + 1}: ${dam.name} at [${dam.coordinates.longitude}, ${dam.coordinates.latitude}]`);
    });
  }, [nearbyFeatures]);

  // Load nearby features when BOTH service AND location are ready
  useEffect(() => {
    if (inspectionService && userLocation) {
      console.log('🎯 BOTH service and location ready! Loading nearby features');
      const coordinates = new Coordinates(userLocation.latitude, userLocation.longitude);
      loadNearbyFeatures(coordinates);
    }
  }, [inspectionService, userLocation]);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [inspectionService, setInspectionService] = useState<InspectionService | null>(null);
  const [showCreateObservation, setShowCreateObservation] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(MAPBOX_CONFIG.DEFAULT_ZOOM);
  const [currentMapStyle, setCurrentMapStyle] = useState(MAPBOX_CONFIG.STYLE_URL);
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
  const cameraRef = useRef<Mapbox.Camera>(null);

  const mapStyles = [
    { name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12', icon: '🛰️' },
    { name: 'Street', url: 'mapbox://styles/mapbox/streets-v12', icon: '🗺️' },
    { name: 'Terrain', url: 'mapbox://styles/mapbox/outdoors-v12', icon: '🏔️' },
    { name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11', icon: '🌙' },
  ];

  const cycleMapStyle = () => {
    const nextIndex = (currentStyleIndex + 1) % mapStyles.length;
    setCurrentStyleIndex(nextIndex);
    setCurrentMapStyle(mapStyles[nextIndex].url);
  };

  useEffect(() => {
    requestLocationPermission();
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      console.log('🔧 Initializing services...');
      const container = Container.getInstance();
      // Use mock data for development - can be configured based on environment
      container.setUseMockData(true);
      const service = await container.getInspectionService();
      setInspectionService(service);
      console.log('✅ Inspection Service initialized');
      
      // NOW load nearby features if we have a location set
      if (userLocation) {
        console.log('🎯 Service ready! Loading nearby features for existing location');
        const coordinates = new Coordinates(userLocation.latitude, userLocation.longitude);
        loadNearbyFeatures(coordinates);
      }
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      Alert.alert('Error', 'Failed to initialize application services');
    }
  };

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'DamInspect needs access to your location to show nearby infrastructure.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Location permission is required for map functionality.');
          setIsLocationLoading(false);
          return;
        }
      }
      
      getCurrentLocation();
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setIsLocationLoading(false);
    }
  };

  const getCurrentLocation = () => {
    console.log('🌍 GET CURRENT LOCATION CALLED - Getting actual GPS location');
    
    Geolocation.getCurrentPosition(
      (position) => {
        const actualLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        console.log('📍 GPS Location obtained:', actualLocation);
        setUserLocation(actualLocation);
        setIsLocationLoading(false);
        
        // Only load nearby features if inspection service is ready
        if (inspectionService) {
          console.log('🚀 Service ready! Loading nearby features from getCurrentLocation');
          const coordinates = new Coordinates(actualLocation.latitude, actualLocation.longitude);
          loadNearbyFeatures(coordinates);
        } else {
          console.log('⏳ Service not ready yet, will load features when service initializes');
        }
      },
      (error) => {
        console.error('❌ GPS Error:', error);
        // Fallback to San Diego coordinates if GPS fails
        const fallbackLocation = {
          latitude: 33.035741,
          longitude: -117.081237
        };
        
        console.log('🔄 Using fallback San Diego coordinates:', fallbackLocation);
        setUserLocation(fallbackLocation);
        setIsLocationLoading(false);
        
        if (inspectionService) {
          const coordinates = new Coordinates(fallbackLocation.latitude, fallbackLocation.longitude);
          loadNearbyFeatures(coordinates);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );
  };

  const loadNearbyFeatures = async (location: Coordinates) => {
    const callId = Date.now();
    if (!inspectionService) {
      console.log(`❌ loadNearbyFeatures #${callId} called but inspectionService is null`);
      return;
    }

    console.log(`🔄 LOAD NEARBY FEATURES CALLED #${callId} at:`, location.latitude, location.longitude);
    setIsLoadingFeatures(true);
    try {
      console.log('🔍 Searching for nearby features at:', location.latitude, location.longitude);
      const result = await inspectionService.getNearbyFeatures(location, 1000); // 1000km radius to show all California dams

      console.log(`🎯 SERVICE RETURNED #${callId}: ${result.dams.length} dams, ${result.observations.length} observations`);
      console.log(`🏗️ Dams found #${callId}:`, result.dams.map(dam => ({
        id: dam.id,
        name: dam.name,
        nidId: dam.nidId,
        coordinates: { lat: dam.coordinates.latitude, lng: dam.coordinates.longitude },
        distance: dam.coordinates.distanceTo(location)
      })));

      console.log(`🔥 ABOUT TO SET STATE #${callId} - Current state: ${nearbyFeatures.dams.length} dams`);
      console.log(`🔥 SETTING NEARBY FEATURES #${callId}: ${result.dams.length} dams, ${result.observations.length} observations`);
      
      // STATE GUARD: Only update if we actually have results or explicitly want to clear
      if (result.dams.length > 0 || result.observations.length > 0) {
        console.log(`✅ Setting state with NEW features #${callId}`);
        setNearbyFeatures({
          dams: result.dams,
          observations: result.observations,
        });
      } else if (nearbyFeatures.dams.length > 0) {
        console.log(`⚠️ WARNING #${callId}: Service returned 0 features but we already have features. KEEPING EXISTING STATE.`);
      } else {
        console.log(`📭 No features found and no existing features #${callId}`);
        setNearbyFeatures({
          dams: result.dams,
          observations: result.observations,
        });
      }
      
      console.log(`✅ STATE UPDATE COMPLETE #${callId}`);
      
      // Verify state was actually set by checking it after a small delay
      setTimeout(() => {
        console.log(`🔍 STATE VERIFICATION #${callId}: nearbyFeatures.dams.length = ${nearbyFeatures.dams.length}`);
      }, 100);
    } catch (error) {
      console.error('❌ Error loading nearby features:', error);
      // Don't show error to user, just log it - the map will still work
    } finally {
      setIsLoadingFeatures(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleAddObservation = () => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please wait for your location to be detected before creating an observation.');
      return;
    }
    setShowCreateObservation(true);
  };

  const handleObservationCreated = (observation: Observation) => {
    // Add the new observation to the map
    setNearbyFeatures(prev => ({
      ...prev,
      observations: [...prev.observations, observation],
    }));
  };

  const showFeatureInfo = (type: string, feature: Dam | Observation) => {
    let title = '';
    let message = '';

    switch (type) {
      case 'dam':
        const dam = feature as Dam;
        title = `Dam: ${dam.name}`;
        message = `Type: ${dam.type}\nOwner: ${dam.ownerName}\nHazard Level: ${dam.hazardLevel}\nCondition: ${dam.conditionAssessment}\nHeight: ${dam.height} ft\nLast Inspection: ${dam.lastInspectionDate}`;
        break;
      case 'observation':
        const obs = feature as Observation;
        title = `Observation: ${obs.type}`;
        message = `Category: ${obs.category.toString()}\nSeverity: ${obs.severity.toUpperCase()}\nStatus: ${obs.status.toUpperCase()}\nRecorded By: ${obs.recordedBy}\nDescription: ${obs.description}`;
        break;
    }

    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  return (
    <View style={styles.container}>
      {/* Map Container */}
      <View style={styles.mapContainer}>
        {isLocationLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        ) : userLocation ? (
          <Mapbox.MapView
            style={styles.map}
            styleURL={currentMapStyle}
            zoomEnabled={true}
            scrollEnabled={true}
            pitchEnabled={true}
            rotateEnabled={true}
            scaleBarEnabled={true}
            scaleBarPosition={{bottom: 140, left: 20}}
          >
            <Mapbox.Camera
              ref={cameraRef}
              centerCoordinate={[userLocation.longitude, userLocation.latitude]}
              zoomLevel={MAPBOX_CONFIG.DEFAULT_ZOOM}
              animationDuration={2000}
            />
            
            {/* User Location Marker */}
            <Mapbox.PointAnnotation
              id="user-location"
              coordinate={[userLocation.longitude, userLocation.latitude]}
            >
              <View style={styles.userLocationMarker} />
            </Mapbox.PointAnnotation>



            {/* Dam Markers - SIMPLIFIED to only PointAnnotation */}
            {console.log(`🏗️ RENDERING DAM MARKERS: ${nearbyFeatures.dams.length} dams in state at ${new Date().toISOString()}`)}
            {nearbyFeatures.dams.map((dam, index) => {
              console.log(`🎯 Rendering dam marker ${index + 1}/${nearbyFeatures.dams.length}: ${dam.name} at [${dam.coordinates.longitude}, ${dam.coordinates.latitude}]`);
              return (
                <Mapbox.PointAnnotation
                  key={`dam-${dam.id}`}
                  id={`dam-${dam.id}`}
                  coordinate={[dam.coordinates.longitude, dam.coordinates.latitude]}
                  onSelected={() => {
                    console.log(`👆 Dam marker selected: ${dam.name}`);
                    showFeatureInfo('dam', dam);
                  }}
                >
                  <View style={styles.damMarkerSimple}>
                    <Text style={styles.damMarkerLabel}>🏗️</Text>
                  </View>
                </Mapbox.PointAnnotation>
              );
            })}

            {/* Observation Markers */}
            {nearbyFeatures.observations.map((observation) => (
              <Mapbox.PointAnnotation
                key={`observation-${observation.id}`}
                id={`observation-${observation.id}`}
                coordinate={[observation.coordinates.longitude, observation.coordinates.latitude]}
                onSelected={() => showFeatureInfo('observation', observation)}
              >
                <View style={[
                  styles.observationMarker,
                  { backgroundColor: getSeverityColor(observation.severity) }
                ]}>
                  <Text style={styles.markerText}>📝</Text>
                </View>
              </Mapbox.PointAnnotation>
            ))}
          </Mapbox.MapView>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unable to load map</Text>
            <Text style={styles.errorSubtext}>Please check location permissions</Text>
            <TouchableOpacity style={styles.retryButton} onPress={requestLocationPermission}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Plus Button for Adding Observations */}
        {userLocation && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddObservation}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity 
            style={[styles.zoomButton, { borderBottomWidth: 1, borderBottomColor: '#333333' }]} 
            onPress={() => {
              const newZoom = Math.min(currentZoom + 1, 20);
              setCurrentZoom(newZoom);
              cameraRef.current?.setCamera({
                zoomLevel: newZoom,
                animationDuration: 300,
              });
            }}
          >
            <Text style={styles.zoomButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.zoomButton} 
            onPress={() => {
              const newZoom = Math.max(currentZoom - 1, 1);
              setCurrentZoom(newZoom);
              cameraRef.current?.setCamera({
                zoomLevel: newZoom,
                animationDuration: 300,
              });
            }}
          >
            <Text style={styles.zoomButtonText}>−</Text>
          </TouchableOpacity>
        </View>

        {/* Map Style Toggle */}
        <TouchableOpacity style={styles.mapStyleToggle} onPress={cycleMapStyle}>
          <Text style={styles.mapStyleIcon}>🗺️</Text>
        </TouchableOpacity>

        {/* Loading Features Indicator */}
        {isLoadingFeatures && (
          <View style={styles.featuresLoadingContainer}>
            <ActivityIndicator size="small" color="#000000" />
            <Text style={styles.featuresLoadingText}>Loading nearby features...</Text>
          </View>
        )}
      </View>

      {/* Create Observation Modal */}
      {userLocation && (
        <CreateObservationScreen
          visible={showCreateObservation}
          onClose={() => setShowCreateObservation(false)}
          userLocation={userLocation}
          onObservationCreated={handleObservationCreated}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 18,
    color: '#000000',
    marginBottom: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 20,
    color: '#000000',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  addButton: {
    position: 'absolute',
    bottom: 120,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  zoomControls: {
    position: 'absolute',
    right: 20,
    top: 60,
    backgroundColor: '#000000',
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  zoomButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },

  damMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  damMarkerLarge: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#FF0000', // Bright red to be very visible
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  damMarkerText: {
    fontSize: 20,
    textAlign: 'center',
  },
  damMarkerLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },
  damMarkerSimple: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF0000',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  damMarkerLabel: {
    fontSize: 14,
  },


  observationMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerText: {
    fontSize: 12,
    textAlign: 'center',
  },
  featuresLoadingContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  featuresLoadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#000000',
  },
  mapStyleToggle: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  mapStyleIcon: {
    fontSize: 24,
  },
});