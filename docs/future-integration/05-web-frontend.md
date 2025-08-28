# 05 – Web Frontend (Next.js) Specification

## Overview
This document provides comprehensive specifications for the Inspections module in the DamSafety.IO web application, built with Next.js 14, React 18, and TypeScript.

## Architecture

### Component Structure
```
src/
├── app/
│   └── dams/
│       └── [id]/
│           └── inspections/
│               ├── page.tsx              // Inspections list view
│               └── [inspectionId]/
│                   └── page.tsx          // Inspection detail view
├── components/
│   └── inspections/
│       ├── InspectionsTab.tsx           // Main tab component
│       ├── InspectionList.tsx           // List view
│       ├── InspectionCard.tsx           // Summary card
│       ├── InspectionDetail.tsx         // Detail view
│       ├── InspectionTimeline.tsx       // Timeline visualization
│       ├── InspectionMap.tsx            // Map view
│       ├── InspectionForm.tsx           // Create/edit form
│       ├── ObservationList.tsx          // Observations section
│       ├── ObservationCard.tsx          // Observation item
│       ├── MediaGallery.tsx             // Photo/video gallery
│       ├── MediaUploader.tsx            // Upload interface
│       ├── PDFViewer.tsx                // Document viewer
│       └── InspectionReport.tsx         // Report generator
```

## Main Components

### 1. InspectionsTab Component
The primary container component that manages the inspections interface.

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InspectionList } from './InspectionList';
import { InspectionTimeline } from './InspectionTimeline';
import { InspectionMap } from './InspectionMap';
import { useInspections } from '@/hooks/useInspections';
import { usePermissions } from '@/hooks/usePermissions';

interface InspectionsTabProps {
  damId: string;
  damName: string;
  damLocation: { lat: number; lon: number };
}

