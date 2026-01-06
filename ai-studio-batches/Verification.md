# User Verification - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)

---

## Overview

To become a verified seller (and gain the "Verified Badge"), users must upload a valid Student ID or Government ID.

**Process:**
1. User uploads Front/Back photos.
2. Status becomes `PENDING`.
3. Admin reviews (see `Admin_Verification.md`).
4. Status becomes `APPROVED` or `REJECTED`.

---

## Types & Interfaces

```typescript
export interface VerificationStatus {
  isVerified: boolean;
  status: 'NOT_VERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  level: 'BASIC' | 'VERIFIED' | 'PREMIUM';
  currentRequest?: {
    id: string;
    adminNotes?: string; // Reason for rejection
    createdAt: string;
    documentFrontUrl?: string; // For preview
  };
}
```

---

## API Endpoints

### 1. New Verification Request

**Endpoint:** `POST /api/verification/upload-id`  
**Headers:** `Content-Type: multipart/form-data`

**FormData:**
- `documentType`: 'STUDENT_ID' | 'NIN' | 'VOTERS_CARD'
- `documentFront`: File
- `documentBack`: File

**Response:**
```json
{
  "message": "Verification submitted",
  "status": "PENDING"
}
```

### 2. Check Status

**Endpoint:** `GET /api/verification/status`

**Response:**
```json
{
  "status": "REJECTED",
  "adminNotes": "Image blurry, please retake."
}
```

---

## Frontend Implementation

### Verification Wizard

```tsx
import { useState } from 'react';
import { useUploadVerification } from '../hooks/useVerification';

export function VerificationPage() {
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const { mutate, isPending } = useUploadVerification();

  const handleSubmit = () => {
    if (!front || !back) return toast.error('Both images required');
    
    const formData = new FormData();
    formData.append('documentType', 'STUDENT_ID');
    formData.append('documentFront', front);
    formData.append('documentBack', back);

    mutate(formData);
  };

  return (
    <div className="max-w-md mx-auto p-6 glass-panel">
      <h1>Get Verified</h1>
      <p>Upload your Student ID to unlock selling features.</p>

      {/* Upload Inputs */}
      <ImageUploader label="Front of ID" onChange={setFront} />
      <ImageUploader label="Back of ID" onChange={setBack} />

      <button onClick={handleSubmit} disabled={isPending} className="btn-primary w-full mt-6">
        {isPending ? 'Uploading...' : 'Submit for Review'}
      </button>
    </div>
  );
}
```
