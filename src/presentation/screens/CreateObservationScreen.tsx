import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { useAuth } from '../contexts/AuthContext';
import { Container } from '../../infrastructure/di/Container';
import { IObservationRepository } from '../../domain/repositories/IObservationRepository';
import { IDamRepository } from '../../domain/repositories/IDamRepository';
import { Observation } from '../../domain/entities/Observation';
import { Dam } from '../../domain/entities/Dam';
import { Coordinates } from '../../domain/value-objects/Coordinates';
import { ObservationSeverity } from '../../domain/value-objects/ObservationEnums';

interface CreateObservationProps {
  visible: boolean;
  onClose: () => void;
  userLocation: { latitude: number; longitude: number };
  onObservationCreated: (observation: Observation) => void;
}

interface InspectionCategory {
  damType: string;
  category: string;
}

const INSPECTION_CATEGORIES: InspectionCategory[] = [
  { damType: 'Concrete', category: 'Structural Integrity' },
  { damType: 'Concrete', category: 'Vegetation and Surface Conditions' },
  { damType: 'Concrete', category: 'Seepage and Drainage' },
  { damType: 'Concrete', category: 'Spillways, Outlets, and Appurtenant Structures' },
  { damType: 'Concrete', category: 'Instrumentation and Monitoring' },
  { damType: 'Concrete', category: 'Miscellaneous' },
  { damType: 'Concrete', category: 'Environmental' },
  { damType: 'Earthen', category: 'Embankment Integrity' },
  { damType: 'Earthen', category: 'Seepage and Drainage' },
  { damType: 'Earthen', category: 'Vegetation and Surface Conditions' },
  { damType: 'Earthen', category: 'Spillways, Outlets, and Appurtenant Structures' },
  { damType: 'Earthen', category: 'Instrumentation and Monitoring' },
  { damType: 'Earthen', category: 'Miscellaneous' },
  { damType: 'Earthen', category: 'Environmental' },
];

const SEVERITY_LEVELS = [
  { value: ObservationSeverity.LOW, label: 'Low', color: '#059669' },
  { value: ObservationSeverity.MEDIUM, label: 'Medium', color: '#D97706' },
  { value: ObservationSeverity.HIGH, label: 'High', color: '#EA580C' },
  { value: ObservationSeverity.CRITICAL, label: 'Critical', color: '#DC2626' },
];

