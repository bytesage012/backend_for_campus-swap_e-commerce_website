# Escrow & Smart Contracts - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)

---

## Overview

The Smart Contract system automates the trust between Buyer and Seller.
- It is created automatically when a transaction starts.
- It tracks the state: `CREATED` -> `SIGNED` -> `FUNDED` -> `ACTIVE` -> `COMPLETED`.
- It handles digital signatures (simulated or real) to bind the agreement.

> [!NOTE]
> This is a simplified "Smart Contract" running on the backend database, not a blockchain, but it enforces similar invariants.

---

## Types & Interfaces

```typescript
export type ContractStatus = 'CREATED' | 'SIGNED' | 'FUNDED' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED';

export interface SmartContract {
  id: string;
  transactionId: string;
  terms: {
    price: number;
    platformFee: number;
    escrowReleaseCondition: 'BUYER_CONFIRMATION';
  };
  state: {
    buyerSigned: boolean;
    sellerSigned: boolean;
    fundsLocked: boolean;
  };
  status: ContractStatus;
  createdAt: string;
}
```

---

## API Endpoints

### 1. Get Contract for Transaction

**Endpoint:** `GET /api/escrow/smart-contract/:id` (where ID is transaction ID or Contract ID)

### 2. Sign Contract (Accept Terms)

**Endpoint:** `POST /api/escrow/smart-contract/:id/sign`

**Purpose:** Buyer/Seller explicitly agrees to terms.

### 3. Release Funds (Simulate Smart Contract Execution)

**Endpoint:** `POST /api/escrow/smart-contract/:id/release`

**Note:** Usually called internally by `confirm-receipt`, but available for Admin overrides.

---

## Frontend Implementation

### Contract Status Logic

```tsx
function ContractStatusBadge({ contract }: { contract: SmartContract }) {
  if (contract.status === 'COMPLETED') return <Badge color="green">Funds Released</Badge>;
  if (contract.state.fundsLocked) return <Badge color="blue">Funds Secured in Escrow</Badge>;
  if (!contract.state.buyerSigned) return <Badge color="yellow">Waiting for Buyer Signature</Badge>;
  
  return <Badge>Draft</Badge>;
}
```

### Signature Flow

```tsx
const { mutate: sign } = useSignContract();

const handleAcceptTerms = () => {
  sign(contract.id, {
    onSuccess: () => toast.success('Contract Signed! Proceeding to payment...')
  });
};

return (
  <div className="p-4 border rounded">
    <h3>Escrow Agreement</h3>
    <pre>{JSON.stringify(contract.terms, null, 2)}</pre>
    <button onClick={handleAcceptTerms} className="btn-primary w-full mt-4">
      I Agree & Sign
    </button>
  </div>
);
```
