/**
 * @fileoverview Advanced performance profiling and analysis tools
 * Purpose: Deep performance insights, bottleneck identification, optimization guidance
 */

interface ProfilePoint {
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  eventLoopDelay?: number;
  customMetrics: Record<string, number>;
}

interface PerformanceSnapshot {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryDelta: number;
  cpuDelta: NodeJS.CpuUsage;
  callStack?: string;
  metadata: Record<string, any>;
}

interface Bottleneck {
  operation: string;
  avgDuration: number;
  maxDuration: number;
  frequency: number;
  memoryImpact: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
}

interface OptimizationSuggestion {
  category: 'MEMORY' | 'CPU' | 'IO' | 'ALGORITHM' | 'CONCURRENCY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  potentialGain: string;
  implementation: string;
  effort: 'EASY' | 'MEDIUM' | 'HARD';
}

/**
 * Advanced performance profiler for detailed analysis
 */
export class PerformanceProfiler {
  private isActive = false;
  private profilePoints: ProfilePoint[] = [];
  private snapshots: PerformanceSnapshot[] = [];
  private activeOperations: Map<string, { startTime: number; startMemory: NodeJS.MemoryUsage; startCpu: NodeJS.CpuUsage }> = new Map();
  private intervalId?: NodeJS.Timeout;
  private eventLoopMonitor?: any;
  
  private readonly samplingInterval = 100; // ms
  private readonly maxProfilePoints = 10000;
  private readonly maxSnapshots = 1000;

  /**
   * Start profiling with configurable options
   */
  startProfiling(options: {
    samplingInterval?: number;
    includeEventLoop?: boolean;
    includeCPU?: boolean;
    customMetrics?: () => Record<string, number>;
  } = {}): void {
    if (this.isActive) {
      throw new Error('Profiler is already active');
    }

    this.isActive = true;
    this.profilePoints = [];
    this.snapshots = [];
    this.activeOperations.clear();

    const samplingInterval = options.samplingInterval || this.samplingInterval;
    const customMetrics = options.customMetrics || (() => ({}));

    // Start periodic sampling
    this.intervalId = setInterval(() => {
      this.samplePerformance(customMetrics);
    }, samplingInterval);

    // Monitor event loop delay if requested
    if (options.includeEventLoop) {
      this.startEventLoopMonitoring();
    }

    console.log(`Performance profiler started with ${samplingInterval}ms sampling interval`);
  }

  /**
   * Stop profiling and generate report
   */
  stopProfiling(): PerformanceReport {
    if (!this.isActive) {
      throw new Error('Profiler is not active');
    }

    this.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    if (this.eventLoopMonitor) {
      this.eventLoopMonitor.unref();
      this.eventLoopMonitor = undefined;
    }

    console.log(`Performance profiler stopped. Collected ${this.profilePoints.length} samples and ${this.snapshots.length} operation snapshots`);

    return this.generateReport();
  }

  /**
   * Start tracking a specific operation
   */
  startOperation(operationName: string, metadata: Record<string, any> = {}): void {
    if (!this.isActive) return;

    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();

    this.activeOperations.set(operationName, {
      startTime,
      startMemory,
      startCpu
    });

    // Record start event
    this.recordCustomMetric(`${operationName}_started`, 1, metadata);
  }

