# Campus Swap Frontend Developer Guide

A comprehensive guide with actual request/response examples for integrating with the Campus Swap backend API.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Users & Profiles](#users--profiles)
4. [Marketplace - Listings](#marketplace---listings)
5. [Transactions & Payments](#transactions--payments)
6. [Wallet Management](#wallet-management)
7. [Reviews & Ratings](#reviews--ratings)
8. [Messaging](#messaging)
9. [Error Handling](#error-handling)
10. [Common Scenarios](#common-scenarios)

---

## Getting Started

### Base URL
```
Development: http://localhost:5000
Production: https://api.yourdomain.com
```

### Authentication
All requests (except auth endpoints) require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Content Type
All requests and responses use JSON:
```
Content-Type: application/json
```

---

## Authentication

### 1. Register New User

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "fullName": "John Doe",
    "phoneNumber": "+2348123456789",
    "faculty": "Engineering",
    "department": "Computer Science",
    "academicLevel": "200",
    "residenceArea": "Lekki"
  }'
```

**Field Constraints:**

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| `email` | string | Valid email format | ✓ |
| `password` | string | Min 8 characters | ✓ |
| `fullName` | string | Min 2 characters | ✓ |
| `phoneNumber` | string | Nigerian format: `+234XXXXXXXXXX` or `0XXXXXXXXXX` | ✓ |
| `faculty` | string | Min 1 character | ✓ |
| `department` | string | Any string | ✗ |
| `academicLevel` | string | Any string (e.g., "100", "200", "300", "400") | ✗ |
| `residenceArea` | string | Any string | ✗ |

**Example Valid Inputs:**
```json
{
  "email": "student@university.edu",
  "password": "StrongPassword123!",
  "fullName": "Jane Smith",
  "phoneNumber": "08123456789",
  "faculty": "Engineering"
}
```

**Validation Errors:**
- Invalid email: "Invalid email format"
- Password < 8 chars: "Password must be at least 8 characters long"
- Name < 2 chars: "Full name must be at least 2 characters"
- Bad phone: "Invalid Nigerian phone number"

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "uuid-12345",
      "email": "john@example.com",
      "fullName": "John Doe",
      "phoneNumber": "+2348123456789",
      "faculty": "Engineering",
      "department": "Computer Science",
      "academicLevel": "200",
      "residenceArea": "Lekki",
      "isVerified": false,
      "verificationLevel": "BASIC",
      "verificationStatus": "NOT_VERIFIED",
      "role": "USER",
      "createdAt": "2025-01-07T10:30:00Z"
    },
    "wallet": {
      "id": "wallet-uuid",
      "userId": "uuid-12345",
      "balance": 0,
      "reservedBalance": 0,
      "transactionPin": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. Login

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-12345",
      "email": "john@example.com",
      "fullName": "John Doe",
      "avatarUrl": "https://example.com/avatars/uuid-12345.jpg",
      "isVerified": false,
      "verificationLevel": "BASIC",
      "role": "USER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

---

### 3. Refresh Token

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

---

## Users & Profiles

### 1. Get Current User Profile

**Request:**
```bash
curl -X GET http://localhost:5000/api/users/me \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-12345",
    "email": "john@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+2348123456789",
    "avatarUrl": "https://example.com/avatars/uuid-12345.jpg",
    "faculty": "Engineering",
    "department": "Computer Science",
    "academicLevel": "200",
    "residenceArea": "Lekki",
    "isVerified": false,
    "verificationLevel": "BASIC",
    "verificationStatus": "NOT_VERIFIED",
    "badge": null,
    "role": "USER",
    "createdAt": "2025-01-07T10:30:00Z",
    "trustScore": 50.0,
    "riskScore": 0.0
  }
}
```

---

### 2. Update User Profile

**Field Constraints:**
| Field | Type | Validation | Required/Optional |
|-------|------|-----------|----------|
| fullName | string | Min: 2 chars, Max: 100 chars | ✗ Optional |
| phoneNumber | string | Nigerian format: +234XXXXXXXXXX or 0XXXXXXXXXX | ✗ Optional |
| residenceArea | string | Max: 100 chars | ✗ Optional |
| faculty | string | Min: 1 char | ✗ Optional |
| department | string | Max: 100 chars | ✗ Optional |

**Request:**
```bash
curl -X PATCH http://localhost:5000/api/users/me \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Updated Doe",
    "phoneNumber": "+2349012345678",
    "residenceArea": "Victoria Island",
    "faculty": "Engineering",
    "department": "Electrical Engineering"
  }'
```

**Example Valid Input:**
```json
{
  "fullName": "Jane Smith",
  "phoneNumber": "08098765432",
  "residenceArea": "Ikeja",
  "department": "Software Engineering"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid-12345",
    "email": "john@example.com",
    "fullName": "John Updated Doe",
    "phoneNumber": "+2349012345678",
    "residenceArea": "Victoria Island",
    "faculty": "Engineering",
    "department": "Electrical Engineering",
    "updatedAt": "2025-01-07T10:45:00Z"
  }
}
```

**Validation Errors:**
- Full name too short: "Full name must be at least 2 characters"
- Phone number invalid: "Invalid Nigerian phone number format"
- Faculty empty: "Faculty is required when provided"

---

### 3. Upload Avatar

**Field Constraints:**
| Field | Type | Validation | Required/Optional |
|-------|------|-----------|----------|
| file | file (multipart) | JPEG, PNG; Max: 5MB | ✓ Required |

**Request:**
```bash
curl -X POST http://localhost:5000/api/users/avatar \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/avatar.jpg"
```

**Example Valid Upload:**
```bash
# Upload JPEG file under 5MB
curl -X POST http://localhost:5000/api/users/avatar \
  -H "Authorization: Bearer <token>" \
  -F "file=@profile_photo.jpg"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatarUrl": "https://example.com/uploads/avatars/uuid-12345-timestamp.jpg",
    "fileSize": 245632,
    "filename": "uuid-12345-timestamp.jpg"
  }
}
```

**Validation Errors:**
- File too large: "File size must not exceed 5MB"
- Invalid file type: "Only JPEG and PNG files are allowed"
- No file provided: "File is required"
- Duplicate upload: "Previous avatar will be replaced"

---

## Marketplace - Listings

### 1. Create a Listing

**Request:**
```bash
curl -X POST http://localhost:5000/api/listings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Advanced Calculus Textbook",
    "description": "Lightly used, excellent condition. Includes all original notes and highlights.",
    "price": 8500,
    "category": "BOOKS",
    "condition": "GOOD",
    "images": [
      "image-uuid-1.jpg",
      "image-uuid-2.jpg"
    ],
    "location": "Lekki",
    "quantity": 1,
    "tags": ["textbook", "calculus", "semester2"]
  }'
