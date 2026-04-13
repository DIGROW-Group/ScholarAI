-- Add 'counselor' role to the users role enum
-- Run this script to update the database enum type

-- For PostgreSQL 9.1+
ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'counselor';

-- If the above doesn't work (older PostgreSQL versions), use this instead:
/*
CREATE TYPE "enum_users_role_new" AS ENUM('student', 'teacher', 'parent', 'admin', 'counselor');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "enum_users_role_new" USING ("role"::text::"enum_users_role_new");
DROP TYPE "enum_users_role";
ALTER TYPE "enum_users_role_new" RENAME TO "enum_users_role";
*/

