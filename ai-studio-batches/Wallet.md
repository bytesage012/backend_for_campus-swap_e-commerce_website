# Wallet & Payments - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)
5. [Security & Pins](#security--pins)

---

## Overview

Every user has a digital wallet for Campus Swap.
- **Balance**: Current available funds.
- **Reserved Balance**: Funds held in escrow (cannot be withdrawn).
- **Transaction PIN**: Required for withdrawals and transfers (encryption handled backend).

---

## Types & Interfaces

```typescript
export interface Wallet {
  id: string;
  balance: number;        // e.g., 5000.00
  reservedBalance: number; // e.g., 2000.00 (Escrow)
  currency: 'NGN';
  hasPin: boolean;       // True if user has set a transaction PIN
}

export type TransactionType = 'DEPOSIT' | 'PURCHASE' | 'SALE' | 'WITHDRAWAL' | 'ESCROW_HOLD';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  reference: string | null;
  description: string | null;
  createdAt: string; // ISO Date
  
  // Optional relations
  listingId?: string;
  metadata?: any;
}

export interface WithdrawalRequest {
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  pin: string; // User's transaction PIN
}
```

---

## API Endpoints

### 1. Get Wallet Balance

**Endpoint:** `GET /api/wallet/balance`

**Response:**
```json
{
  "balance": 15000.00,
  "reservedBalance": 2000.00,
  "hasPin": true
}
```

### 2. Get Transactions

**Endpoint:** `GET /api/wallet/transactions`

**Query:** `?page=1&limit=20`

**Response:**
```json
{
  "transactions": [
    {
      "id": "tx-123",
      "type": "SALE",
      "amount": 5000,
      "status": "SUCCESS",
      "description": "Sold: Calculus Textbook",
      "createdAt": "2026-01-04T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### 3. Setup/Change PIN

**Endpoint:** `POST /api/wallet/pin/setup`

**Body:**
```json
{
  "pin": "1234",
  "oldPin": "0000" // Required if changing
}
```

### 4. Withdraw Funds

**Endpoint:** `POST /api/wallet/withdraw`

**Body:**
```json
{
  "amount": 5000,
  "bankCode": "033",
  "accountNumber": "0123456789",
  "accountName": "John Doe",
  "pin": "1234"
}
```

---

## Frontend Implementation

### Bank Verification Hook (External API helper)

Before submitting a withdrawal, verify the account name.

```typescript
// Usually hits a proxy endpoint like /api/wallet/banks/resolve
export const useResolveBankAccount = () => {
  return useMutation({
    mutationFn: async ({ bankCode, accountNumber }: { bankCode: string, accountNumber: string }) => {
      const { data } = await api.post('/wallet/banks/resolve', { bankCode, accountNumber });
      return data.accountName; // "JOHN DOE"
    }
  });
};
```

### Withdrawal Modal Component

```tsx
import { useState } from 'react';
import { useWalletStore } from '../store/walletStore';

export function WithdrawalModal({ isOpen, onClose }: any) {
  const [step, setStep] = useState(1); // 1: Details, 2: PIN, 3: Success
  const [form, setForm] = useState({ amount: '', accountNumber: '', bankCode: '' });
  const [pin, setPin] = useState('');
  
  const { mutate: withdraw, isPending } = useWithdraw();

  const handleWithdraw = () => {
    withdraw({
      ...form,
      amount: Number(form.amount),
      accountName: 'Resolved Name', // In real app, resolved from step 1
      pin
    }, {
      onSuccess: () => setStep(3)
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      {step === 1 && (
        <WithdrawalForm 
          onSubmit={(data) => { setForm(data); setStep(2); }} 
        />
      )}
      
      {step === 2 && (
        <div className="space-y-4">
          <h3>Enter Transaction PIN</h3>
          <PinInput value={pin} onChange={setPin} />
          <button 
            disabled={isPending || pin.length !== 4} 
            onClick={handleWithdraw}
            className="btn-primary"
          >
            Confirm Withdrawal
          </button>
        </div>
      )}
      
      {step === 3 && <SuccessMessage />}
    </Dialog>
  );
}
```

---

## Security & Pins

> [!IMPORTANT]
> **PIN Handling Rules:**
> 1. Never store the PIN in local storage or cookies.
> 2. Always send the PIN over HTTPS.
> 3. Clear the PIN state immediately after the request completes.

### Validation Schema

```typescript
import { z } from 'zod';

export const withdrawalSchema = z.object({
  amount: z.number().min(100, 'Minimum withdrawal is ₦100'),
  bankCode: z.string().min(1, 'Select a bank'),
  accountNumber: z.string().length(10, 'Invalid account number'),
  pin: z.string().length(4, 'PIN must be 4 digits'),
});
```