```

**Field Constraints:**

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| `title` | string | Min 3, Max 100 characters | ✓ |
| `description` | string | Min 10, Max 1000 characters | ✓ |
| `price` | number | Positive decimal (0.01 - unlimited) | ✓ |
| `category` | enum | `BOOKS`, `NOTES`, `GOODS`, `SERVICES` | ✓ |
| `condition` | enum | `NEW`, `USED`, `FAIR` | ✓ |
| `images` | array | File names/UUIDs | ✗ |
| `location` | string | Any string | ✗ |
| `quantity` | number | Positive integer | ✗ |
| `tags` | array | Array of strings | ✗ |
| `faculty` | string | Any string | ✗ |
| `department` | string | Any string | ✗ |

**Example Valid Input:**
```json
{
  "title": "Discrete Math Notes",
  "description": "Comprehensive notes from Sem 1 covering all topics with examples.",
  "price": 2500.50,
  "category": "NOTES",
  "condition": "USED",
  "tags": ["math", "notes", "semester1"]
}
```

**Validation Errors:**
- Title < 3 chars: "Title must be at least 3 characters"
- Description < 10 chars: "Description must be at least 10 characters"
- Negative price: "Price must be positive"
- Invalid category: "Category must be BOOKS, NOTES, GOODS, or SERVICES"

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Listing created successfully",
  "data": {
    "id": "listing-uuid-001",
    "sellerId": "uuid-12345",
    "title": "Advanced Calculus Textbook",
    "description": "Lightly used, excellent condition...",
    "price": 8500,
    "category": "BOOKS",
    "condition": "GOOD",
    "location": "Lekki",
    "status": "ACTIVE",
    "images": [
      {
        "id": "img-uuid-1",
        "url": "https://example.com/uploads/listings/img-uuid-1.jpg",
        "isPrimary": true
      },
      {
        "id": "img-uuid-2",
        "url": "https://example.com/uploads/listings/img-uuid-2.jpg",
        "isPrimary": false
      }
    ],
    "seller": {
      "id": "uuid-12345",
      "fullName": "John Doe",
      "avatarUrl": "https://example.com/avatars/uuid-12345.jpg",
      "trustScore": 50.0,
      "reviewCount": 0,
      "averageRating": 0
    },
    "views": 0,
    "saves": 0,
    "createdAt": "2025-01-07T11:00:00Z"
  }
}
```

---

### 2. Get All Listings with Filters

