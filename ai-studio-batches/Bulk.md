# Bulk Operations - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)

---

## Overview

Bulk operations allow performing actions on many items at once. Since these can take time, they are **asynchronous**.
1. Client submits request (e.g., "Export 1000 users").
2. Server returns `202 Accepted` with an `operationId`.
3. Client polls status until `COMPLETED`.
4. Client downloads result URL.

---

## Types & Interfaces

```typescript
export type BulkStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface BulkOperation {
  id: string;
  type: 'EXPORT' | 'BULK_CREATE' | 'PRICE_OPTIMIZE';
  status: BulkStatus;
  progress: number; // 0-100
  resultUrl?: string;
  error?: string;
}
```

---

## API Endpoints

### 1. Start Bulk Export

**Endpoint:** `POST /api/bulk/export`

**Response:**
```json
{
  "message": "Export started",
  "id": "bulk-123"
}
```

### 2. Check Status

**Endpoint:** `GET /api/bulk/status/:id`

**Response:**
```json
{
  "id": "bulk-123",
  "status": "PROCESSING",
  "progress": 45
}
```

---

## Frontend Implementation

### Polling Hook (React Query)

```typescript
export const useBulkStatus = (operationId: string | null) => {
  return useQuery({
    queryKey: ['bulk', operationId],
    queryFn: () => api.get(`/bulk/status/${operationId}`).then(res => res.data),
    enabled: !!operationId,
    refetchInterval: (data) => {
      // Stop polling if complete or failed
      if (data?.status === 'COMPLETED' || data?.status === 'FAILED') return false;
      return 2000; // Poll every 2s
    }
  });
};
```

### Export Button with Progress

```tsx
export function ExportButton() {
  const [opId, setOpId] = useState<string | null>(null);
  const { mutate } = useStartExport();
  const { data: status } = useBulkStatus(opId);

  const handleStart = () => {
    mutate(null, { onSuccess: (res) => setOpId(res.id) });
  };

  if (status?.status === 'PROCESSING') {
    return <button disabled>Exporting {status.progress}%...</button>;
  }

  if (status?.status === 'COMPLETED') {
    return (
      <a href={status.resultUrl} className="btn-success" download>
        Download File
      </a>
    );
  }

  return <button onClick={handleStart}>Start Export</button>;
}
```
