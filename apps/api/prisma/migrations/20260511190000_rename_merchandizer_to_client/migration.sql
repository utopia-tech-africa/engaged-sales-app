-- Rename field-observer role: clients are rostered on activations for read-only portal access.
ALTER TYPE "UserRole" RENAME VALUE 'merchandizer' TO 'client';
