# Quick Start Reference - Campus Swap Backend

A quick reference guide for developers working on the Campus Swap backend.

## Installation & Setup (5 minutes)

```bash
# Clone the repository
git clone https://github.com/yourusername/campus-swap.git
cd campus-swap/backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your local database credentials

# Set up database
npx prisma migrate dev
npx prisma db seed

# Start development server
npm run dev
```

**Server will run at**: http://localhost:5000

## Common Commands

### Development
```bash
make dev                # Start development server with hot-reload
make test               # Run all tests
make test-watch        # Run tests in watch mode
make test-coverage     # Run tests with coverage report
make lint               # Check code style
make lint-fix           # Fix code style issues
make type-check         # Check TypeScript types
make build              # Build for production
```

### Database
```bash
make db-migrate         # Run pending migrations
make db-studio          # Open Prisma Studio (visual database editor)
make db-seed            # Seed database with sample data
make db-reset           # Reset database (deletes all data!)
```

### Docker
```bash
make docker-build       # Build Docker image
make docker-up          # Start services (postgres, redis, backend)
make docker-down        # Stop services
make docker-logs        # View container logs
make docker-clean       # Remove containers and volumes
```

### API Documentation
```bash
npm run swagger          # Generate Swagger documentation
# Then visit: http://localhost:5000/docs
```

### Using npm directly (without Makefile)
```bash
npm run dev             # Development server
npm test                # Run tests
npm run lint            # Lint code
npm run build           # Build
npx prisma studio      # Database UI
```

## Project Structure

```
src/
├── controllers/        # API request handlers (20+ files)
├── services/          # Business logic layer
├── middleware/        # Express middleware
├── routes/            # API route definitions
├── validations/       # Zod schema validations
├── utils/             # Helper functions
└── index.ts           # Application entry point

prisma/
├── schema.prisma      # Database schema (25+ models)
└── migrations/        # Database migrations
    └── add_dispute_model/  # NEW: Dispute model migration

tests/                 # Jest test files (23 files)
docs/
├── SETUP.md           # Detailed setup guide
└── DEPLOYMENT.md      # Production deployment guide
```

## API Endpoints Overview

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### User & Profile
- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/:id` - Update profile
- `POST /api/verification/upload-id` - Upload ID document

### Listings (Marketplace)
- `GET /api/listings` - List all items
- `POST /api/listings` - Create listing
- `PATCH /api/listings/:id` - Update listing
- `DELETE /api/listings/:id` - Delete listing

### Transactions & Payments
- `POST /api/transactions/deposit` - Deposit funds
- `POST /api/transactions/purchase` - Purchase item
- `POST /api/transactions/confirm-receipt` - Confirm receipt
- `POST /api/transactions/dispute` - Dispute transaction

### Wallet & Withdrawal
- `GET /api/wallet` - Get wallet balance
- `POST /api/wallet/setup-pin` - Set 4-digit PIN
- `POST /api/withdrawals` - Withdraw funds
- `GET /api/withdrawals/:id` - Get withdrawal status

### Reviews & Ratings
- `POST /api/reviews` - Submit review
- `GET /api/reviews/user/:id` - Get user reviews
- `PATCH /api/reviews/:id` - Update review

### Conversations (Messaging)
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Start conversation
- `POST /api/conversations/:id/messages` - Send message
- `GET /api/conversations/:id/messages` - Get messages

### Admin
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/verify` - Verify user
- `GET /api/admin/transactions` - Transaction logs

**Full API documentation**: http://localhost:5000/docs (after `npm run swagger`)

## Database Models

Key models you'll work with:

```typescript
User              // User accounts and profiles
Wallet            // User wallet balances
Transaction       // All transactions (deposits, purchases, etc.)
Listing           // Marketplace items
Review            // User reviews and ratings
Verification      // Identity verification
Conversation      // User messaging
Message           // Individual messages
Dispute           // NEW: Transaction disputes
```

See [prisma/schema.prisma](prisma/schema.prisma) for complete schema.

## Environment Variables

Essential variables for local development:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/campus_swap
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRY=24h
FRONTEND_URL=http://localhost:3000
```

See [.env.example](.env.example) for all 40+ variables.

## Validation Schemas

All endpoints use Zod schemas for input validation. Examples:

```typescript
// Location: src/validations/marketplaceValidation.ts
const createListingSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500),
  price: z.number().positive(),
  category: z.enum(['BOOKS', 'NOTES', 'GOODS', 'SERVICES']),
});

