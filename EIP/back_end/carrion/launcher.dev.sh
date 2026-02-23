#!/bin/sh

echo "Applying database migrations..."
npx prisma migrate dev --name init --skip-generate

echo "Starting application in development mode..."
npm run start:dev