**Query Parameters:**
| Parameter | Type | Validation | Required/Optional |
|-----------|------|-----------|----------|
| search | string | Min: 1 char, Max: 100 chars | ✗ Optional |
| category | enum | BOOKS, NOTES, GOODS, SERVICES | ✗ Optional |
| minPrice | number | Positive number (₦) | ✗ Optional |
| maxPrice | number | Positive number (₦), >= minPrice | ✗ Optional |
| condition | enum | NEW, USED, FAIR | ✗ Optional |
| location | string | Max: 100 chars | ✗ Optional |
| sortBy | enum | NEWEST, PRICE_LOW, PRICE_HIGH, RATING, TRENDING | ✗ Optional (default: NEWEST) |
| page | number | Min: 1 | ✗ Optional (default: 1) |
| limit | number | Min: 1, Max: 100 | ✗ Optional (default: 20) |

**Request:**
```bash
curl -X GET "http://localhost:5000/api/listings?category=BOOKS&maxPrice=15000&location=Lekki&search=textbook&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Example Valid Query:**
```bash
# Search for books with filters
curl -X GET "http://localhost:5000/api/listings?search=mathematics&category=BOOKS&maxPrice=10000&sortBy=PRICE_LOW&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "listing-uuid-001",
        "title": "Advanced Calculus Textbook",
        "price": 8500,
        "category": "BOOKS",
        "images": [
          {
            "url": "https://example.com/uploads/listings/img-uuid-1.jpg",
            "isPrimary": true
          }
        ],
        "seller": {
          "id": "uuid-12345",
          "fullName": "John Doe",
          "avatarUrl": "https://example.com/avatars/uuid-12345.jpg",
          "averageRating": 4.8
        },
        "views": 45,
        "saves": 12,
        "createdAt": "2025-01-07T11:00:00Z"
      },
      {
        "id": "listing-uuid-002",
        "title": "Discrete Mathematics Notes",
        "price": 3500,
        "category": "NOTES",
        "images": [
          {
            "url": "https://example.com/uploads/listings/img-uuid-3.jpg",
            "isPrimary": true
          }
        ],
        "seller": {
          "id": "uuid-67890",
          "fullName": "Jane Smith",
          "avatarUrl": "https://example.com/avatars/uuid-67890.jpg",
          "averageRating": 4.5
        },
        "views": 23,
        "saves": 5,
        "createdAt": "2025-01-05T14:30:00Z"
      }
    ],
    "pagination": {
      "total": 47,
      "page": 1,
      "limit": 20,
      "pages": 3
    }
  }
}
```

**Validation Errors:**
- Invalid category: "Category must be one of: BOOKS, NOTES, GOODS, SERVICES"
- minPrice > maxPrice: "Minimum price cannot be greater than maximum price"
- Page < 1: "Page number must be at least 1"
- Limit > 100: "Limit cannot exceed 100"

---

### 3. Get Single Listing

**Request:**
```bash
curl -X GET http://localhost:5000/api/listings/listing-uuid-001 \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "listing-uuid-001",
    "title": "Advanced Calculus Textbook",
    "description": "Lightly used, excellent condition. Includes all original notes and highlights.",
    "price": 8500,
    "category": "BOOKS",
    "condition": "GOOD",
    "location": "Lekki",
    "status": "ACTIVE",
    "images": [
      {
        "id": "img-uuid-1",
        "url": "https://example.com/uploads/listings/img-uuid-1.jpg",
        "isPrimary": true
      },
      {
        "id": "img-uuid-2",
        "url": "https://example.com/uploads/listings/img-uuid-2.jpg",
        "isPrimary": false
      }
    ],
    "seller": {
      "id": "uuid-12345",
      "fullName": "John Doe",
      "avatarUrl": "https://example.com/avatars/uuid-12345.jpg",
      "email": "john@example.com",
      "phoneNumber": "+2348123456789",
      "trustScore": 50.0,
      "reviewCount": 0,
      "averageRating": 0,
      "responseTime": null,
      "verificationStatus": "NOT_VERIFIED"
    },
    "tags": ["textbook", "calculus", "semester2"],
    "views": 45,
    "saves": 12,
    "createdAt": "2025-01-07T11:00:00Z",
    "updatedAt": "2025-01-07T11:00:00Z"
  }
}
```

---

### 4. Update Listing

**Request:**
```bash
curl -X PATCH http://localhost:5000/api/listings/listing-uuid-001 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Advanced Calculus Textbook - Updated",
    "price": 7500,
    "description": "Updated description..."
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Listing updated successfully",
  "data": {
    "id": "listing-uuid-001",
    "title": "Advanced Calculus Textbook - Updated",
    "price": 7500,
    "description": "Updated description...",
    "updatedAt": "2025-01-07T11:15:00Z"
  }
}
```

---

## Transactions & Payments

### 1. Deposit Funds to Wallet

**Field Constraints:**
| Field | Type | Validation | Required/Optional |
|-------|------|-----------|----------|
| amount | number | Min: ₦500, no max limit | ✓ Required |
| paymentMethod | enum | `PAYSTACK_DIRECT`, `BANK_TRANSFER` | ✓ Required |

**Request:**
```bash
curl -X POST http://localhost:5000/api/transactions/deposit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "paymentMethod": "PAYSTACK_DIRECT"
  }'
