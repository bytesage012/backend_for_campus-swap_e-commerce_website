# Conversations & Messaging - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)
5. [Realtime Strategy](#realtime-strategy)

---

## Overview

The conversation system enables direct messaging between buyers and sellers, scoped to a specific listing. This prevents spam and keeps context clear.

---

## Types & Interfaces

```typescript
import { User } from './Auth';
import { Listing } from './Listings';

export interface Message {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    fullName: string;
    avatarUrl: string;
  };
}

export interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  
  // Relations
  listing: {
    id: string;
    title: string;
    price: number;
    image: string;
    sellerId: string;
  };
  otherUser: { // Helper field from backend
    id: string;
    fullName: string;
    avatarUrl: string;
    isOnLine?: boolean;
  };
  lastMessage?: Message;
  unreadCount?: number;
  
  updatedAt: string; // Used for sorting
}

export interface SendMessageDTO {
  content: string;
}

export interface StartConversationDTO {
  listingId: string;
  initialMessage?: string;
}
```

---

## API Endpoints

### 1. List Conversations

**Endpoint:** `GET /api/conversations`

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv-1",
      "listing": { "title": "Math Textbook" },
      "otherUser": { "fullName": "Jane Doe" },
      "lastMessage": { "content": "Is this available?", "isRead": false },
      "updatedAt": "2026-01-04T12:00:00Z"
    }
  ]
}
```

### 2. Get Chat History

**Endpoint:** `GET /api/conversations/:id/messages`

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-1",
      "content": "Hello",
      "senderId": "user-1",
      "createdAt": "..."
    }
  ]
}
```

### 3. Send Message

**Endpoint:** `POST /api/conversations/:id/messages`

**Body:** `{ "content": "I can meet at the library." }`

### 4. Start Conversation

**Endpoint:** `POST /api/conversations`

**Body:** `{ "listingId": "listing-123", "initialMessage": "Hi..." }`

---

## Frontend Implementation

### Chat Window Component

```tsx
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMessages, useSendMessage } from '../hooks/useChat';

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: messages } = useMessages(conversationId);
  const { mutate: send } = useSendMessage(conversationId);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string) => {
    send({ content: text });
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} isMe={msg.senderId === myId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSend} />
    </div>
  );
}
```

---

## Realtime Strategy

For MVP, we use **Polling** (every 3-5 seconds) or `refetchInterval` in React Query.
For Scale, we will switch to **Socket.io**.

### Polling Hook Implementation

```typescript
export const useMessages = (conversationId: string) => {
  return useQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: async () => {
      const { data } = await api.get(`/conversations/${conversationId}/messages`);
      return data.messages;
    },
    refetchInterval: 3000, // Poll every 3 seconds
  });
};
```
