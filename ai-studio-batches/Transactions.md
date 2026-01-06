# Transactions & Escrow Management - Frontend Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)
5. [Escrow Flow](#escrow-flow)

---

## Overview

This module manages the lifecycle of a transaction, particularly focusing on **Escrow** safety.
- **Buyers** pay into a secure holding account.
- **Sellers** are notified to deliver.
- **Buyers** confirm receipt -> Funds released to Seller.
- **Disputes** freeze funds until Admin intervenes.

---

## Types & Interfaces

```typescript
export type EscrowStatus = 
  | 'PENDING'            // Waiting for payment
  | 'HELD'               // Paid, funds held
  | 'RELEASE_SCHEDULED'  // Timer started for release
  | 'RELEASED'           // Paid to seller
  | 'DISPUTED'           // Frozen
  | 'REFUNDED';          // Returned to buyer

export interface TransactionDetails {
  id: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  
  // Escrow Specifics
  escrowStatus: EscrowStatus;
  escrowReleaseDate?: string;
  disputeLikelihood: number;
  
  // Relations
  buyer: { id: string; fullName: string };
  seller: { id: string; fullName: string };
  listing: { id: string; title: string; image: string };
  
  timeline: {
    state: string;
    timestamp: string;
    description: string;
  }[];
}
```

---

## API Endpoints

### 1. Confirm Receipt (Releases Funds)

**Endpoint:** `POST /api/transactions/:id/confirm-receipt`

**Purpose:** Buyer confirms they received the item. Triggers fund release to seller.

**Response:**
```json
{
  "message": "Transaction completed",
  "transaction": {
    "id": "tx-123",
    "status": "SUCCESS",
    "escrowStatus": "RELEASED"
  }
}
```

### 2. Raise Dispute

**Endpoint:** `POST /api/transactions/:id/dispute`

**Body:**
```json
{
  "reason": "Item damaged",
  "description": "The screen is cracked...",
  "evidenceUrls": ["https://..."]
}
```

### 3. Get Transaction Details

**Endpoint:** `GET /api/transactions/:id`

---

## Frontend Implementation

### Transaction Timeline Component

Visualizes the state of the transaction.

```tsx
import { CheckCircle, Clock, XCircle } from 'lucide-react';

function Timeline({ steps }: { steps: any[] }) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step.completed ? 'bg-green-100 text-green-600' : 'bg-slate-100'
            }`}>
              {step.completed ? <CheckCircle size={16} /> : <Clock size={16} />}
            </div>
            {index !== steps.length - 1 && <div className="w-0.5 h-full bg-slate-200" />}
          </div>
          <div>
            <h4 className="font-medium">{step.title}</h4>
            <p className="text-sm text-slate-500">{step.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Action Buttons (Dynamic based on Status)

```tsx
function TransactionActions({ transaction }: { transaction: TransactionDetails }) {
  const { mutate: confirm } = useConfirmReceipt();
  const { mutate: dispute } = useRaiseDispute();

  if (transaction.escrowStatus === 'HELD') {
    return (
      <div className="flex gap-4">
        <button 
          onClick={() => confirm(transaction.id)} 
          className="btn-success flex-1"
        >
          I have received the item
        </button>
        
        <button 
          onClick={() => openDisputeModal(transaction.id)} 
          className="btn-danger-outline"
        >
          Report Issue
        </button>
      </div>
    );
  }
  
  if (transaction.escrowStatus === 'RELEASED') {
    return <div className="badge-success">Completed</div>;
  }

  return null;
}
```

---

## Escrow Flow

1. **Purchase**: `Transaction` created with `escrowStatus: PENDING`.
2. **Payment**: User pays via Wallet/Paystack -> `escrowStatus: HELD`.
3. **Delivery**: Seller delivers item offline.
4. **Confirmation**: Buyer calls `/confirm-receipt`.
5. **Settlement**: Backend moves funds from `reservedBalance` to Seller's `balance`.