```

**Example Valid Input:**
```json
{
  "amount": 50000,
  "paymentMethod": "PAYSTACK_DIRECT"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Deposit initiated",
  "data": {
    "transactionId": "txn-uuid-001",
    "amount": 50000,
    "type": "DEPOSIT",
    "status": "PENDING",
    "paymentMethod": "PAYSTACK_DIRECT",
    "paymentUrl": "https://checkout.paystack.com/...",
    "reference": "paystack-ref-12345",
    "createdAt": "2025-01-07T12:00:00Z"
  }
}
```

**Validation Errors:**
- Amount less than ₦500: "Minimum deposit amount is ₦500"
- Invalid amount: "Amount must be a positive number"
- Invalid payment method: "Payment method must be PAYSTACK_DIRECT or BANK_TRANSFER"

---

### 2. Purchase a Listing

**Request:**
```bash
curl -X POST http://localhost:5000/api/transactions/purchase \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "listing-uuid-001",
    "quantity": 1
  }'
```

**Field Constraints:**

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| `listingId` | string (UUID) | Valid UUID format | ✓ |
| `quantity` | number | Positive integer | ✓ |
| `paymentMethod` | enum | `WALLET`, `PAYSTACK_DIRECT` | ✗ (default: WALLET) |
| `useEscrow` | boolean | true/false | ✗ (default: true) |
| `meetupLocation` | string | Any string | ✗ |
| `meetupTime` | string | ISO 8601 format | ✗ |

**Example Valid Input:**
```json
{
  "listingId": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 1,
  "paymentMethod": "WALLET",
  "meetupLocation": "Lekki Phase 1"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Purchase successful. Funds held in escrow.",
  "data": {
    "transactionId": "txn-uuid-002",
    "listingId": "listing-uuid-001",
    "buyerId": "uuid-buyer",
    "sellerId": "uuid-12345",
    "amount": 8500,
    "platformFee": 425,
    "totalAmount": 8925,
    "type": "PURCHASE",
    "status": "PENDING",
    "escrowStatus": "PENDING",
    "escrowReleaseDate": "2025-01-12T12:00:00Z",
    "listing": {
      "id": "listing-uuid-001",
      "title": "Advanced Calculus Textbook"
    },
    "createdAt": "2025-01-07T12:15:00Z"
  }
}
```

---

### 3. Confirm Receipt (Release Escrow)

**Request:**
```bash
curl -X POST http://localhost:5000/api/transactions/confirm-receipt \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "txn-uuid-002"
  }'
```

**Field Constraints:**

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| `transactionId` | string (UUID) | Valid UUID format | ✓ |
| `received` | boolean | true/false | ✗ |
| `conditionMet` | boolean | true/false | ✗ |
| `notes` | string | Any string | ✗ |

**Example Valid Input:**
```json
{
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "received": true,
  "conditionMet": true,
  "notes": "Item received in excellent condition"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Receipt confirmed. Funds released to seller.",
  "data": {
    "transactionId": "txn-uuid-002",
    "status": "SUCCESS",
    "escrowStatus": "RELEASED",
    "releaseDetails": {
      "sellerAmount": 8075,
      "platformFee": 425,
      "releaseTime": "2025-01-07T12:20:00Z"
    },
    "sellerWallet": {
      "balance": 58075,
      "updated": "2025-01-07T12:20:00Z"
    }
  }
}
```

---

### 4. Dispute a Transaction

**Request:**
```bash
curl -X POST http://localhost:5000/api/transactions/dispute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "txn-uuid-002",
    "reason": "Item received was in poor condition",
    "evidence": "The textbook had several torn pages and water damage not mentioned in the listing."
  }'
