# Backend Architecture Overview

This document outlines the logical organization of the backend codebase, grouping functional modules by domain, while providing detailed insights into the system's components.

## 1. System Overview

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: JWT (JSON Web Tokens) with Role-Based Access Control (RBAC)
- **Real-time Engine**: Socket.io for messaging and notifications
- **Architecture Style**: Layered Application (Route -> Middleware -> Controller -> Service -> Data Access)

---

## 2. Functional Domains

### 2.1 Authentication & Identity
**Primary Entity:** `User`
**Base Route:** `/api/auth`, `/api/verification`

| Module | Description | Controllers |
| :--- | :--- | :--- |
| **Auth** | Manages user registration, login, and secure session handling via JWT. <br>• _Key Endpoints_: `/register`, `/login`, `/profile` | `authController.ts` |
| **Verification** | Handles identity verification requests, including document uploads (ID front/back) and status tracking. <br>• _Key Endpoints_: `/verification/request` | `verificationController.ts` |

**Relationships:**
- **User** is the core entity referenced by almost all other modules.
- **Verification** directly updates the `User`'s status (`isVerified`, `verificationLevel`).

---

### 2.2 User Management & Personalization
**Primary Entity:** `User`, `Preference`, `Notification`, `SavedItem`
**Base Route:** `/api/preferences`, `/api/notifications`, `/api/watchlist`

| Module | Description | Controllers |
| :--- | :--- | :--- |
| **Preferences** | Manages user-specific settings such as UI themes (Dark/Light/Auto) and notification opt-ins. | `preferenceController.ts` |
| **Notifications** | Centralized system for delivering in-app alerts for messages, transactions, and system updates. | `notificationController.ts` |
| **Watchlist** | Allows users to "save" listings for later viewing. | `savedItemController.ts` |

**Relationships:**
- **Preferences** has a 1:1 relationship with **User**.
- **Watchlist** creates a many-to-many link between **User** and **Listing** (via `SavedItem` join table).

---

### 2.3 Marketplace & Discovery
**Primary Entity:** `Listing`
**Base Route:** `/api/listings`, `/api` (reviews)

| Module | Description | Controllers |
| :--- | :--- | :--- |
| **Listings** | Core CRUD for marketplace items. Supports multi-image upload, categorization, and status management (Active, Sold). <br>• _Key Endpoints_: `GET /listings`, `POST /listings` | `listingController.ts` |
| **Search** | Discovery layer providing text search and complex filtering (price, category, condition). | `searchController.ts` |
| **Reviews** | Reputation system allowing buyers and sellers to rate each other after transactions. | `reviewController.ts` |
| **Market Offers** | Logic for buyer/seller negotiation and bidding on listings. | `listingController.ts` (Integrated) |

**Relationships:**
- **Listing** belongs to a **User** (Seller).
- **Listing** owns multiple **ListingImage** records.
- **Reviews** link two **Users** (Buyer & Seller) based on a transaction context.

---

### 2.4 Communication
**Primary Entity:** `Conversation`
**Base Route:** `/api/conversations`

| Module | Description | Controllers |
| :--- | :--- | :--- |
| **Messaging** | Real-time chat infrastructure connecting buyers and sellers. Supports message history and read receipts. <br>• _Socket Events_: `join_conversation`, `leave_conversation` | `conversationController.ts` |

**Relationships:**
- **Conversation** uniquely links a **User** (Buyer) and a **Listing** (which implies the Seller).
- A Conversation contains many **Message** entities.

---

### 2.5 Financial Services (FinTech)
**Primary Entity:** `Wallet`, `Transaction`, `SmartContract`, `Escrow`
**Base Route:** `/api/wallet`, `/api/payment`, `/api/transactions`, `/api/escrow`

| Module | Description | Controllers |
| :--- | :--- | :--- |
| **Wallet** | Internal ledger system managing user balances, reserved funds, and security PINs. | `walletController.ts` |
| **Transfers** | Handles external money movement: Deposits (via Paystack) and Withdrawals (to Bank Accounts). | `paymentController.ts`, `withdrawalController.ts` |
| **Escrow** | Intermediate holding service that locks funds during a transaction to prevent fraud. | `escrowController.ts` |
| **Smart Contracts** | Advanced transaction logic defining release conditions, dispute resolution terms, and state management. | `smartContractController.ts` |

**Relationships:**
- **Wallet** has a strict 1:1 relationship with **User**.
- **Transaction** is the central ledger record for all financial events.
- **SmartContract** binds a **Buyer**, **Seller**, and **Transaction** together with enforceable terms.

---

### 2.6 Admin & Operations
**Primary Entity:** `AdminLog`, `Report`, `ListingModeration`, `BulkOperation`
**Base Route:** `/api/admin`, `/api/reports`, `/api/bulk`

| Module | Description | Controllers |
| :--- | :--- | :--- |
| **Admin Dashboard** | High-level metrics (User growth, Transaction volume) and user management tools. | `adminController.ts`, `adminUserController.ts` |
| **Moderation** | Content safety workflows: Reviewing reported listings/users and approving ID verifications. | `moderationController.ts`, `reportController.ts`, `adminVerificationController.ts` |
| **Bulk Ops** | Tools for mass actions: Batch user bans, data exports, and system-wide notifications. | `bulkOperationsController.ts` |

**Relationships:**
- **Reports** can flag specific **Users** or **Listings** for review.
- **ListingModeration** captures the review status and audit trail for a **Listing**.

---

### 2.7 Analytics
**Primary Entity:** `ListingAnalytics`, `AnalyticsEvent`
**Base Route:** `/api/analytics`

| Module | Description | Controllers |
| :--- | :--- | :--- |
| **Platform Analytics** | Aggregated system health and usage statistics for admins. | `platformAnalyticsController.ts`, `analyticsController.ts` |
| **Seller Analytics** | Dashboard for sellers to track views, clicks, and engagement on their listings. | `sellerAnalyticsController.ts` |

**Relationships:**
- **AnalyticsEvent** is an immutable stream of user actions.
- **ListingAnalytics** aggregates these events into summary stats for each **Listing**.

---

## 3. Key Middleware & Security

| Middleware | File | Purpose |
| :--- | :--- | :--- |
| **protect** | `authRoutes.ts` | Verifies JWT tokens and attaches the authenticated user to the request object. |
| **restrictTo** | `authRoutes.ts` | Enforces Role-Based Access Control (RBAC), e.g., allowing only `ADMIN` users. |
| **upload** | `uploadMiddleware.ts` | Manages file uploads using Multer, enforcing size limits and file type validation. |
| **validate** | *(Generic)* | Uses Zod schemas to ensure request bodies match expected formats before processing. |