export function CreateObservationScreen({ visible, onClose, userLocation, onObservationCreated }: CreateObservationProps) {
  const { state } = useAuth();
  const [observationRepository, setObservationRepository] = useState<IObservationRepository | null>(null);
  const [damRepository, setDamRepository] = useState<IDamRepository | null>(null);
  const [nearestDam, setNearestDam] = useState<Dam | null>(null);
  const [determinedDamType, setDeterminedDamType] = useState<string>('');

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [observationType, setObservationType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<ObservationSeverity>(ObservationSeverity.LOW);
  const [notes, setNotes] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize repositories
  useEffect(() => {
    initializeRepositories();
  }, []);

  // Reset form when modal opens and find nearest dam
  useEffect(() => {
    if (visible) {
      resetForm();
      findNearestDam();
    }
  }, [visible, damRepository]);

  const initializeRepositories = async () => {
    try {
      const container = Container.getInstance();
      const obsRepo = await container.getObservationRepository();
      const damRepo = await container.getDamRepository();
      setObservationRepository(obsRepo);
      setDamRepository(damRepo);
    } catch (error) {
      console.error('Failed to initialize repositories:', error);
    }
  };

  const resetForm = () => {
    setSelectedCategory('');
    setObservationType('');
    setDescription('');
    setSeverity(ObservationSeverity.LOW);
    setNotes('');
    setPhotos([]);
    setIsSubmitting(false);
    setNearestDam(null);
    setDeterminedDamType('');
  };

  const getFilteredCategories = () => {
    if (!determinedDamType) return [];
    return INSPECTION_CATEGORIES.filter(cat => cat.damType === determinedDamType);
  };

  const findNearestDam = async () => {
    if (!damRepository) return;
    
    try {
      const userCoords = new Coordinates(userLocation.latitude, userLocation.longitude);
      const nearbyDams = await damRepository.findNearby(userCoords, 50); // 50km radius
      
      if (nearbyDams.length > 0) {
        const nearest = nearbyDams[0]; // Already sorted by distance
        setNearestDam(nearest);
        
        // Map dam type from data to our categories
        let damType = 'Earthen'; // default
        if (nearest.type.toLowerCase().includes('concrete') || 
            nearest.type.toLowerCase().includes('arch') ||
            nearest.type.toLowerCase().includes('gravity')) {
          damType = 'Concrete';
        }
        
        setDeterminedDamType(damType);
        console.log(`🎯 Found nearest dam: ${nearest.name} (${nearest.type}) -> ${damType}`);
      } else {
        console.log('⚠️ No nearby dams found, defaulting to Earthen');
        setDeterminedDamType('Earthen'); // Default if no nearby dam
      }
    } catch (error) {
      console.error('Error finding nearest dam:', error);
      setDeterminedDamType('Earthen'); // Default on error
    }
  };

  const handleAddPhoto = () => {
    Alert.alert(
      'Add Photo',
      'Choose photo source',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Photo Library', onPress: () => openImageLibrary() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    launchCamera(options, handleImageResponse);
  };

  const openImageLibrary = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
      selectionLimit: 5 - photos.length, // Allow up to 5 photos total
    };

    launchImageLibrary(options, handleImageResponse);
  };

  const handleImageResponse = async (response: ImagePickerResponse) => {
    if (response.didCancel || response.errorMessage) {
      return;
    }

    if (response.assets && response.assets.length > 0) {
      try {
        const resizedImages = await Promise.all(
          response.assets.map(async (asset) => {
            if (asset.uri) {
              const resized = await ImageResizer.createResizedImage(
                asset.uri,
                800,
                600,
                'JPEG',
                80
              );
              return resized.uri;
            }
            return null;
          })
        );

        const validImages = resizedImages.filter(uri => uri !== null) as string[];
        setPhotos(prev => [...prev, ...validImages].slice(0, 5)); // Max 5 photos
      } catch (error) {
        console.error('Error resizing images:', error);
        Alert.alert('Error', 'Failed to process images');
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!observationRepository) {
      Alert.alert('Error', 'Service not initialized. Please try again.');
      return;
    }
    if (!determinedDamType) {
      Alert.alert('Error', 'Unable to determine dam type. Please try again.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }
    if (!observationType.trim()) {
      Alert.alert('Validation Error', 'Please enter an observation type');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return;
    }

    setIsSubmitting(true);

    try {
      const coordinates = new Coordinates(userLocation.latitude, userLocation.longitude);
      
      const createRequest = {
        type: observationType.trim(),
        category: {
          damType: determinedDamType,
          categoryName: selectedCategory,
        },
        description: description.trim(),
        severity,
        coordinates,
        photos,
        recordedBy: state.user?.username || 'Unknown',
        notes: notes.trim() || undefined,
        followUpRequired: severity === ObservationSeverity.HIGH || severity === ObservationSeverity.CRITICAL,
      };

      // Create observation in database
      const createdObservation = await observationRepository.create(createRequest);
      
      Alert.alert(
        'Success',
        'Observation created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              onObservationCreated(createdObservation);
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating observation:', error);
      Alert.alert('Error', 'Failed to create observation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Observation</Text>
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Dam Information */}
          {nearestDam && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nearest Dam</Text>
              <View style={styles.damInfoContainer}>
                <Text style={styles.damInfoText}>
                  📍 {nearestDam.name}
                </Text>
                <Text style={styles.damInfoSubtext}>
                  Type: {determinedDamType} • Distance: {nearestDam.coordinates.distanceTo(new Coordinates(userLocation.latitude, userLocation.longitude)).toFixed(1)} km
                </Text>
              </View>
            </View>
          )}

          {/* Category Selection */}
          {determinedDamType && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category</Text>
              <View style={styles.categoryGrid}>
                {getFilteredCategories().map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.categoryButton,
                      selectedCategory === cat.category && styles.categoryButtonSelected,
                    ]}
                    onPress={() => setSelectedCategory(cat.category)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        selectedCategory === cat.category && styles.categoryButtonTextSelected,
                      ]}
                    >
                      {cat.category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Observation Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observation Type</Text>
            <TextInput
              style={styles.textInput}
              value={observationType}
              onChangeText={setObservationType}
              placeholder="e.g., Crack, Seepage, Vegetation Growth"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the observation in detail..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Severity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Severity</Text>
            <View style={styles.severityContainer}>
              {SEVERITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.severityButton,
                    { borderColor: level.color },
                    severity === level.value && { backgroundColor: level.color },
                  ]}
                  onPress={() => setSeverity(level.value)}
                >
                  <Text
                    style={[
                      styles.severityButtonText,
                      { color: severity === level.value ? '#FFFFFF' : level.color },
                    ]}
                  >
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Photos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({photos.length}/5)</Text>
            <View style={styles.photosContainer}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Text style={styles.removePhotoText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 5 && (
                <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
                  <Text style={styles.addPhotoText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes or context..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Location Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.locationText}>
              📍 Lat: {userLocation.latitude.toFixed(6)}, Lng: {userLocation.longitude.toFixed(6)}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  damInfoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  damInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  damInfoSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  categoryButtonSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EBF4FF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  categoryButtonTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  severityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
  },
  severityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  addPhotoText: {
    fontSize: 32,
    color: '#9CA3AF',
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});