export function InspectionsTab({ damId, damName, damLocation }: InspectionsTabProps) {
  const [view, setView] = useState<'list' | 'timeline' | 'map'>('list');
  const [selectedInspection, setSelectedInspection] = useState<string | null>(null);
  const [filters, setFilters] = useState<InspectionFilters>({
    status: [],
    type: [],
    dateRange: { start: null, end: null },
    severity: [],
    search: ''
  });

  const { inspections, loading, error, refresh } = useInspections(damId, filters);
  const { canCreate, canApprove } = usePermissions('inspection');

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inspections</h2>
        <div className="flex items-center gap-4">
          {canCreate && (
            <Button onClick={() => router.push(`/dams/${damId}/inspections/new`)}>
              <Plus className="w-4 h-4 mr-2" />
              New Inspection
            </Button>
          )}
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* View selector */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList>
          <TabsTrigger value="list">
            <List className="w-4 h-4 mr-2" />
            List
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Calendar className="w-4 h-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapPin className="w-4 h-4 mr-2" />
            Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <InspectionList
            inspections={inspections}
            loading={loading}
            filters={filters}
            onFilterChange={setFilters}
            onInspectionSelect={setSelectedInspection}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <InspectionTimeline
            inspections={inspections}
            loading={loading}
            onInspectionSelect={setSelectedInspection}
          />
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <InspectionMap
            damLocation={damLocation}
            inspections={inspections}
            loading={loading}
            onInspectionSelect={setSelectedInspection}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 2. InspectionList Component
Displays inspections in a filterable, sortable list.

```typescript
interface InspectionListProps {
  inspections: Inspection[];
  loading: boolean;
  filters: InspectionFilters;
  onFilterChange: (filters: InspectionFilters) => void;
  onInspectionSelect: (id: string) => void;
}

export function InspectionList({ 
  inspections, 
  loading, 
  filters, 
  onFilterChange,
  onInspectionSelect 
}: InspectionListProps) {
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'severity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              value={filters.status}
              onValueChange={(value) => onFilterChange({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
              </SelectContent>
            </Select>

            {/* Additional filter controls */}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : inspections.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No inspections found</p>
            </CardContent>
          </Card>
        ) : (
          inspections.map((inspection) => (
            <InspectionCard
              key={inspection.id}
              inspection={inspection}
              onClick={() => onInspectionSelect(inspection.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

### 3. InspectionTimeline Component
Visual timeline of inspections using the existing TimelineComponent.

```typescript
import { TimelineComponent } from '@/components/Timeline/TimelineComponent';

export function InspectionTimeline({ inspections, onInspectionSelect }) {
  // Transform inspections to timeline format
  const timelineData = inspections.map(inspection => ({
    id: inspection.id,
    date: inspection.inspectedAt,
    title: inspection.title,
    type: getTimelineType(inspection.type),
    description: inspection.summary,
    metadata: {
      status: inspection.status,
      severity: inspection.maxSeverity,
      inspector: inspection.inspector.name,
      observationCount: inspection.statistics.observationCount
    }
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspection Timeline</CardTitle>
        <CardDescription>
          Visual history of all inspections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TimelineComponent
          data={timelineData}
          onItemClick={(item) => onInspectionSelect(item.id)}
          showYearMarkers
          interactive
        />
      </CardContent>
    </Card>
  );
}
```

### 4. InspectionDetail Component
Comprehensive view of a single inspection.

```typescript
export function InspectionDetail({ inspectionId }: { inspectionId: string }) {
  const { inspection, loading, error } = useInspection(inspectionId);
  const { canEdit, canApprove } = usePermissions('inspection', inspection);
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert error={error} />;
  if (!inspection) return <NotFound />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{inspection.title}</h1>
          <p className="text-muted-foreground mt-1">
            Inspection #{inspection.inspectionNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={inspection.status} />
          <ConditionBadge condition={inspection.overallCondition} />
        </div>
      </div>

      {/* Key Information */}
      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">Inspected</p>
            <p className="font-medium">{formatDate(inspection.inspectedAt)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Inspector</p>
            <p className="font-medium">{inspection.inspector.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-medium">{formatDuration(inspection.duration)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Water Level</p>
            <p className="font-medium">{inspection.waterLevel} ft</p>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="observations">
            Observations ({inspection.statistics.observationCount})
          </TabsTrigger>
          <TabsTrigger value="media">
            Media ({inspection.statistics.mediaCount})
          </TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <InspectionOverview inspection={inspection} />
        </TabsContent>

        <TabsContent value="observations">
          <ObservationList 
            observations={inspection.observations}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="media">
          <MediaGallery 
            media={inspection.media}
            canUpload={canEdit}
          />
        </TabsContent>

        <TabsContent value="report">
          <InspectionReport inspection={inspection} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 5. MediaGallery Component
Rich media viewer with upload capabilities.

```typescript
export function MediaGallery({ media, canUpload }) {
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'photos' | 'videos' | 'documents'>('all');

  const filteredMedia = media.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'photos') return item.type === 'PHOTO';
    if (filter === 'videos') return item.type === 'VIDEO';
    if (filter === 'documents') return item.type === 'DOCUMENT';
    return false;
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ToggleGroup value={viewMode} onValueChange={setViewMode}>
            <ToggleGroupItem value="grid">
              <Grid3x3 className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list">
              <List className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Media</SelectItem>
              <SelectItem value="photos">Photos</SelectItem>
              <SelectItem value="videos">Videos</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canUpload && <MediaUploader />}
      </div>

      {/* Gallery */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <MediaThumbnail
              key={item.id}
              media={item}
              onClick={() => setSelectedMedia(item)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMedia.map((item) => (
            <MediaListItem
              key={item.id}
              media={item}
              onClick={() => setSelectedMedia(item)}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedMedia && (
        <MediaLightbox
          media={selectedMedia}
          allMedia={filteredMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
}
```

## State Management

### 1. Data Fetching with SWR
```typescript
// hooks/useInspections.ts
export function useInspections(damId: string, filters: InspectionFilters) {
  const { data, error, mutate } = useSWR(
    [`/api/dams/${damId}/inspections`, filters],
    ([url, filters]) => fetchInspections(url, filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // 30 seconds
    }
  );

  return {
    inspections: data?.data || [],
    pagination: data?.pagination,
    loading: !data && !error,
    error,
    refresh: mutate
  };
}
```

### 2. Optimistic Updates
```typescript
// hooks/useInspectionMutations.ts
export function useInspectionMutations() {
  const { mutate } = useSWRConfig();

  const updateInspectionStatus = async (
    damId: string,
    inspectionId: string,
    newStatus: InspectionStatus
  ) => {
    // Optimistic update
    mutate(
      `/api/dams/${damId}/inspections/${inspectionId}`,
      async (inspection: Inspection) => ({
        ...inspection,
        status: newStatus
      }),
      false
    );

    // Server update
    try {
      await api.patch(`/api/dams/${damId}/inspections/${inspectionId}`, {
        status: newStatus
      });
      
      // Revalidate
      mutate(`/api/dams/${damId}/inspections/${inspectionId}`);
    } catch (error) {
      // Rollback on error
      mutate(`/api/dams/${damId}/inspections/${inspectionId}`);
      throw error;
    }
  };

  return { updateInspectionStatus };
}
```

### 3. Real-time Updates
```typescript
// hooks/useInspectionWebSocket.ts
export function useInspectionWebSocket(damId: string) {
  const { mutate } = useSWRConfig();
  
  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: [`inspection:${damId}`]
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'inspection.updated':
          mutate(`/api/dams/${damId}/inspections/${data.inspectionId}`);
          break;
        case 'inspection.created':
          mutate(`/api/dams/${damId}/inspections`);
          break;
      }
    };
    
    return () => ws.close();
  }, [damId]);
}
```

## UI Components

### 1. Status Badge
```typescript
export function StatusBadge({ status }: { status: InspectionStatus }) {
  const config = {
    DRAFT: { color: 'gray', icon: FileText },
    IN_PROGRESS: { color: 'blue', icon: Clock },
    SUBMITTED: { color: 'yellow', icon: Send },
    IN_REVIEW: { color: 'orange', icon: Eye },
    APPROVED: { color: 'green', icon: CheckCircle },
    REJECTED: { color: 'red', icon: XCircle },
    ARCHIVED: { color: 'gray', icon: Archive }
  };

  const { color, icon: Icon } = config[status];

  return (
    <Badge variant={color as any}>
      <Icon className="w-3 h-3 mr-1" />
      {status.replace('_', ' ')}
    </Badge>
  );
}
```

### 2. Observation Severity Indicator
```typescript
export function SeverityIndicator({ severity }: { severity: ObservationSeverity }) {
  const config = {
    INFO: { color: 'blue', label: 'Info' },
    MINOR: { color: 'green', label: 'Minor' },
    MODERATE: { color: 'yellow', label: 'Moderate' },
    MAJOR: { color: 'orange', label: 'Major' },
    CRITICAL: { color: 'red', label: 'Critical' },
    EMERGENCY: { color: 'red', label: 'Emergency', pulse: true }
  };

  const { color, label, pulse } = config[severity];

  return (
    <div className={`flex items-center gap-2 ${pulse ? 'animate-pulse' : ''}`}>
      <div className={`w-3 h-3 rounded-full bg-${color}-500`} />
      <span className={`text-sm font-medium text-${color}-700`}>{label}</span>
    </div>
  );
}
```

## Performance Optimizations

### 1. Image Loading
```typescript
// components/OptimizedImage.tsx
export function OptimizedImage({ src, alt, ...props }) {
  return (
    <Image
      src={src}
      alt={alt}
      placeholder="blur"
      blurDataURL={generateBlurDataURL(src)}
      loading="lazy"
      {...props}
    />
  );
}
```

### 2. Virtual Scrolling
```typescript
// For long lists of observations
import { FixedSizeList } from 'react-window';

export function VirtualObservationList({ observations }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ObservationCard observation={observations[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={observations.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### 3. Bundle Splitting
```typescript
// Lazy load heavy components
const PDFViewer = dynamic(() => import('./PDFViewer'), {
  loading: () => <p>Loading PDF viewer...</p>,
  ssr: false
});

const MediaLightbox = dynamic(() => import('./MediaLightbox'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});
```

## Accessibility

### 1. Keyboard Navigation
```typescript
export function InspectionCard({ inspection, onClick }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {/* Content */}
    </Card>
  );
}
```

### 2. Screen Reader Support
```typescript
<div role="region" aria-label="Inspection details">
  <h2 id="inspection-title">{inspection.title}</h2>
  <div role="status" aria-live="polite">
    {inspection.status === 'IN_PROGRESS' && (
      <span>Inspection in progress</span>
    )}
  </div>
</div>
```

### 3. Color Contrast
All color combinations meet WCAG AA standards:
- Text on backgrounds: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

## Error Handling

### 1. Error Boundaries
```typescript
export class InspectionErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Inspection module error:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            Unable to load inspection data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
```

### 2. Network Error Handling
```typescript
export function useNetworkError() {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOnline };
}
```