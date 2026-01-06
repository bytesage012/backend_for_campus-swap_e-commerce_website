# Listings & Marketplace - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)
5. [Filtering & Search](#filtering--search)

---

## Overview

The Listings API handles the core marketplace functionality. It includes creating listings with images, searching/filtering, and managing listing status (e.g., marking as sold).

**Key Features:**
- **Status Lifecycle**: `DRAFT` -> `ACTIVE` -> `RESERVED` -> `SOLD`.
- **Image Handling**: Supports multiple image uploads via `multipart/form-data`.
- **Search**: Flexible search by title, category, price range, and faculty.

---

## Types & Interfaces

```typescript
import { User } from './Auth'; // Assuming shared types

export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'RESERVED' | 'SOLD' | 'ARCHIVED';
export type ItemCondition = 'NEW' | 'USED' | 'FAIR';

export interface ListingImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: string; // Decimal string from backend
  category: string;
  condition: ItemCondition;
  status: ListingStatus;
  
  // Location/Context
  faculty: string | null;
  department: string | null;
  
  // Relations
  images: ListingImage[];
  sellerId: string;
  seller?: User; // Included in details view
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Analytics (Optional)
  views?: number;
  saves?: number;
}

export interface CreateListingDTO {
  title: string;
  description: string;
  price: number;
  category: string;
  condition: ItemCondition;
  images: File[]; // For frontend form
}
```

---

## API Endpoints

### 1. Get All Listings (Feed)

**Endpoint:** `GET /api/listings`

**Query Parameters:**
- `page`: number (default 1)
- `limit`: number (default 20)
- `category`: string (optional)
- `minPrice`: number (optional)
- `maxPrice`: number (optional)
- `sort`: 'newest' | 'price_asc' | 'price_desc'

**Response:**
```json
{
  "data": [
    {
      "id": "list-123",
      "title": "Calculus Textbook",
      "price": "5000.00",
      "images": [{ "url": "https://...", "isPrimary": true }],
      "seller": { "fullName": "John Doe", "isVerified": true }
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "lastPage": 5
  }
}
```

### 2. Get Single Listing

**Endpoint:** `GET /api/listings/:id`

**Response:**
```json
{
  "id": "list-123",
  "title": "Calculus Textbook",
  "description": "Used engineering mathematics textbook...",
  "images": [...],
  "seller": { ... },
  "relatedListings": [...]
}
```

### 3. Create Listing

**Endpoint:** `POST /api/listings`  
**Headers:** `Content-Type: multipart/form-data`

**FormData Fields:**
- `title`: string
- `description`: string
- `price`: number
- `category`: string
- `condition`: 'NEW' | 'USED' | 'FAIR'
- `images`: File[] (Multiple files supported)

### 4. Update Status (e.g., Mark Sold)

**Endpoint:** `PATCH /api/listings/:id/status`

**Body:**
```json
{
  "status": "SOLD"
}
```

### 5. Search

**Endpoint:** `GET /api/listings/search`

**Query:** `?q=search_term`

---

## Frontend Implementation

### React Query Hooks

```typescript
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import api from '../lib/api';

// --- Infinite Feed Hook ---
export const useListingsFeed = (filters: any) => {
  return useInfiniteQuery({
    queryKey: ['listings', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get('/listings', {
        params: { ...filters, page: pageParam }
      });
      return data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.lastPage) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
};

// --- Create Listing Mutation ---
export const useCreateListing = () => {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post('/listings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },
  });
};
```

### Marketplace Filter Component

```tsx
import { useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';

export function ListingFilters({ onFilterChange }: { onFilterChange: (f: any) => void }) {
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest'
  });

  const handleChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="flex flex-col gap-4 p-4 glass-panel">
      {/* Category */}
      <select 
        value={filters.category}
        onChange={(e) => handleChange('category', e.target.value)}
        className="input"
      >
        <option value="">All Categories</option>
        <option value="textbooks">Textbooks</option>
        <option value="electronics">Electronics</option>
        <option value="access_codes">Access Codes</option>
      </select>

      {/* Price Range */}
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Min Price"
          value={filters.minPrice}
          onChange={(e) => handleChange('minPrice', e.target.value)}
          className="input w-1/2"
        />
        <input
          type="number"
          placeholder="Max Price"
          value={filters.maxPrice}
          onChange={(e) => handleChange('maxPrice', e.target.value)}
          className="input w-1/2"
        />
      </div>
    </div>
  );
}
```

---

## Validation (Zod)

```typescript
import { z } from 'zod';

export const listingSchema = z.object({
  title: z.string().min(5, 'Title too short').max(100),
  description: z.string().min(20, 'Please provide more detail'),
  price: z.number().min(500, 'Minimum price is ₦500'),
  category: z.string().min(1, 'Category is required'),
  condition: z.enum(['NEW', 'USED', 'FAIR']),
  // File validation handled separately or via generic types
});
```
