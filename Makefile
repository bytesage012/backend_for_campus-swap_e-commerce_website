.PHONY: help install dev test lint build clean docker-build docker-up docker-down db-setup db-reset db-studio migrations swagger

help:
	@echo "Campus Swap Backend - Makefile Commands"
	@echo ""
	@echo "Setup Commands:"
	@echo "  make install          Install dependencies"
	@echo "  make db-setup         Setup database (create and migrate)"
	@echo "  make db-reset         Reset database (dangerous!)"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev              Start development server with auto-reload"
	@echo "  make dev-debug        Start development server with debugger"
	@echo "  make test             Run all tests"
	@echo "  make test-watch       Run tests in watch mode"
	@echo "  make test-coverage    Run tests with coverage report"
	@echo "  make lint             Run ESLint"
	@echo "  make lint-fix         Fix ESLint issues automatically"
	@echo "  make type-check       Check TypeScript types"
	@echo ""
	@echo "Build Commands:"
	@echo "  make build            Build the application"
	@echo "  make clean            Clean build artifacts"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make docker-build     Build Docker image"
	@echo "  make docker-up        Start Docker containers"
	@echo "  make docker-down      Stop Docker containers"
	@echo "  make docker-logs      View Docker container logs"
	@echo "  make docker-clean     Remove Docker containers and images"
	@echo ""
	@echo "Database Commands:"
	@echo "  make db-migrate       Run database migrations"
	@echo "  make db-studio        Open Prisma Studio"
	@echo "  make db-seed          Seed database with sample data"
	@echo ""
	@echo "API Documentation:"
	@echo "  make swagger-gen      Generate Swagger documentation"
	@echo "  make swagger-open     Open Swagger UI"

# Setup Commands
install:
	npm install

db-setup:
	npx prisma migrate dev
	npx prisma db seed

db-reset:
	@echo "WARNING: This will delete all data in the database!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read dummy
	npx prisma migrate reset --force

# Development Commands
dev:
	npm run dev

dev-debug:
	node --inspect-brk dist/index.js

test:
	npm test

test-watch:
	npm run test:watch

test-coverage:
	npm test -- --coverage

lint:
	npm run lint

lint-fix:
	npm run lint -- --fix

type-check:
	npx tsc --noEmit

# Build Commands
build:
	npm run build

clean:
	rm -rf dist coverage node_modules

# Docker Commands
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f backend

docker-clean:
	docker-compose down -v
	docker system prune -f

# Database Commands
db-migrate:
	npx prisma migrate dev

db-studio:
	npx prisma studio

db-seed:
	npx prisma db seed

# API Documentation
swagger-gen:
	npm run swagger

swagger-open:
	@echo "Opening Swagger UI..."
	@which open > /dev/null && open http://localhost:5000/docs || echo "Visit http://localhost:5000/docs in your browser"

# Utility Commands
format:
	npx prettier --write "src/**/*.ts"

validate:
	@echo "Running validation checks..."
	@npm run type-check
	@npm run lint
	@npm test

# Development setup
setup: install db-setup
	@echo "Setup complete! Run 'make dev' to start the development server."

# Production-like build
prod-build: clean install build
	@echo "Production build complete!"