  /**
   * End tracking of a specific operation
   */
  endOperation(operationName: string, metadata: Record<string, any> = {}): PerformanceSnapshot | null {
    if (!this.isActive) return null;

    const activeOp = this.activeOperations.get(operationName);
    if (!activeOp) {
      console.warn(`Operation ${operationName} was not started or already ended`);
      return null;
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const endCpu = process.cpuUsage(activeOp.startCpu);

    const snapshot: PerformanceSnapshot = {
      operation: operationName,
      startTime: activeOp.startTime,
      endTime,
      duration: endTime - activeOp.startTime,
      memoryDelta: endMemory.heapUsed - activeOp.startMemory.heapUsed,
      cpuDelta: endCpu,
      metadata
    };

    this.snapshots.push(snapshot);
    this.activeOperations.delete(operationName);

    // Keep snapshots within limit
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    // Record end event
    this.recordCustomMetric(`${operationName}_completed`, 1, {
      duration: snapshot.duration,
      memoryDelta: snapshot.memoryDelta,
      ...metadata
    });

    return snapshot;
  }

  /**
   * Record custom performance metric
   */
  recordCustomMetric(name: string, value: number, metadata: Record<string, any> = {}): void {
    if (!this.isActive) return;

    // Add to current profile point if recent, otherwise create new one
    const now = Date.now();
    const lastPoint = this.profilePoints[this.profilePoints.length - 1];
    
    if (lastPoint && now - lastPoint.timestamp < this.samplingInterval / 2) {
      lastPoint.customMetrics[name] = value;
    } else {
      this.profilePoints.push({
        timestamp: now,
        memoryUsage: process.memoryUsage(),
        customMetrics: { [name]: value }
      });
    }
  }

  /**
   * Measure function execution time
   */
  async measureFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata: Record<string, any> = {}
  ): Promise<{ result: T; snapshot: PerformanceSnapshot | null }> {
    this.startOperation(name, metadata);
    
    try {
      const result = await fn();
      const snapshot = this.endOperation(name, { success: true, ...metadata });
      return { result, snapshot };
    } catch (error) {
      const snapshot = this.endOperation(name, { success: false, error: error.message, ...metadata });
      throw error;
    }
  }

  /**
   * Create performance benchmark
   */
  async benchmark(
    name: string,
    fn: () => Promise<any> | any,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    const results: number[] = [];
    const memoryResults: number[] = [];
    
    // Warm up
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await fn();
    }

    // Clear memory before benchmark
    if (global.gc) global.gc();

    // Run benchmark
    for (let i = 0; i < iterations; i++) {
      const startMemory = process.memoryUsage().heapUsed;
      const startTime = performance.now();
      
      await fn();
      
      const duration = performance.now() - startTime;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;
      
      results.push(duration);
      memoryResults.push(memoryDelta);
    }

    // Calculate statistics
    const sorted = results.sort((a, b) => a - b);
    const memorySorted = memoryResults.sort((a, b) => a - b);
    