```

**Field Constraints:**

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| `transactionId` | string (UUID) | Valid UUID format | ✓ |
| `reason` | string | Min 10 characters | ✓ |
| `evidence` | string | Any string (optional but recommended) | ✗ |

**Example Valid Input:**
```json
{
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "Textbook not as described - multiple pages missing",
  "evidence": "Page 45-67 completely missing from the book"
}
```

**Validation Errors:**
- Reason < 10 chars: "Please provide a detailed reason"
- Invalid transactionId: "Invalid UUID format"

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Dispute created successfully",
  "data": {
    "dispute": {
      "id": "dispute-uuid-001",
      "transactionId": "txn-uuid-002",
      "initiatorId": "uuid-buyer",
      "reason": "Item received was in poor condition",
      "evidence": "The textbook had several torn pages and water damage...",
      "status": "OPEN",
      "createdAt": "2025-01-07T12:25:00Z"
    },
    "transaction": {
      "id": "txn-uuid-002",
      "status": "PENDING",
      "escrowStatus": "DISPUTED"
    },
    "notification": {
      "id": "notif-uuid",
      "type": "DISPUTE",
      "title": "Transaction Dispute",
      "body": "A dispute has been opened for your transaction"
    }
  }
}
```

---

## Wallet Management

### 1. Get Wallet Balance

**Request:**
```bash
curl -X GET http://localhost:5000/api/wallet \
  -H "Authorization: Bearer <token>"
```

**Note:** This is a GET request with no required parameters or body.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "userId": "uuid-12345",
    "balance": 58075,
    "reservedBalance": 0,
    "transactionPin": "****",
    "transactions": [
      {
        "id": "txn-uuid-001",
        "type": "DEPOSIT",
        "amount": 50000,
        "status": "SUCCESS",
        "description": "Deposit via Paystack",
        "createdAt": "2025-01-07T12:00:00Z"
      },
      {
        "id": "txn-uuid-002",
        "type": "PURCHASE",
        "amount": -8925,
        "status": "SUCCESS",
        "description": "Purchase - Advanced Calculus Textbook",
        "createdAt": "2025-01-07T12:15:00Z"
      }
    ]
  }
}
```

**Transaction Types:**
- `DEPOSIT` - Money added to wallet
- `PURCHASE` - Money spent on listing purchase
- `SALE` - Money received from sale
- `WITHDRAWAL` - Money withdrawn to bank
- `ESCROW_HOLD` - Money held in escrow
- `ESCROW_RELEASE` - Escrow funds released/transferred

---

### 2. Setup Transaction PIN

**Request:**
```bash
curl -X POST http://localhost:5000/api/wallet/setup-pin \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234"
  }'
```

**Field Constraints:**

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| `newPin` | string | Exactly 4 digits (0-9) | ✓ |
| `confirmPin` | string | Exactly 4 digits, must match newPin | ✓ |
| `currentPin` | string | Exactly 4 digits (for PIN reset) | ✗ |

**Example Valid Input:**
```json
{
  "newPin": "1234",
  "confirmPin": "1234"
}
```

**Validation Errors:**
- PIN not 4 digits: "PIN must be exactly 4 digits"
- Non-numeric characters: "PIN must contain only digits"
- PINs don't match: "PINs don't match"

**Response (200 OK):**
```json
{
  "success": true,
  "message": "PIN set successfully",
  "data": {
    "pinSetAt": "2025-01-07T12:30:00Z"
  }
}
```

---

### 3. Request Withdrawal

**Field Constraints:**
| Field | Type | Validation | Required/Optional |
|-------|------|-----------|----------|
| amount | number | Min: ₦100, Max: ₦500,000 | ✓ Required |
| bankCode | string | Valid USSD bank code (3 chars) | ✓ Required |
| accountNumber | string | Exactly 10 digits | ✓ Required |
| accountName | string | Valid account holder name | ✓ Required |
| pin | string | Exactly 4 digits | ✓ Required |

**Request:**
```bash
curl -X POST http://localhost:5000/api/withdrawals \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 30000,
    "bankCode": "058",
    "accountNumber": "1234567890",
    "accountName": "John Doe",
    "pin": "1234"
  }'
