# Payment & Integration - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)

---

## Overview

We use **Paystack** for payments.
1. Frontend requests authorization URL from Backend.
2. User is redirected to Paystack (or popup).
3. On completion, Paystack calls our Webhook.
4. User is redirected back to `/payment/success`.

---

## Types & Interfaces

```typescript
export interface PaymentInitializeResponse {
  authorizationDate: string;
  reference: string;
  authorizationUrl: string; // Redirect user here
  accessCode: string; // For inline popup
}

export interface DepositDTO {
  amount: number; // In Naira (e.g., 5000)
  channel: 'card' | 'bank_transfer' | 'ussd';
}
```

---

## API Endpoints

### 1. Initialize Deposit

**Endpoint:** `POST /api/payment/deposit`

**Body:**
```json
{
  "amount": 5000,
  "email": "user@unn.edu.ng"
}
```

**Response:**
```json
{
  "authorizationUrl": "https://checkout.paystack.com/...",
  "reference": "T394583905"
}
```

### 2. Payment Webhook (Backend Only)

**Endpoint:** `POST /api/payment/webhook`

**Note:** Frontend does not call this. Paystack server calls this.

---

## Frontend Implementation

### Deposit Modal with Redirect

```tsx
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';

export function DepositModal() {
  const [amount, setAmount] = useState('');
  
  const { mutate, isPending } = useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post('/payment/deposit', { amount });
      return data;
    },
    onSuccess: (data) => {
      // Redirect to Paystack
      window.location.href = data.authorizationUrl;
    }
  });

  return (
    <div>
      <h3>Fund Wallet</h3>
      <input 
        type="number" 
        value={amount} 
        onChange={e => setAmount(e.target.value)} 
        placeholder="Amount (₦)"
      />
      <button 
        onClick={() => mutate(Number(amount))}
        disabled={isPending}
        className="btn-primary"
      >
        {isPending ? 'Connecting...' : 'Pay with Paystack'}
      </button>
    </div>
  );
}
```