// Usage in controller:
const validation = createListingSchema.safeParse(req.body);
if (!validation.success) {
  return res.status(400).json({ errors: validation.error.flatten() });
}
```

## Error Handling Pattern

```typescript
try {
  // Your logic here
  return res.json({ success: true, data });
} catch (error) {
  logger.error('Operation failed', { error, userId });
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- escrow.test.ts

# Run in watch mode (re-runs on file changes)
npm run test:watch

# Run with coverage report
npm test -- --coverage

# Run a specific test
npm test -- --testNamePattern="should create listing"
```

Test files are in the `tests/` directory with 23 files covering:
- Authentication
- User management
- Listings
- Payments & transactions
- Escrow operations
- Withdrawals
- Messaging
- Admin functions

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test
npm run lint
npm run type-check
npm test

# Commit with clear message
git commit -m "feat(feature-name): clear description"

# Push and create pull request
git push origin feature/your-feature-name
```

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) for detailed guidelines.

## Docker Development

For isolated development with PostgreSQL and Redis:

```bash
# Start all services
docker-compose up

# In another terminal, run migrations
docker-compose exec backend npx prisma migrate dev

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Remove all data and start fresh
docker-compose down -v
```

For development overrides (hot-reload), create:
```bash
cp docker-compose.override.yml.example docker-compose.override.yml
```

## Debugging

### Visual Studio Code

Install extensions:
- Prettier - Code formatter
- ESLint - Linting
- Prisma - Database schema

Debug config in `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${workspaceFolder}/dist/index.js",
      "restart": true
    }
  ]
}
```

### Chrome DevTools

```bash
make dev-debug
# Then visit: chrome://inspect
```

### Logs

```bash
# View logs in real-time
tail -f logs/app.log

# Search logs
grep "error" logs/app.log
```

## Performance Tips

1. **Database Queries** - Use `select` to limit returned fields
   ```typescript
   const user = await prisma.user.findUnique({
     where: { id: userId },
     select: { id: true, email: true },  // Only these fields
   });
   ```

2. **N+1 Queries** - Use `include` instead of multiple queries
   ```typescript
   const listings = await prisma.listing.findMany({
     include: { owner: true },  // Fetch user with listing
   });
   ```

3. **Caching** - Use Redis for frequently accessed data
   ```typescript
   const cached = await redis.get('user:' + userId);
   if (cached) return JSON.parse(cached);
   ```

4. **Indexing** - Add indexes for frequently filtered columns (done in schema)

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] TypeScript compiles: `npm run build`
- [ ] Database migrations ready: `npx prisma migrate status`
- [ ] Environment variables configured
- [ ] Security check: `npm audit`
- [ ] Load testing completed

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for comprehensive checklist.

## Useful Links

- **API Spec**: http://localhost:5000/docs (when running)
- **Swagger JSON**: [swagger-output.json](swagger-output.json)
- **Architecture**: [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md)
- **Setup Guide**: [docs/SETUP.md](docs/SETUP.md)
- **Deployment Guide**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Contributing**: [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)
- **Database Schema**: [prisma/schema.prisma](prisma/schema.prisma)
- **Completion Summary**: [PROJECT_COMPLETION_SUMMARY.md](PROJECT_COMPLETION_SUMMARY.md)

## Getting Help

1. Check the [README.md](README.md) for overview
2. See [docs/SETUP.md](docs/SETUP.md) for setup issues
3. Check [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) for code guidelines
4. Review existing test files for examples
5. Check [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) for system design
6. Browse [swagger-output.json](swagger-output.json) for API details

## FAQ

**Q: How do I connect to the database directly?**
```bash
psql "postgresql://user:password@localhost:5432/campus_swap"
```

**Q: How do I reset my database?**
```bash
make db-reset  # WARNING: Deletes all data
```

**Q: Where are tests run?**
```bash
cd tests/
npm test -- <filename>
```

**Q: How do I add a new API endpoint?**
1. Create controller in `src/controllers/`
2. Create validation schema in `src/validations/`
3. Add route in `src/routes/`
4. Add tests in `tests/`
5. Update Swagger in `swagger-output.json`

**Q: How do I debug TypeScript errors?**
```bash
npm run type-check
```

**Q: How do I check my code style?**
```bash
npm run lint
npm run lint -- --fix  # Auto-fix issues
```

---

**Welcome to Campus Swap Backend!** Happy coding! 🚀

For more information, see the [PROJECT_COMPLETION_SUMMARY.md](PROJECT_COMPLETION_SUMMARY.md).
