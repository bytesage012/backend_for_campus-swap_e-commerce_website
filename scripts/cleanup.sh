#!/bin/bash

# cleanup.sh - Clears uploads and resets the database

echo "Cleaning up uploads directory..."
# Delete all files in uploads and its subdirectories, except .gitkeep files
find uploads -type f ! -name ".gitkeep" -delete

echo "Resetting the database..."
# Use db push --force-reset to ensure the schema matches schema.prisma exactly
npx prisma db push --force-reset

# Generate Prisma Client to ensure type safety and sync with schema
npx prisma generate

echo "Cleanup complete!"

