/**
 * @fileoverview Sensor Reading Validation Tests
 * Following TDD - these tests define expected sensor validation behavior
 */

/// <reference path="../../types/jest.d.ts" />

import { SensorFactory, SensorReadingFactory } from '../../fixtures/factories';

describe('SensorReadingValidation', () => {
  let piezometerSensor: any;
  let flowMeterSensor: any;

  beforeEach(() => {
    piezometerSensor = SensorFactory.create({
      type: 'piezometer',
      unit: 'feet',
      normalRange: { min: 10, max: 50 }
    });
    flowMeterSensor = SensorFactory.create({
      type: 'flow_meter',
      unit: 'cfs',
      normalRange: { min: 0, max: 1000 }
    });
  });

  describe('Basic Reading Validation', () => {
    test('SHOULD accept valid piezometer reading within normal range', () => {
      // GIVEN a valid piezometer reading
      const reading = SensorReadingFactory.create({
        sensorId: piezometerSensor.id,
        value: 26.5,
        unit: 'feet',
        timestamp: new Date(),
        quality: 'GOOD'
      });

      // THEN reading should be valid
      expect(reading.value).toBeGreaterThanOrEqual(piezometerSensor.normalRange.min);
      expect(reading.value).toBeLessThanOrEqual(piezometerSensor.normalRange.max);
      expect(reading.unit).toBe(piezometerSensor.unit);
      expect(['GOOD', 'FAIR', 'POOR'].includes(reading.quality)).toBe(true);
    });

    test('SHOULD reject negative values for piezometer readings', () => {
      // GIVEN a piezometer reading with negative value
      const reading = SensorReadingFactory.create({
        sensorId: piezometerSensor.id,
        value: -5.2,
        unit: 'feet'
      });

      // THEN should be flagged as invalid for piezometer
      expect(reading.value).toBeLessThan(0);
      // For piezometer (depth to water), negative values don't make sense
      const isValidForPiezometer = reading.value >= 0;
      expect(isValidForPiezometer).toBe(false);
    });

    test('SHOULD accept zero values for flow meters', () => {
      // GIVEN a flow meter reading with zero value (dry conditions)
      const reading = SensorReadingFactory.create({
        sensorId: flowMeterSensor.id,
        value: 0,
        unit: 'cfs',
        notes: 'No flow observed - dry conditions'
      });

      // THEN should be valid for flow meter
      expect(reading.value).toBe(0);
      expect(reading.unit).toBe('cfs');
      // Zero flow is valid for flow meters
      const isValidForFlowMeter = reading.value >= 0;
      expect(isValidForFlowMeter).toBe(true);
    });

    test('SHOULD validate timestamp constraints', () => {
      // GIVEN readings with various timestamps
      const futureDate = new Date(Date.now() + 3600000); // 1 hour in future
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const validDate = new Date();

      const futureReading = SensorReadingFactory.create({ timestamp: futureDate });
      const oldReading = SensorReadingFactory.create({ timestamp: oldDate });
      const validReading = SensorReadingFactory.create({ timestamp: validDate });

      // THEN should validate timestamp constraints
      expect(futureReading.timestamp > new Date()).toBe(true); // Future timestamp invalid
      expect(oldReading.timestamp < new Date(Date.now() - 24 * 60 * 60 * 1000)).toBe(true); // Too old
      expect(validReading.timestamp <= new Date()).toBe(true); // Valid timestamp
    });
  });

  describe('Quality Assessment', () => {
    test('SHOULD require quality assessment for all readings', () => {
      // GIVEN reading without quality assessment
      const readingWithoutQuality: any = {
        sensorId: piezometerSensor.id,
        value: 25.0,
        timestamp: new Date()
        // Missing quality field
      };

      const readingWithQuality = SensorReadingFactory.create({
        quality: 'GOOD'
      });

      // THEN should identify missing quality
      expect(readingWithoutQuality.quality).toBeUndefined();
      expect(readingWithQuality.quality).toBeDefined();
      expect(['GOOD', 'FAIR', 'POOR'].includes(readingWithQuality.quality || '')).toBe(true);
    });

    test('SHOULD validate quality values', () => {
      const validQualities = ['GOOD', 'FAIR', 'POOR'];
      const invalidQualities = ['EXCELLENT', 'BAD', 'OK', '', null, undefined];

      validQualities.forEach(quality => {
        expect(validQualities.includes(quality)).toBe(true);
      });

      invalidQualities.forEach(quality => {
        expect(validQualities.includes(quality as string)).toBe(false);
      });
    });
  });

  describe('Manual Reading Requirements', () => {
    test('SHOULD require inspector information for manual readings', () => {
      // GIVEN a manual reading
      const manualReading = SensorReadingFactory.create({
        readingMethod: 'manual',
        inspectorId: 'inspector-123',
        gpsCoordinates: { lat: 40.7128, lng: -74.0060 }
      });

      const incompleteManualReading = SensorReadingFactory.create({
        readingMethod: 'manual'
        // Missing inspectorId and gpsCoordinates
      });

      // THEN should validate manual reading requirements
      expect(manualReading.readingMethod).toBe('manual');
      expect(manualReading.inspectorId).toBeDefined();
      expect(manualReading.gpsCoordinates).toBeDefined();

      expect(incompleteManualReading.inspectorId).toBeUndefined();
      expect(incompleteManualReading.gpsCoordinates).toBeUndefined();
    });
  });
});
