-- CreateEnum
CREATE TYPE "AttendanceKind" AS ENUM ('clock_in', 'clock_out');

-- AlterTable
ALTER TABLE "LocationPing" ADD COLUMN "attendanceKind" "AttendanceKind" NOT NULL DEFAULT 'clock_in';
