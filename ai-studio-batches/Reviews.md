# Reviews & Ratings - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)

---

## Overview

Reviews allow users to rate their transaction partners. This builds trust (Trust Score) in the system.

**Rules:**
- Reviews can only be submitted *after* a transaction is completed.
- Both Buyer and Seller can review each other.
- Ratings are 1-5 stars.

---

## Types & Interfaces

```typescript
export interface Review {
  id: string;
  reviewerId: string;
  targetId: string;
  transactionId?: string; // Optional context
  rating: number; // 1-5
  comment: string | null;
  createdAt: string;
  
  reviewer: {
    id: string;
    fullName: string;
    avatarUrl: string;
  };
}

export interface RatingSummary {
  average: number;
  total: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
```

---

## API Endpoints

### 1. Submit Review

**Endpoint:** `POST /api/transactions/:id/review`

**Body:**
```json
{
  "rating": 5,
  "comment": "Great seller, very fast delivery!"
}
```

### 2. Get User Reviews

**Endpoint:** `GET /api/users/:id/reviews`

**Response:**
```json
{
  "reviews": [
    {
      "id": "rev-1",
      "rating": 5,
      "comment": "Great!",
      "reviewer": { "fullName": "Alice" }
    }
  ]
}
```

### 3. Get Rating Summary

**Endpoint:** `GET /api/users/:id/rating-summary`

**Response:**
```json
{
  "average": 4.8,
  "total": 50,
  "distribution": { "5": 40, "4": 10, ... }
}
```

---

## Frontend Implementation

### Star Rating Input

```tsx
import { Star } from 'lucide-react';
import { useState } from 'react';

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`focus:outline-none transition-colors ${
            star <= (hover || value) ? 'text-yellow-400' : 'text-slate-300'
          }`}
        >
          <Star className="w-8 h-8 fill-current" />
        </button>
      ))}
    </div>
  );
}
```

### Review Modal

```tsx
export function ReviewModal({ transactionId, onClose }: any) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const { mutate, isPending } = useSubmitReview();

  const handleSubmit = () => {
    mutate({ transactionId, rating, comment }, { onSuccess: onClose });
  };

  return (
    <Dialog open onClose={onClose}>
      <h3>Rate your experience</h3>
      <StarInput value={rating} onChange={setRating} />
      <textarea 
        value={comment} 
        onChange={e => setComment(e.target.value)}
        placeholder="Write a review..."
        className="input mt-4"
      />
      <button onClick={handleSubmit} disabled={isPending} className="btn-primary mt-4">
        Submit Review
      </button>
    </Dialog>
  );
}
```