```

**Example Valid Input:**
```json
{
  "amount": 30000,
  "bankCode": "058",
  "accountNumber": "1234567890",
  "accountName": "John Doe",
  "pin": "1234"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Withdrawal request created",
  "data": {
    "id": "withdrawal-uuid-001",
    "amount": 30000,
    "fee": 450,
    "netAmount": 29550,
    "bankCode": "058",
    "accountNumber": "****7890",
    "accountName": "John Doe",
    "status": "PENDING",
    "reference": "WTH-2025010712345678",
    "createdAt": "2025-01-07T12:45:00Z"
  }
}
```

**Validation Errors:**
- Amount less than ₦100: "Amount must be at least ₦100"
- Amount greater than ₦500,000: "Amount cannot exceed ₦500,000"
- Account number not 10 digits: "Account number must be exactly 10 digits"
- PIN not 4 digits: "PIN must be exactly 4 digits"
- Invalid PIN: "PIN verification failed"

**Note:** Withdrawal fee is calculated as 1.5% of the amount. Min ₦100, Max ₦500,000.

---

### 4. Get Withdrawal Status

**Query Parameters (Optional):**
| Parameter | Type | Validation | Description |
|-----------|------|-----------|----------|
| withdrawalId | string | UUID format | Required in URL path |

**Request:**
```bash
curl -X GET http://localhost:5000/api/withdrawals/withdrawal-uuid-001 \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "withdrawal-uuid-001",
    "amount": 30000,
    "fee": 450,
    "netAmount": 29550,
    "status": "COMPLETED",
    "reference": "WTH-2025010712345678",
    "bankReference": "BANK-REF-987654",
    "completedAt": "2025-01-07T14:00:00Z",
    "createdAt": "2025-01-07T12:45:00Z"
  }
}
```

**Status Values:**
- `PENDING` - Withdrawal request submitted, awaiting bank processing
- `PROCESSING` - Bank is processing the withdrawal
- `COMPLETED` - Withdrawal successfully transferred
- `FAILED` - Withdrawal failed, funds returned to wallet
- `CANCELLED` - User cancelled the withdrawal request

---

## Reviews & Ratings

### 1. Submit a Review

**Field Constraints:**
| Field | Type | Validation | Required/Optional |
|-------|------|-----------|----------|
| transactionId | string | Valid UUID format | ✓ Required |
| rating | number | Min: 1, Max: 5 (integer) | ✓ Required |
| title | string | Min: 3 chars, Max: 100 chars | ✓ Required |
| content | string | Min: 10 chars, Max: 500 chars | ✓ Required |
| categories.itemQuality | number | Min: 1, Max: 5 | ✗ Optional |
| categories.communication | number | Min: 1, Max: 5 | ✗ Optional |
| categories.shipping | number | Min: 1, Max: 5 | ✗ Optional |

**Request:**
```bash
curl -X POST http://localhost:5000/api/reviews \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "txn-uuid-002",
    "rating": 5,
    "title": "Excellent condition!",
    "content": "The book arrived in perfect condition. Very happy with the purchase. Highly recommend this seller!",
    "categories": {
      "itemQuality": 5,
      "communication": 5,
      "shipping": 5
    }
  }'
```

**Example Valid Input:**
```json
{
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "rating": 5,
  "title": "Excellent seller!",
  "content": "Great condition, fast delivery, very professional. Highly recommended for anyone buying here!",
  "categories": {
    "itemQuality": 5,
    "communication": 5,
    "shipping": 4
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "id": "review-uuid-001",
    "transactionId": "txn-uuid-002",
    "reviewerId": "uuid-buyer",
    "recipientId": "uuid-12345",
    "rating": 5,
    "title": "Excellent condition!",
    "content": "The book arrived in perfect condition...",
    "categories": {
      "itemQuality": 5,
      "communication": 5,
      "shipping": 5
    },
    "helpful": 0,
    "createdAt": "2025-01-07T13:00:00Z"
  }
}
```

**Validation Errors:**
- Rating < 1 or > 5: "Rating must be between 1 and 5"
- Title too short: "Title must be at least 3 characters"
- Title too long: "Title cannot exceed 100 characters"
- Content too short: "Review content must be at least 10 characters"
- Content too long: "Review content cannot exceed 500 characters"
- Category rating invalid: "Category ratings must be between 1 and 5"
- Duplicate review: "You have already reviewed this transaction"

---

### 2. Get User Reviews

**Request:**
```bash
curl -X GET "http://localhost:5000/api/reviews/user/uuid-12345?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "review-uuid-001",
        "rating": 5,
        "title": "Excellent condition!",
        "content": "The book arrived in perfect condition...",
        "reviewer": {
          "id": "uuid-buyer",
          "fullName": "Jane Smith",
          "avatarUrl": "https://example.com/avatars/uuid-buyer.jpg"
        },
        "categories": {
          "itemQuality": 5,
          "communication": 5,
          "shipping": 5
        },
        "helpful": 2,
        "createdAt": "2025-01-07T13:00:00Z"
      }
    ],
    "ratings": {
      "average": 4.8,
      "total": 15,
      "distribution": {
        "5": 12,
        "4": 2,
        "3": 1,
        "2": 0,
        "1": 0
      }
    },
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 10,
      "pages": 2
    }
  }
}
```

---

## Messaging

### 1. Start a Conversation

**Field Constraints:**
| Field | Type | Validation | Required/Optional |
|-------|------|-----------|----------|
| recipientId | string | Valid UUID format | ✓ Required |
| subject | string | Min: 3 chars, Max: 100 chars | ✗ Optional |
| initialMessage | string | Min: 1 char, Max: 1000 chars | ✗ Optional |

**Request:**
```bash
curl -X POST http://localhost:5000/api/conversations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "uuid-12345",
    "subject": "Question about Advanced Calculus Textbook",
    "initialMessage": "Hi John, I'\''m interested in your textbook. Is it still available?"
  }'
