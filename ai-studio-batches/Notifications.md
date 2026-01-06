# Notifications - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)

---

## Overview

Notifications alert users to important events:
- New messages
- Transaction updates
- Price drops on saved items
- System announcements

---

## Types & Interfaces

```typescript
export type NotificationType = 'MESSAGE' | 'TRANSACTION' | 'SYSTEM' | 'PRICE_ALERT';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any; // Metadata like listingId, transactionId
  isRead: boolean;
  createdAt: string;
}
```

---

## API Endpoints

### 1. Get Notifications

**Endpoint:** `GET /api/notifications`

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif-1",
      "type": "TRANSACTION",
      "title": "Payment Received",
      "body": "User X has paid for your item...",
      "isRead": false
    }
  ],
  "unreadCount": 5
}
```

### 2. Mark as Read

**Endpoint:** `POST /api/notifications/:id/read`

### 3. Mark All Read

**Endpoint:** `POST /api/notifications/read-all`

---

## Frontend Implementation

### Global Notification Bell

```tsx
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export function NotificationBell() {
  const { data } = useNotifications();
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="relative">
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
}
```

### Auto-Refresh Hook

```typescript
export const useNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: api.getNotifications,
    refetchInterval: 10000, // Check every 10 seconds
  });
};
```
