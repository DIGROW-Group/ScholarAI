-- Add onboardingCompleted column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
