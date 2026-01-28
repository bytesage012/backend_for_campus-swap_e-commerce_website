# Campus Swap Backend

A comprehensive peer-to-peer marketplace platform for university students to buy, sell, and exchange items. Built with Express.js, TypeScript, PostgreSQL, and real-time features.

## 🌟 Features

- **User Authentication** - JWT-based secure authentication with role-based access control
- **Marketplace** - Create, list, and manage product listings with images
- **Smart Wallet** - Integrated payment wallet with deposit and withdrawal capabilities
- **Escrow System** - Secure transactions with escrow protection and dispute resolution
- **Smart Contracts** - Digital contracts with signatures and enforcement
- **Real-time Messaging** - WebSocket-based instant messaging between buyers and sellers
- **Verification** - Document-based user verification with admin approval
- **Reviews & Ratings** - Transparent rating system for trust building
- **Bulk Operations** - Batch listing creation, updates, and messaging
- **Admin Dashboard** - Comprehensive admin tools for moderation and analytics
- **Analytics** - Detailed platform and seller analytics
- **Payment Integration** - Paystack integration for seamless payments

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Contributing](#contributing)
- [Deployment](#deployment)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Redis (optional, for caching)

### 1. Clone and Install

```bash
git clone <repository-url>
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PAYSTACK_SECRET_KEY` - Paystack API key

### 3. Setup Database

```bash
npx prisma migrate dev
npm run seed  # Optional: populate with demo data
```

### 4. Start Development Server

```bash
npm run dev
# Server runs on http://localhost:3001
```

### 5. View API Documentation

Open browser and navigate to:
```
http://localhost:3001/docs
```

## 📂 Project Structure

```
backend/
├── src/
│   ├── controllers/        # Request handlers
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   ├── validations/       # Input validation schemas (Zod)
│   ├── utils/             # Utility functions
│   ├── socket.ts          # WebSocket configuration
│   ├── prisma.ts          # Database client
│   └── index.ts           # Application entry point
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # Database migrations
│   └── seed.ts           # Database seeding script
├── tests/                 # Jest test suites
├── uploads/              # User uploads directory
├── swagger-output.json   # OpenAPI specification
├── package.json
├── tsconfig.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PATCH /api/auth/profile` - Update user profile

### Listings
- `GET /api/listings` - List all active listings
- `POST /api/listings` - Create new listing
- `GET /api/listings/{id}` - Get listing details
- `PATCH /api/listings/{id}` - Update listing
- `DELETE /api/listings/{id}` - Delete listing
- `POST /api/listings/{id}/purchase` - Purchase listing
- `POST /api/listings/{id}/reserve` - Reserve listing
- `POST /api/listings/{id}/save` - Save listing

### Wallet
- `GET /api/wallet/balance` - Get wallet balance
- `POST /api/payment/deposit` - Deposit funds
- `GET /api/wallet/transactions` - Transaction history
- `POST /api/wallet/pin/setup` - Setup transaction PIN
- `POST /api/wallet/withdraw` - Withdraw funds

### Messaging
- `POST /api/conversations` - Start conversation
- `GET /api/conversations` - List conversations
- `POST /api/conversations/{id}/messages` - Send message
- `GET /api/conversations/{id}/messages` - Get messages

### Reviews
- `POST /api/transactions/{id}/review` - Submit review
- `GET /api/users/{id}/reviews` - Get user reviews
- `GET /api/users/{id}/rating-summary` - Get rating summary

### Admin
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/users` - List all users
- `GET /api/admin/verifications/pending` - Pending verifications
- `POST /api/admin/verifications/{id}/approve` - Approve verification

For complete API documentation, visit `/docs` after starting the server.

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Specific Test Suite

```bash
npm test -- auth.test.ts
```

### Test Files

- `tests/auth.test.ts` - Authentication tests
- `tests/marketplace.test.ts` - Listing CRUD tests
- `tests/wallet.test.ts` - Wallet operations
- `tests/escrow.test.ts` - Escrow transactions
- `tests/conversations.test.ts` - Messaging
- And 18+ more test suites

## 🛠️ Development

### Build TypeScript

```bash
npm run build
```

### Lint Code

```bash
npm run lint
```

### Generate Prisma Client

```bash
npx prisma generate
```

### View Database

```bash
npx prisma studio
```

## 📚 Documentation

- [API Endpoints](./API_ENDPOINTS.md) - Detailed endpoint reference
- [Architecture](./BACKEND_ARCHITECTURE.md) - System design and patterns
- [Setup Guide](./docs/SETUP.md) - Development environment setup
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment

## 🔐 Security

- Password hashing with bcrypt
- JWT token authentication
- Input validation with Zod
- CORS protection
- SQL injection prevention via Prisma
- Rate limiting on sensitive endpoints
- Transaction PIN for withdrawals

## 🚢 Deployment

### Docker Deployment

```bash
docker-compose up -d
```

See [Deployment Guide](./docs/DEPLOYMENT.md) for detailed instructions.

### Environment Variables (Production)

```bash
NODE_ENV=production
JWT_SECRET=<generate-secure-secret>
DATABASE_URL=<production-database-url>
PAYSTACK_SECRET_KEY=<production-key>
FRONTEND_URL=<production-frontend-url>
```

## 📊 Database Schema

Key models:
- **User** - User accounts with profile and verification
- **Wallet** - User wallet with balance and PIN
- **Listing** - Product listings with images and metadata
- **Transaction** - Payment transactions with escrow support
- **Conversation** - Messages between buyers and sellers
- **Review** - User ratings and reviews
- **SmartContract** - Digital contracts for transactions
- **Verification** - KYC/student verification documents

See `prisma/schema.prisma` for complete schema.

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and write tests
3. Commit: `git commit -am 'Add feature'`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

See [Contributing Guidelines](./.github/CONTRIBUTING.md)

## 📝 License

ISC License

## 👥 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review test files for usage examples

## 🔄 Version

**Current Version:** 1.0.0  
**Last Updated:** 7 January 2026

---

**Happy coding!** 🚀