    return {
      name,
      iterations,
      duration: {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: results.reduce((a, b) => a + b, 0) / results.length,
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      },
      memory: {
        min: memorySorted[0],
        max: memorySorted[memorySorted.length - 1],
        mean: memoryResults.reduce((a, b) => a + b, 0) / memoryResults.length,
        median: memorySorted[Math.floor(memorySorted.length / 2)]
      }
    };
  }

  /**
   * Generate comprehensive performance report
   */
  private generateReport(): PerformanceReport {
    const report: PerformanceReport = {
      summary: this.generateSummary(),
      timeline: this.generateTimeline(),
      bottlenecks: this.identifyBottlenecks(),
      memoryAnalysis: this.analyzeMemoryUsage(),
      optimizationSuggestions: this.generateOptimizationSuggestions(),
      operationAnalysis: this.analyzeOperations(),
      trends: this.analyzeTrends(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  private samplePerformance(customMetrics: () => Record<string, number>): void {
    if (this.profilePoints.length >= this.maxProfilePoints) {
      this.profilePoints.shift(); // Remove oldest point
    }

    const point: ProfilePoint = {
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      customMetrics: customMetrics()
    };

    this.profilePoints.push(point);
  }

  private startEventLoopMonitoring(): void {
    // Simple event loop delay monitoring
    let lastTime = process.hrtime.bigint();
    
    const checkEventLoop = () => {
      const currentTime = process.hrtime.bigint();
      const delay = Number(currentTime - lastTime) / 1000000; // Convert to milliseconds
      lastTime = currentTime;
      
      if (this.profilePoints.length > 0) {
        const lastPoint = this.profilePoints[this.profilePoints.length - 1];
        if (Date.now() - lastPoint.timestamp < this.samplingInterval) {
          lastPoint.eventLoopDelay = delay;
        }
      }
      
      if (this.isActive) {
        setImmediate(checkEventLoop);
      }
    };
    
    setImmediate(checkEventLoop);
  }

  private generateSummary(): PerformanceSummary {
    const totalDuration = this.profilePoints.length > 0 
      ? this.profilePoints[this.profilePoints.length - 1].timestamp - this.profilePoints[0].timestamp
      : 0;

    const memoryUsages = this.profilePoints.map(p => p.memoryUsage.heapUsed);
    const maxMemory = Math.max(...memoryUsages);
    const minMemory = Math.min(...memoryUsages);

    return {
      profilingDuration: totalDuration,
      totalOperations: this.snapshots.length,
      memoryPeak: maxMemory,
      memoryRange: maxMemory - minMemory,
      averageOperationTime: this.snapshots.length > 0 
        ? this.snapshots.reduce((sum, s) => sum + s.duration, 0) / this.snapshots.length 
        : 0,
      slowestOperation: this.snapshots.reduce((slowest, current) => 
        current.duration > (slowest?.duration || 0) ? current : slowest, null),
      samplesCollected: this.profilePoints.length
    };
  }

  private generateTimeline(): PerformanceTimeline {
    const timelineEvents = this.snapshots.map(snapshot => ({
      timestamp: snapshot.startTime,
      type: 'operation_start' as const,
      operation: snapshot.operation,
      duration: snapshot.duration,
      memoryDelta: snapshot.memoryDelta
    }));

    // Add memory spikes
    const memorySpikes = this.profilePoints
      .filter((point, index) => {
        if (index === 0) return false;
        const prevPoint = this.profilePoints[index - 1];
        const increase = point.memoryUsage.heapUsed - prevPoint.memoryUsage.heapUsed;
        return increase > 10 * 1024 * 1024; // 10MB spike
      })
      .map(point => ({
        timestamp: point.timestamp,
        type: 'memory_spike' as const,
        memoryUsage: point.memoryUsage.heapUsed
      }));

    return {
      events: [...timelineEvents, ...memorySpikes].sort((a, b) => a.timestamp - b.timestamp),
      startTime: this.profilePoints[0]?.timestamp || 0,
      endTime: this.profilePoints[this.profilePoints.length - 1]?.timestamp || 0
    };
  }

  private identifyBottlenecks(): Bottleneck[] {
    const operationStats = new Map<string, { durations: number[]; memoryDeltas: number[] }>();

    // Collect statistics for each operation type
    this.snapshots.forEach(snapshot => {
      if (!operationStats.has(snapshot.operation)) {
        operationStats.set(snapshot.operation, { durations: [], memoryDeltas: [] });
      }
      const stats = operationStats.get(snapshot.operation)!;
      stats.durations.push(snapshot.duration);
      stats.memoryDeltas.push(Math.abs(snapshot.memoryDelta));
    });

    // Identify bottlenecks
    const bottlenecks: Bottleneck[] = [];
    
    operationStats.forEach((stats, operation) => {
      const avgDuration = stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length;
      const maxDuration = Math.max(...stats.durations);
      const avgMemoryImpact = stats.memoryDeltas.reduce((a, b) => a + b, 0) / stats.memoryDeltas.length;
      
      let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      const recommendations: string[] = [];
      
      if (avgDuration > 1000) { // > 1 second
        severity = 'HIGH';
        recommendations.push('Consider optimizing algorithm or adding caching');
      } else if (avgDuration > 500) { // > 500ms
        severity = 'MEDIUM';
        recommendations.push('Monitor for potential optimization opportunities');
      }
      
      if (avgMemoryImpact > 50 * 1024 * 1024) { // > 50MB
        severity = severity === 'LOW' ? 'MEDIUM' : 'CRITICAL';
        recommendations.push('Optimize memory usage or implement streaming');
      }
      
      if (maxDuration > avgDuration * 3) {
        recommendations.push('Investigate outlier performance cases');
      }

      bottlenecks.push({
        operation,
        avgDuration,
        maxDuration,
        frequency: stats.durations.length,
        memoryImpact: avgMemoryImpact,
        severity,
        recommendations
      });
    });

    return bottlenecks.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private analyzeMemoryUsage(): MemoryAnalysis {
    const memoryPoints = this.profilePoints.map(p => ({
      timestamp: p.timestamp,
      heapUsed: p.memoryUsage.heapUsed,
      heapTotal: p.memoryUsage.heapTotal,
      external: p.memoryUsage.external,
      rss: p.memoryUsage.rss
    }));

    const heapUsages = memoryPoints.map(p => p.heapUsed);
    const maxHeap = Math.max(...heapUsages);
    const minHeap = Math.min(...heapUsages);
    const avgHeap = heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length;

    // Detect memory leaks (sustained growth)
    const leakDetection = this.detectMemoryLeaks(memoryPoints);

    return {
      peakMemoryUsage: maxHeap,
      averageMemoryUsage: avgHeap,
      memoryRange: maxHeap - minHeap,
      memoryEfficiency: avgHeap / maxHeap,
      leakDetection,
      garbageCollectionImpact: this.analyzeGCImpact(memoryPoints),
      recommendations: this.generateMemoryRecommendations(memoryPoints, leakDetection)
    };
  }

  private generateOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze operation patterns
    const slowOperations = this.snapshots.filter(s => s.duration > 500);
    if (slowOperations.length > 0) {
      suggestions.push({
        category: 'ALGORITHM',
        priority: 'HIGH',
        description: `${slowOperations.length} operations are taking longer than 500ms`,
        potentialGain: '50-80% performance improvement',
        implementation: 'Profile specific operations and optimize algorithms or add caching',
        effort: 'MEDIUM'
      });
    }

    // Memory optimization
    const memoryIntensiveOps = this.snapshots.filter(s => Math.abs(s.memoryDelta) > 10 * 1024 * 1024);
    if (memoryIntensiveOps.length > 0) {
      suggestions.push({
        category: 'MEMORY',
        priority: 'MEDIUM',
        description: `${memoryIntensiveOps.length} operations use more than 10MB of memory`,
        potentialGain: '30-50% memory reduction',
        implementation: 'Implement streaming or chunked processing for large data sets',
        effort: 'MEDIUM'
      });
    }

    // Concurrency opportunities
    const serialOperations = this.identifySerialOperations();
    if (serialOperations.length > 0) {
      suggestions.push({
        category: 'CONCURRENCY',
        priority: 'MEDIUM',
        description: 'Multiple operations could be parallelized',
        potentialGain: '20-40% throughput improvement',
        implementation: 'Use Promise.all() or worker threads for independent operations',
        effort: 'EASY'
      });
    }

    return suggestions;
  }

  private analyzeOperations(): OperationAnalysis {
    const operationTypes = new Set(this.snapshots.map(s => s.operation));
    const analysis: Record<string, any> = {};

    operationTypes.forEach(opType => {
      const operations = this.snapshots.filter(s => s.operation === opType);
      const durations = operations.map(o => o.duration);
      const memoryDeltas = operations.map(o => o.memoryDelta);

      analysis[opType] = {
        count: operations.length,
        totalTime: durations.reduce((a, b) => a + b, 0),
        averageTime: durations.reduce((a, b) => a + b, 0) / durations.length,
        minTime: Math.min(...durations),
        maxTime: Math.max(...durations),
        memoryImpact: memoryDeltas.reduce((a, b) => a + Math.abs(b), 0) / memoryDeltas.length,
        successRate: operations.filter(o => o.metadata.success !== false).length / operations.length
      };
    });

    return analysis;
  }

  private analyzeTrends(): PerformanceTrends {
    // Analyze trends over time
    const timeWindows = this.createTimeWindows(this.profilePoints, 10); // 10 windows
    
    const memoryTrend = this.calculateTrend(timeWindows.map(w => w.avgMemory));
    const performanceTrend = this.calculateTrend(timeWindows.map(w => w.avgDuration));

    return {
      memoryTrend,
      performanceTrend,
      degradationPoints: this.identifyDegradationPoints(timeWindows),
      predictions: this.predictFuturePerformance(timeWindows)
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const summary = this.generateSummary();
    const bottlenecks = this.identifyBottlenecks();
    
    if (summary.averageOperationTime > 100) {
      recommendations.push('Consider implementing operation caching to reduce average execution time');
    }
    
    if (bottlenecks.some(b => b.severity === 'CRITICAL')) {
      recommendations.push('Address critical performance bottlenecks immediately');
    }
    
    if (summary.memoryRange > 100 * 1024 * 1024) {
      recommendations.push('Implement memory pooling or streaming to reduce memory fluctuations');
    }
    
    return recommendations;
  }

  // Helper methods
  private detectMemoryLeaks(memoryPoints: Array<{ timestamp: number; heapUsed: number }>): MemoryLeakDetection {
    // Simple linear regression to detect sustained growth
    const n = memoryPoints.length;
    if (n < 10) return { detected: false, confidence: 0, growthRate: 0 };

    const sumX = memoryPoints.reduce((sum, _, i) => sum + i, 0);
    const sumY = memoryPoints.reduce((sum, p) => sum + p.heapUsed, 0);
    const sumXY = memoryPoints.reduce((sum, p, i) => sum + i * p.heapUsed, 0);
    const sumXX = memoryPoints.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const correlation = this.calculateCorrelation(memoryPoints.map((_, i) => i), memoryPoints.map(p => p.heapUsed));

    return {
      detected: slope > 1000 && Math.abs(correlation) > 0.7, // Growing by >1KB per sample with strong correlation
      confidence: Math.abs(correlation),
      growthRate: slope
    };
  }

  private analyzeGCImpact(memoryPoints: Array<{ heapUsed: number }>): number {
    // Detect sudden memory drops (likely GC events)
    let gcEvents = 0;
    for (let i = 1; i < memoryPoints.length; i++) {
      const drop = memoryPoints[i - 1].heapUsed - memoryPoints[i].heapUsed;
      if (drop > 10 * 1024 * 1024) { // 10MB drop
        gcEvents++;
      }
    }
    return gcEvents;
  }

  private generateMemoryRecommendations(memoryPoints: any[], leakDetection: MemoryLeakDetection): string[] {
    const recommendations: string[] = [];
    
    if (leakDetection.detected) {
      recommendations.push('Memory leak detected - review object lifecycle and event listener cleanup');
    }
    
    const maxMemory = Math.max(...memoryPoints.map(p => p.heapUsed));
    if (maxMemory > 500 * 1024 * 1024) { // 500MB
      recommendations.push('High memory usage detected - consider implementing data streaming or pagination');
    }
    
    return recommendations;
  }

  private identifySerialOperations(): string[] {
    // Simple heuristic: operations that could run concurrently but don't
    const operationsByTime = this.snapshots.sort((a, b) => a.startTime - b.startTime);
    const serialOperations: string[] = [];
    
    for (let i = 1; i < operationsByTime.length; i++) {
      const current = operationsByTime[i];
      const previous = operationsByTime[i - 1];
      
      // If operations start right after each other and are independent
      if (current.startTime - previous.endTime < 10 && // < 10ms gap
          current.operation !== previous.operation) {
        serialOperations.push(`${previous.operation} -> ${current.operation}`);
      }
    }
    
    return serialOperations;
  }

  private createTimeWindows(points: ProfilePoint[], windowCount: number): any[] {
    const windowSize = Math.floor(points.length / windowCount);
    const windows = [];
    
    for (let i = 0; i < windowCount; i++) {
      const start = i * windowSize;
      const end = Math.min(start + windowSize, points.length);
      const windowPoints = points.slice(start, end);
      
      windows.push({
        startTime: windowPoints[0]?.timestamp || 0,
        endTime: windowPoints[windowPoints.length - 1]?.timestamp || 0,
        avgMemory: windowPoints.reduce((sum, p) => sum + p.memoryUsage.heapUsed, 0) / windowPoints.length,
        avgDuration: this.snapshots
          .filter(s => s.startTime >= (windowPoints[0]?.timestamp || 0) && s.startTime <= (windowPoints[windowPoints.length - 1]?.timestamp || 0))
          .reduce((sum, s, _, arr) => sum + s.duration / arr.length, 0)
      });
    }
    
    return windows;
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 3) return 'stable';
    
    const firstThird = values.slice(0, Math.floor(values.length / 3));
    const lastThird = values.slice(-Math.floor(values.length / 3));
    
    const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
    const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
    
    const changePercent = (lastAvg - firstAvg) / firstAvg;
    
    if (changePercent > 0.1) return 'increasing';
    if (changePercent < -0.1) return 'decreasing';
    return 'stable';
  }

  private identifyDegradationPoints(windows: any[]): any[] {
    const degradationPoints = [];
    
    for (let i = 1; i < windows.length; i++) {
      const current = windows[i];
      const previous = windows[i - 1];
      
      const memoryIncrease = (current.avgMemory - previous.avgMemory) / previous.avgMemory;
      const durationIncrease = (current.avgDuration - previous.avgDuration) / previous.avgDuration;
      
      if (memoryIncrease > 0.2 || durationIncrease > 0.2) { // 20% increase
        degradationPoints.push({
          timestamp: current.startTime,
          memoryIncrease,
          durationIncrease,
          severity: (memoryIncrease > 0.5 || durationIncrease > 0.5) ? 'HIGH' : 'MEDIUM'
        });
      }
    }
    
    return degradationPoints;
  }

  private predictFuturePerformance(windows: any[]): any {
    // Simple linear prediction based on recent trends
    const recentWindows = windows.slice(-3); // Last 3 windows
    if (recentWindows.length < 2) return null;
    
    const memoryTrend = this.calculateTrend(recentWindows.map(w => w.avgMemory));
    const durationTrend = this.calculateTrend(recentWindows.map(w => w.avgDuration));
    
    return {
      memoryTrend,
      durationTrend,
      riskLevel: (memoryTrend === 'increasing' && durationTrend === 'increasing') ? 'HIGH' : 'LOW'
    };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
}

// Type definitions
interface BenchmarkResult {
  name: string;
  iterations: number;
  duration: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
  };
  memory: {
    min: number;
    max: number;
    mean: number;
    median: number;
  };
}

interface PerformanceReport {
  summary: PerformanceSummary;
  timeline: PerformanceTimeline;
  bottlenecks: Bottleneck[];
  memoryAnalysis: MemoryAnalysis;
  optimizationSuggestions: OptimizationSuggestion[];
  operationAnalysis: OperationAnalysis;
  trends: PerformanceTrends;
  recommendations: string[];
}

interface PerformanceSummary {
  profilingDuration: number;
  totalOperations: number;
  memoryPeak: number;
  memoryRange: number;
  averageOperationTime: number;
  slowestOperation: PerformanceSnapshot | null;
  samplesCollected: number;
}

interface PerformanceTimeline {
  events: Array<{
    timestamp: number;
    type: 'operation_start' | 'memory_spike';
    operation?: string;
    duration?: number;
    memoryDelta?: number;
    memoryUsage?: number;
  }>;
  startTime: number;
  endTime: number;
}

interface MemoryAnalysis {
  peakMemoryUsage: number;
  averageMemoryUsage: number;
  memoryRange: number;
  memoryEfficiency: number;
  leakDetection: MemoryLeakDetection;
  garbageCollectionImpact: number;
  recommendations: string[];
}

interface MemoryLeakDetection {
  detected: boolean;
  confidence: number;
  growthRate: number;
}

interface OperationAnalysis {
  [operationType: string]: {
    count: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    memoryImpact: number;
    successRate: number;
  };
}

interface PerformanceTrends {
  memoryTrend: 'increasing' | 'decreasing' | 'stable';
  performanceTrend: 'increasing' | 'decreasing' | 'stable';
  degradationPoints: any[];
  predictions: any;
}