```

**Example Valid Input:**
```json
{
  "recipientId": "550e8400-e29b-41d4-a716-446655440000",
  "subject": "Question about your listing",
  "initialMessage": "Hi! I'm interested in this item. Is it still available and in good condition?"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Conversation created",
  "data": {
    "id": "conversation-uuid-001",
    "buyerId": "uuid-buyer",
    "sellerId": "uuid-12345",
    "subject": "Question about Advanced Calculus Textbook",
    "lastMessage": "Hi John, I'm interested in your textbook. Is it still available?",
    "messages": [
      {
        "id": "message-uuid-001",
        "senderId": "uuid-buyer",
        "content": "Hi John, I'm interested in your textbook. Is it still available?",
        "createdAt": "2025-01-07T13:15:00Z",
        "isRead": false
      }
    ],
    "createdAt": "2025-01-07T13:15:00Z"
  }
}
```

**Validation Errors:**
- Recipient not found: "Recipient user not found"
- Subject too long: "Subject cannot exceed 100 characters"
- Message empty: "Message content is required (minimum 1 character)"
- Message too long: "Message cannot exceed 1000 characters"
- Cannot message self: "Cannot start a conversation with yourself"

---

### 2. Send Message

**Field Constraints:**
| Field | Type | Validation | Required/Optional |
|-------|------|-----------|----------|
| conversationId | string | Valid UUID format (in URL path) | ✓ Required |
| content | string | Min: 1 char, Max: 1000 chars | ✓ Required |

**Request:**
```bash
curl -X POST http://localhost:5000/api/conversations/conversation-uuid-001/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Yes, it'\''s still available. What'\''s your offer?"
  }'
