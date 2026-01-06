# Analytics & Insights - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)

---

## Overview

Analytics provide insights for both:
- **Sellers**: View counts, search hits, and performance of their listings.
- **Admin**: Platform growth, user retention, and revenue.

---

## Types & Interfaces

```typescript
export interface SellerAnalytics {
  totalViews: number;
  totalSaves: number;
  totalMessages: number;
  
  topListings: {
    id: string;
    title: string;
    views: number;
  }[];
  
  viewsByDay: {
    date: string; // YYYY-MM-DD
    count: number;
  }[];
}

export interface PlatformGrowthStats {
  users: { total: number; growth: number };
  listings: { total: number; growth: number };
  revenue: { total: number; growth: number };
}
```

---

## API Endpoints

### 1. Seller Dashboard Stats

**Endpoint:** `GET /api/analytics/seller`

**Response:** matches `SellerAnalytics`

### 2. Listing Specific Stats

**Endpoint:** `GET /api/analytics/listings/:id`

### 3. Record Event (Frontend Tracking)

**Endpoint:** `POST /api/analytics/platform/events`

**Body:**
```json
{
  "eventType": "VIEW_LISTING",
  "metadata": { "listingId": "123" }
}
```

---

## Frontend Implementation

### Chart Component (Recharts)

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useSellerAnalytics } from '../hooks/useAnalytics';

export function ViewsChart() {
  const { data } = useSellerAnalytics();

  if (!data) return <Skeleton />;

  return (
    <div className="h-64">
      <h3>Views this week</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.viewsByDay}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Auto-Tracker Hook

```typescript
export const useTrackEvent = () => {
  return useMutation({
    mutationFn: (event: { type: string, meta?: any }) => 
      api.post('/analytics/platform/events', {
        eventType: event.type,
        metadata: event.meta
      })
  });
};

// Usage in Listing Detail
useEffect(() => {
  track({ type: 'VIEW_LISTING', meta: { id } });
}, [id]);
```
