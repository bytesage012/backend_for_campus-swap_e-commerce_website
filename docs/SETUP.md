# Development Setup Guide

Complete guide to set up your development environment for Campus Swap backend.

## Prerequisites

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **npm** 9.0 or higher (comes with Node.js)
- **PostgreSQL** 12 or higher ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))
- **VSCode** or preferred code editor (optional)

## Step 1: Install PostgreSQL

### macOS (using Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
Download from PostgreSQL website and run installer. Follow installation wizard.

### Verify Installation
```bash
psql --version
```

## Step 2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE campus_swap;

# Create user (optional)
CREATE USER campus_user WITH PASSWORD 'your_password';
ALTER ROLE campus_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE campus_swap TO campus_user;

# Exit psql
\q
```

## Step 3: Clone Repository

```bash
git clone <repository-url>
cd campus-swap/backend
```

## Step 4: Install Dependencies

```bash
npm install
```

This will install:
- Express.js - Web framework
- TypeScript - Type safety
- Prisma - ORM
- Jest - Testing framework
- Socket.io - Real-time communication
- And 50+ other dependencies

## Step 5: Configure Environment

### Create .env File

```bash
cp .env.example .env
```

### Edit .env with Your Settings

```dotenv
# Application
NODE_ENV=development
PORT=3001

# Database - IMPORTANT: Update with your credentials
DATABASE_URL="postgresql://campus_user:your_password@localhost:5432/campus_swap"

# JWT (generate a new secret)
JWT_SECRET="your-super-secret-jwt-key"

# Paystack (use test keys for development)
PAYSTACK_SECRET_KEY="sk_test_xxxxx"
PAYSTACK_PUBLIC_KEY="pk_test_xxxxx"

# Frontend
FRONTEND_URL="http://localhost:3000"
SERVER_URL="http://localhost:3001"
```

### Generate JWT Secret (Optional)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 6: Setup Database

### Run Migrations

```bash
npx prisma migrate dev
```

This will:
- Create all tables from schema
- Run any pending migrations
- Generate Prisma client

### (Optional) Seed Database

```bash
npx prisma db seed
```

This populates demo data for testing.

### View Database

```bash
npx prisma studio
```

Opens Prisma Studio to browse/edit database in browser.

## Step 7: Verify Setup

### Check Node and npm

```bash
node --version    # Should be 18.0 or higher
npm --version     # Should be 9.0 or higher
```

### Check Database Connection

```bash
npx prisma db execute --stdin
# Type: SELECT 1;
# Should return (1)
```

### Run Tests (Optional)

```bash
npm test
```

All tests should pass.

## Step 8: Start Development Server

```bash
npm run dev
```

Expected output:
```
> tsx watch src/index.ts

Server running on port 3001
Database: connected
```

## Step 9: Verify API is Running

### In another terminal:

```bash
# Check health endpoint
curl http://localhost:3001/api/health

# View Swagger documentation
open http://localhost:3001/docs
```

## 📁 Project Structure for Developers

```
src/
├── controllers/        # Where request handlers live
├── routes/            # Where you define API routes
├── services/          # Business logic and database queries
├── middleware/        # Authentication, validation, error handling
├── validations/       # Input schema validation (Zod)
├── utils/            # Helper functions
├── socket.ts         # WebSocket setup
└── index.ts          # Server entry point
```

## 🔧 Common Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production build
npm start

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint

# Generate Swagger docs
npm run swagger-gen

# Open database UI
npx prisma studio
```

## 🐛 Troubleshooting

### "Cannot find module 'dotenv'"
```bash
npm install
```

### "Connection refused on localhost:5432"
PostgreSQL not running. Start it:
```bash
# macOS
brew services start postgresql@15

# Ubuntu
sudo systemctl start postgresql

# Windows: Use Services manager or PG Tools
```

### "Database does not exist"
```bash
psql -U postgres -c "CREATE DATABASE campus_swap;"
```

### "Permission denied" on migrations
```bash
# Reset migrations
npx prisma migrate reset
```

### Port 3001 already in use
```bash
# Kill process on port 3001
lsof -i :3001
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

### Tests failing
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

## 📚 IDE Setup

### VSCode (Recommended)

**Extensions to install:**
- "Prettier - Code formatter" (esbenp.prettier-vscode)
- "ESLint" (dbaeumer.vscode-eslint)
- "Prisma" (prisma.prisma)
- "REST Client" (humao.rest-client)
- "Thunder Client" or "Postman"

**Settings (.vscode/settings.json):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## 🔐 Security Notes

### Development Only
- Never commit `.env` file with real secrets
- Use test keys for payment integration
- Keep JWT_SECRET changed in production

### Before Deployment
- Review DEPLOYMENT.md
- Update all secrets
- Run security audit: `npm audit`

## 📖 Next Steps

1. **Read API Documentation:**
   ```bash
   npm run dev
   # Visit http://localhost:3001/docs
   ```

2. **Review Code Structure:**
   - Look at `src/controllers/authController.ts`
   - Explore `src/validations/` folder
   - Check `prisma/schema.prisma`

3. **Create Your First Endpoint:**
   - Add to `src/routes/`
   - Create controller in `src/controllers/`
   - Add validation schema
   - Write tests in `tests/`

4. **Understand Database:**
   - Run `npx prisma studio`
   - Explore relationships between models
   - Check seed.ts for example data

## 🆘 Getting Help

- Check existing issues on GitHub
- Review test files for usage examples
- Read BACKEND_ARCHITECTURE.md for design patterns
- Check Prisma docs: https://www.prisma.io/docs/

## ✅ Development Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL running
- [ ] Database created
- [ ] `.env` file configured
- [ ] Migrations run successfully
- [ ] Tests passing
- [ ] Server starts on port 3001
- [ ] Swagger docs accessible at `/docs`
- [ ] Can connect to database via Prisma Studio

Once all items are checked, you're ready to start developing! 🚀

---

**Last Updated:** 7 January 2026
