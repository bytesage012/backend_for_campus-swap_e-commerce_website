# Contributing to Campus Swap Backend

Thank you for your interest in contributing to Campus Swap! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## Code of Conduct

All contributors are expected to:
- Be respectful and inclusive
- Welcome diverse perspectives
- Focus on constructive feedback
- Report unacceptable behavior to maintainers

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+
- Git
- Visual Studio Code (recommended)

### Setup Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/campus-swap.git
   cd campus-swap/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your local database credentials
   ```

4. **Set up database**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Verify setup**
   ```bash
   npm run dev
   # Server should start at http://localhost:5000
   ```

## Development Workflow

### Creating a Feature Branch

```bash
# Create and checkout a new branch
git checkout -b feature/your-feature-name

# or for bug fixes
git checkout -b fix/bug-description

# or for documentation
git checkout -b docs/documentation-topic
```

### Branch Naming Convention

- Features: `feature/feature-name` (e.g., `feature/add-dispute-resolution`)
- Bug fixes: `fix/bug-description` (e.g., `fix/wallet-balance-calculation`)
- Documentation: `docs/topic-name` (e.g., `docs/api-documentation`)
- Tests: `test/feature-name` (e.g., `test/escrow-transactions`)
- Chores: `chore/task-name` (e.g., `chore/update-dependencies`)

### Local Development

```bash
# Start development server with auto-reload
npm run dev

# Run tests in watch mode
npm run test:watch

# Run linter in watch mode
npm run lint -- --fix

# Generate Prisma client
npx prisma generate

# View database schema
npx prisma studio
```

## Coding Standards

### TypeScript/JavaScript

- Use **TypeScript** for all new code (no plain JavaScript)
- Enable strict mode: `"strict": true` in tsconfig.json
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Maximum line length: 100 characters

#### Example Function:
```typescript
/**
 * Calculate the platform fee for a transaction
 * @param amount - Transaction amount in naira
 * @param feePercentage - Platform fee percentage
 * @returns Calculated fee amount
 */
function calculatePlatformFee(amount: number, feePercentage: number): number {
  return (amount * feePercentage) / 100;
}
```

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Always include
- **Trailing commas**: Yes, for multi-line objects/arrays
- **Arrow functions**: Prefer for callbacks

#### Example:
```typescript
const users = await prisma.user.findMany({
  where: {
    isVerified: true,
  },
  select: {
    id: true,
    email: true,
    fullName: true,
  },
});
```

### File Organization

```
src/
├── controllers/     # Request handlers
├── services/        # Business logic
├── middleware/      # Express middleware
├── routes/          # API routes
├── validations/     # Zod schemas
├── utils/           # Utility functions
├── types/           # TypeScript types (if any)
└── index.ts         # App entry point
```

### Error Handling

- Always catch promises with `.catch()` or `try/catch`
- Return meaningful error messages
- Use appropriate HTTP status codes
- Log errors with context

#### Example:
```typescript
try {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  return res.json(user);
} catch (error) {
  logger.error('User fetch failed', { userId, error });
  return res.status(404).json({
    error: 'User not found',
    code: 'USER_NOT_FOUND',
  });
}
```

### Input Validation

All request inputs must be validated using Zod schemas:

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required'),
});

export async function createUser(req: Request, res: Response) {
  const validation = createUserSchema.safeParse(req.body);
  
  if (!validation.success) {
    return res.status(400).json({ 
      errors: validation.error.flatten() 
    });
  }
  
  // Process validated data
}
```

### Database Operations

- Use Prisma transactions for multi-step operations
- Always include proper error handling
- Use `select` to limit returned fields for performance
- Add database indexes for frequently queried fields

#### Example:
```typescript
const result = await prisma.$transaction(async (tx) => {
  // Update multiple records in a transaction
  const user = await tx.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

  const wallet = await tx.wallet.findUnique({
    where: { userId },
  });

  return { user, wallet };
});
```

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Code change that improves performance
- `test`: Adding missing or updating tests
- `chore`: Changes to build process, dependencies, etc.

### Scopes
- `auth`: Authentication-related changes
- `wallet`: Wallet functionality
- `transaction`: Transaction processing
- `escrow`: Escrow system
- `listing`: Marketplace listings
- `user`: User management
- `admin`: Admin functions
- `api`: API endpoints
- `database`: Database/Prisma changes

### Examples

**Good commit:**
```
feat(escrow): add dispute resolution workflow

- Add Dispute model to schema
- Implement dispute creation endpoint
- Add admin dispute review functionality
- Create dispute notification system

Closes #123
```

**Bad commit:**
```
fixed stuff
```

### Tips
- Keep commits atomic (one logical change per commit)
- Write descriptive commit messages
- Use imperative mood ("add feature" not "added feature")
- Reference issue numbers when applicable

## Pull Request Process

### Before Creating a PR

1. **Update your branch**
   ```bash
   git fetch origin
   git rebase origin/develop
   ```

2. **Run all checks locally**
   ```bash
   npm run lint
   npm run type-check
   npm test
   npm run build
   ```

3. **Push your changes**
   ```bash
   git push origin feature/your-feature-name
   ```

### Creating a PR

Use the provided PR template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #(issue number)

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
```

### PR Requirements

For your PR to be merged:
- ✅ All tests must pass
- ✅ Code coverage should not decrease
- ✅ No ESLint errors
- ✅ TypeScript compilation succeeds
- ✅ At least 1 approval from maintainers
- ✅ All conversations resolved

## Testing Guidelines

### Test Structure

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid input', async () => {
      // Arrange
      const userData = { email: 'test@example.com', password: 'test123' };
      
      // Act
      const user = await UserService.createUser(userData);
      
      // Assert
      expect(user.email).toBe('test@example.com');
      expect(user.id).toBeDefined();
    });

    it('should throw error for duplicate email', async () => {
      // Arrange
      await UserService.createUser({ email: 'test@example.com', password: 'test123' });
      
      // Act & Assert
      await expect(
        UserService.createUser({ email: 'test@example.com', password: 'test456' })
      ).rejects.toThrow('Email already exists');
    });
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Test happy paths and error cases
- Include edge cases
- Test database operations with transactions
- Mock external dependencies (APIs, services)

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- escrow.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm run test:watch
```

## Documentation

### Code Documentation

- Add JSDoc comments to all public functions
- Document complex logic with inline comments
- Keep comments up-to-date with code changes

### API Documentation

- Update Swagger definitions when adding/modifying endpoints
- Include request/response schemas
- Document error codes and status codes
- Add examples for complex requests

### README Updates

- Update README.md if adding new features
- Document new environment variables
- Update API endpoints list
- Add setup instructions for new dependencies

## Questions?

- Check existing issues and discussions
- Ask in GitHub Discussions
- Email maintainers directly

---

**Thank you for contributing to Campus Swap!** 🎉
