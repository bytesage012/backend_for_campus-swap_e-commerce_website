# Watchlist & Saved Items - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)

---

## Overview

Users can bookmark listings they are interested in. This is often represented by a "Heart" icon.

---

## Types & Interfaces

```typescript
import { Listing } from './Listings';

export interface SavedItem {
  id: string; // The ID of the saved record, NOT the listing ID
  listingId: string;
  userId: string;
  createdAt: string;
  
  listing: Listing; // Full listing details usually included in list view
}
```

---

## API Endpoints

### 1. Toggle Save (Add/Remove)

**Endpoint:** `POST /api/listings/:id/save`  
**Endpoint:** `DELETE /api/listings/:id/save`

**Note:** The backend might support a toggle endpoint or distinct Add/Remove. Assuming separate for clarity.

### 2. Get Watchlist

**Endpoint:** `GET /api/watchlist`

**Response:**
```json
{
  "savedItems": [
    {
      "id": "save-1",
      "listingId": "list-123",
      "createdAt": "...",
      "listing": {
        "title": "Old Textbooks",
        "price": 2000
      }
    }
  ]
}
```

---

## Frontend Implementation

### Toggle Hook (Optimistic Updates)

This is crucial for the UI to feel "snappy" when clicking the heart icon.

```typescript
export const useToggleSave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, isSaved }: { listingId: string, isSaved: boolean }) => {
      // If currently saved -> DELETE. If not -> POST
      if (isSaved) {
        await api.delete(`/listings/${listingId}/save`);
      } else {
        await api.post(`/listings/${listingId}/save`);
      }
    },
    onMutate: async ({ listingId, isSaved }) => {
      // Cancel refetches
      await queryClient.cancelQueries({ queryKey: ['listing', listingId] });

      // Creating optimistic update logic can be complex for lists, 
      // but for a single button it's often visual state only.
      // We return the previous state to rollback if needed.
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      // Also invalidate specific listing to sync 'saved' count
      queryClient.invalidateQueries({ queryKey: ['listings'] }); 
    }
  });
};
```

### Heart Button Component

```tsx
import { Heart } from 'lucide-react';

export function SaveButton({ listingId, initialIsSaved }: { listingId: string, initialIsSaved: boolean }) {
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const { mutate } = useToggleSave();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to listing details
    setIsSaved(!isSaved); // Immediate visual feedback
    mutate({ listingId, isSaved });
  };

  return (
    <button onClick={handleClick} className="p-2 rounded-full hover:bg-slate-100">
      <Heart 
        className={`w-6 h-6 transition-colors ${
          isSaved ? 'fill-red-500 text-red-500' : 'text-slate-400'
        }`} 
      />
    </button>
  );
}
```