```

**Example Valid Input:**
```json
{
  "content": "Thanks for asking! Yes, it's available. I can negotiate on the price if needed."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Message sent",
  "data": {
    "id": "message-uuid-002",
    "conversationId": "conversation-uuid-001",
    "senderId": "uuid-12345",
    "content": "Yes, it's still available. What's your offer?",
    "isRead": false,
    "createdAt": "2025-01-07T13:20:00Z"
  }
}
```

**Validation Errors:**
- Message empty: "Message content is required"
- Message too long: "Message cannot exceed 1000 characters"
- Conversation not found: "Conversation not found"
- User not part of conversation: "You are not a participant in this conversation"
- Conversation archived: "Cannot send messages in archived conversation"

---

### 3. Get Conversation Messages

**Request:**
```bash
curl -X GET "http://localhost:5000/api/conversations/conversation-uuid-001/messages?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conversation-uuid-001",
      "subject": "Question about Advanced Calculus Textbook",
      "participants": [
        {
          "id": "uuid-buyer",
          "fullName": "Jane Smith",
          "avatarUrl": "https://example.com/avatars/uuid-buyer.jpg"
        },
        {
          "id": "uuid-12345",
          "fullName": "John Doe",
          "avatarUrl": "https://example.com/avatars/uuid-12345.jpg"
        }
      ],
      "createdAt": "2025-01-07T13:15:00Z"
    },
    "messages": [
      {
        "id": "message-uuid-001",
        "senderId": "uuid-buyer",
        "senderName": "Jane Smith",
        "content": "Hi John, I'm interested in your textbook. Is it still available?",
        "isRead": true,
        "createdAt": "2025-01-07T13:15:00Z"
      },
      {
        "id": "message-uuid-002",
        "senderId": "uuid-12345",
        "senderName": "John Doe",
        "content": "Yes, it's still available. What's your offer?",
        "isRead": true,
        "createdAt": "2025-01-07T13:20:00Z"
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Descriptive error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

---

### Common Error Codes

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": ["Invalid email format"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "No token provided",
  "code": "NO_TOKEN",
  "details": {}
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "You don't have permission to perform this action",
  "code": "FORBIDDEN",
  "details": {}
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Listing not found",
  "code": "NOT_FOUND",
  "details": {
    "resource": "Listing",
    "id": "listing-uuid-999"
  }
}
```

#### 409 Conflict
```json
{
  "success": false,
  "error": "Email already exists",
  "code": "DUPLICATE_EMAIL",
  "details": {}
}
```

#### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "retryAfter": 60
  }
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "details": {}
}
```

---

## Common Scenarios

### Scenario 1: Complete Purchase Workflow

```javascript
// Step 1: Get listing details
GET /api/listings/listing-uuid-001
→ Returns listing details with seller info

// Step 2: Check wallet balance
GET /api/wallet
→ Ensure sufficient balance or deposit funds

// Step 3: Purchase listing
POST /api/transactions/purchase
{
  "listingId": "listing-uuid-001",
  "quantity": 1
}
→ Funds held in escrow

// Step 4: Receive item and confirm receipt
POST /api/transactions/confirm-receipt
{
  "transactionId": "txn-uuid-002"
}
→ Funds released to seller

// Step 5: Leave review
POST /api/reviews
{
  "transactionId": "txn-uuid-002",
  "rating": 5,
  "content": "..."
}
→ Review submitted
```

---

### Scenario 2: Handle Dispute

```javascript
// Step 1: Identify issue with received item
// Step 2: Open dispute
POST /api/transactions/dispute
{
  "transactionId": "txn-uuid-002",
  "reason": "Item damaged",
  "evidence": "Photos of damage..."
}
→ Dispute created, transaction marked as DISPUTED

// Step 3: Admin reviews dispute
// Step 4: Admin resolves (refund or release)
// Step 5: User receives notification of resolution
```

---

### Scenario 3: Real-Time Messaging

```javascript
// Step 1: Start conversation
POST /api/conversations
{
  "recipientId": "uuid-12345",
  "subject": "About your listing",
  "initialMessage": "Hi, interested in your item"
}
→ Conversation created

// Step 2: Send/receive messages
POST /api/conversations/conversation-uuid/messages
{
  "content": "Message text"
}

// Step 3: Listen for real-time updates (WebSocket)
// Connect to ws://localhost:5000/socket.io
// Listen for 'message:new' events
```

---

### Scenario 4: Seller Workflow

```javascript
// Step 1: Create listings
POST /api/listings (multiple)
→ List items for sale

// Step 2: Receive purchase notifications
// Listen to transactions endpoint or WebSocket
// Notification type: "TRANSACTION"

// Step 3: Communicate with buyers
POST /api/conversations/[id]/messages
→ Answer questions, arrange pickup/delivery

// Step 4: Funds automatically transferred after confirmation
// Check wallet balance: GET /api/wallet

// Step 5: Withdraw funds
POST /api/withdrawals
{
  "amount": 50000,
  "bankCode": "058",
  "accountNumber": "...",
  "pin": "1234"
}
→ Withdrawal processed
```

---

## Best Practices

### 1. Token Management
```javascript
// Always refresh token before expiry
const tokenExpiresIn = response.expiresIn;
refreshTokenAfter(tokenExpiresIn - 300); // Refresh 5 min before expiry

// Store tokens securely
localStorage.setItem('token', response.token);
localStorage.setItem('refreshToken', response.refreshToken);
```

### 2. Error Handling
```javascript
// Always check response.success before accessing data
if (response.success) {
  // Use response.data
} else {
  // Handle error based on response.code
  switch(response.code) {
    case 'VALIDATION_ERROR':
      // Show validation errors to user
      break;
    case 'NOT_FOUND':
      // Show 404 message
      break;
    default:
      // Show generic error
  }
}
```

### 3. Pagination
```javascript
// Always use pagination for large datasets
GET /api/listings?page=1&limit=20
→ Returns with pagination info

// Load more
GET /api/listings?page=2&limit=20
```

### 4. Real-Time Updates
```javascript
// Subscribe to WebSocket for real-time updates
const socket = io('http://localhost:5000');

socket.on('transaction:new', (data) => {
  // Update UI with new transaction
});

socket.on('message:new', (data) => {
  // Update chat with new message
});
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Default**: 100 requests per 15 minutes per IP
- **Header Response**: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

When limit exceeded: HTTP 429 with retry-after header.

---

## API Response Headers

Every response includes helpful headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609686000
Content-Type: application/json
Cache-Control: public, max-age=300
```

---

## Testing with cURL

### Using .env variables in cURL

Create a `.env` file with:
```
BASE_URL=http://localhost:5000
TOKEN=your_token_here
```

Then use:
```bash
curl -X GET "${BASE_URL}/api/users/me" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Webhook Events (Optional)

Subscribe to webhook events for real-time notifications:

**Available Events:**
- `transaction.completed`
- `dispute.opened`
- `dispute.resolved`
- `review.submitted`
- `user.verified`

Configure webhooks in your admin panel.

---

## Next Steps

1. Review [API Documentation](../swagger-output.json)
2. Check [Backend Architecture](../BACKEND_ARCHITECTURE.md)
3. Read [Contributing Guidelines](../.github/CONTRIBUTING.md)
4. Explore example integrations in test files

**Happy integrating!** 🚀
