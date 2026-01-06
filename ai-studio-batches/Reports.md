# Reports & Safety - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)

---

## Overview

The Reporting system is crucial for community safety. Users can report:
- **Other Users**: For harassment, spam, etc.
- **Listings**: For prohibited items, scams, etc.
- **Transactions**: (Handled via Dispute in Transactions.md, but reports can be linked).

---

## Types & Interfaces

```typescript
export type ReportReason = 
  | 'PROHIBITED_ITEM' 
  | 'MISLEADING' 
  | 'SCAM' 
  | 'HARASSMENT' 
  | 'INAPPROPRIATE_BEHAVIOR';

export interface ReportDTO {
  reason: ReportReason;
  description: string;
  evidenceUrls?: string[]; // Screenshots
}
```

---

## API Endpoints

### 1. Report User

**Endpoint:** `POST /api/reports/user/:id`

**Body:** `ReportDTO`

### 2. Report Listing

**Endpoint:** `POST /api/reports/listing/:id`

**Body:** `ReportDTO`

---

## Frontend Implementation

### Report Dialog

```tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';

export function ReportDialog({ targetId, type, onClose }: { targetId: string, type: 'user' | 'listing', onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason>('MISLEADING');
  const [desc, setDesc] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post(`/reports/${type}/${targetId}`, {
        reason,
        description: desc
      });
    },
    onSuccess: () => {
      toast.success('Report submitted. We will review it shortly.');
      onClose();
    }
  });

  return (
    <Dialog open onClose={onClose}>
      <h3 className="text-red-600 font-bold mb-4">Report {type === 'user' ? 'User' : 'Listing'}</h3>
      
      <label>Reason</label>
      <select value={reason} onChange={e => setReason(e.target.value as any)} className="input mb-4">
        <option value="SCAM">Scam / Fraud</option>
        <option value="HARASSMENT">Harassment</option>
        <option value="PROHIBITED_ITEM">Prohibited Item</option>
        <option value="MISLEADING">Misleading Info</option>
      </select>

      <label>Description</label>
      <textarea 
        value={desc} 
        onChange={e => setDesc(e.target.value)}
        className="input mb-4"
        placeholder="Please provide details..."
      />

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-outline">Cancel</button>
        <button onClick={() => mutation.mutate()} className="btn-danger">
          Submit Report
        </button>
      </div>
    </Dialog>
  );
}
```
