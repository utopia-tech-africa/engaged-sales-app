DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceKind') THEN
    CREATE TYPE "AttendanceKind" AS ENUM ('clock_in', 'clock_out');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LocationPing'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'LocationPing'
      AND column_name = 'attendanceKind'
  ) THEN
    ALTER TABLE "LocationPing"
      ADD COLUMN "attendanceKind" "AttendanceKind" NOT NULL DEFAULT 'clock_in';
  END IF;
END $$;
