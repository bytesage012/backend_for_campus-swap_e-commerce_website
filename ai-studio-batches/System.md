# System & Health - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Frontend Implementation](#frontend-implementation)

---

## Overview

System endpoints provide metadata about the API's status, version, and configuration.

---

## API Endpoints

### 1. Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "OK",
  "uptime": 12345,
  "version": "1.0.0",
  "database": "CONNECTED",
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

## Frontend Implementation

### Status Indicator Hook

Useful for showing a "Server Offline" banner if the backend is down.

```typescript
import { useQuery } from '@tanstack/react-query';

export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => api.get('/health'),
    refetchInterval: 60000, // Check every minute
    retry: false // Don't retry aggressively if down
  });
};
```

### Banner Component

```tsx
export function SystemStatusBanner() {
  const { isError } = useSystemHealth();

  if (!isError) return null;

  return (
    <div className="bg-red-600 text-white text-center py-1 text-sm">
      ⚠️ Cannot connect to server. Some features may be unavailable.
    </div>
  );
}
```
