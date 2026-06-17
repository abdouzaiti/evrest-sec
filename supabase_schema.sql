-- ========================================================
-- Schema Solution for Everest Academy (Supabase Database)
-- ========================================================
-- This file contains the complete SQL definitions required to run 
-- the Everest Academy school management applet.
-- 
-- 🎨 HIGHLY COMPATIBLE DESIGN:
-- This schema defines duplicate columns (e.g. "parentPhone" and parent_phone) 
-- and installs live POSTGRES TRIGGERS to automatically sync values between 
-- them under the hood! No matter if an operation executes camelCase or snake_case,
-- the data remains perfectly synchronized.
--
-- 👉 HOW TO DEPLOY:
-- 1. Go to your Supabase Dashboard (https://supabase.com).
-- 2. Select your project.
-- 3. Click "SQL Editor" in the left sidebar navigation.
-- 4. Create a new query (Click "+ New query").
-- 5. Paste this entire script and click "RUN".

-- ==========================================
-- 1. CLEAN UP EXISTING STRUCTURE (Optional)
-- ==========================================
-- DROP TRIGGER IF EXISTS trg_sync_students_keys ON students;
-- DROP TRIGGER IF EXISTS trg_sync_teachers_keys ON teachers;
-- DROP TRIGGER IF EXISTS trg_sync_pointage_logs_keys ON pointage_logs;
-- DROP FUNCTION IF EXISTS sync_students_keys();
-- DROP FUNCTION IF EXISTS sync_teachers_keys();
-- DROP FUNCTION IF EXISTS sync_pointage_logs_keys();
-- DROP TABLE IF EXISTS pointage_logs;
-- DROP TABLE IF EXISTS students;
-- DROP TABLE IF EXISTS teachers;
-- DROP TABLE IF EXISTS classes;


-- ==========================================
-- 2. CREATE TABLE DEFINITIONS
-- ==========================================

-- A. CREATE classes TABLE
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT
);

-- B. CREATE students TABLE (Supporting Dual Case naming and Tokens)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "parentPhone" TEXT,
  parent_phone TEXT,
  "paymentStatus" TEXT DEFAULT 'Pending' CHECK ("paymentStatus" IN ('Paid', 'Pending', 'Unpaid')),
  payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Unpaid')),
  "classId" TEXT NOT NULL,
  class_id TEXT,
  "tokenId" TEXT,
  token_id TEXT
);

-- C. CREATE teachers TABLE (Supporting Dual Case naming and Tokens)
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT,
  subject TEXT NOT NULL,
  salary NUMERIC NOT NULL DEFAULT 0,
  "paymentStatus" TEXT DEFAULT 'Unpaid' CHECK ("paymentStatus" IN ('Paid', 'Pending', 'Unpaid')),
  payment_status TEXT DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Pending', 'Unpaid')),
  "lastPaymentDate" TEXT,
  last_payment_date TEXT,
  "tokenId" TEXT,
  token_id TEXT
);

-- D. CREATE pointage_logs TABLE (Supporting dual case naming)
CREATE TABLE IF NOT EXISTS pointage_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "personId" TEXT NOT NULL,
  person_id TEXT,
  "personType" TEXT NOT NULL CHECK ("personType" IN ('student', 'teacher')),
  person_type TEXT CHECK (person_type IN ('student', 'teacher')),
  "personName" TEXT NOT NULL,
  person_name TEXT,
  "tokenId" TEXT NOT NULL,
  token_id TEXT,
  timestamp TEXT NOT NULL,
  details TEXT NOT NULL
);


-- ========================================================
-- 2.5 ENSURE ALL COLUMNS EXIST ON OLDER TABLES
-- ========================================================
-- These statements ensure that if tables already exist in your database,
-- they receive the required columns (like token_id / tokenId) without errors!

ALTER TABLE classes ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE students ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "classId" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tokenId" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS token_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "parentPhone" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT DEFAULT 'Pending';
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Pending';

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS salary NUMERIC DEFAULT 0;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS "tokenId" TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS token_id TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT DEFAULT 'Unpaid';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS "lastPaymentDate" TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS last_payment_date TEXT;

ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS "personId" TEXT;
ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS person_id TEXT;
ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS "personType" TEXT;
ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS person_type TEXT;
ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS "personName" TEXT;
ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS person_name TEXT;
ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS "tokenId" TEXT;
ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS token_id TEXT;
ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS timestamp TEXT;
ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS details TEXT;


-- ==========================================
-- 3. AUTOMATED DB SYNCHRONIZATION TRIGGERS
-- ==========================================

-- Function to keep student columns in sync
CREATE OR REPLACE FUNCTION sync_students_keys()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync parent phone
  IF NEW.parent_phone IS DISTINCT FROM OLD.parent_phone THEN
    NEW."parentPhone" := NEW.parent_phone;
  ELSIF NEW."parentPhone" IS DISTINCT FROM OLD."parentPhone" THEN
    NEW.parent_phone := NEW."parentPhone";
  END IF;

  -- Default fallback if one is provided but not another on insert
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_phone IS NOT NULL AND NEW."parentPhone" IS NULL THEN
      NEW."parentPhone" := NEW.parent_phone;
    ELSIF NEW."parentPhone" IS NOT NULL AND NEW.parent_phone IS NULL THEN
      NEW.parent_phone := NEW."parentPhone";
    END IF;
  END IF;

  -- Sync payment status
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    NEW."paymentStatus" := NEW.payment_status;
  ELSIF NEW."paymentStatus" IS DISTINCT FROM OLD."paymentStatus" THEN
    NEW.payment_status := NEW."paymentStatus";
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status IS NOT NULL AND NEW."paymentStatus" IS NULL THEN
      NEW."paymentStatus" := NEW.payment_status;
    ELSIF NEW."paymentStatus" IS NOT NULL AND NEW.payment_status IS NULL THEN
      NEW.payment_status := NEW."paymentStatus";
    END IF;
  END IF;

  -- Sync class id
  IF NEW.class_id IS DISTINCT FROM OLD.class_id THEN
    NEW."classId" := NEW.class_id;
  ELSIF NEW."classId" IS DISTINCT FROM OLD."classId" THEN
    NEW.class_id := NEW."classId";
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.class_id IS NOT NULL AND NEW."classId" IS NULL THEN
      NEW."classId" := NEW.class_id;
    ELSIF NEW."classId" IS NOT NULL AND NEW.class_id IS NULL THEN
      NEW.class_id := NEW."classId";
    END IF;
  END IF;

  -- Sync token id
  IF NEW.token_id IS DISTINCT FROM OLD.token_id THEN
    NEW."tokenId" := NEW.token_id;
  ELSIF NEW."tokenId" IS DISTINCT FROM OLD."tokenId" THEN
    NEW.token_id := NEW."tokenId";
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.token_id IS NOT NULL AND NEW."tokenId" IS NULL THEN
      NEW."tokenId" := NEW.token_id;
    ELSIF NEW."tokenId" IS NOT NULL AND NEW.token_id IS NULL THEN
      NEW.token_id := NEW."tokenId";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_students_keys
BEFORE INSERT OR UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION sync_students_keys();


-- Function to keep teacher columns in sync
CREATE OR REPLACE FUNCTION sync_teachers_keys()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync payment status
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    NEW."paymentStatus" := NEW.payment_status;
  ELSIF NEW."paymentStatus" IS DISTINCT FROM OLD."paymentStatus" THEN
    NEW.payment_status := NEW."paymentStatus";
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status IS NOT NULL AND NEW."paymentStatus" IS NULL THEN
      NEW."paymentStatus" := NEW.payment_status;
    ELSIF NEW."paymentStatus" IS NOT NULL AND NEW.payment_status IS NULL THEN
      NEW.payment_status := NEW."paymentStatus";
    END IF;
  END IF;

  -- Sync last payment date
  IF NEW.last_payment_date IS DISTINCT FROM OLD.last_payment_date THEN
    NEW."lastPaymentDate" := NEW.last_payment_date;
  ELSIF NEW."lastPaymentDate" IS DISTINCT FROM OLD."lastPaymentDate" THEN
    NEW.last_payment_date := NEW."lastPaymentDate";
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.last_payment_date IS NOT NULL AND NEW."lastPaymentDate" IS NULL THEN
      NEW."lastPaymentDate" := NEW.last_payment_date;
    ELSIF NEW."lastPaymentDate" IS NOT NULL AND NEW.last_payment_date IS NULL THEN
      NEW.last_payment_date := NEW."lastPaymentDate";
    END IF;
  END IF;

  -- Sync token id
  IF NEW.token_id IS DISTINCT FROM OLD.token_id THEN
    NEW."tokenId" := NEW.token_id;
  ELSIF NEW."tokenId" IS DISTINCT FROM OLD."tokenId" THEN
    NEW.token_id := NEW."tokenId";
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.token_id IS NOT NULL AND NEW."tokenId" IS NULL THEN
      NEW."tokenId" := NEW.token_id;
    ELSIF NEW."tokenId" IS NOT NULL AND NEW.token_id IS NULL THEN
      NEW.token_id := NEW."tokenId";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_teachers_keys
BEFORE INSERT OR UPDATE ON teachers
FOR EACH ROW
EXECUTE FUNCTION sync_teachers_keys();


-- Function to keep pointage_logs columns in sync
CREATE OR REPLACE FUNCTION sync_pointage_logs_keys()
RETURNS TRIGGER AS $$
BEGIN
  -- Person ID
  IF NEW.person_id IS DISTINCT FROM OLD.person_id THEN
    NEW."personId" := NEW.person_id;
  ELSIF NEW."personId" IS DISTINCT FROM OLD."personId" THEN
    NEW.person_id := NEW."personId";
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.person_id IS NOT NULL AND NEW."personId" IS NULL THEN
      NEW."personId" := NEW.person_id;
    ELSIF NEW."personId" IS NOT NULL AND NEW.person_id IS NULL THEN
      NEW.person_id := NEW."personId";
    END IF;
  END IF;

  -- Person Type
  IF NEW.person_type IS DISTINCT FROM OLD.person_type THEN
    NEW."personType" := NEW.person_type;
  ELSIF NEW."personType" IS DISTINCT FROM OLD."personType" THEN
    NEW.person_type := NEW."personType";
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.person_type IS NOT NULL AND NEW."personType" IS NULL THEN
      NEW."personType" := NEW.person_type;
    ELSIF NEW."personType" IS NOT NULL AND NEW.person_type IS NULL THEN
      NEW.person_type := NEW."personType";
    END IF;
  END IF;

  -- Person Name
  IF NEW.person_name IS DISTINCT FROM OLD.person_name THEN
    NEW."personName" := NEW.person_name;
  ELSIF NEW."personName" IS DISTINCT FROM OLD."personName" THEN
    NEW.person_name := NEW."personName";
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.person_name IS NOT NULL AND NEW."personName" IS NULL THEN
      NEW."personName" := NEW.person_name;
    ELSIF NEW."personName" IS NOT NULL AND NEW.person_name IS NULL THEN
      NEW.person_name := NEW."personName";
    END IF;
  END IF;

  -- Token ID
  IF NEW.token_id IS DISTINCT FROM OLD.token_id THEN
    NEW."tokenId" := NEW.token_id;
  ELSIF NEW."tokenId" IS DISTINCT FROM OLD."tokenId" THEN
    NEW.token_id := NEW."tokenId";
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.token_id IS NOT NULL AND NEW."tokenId" IS NULL THEN
      NEW."tokenId" := NEW.token_id;
    ELSIF NEW."tokenId" IS NOT NULL AND NEW.token_id IS NULL THEN
      NEW.token_id := NEW."tokenId";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_pointage_logs_keys
BEFORE INSERT OR UPDATE ON pointage_logs
FOR EACH ROW
EXECUTE FUNCTION sync_pointage_logs_keys();


-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable security rules
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointage_logs ENABLE ROW LEVEL SECURITY;

-- Dynamic policies allowing unrestricted operations for the Director / Admin Dashboard
DROP POLICY IF EXISTS "Allow public select on classes" ON classes;
CREATE POLICY "Allow public select on classes" ON classes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on classes" ON classes;
CREATE POLICY "Allow public insert on classes" ON classes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on classes" ON classes;
CREATE POLICY "Allow public update on classes" ON classes FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow public delete on classes" ON classes;
CREATE POLICY "Allow public delete on classes" ON classes FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select on students" ON students;
CREATE POLICY "Allow public select on students" ON students FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on students" ON students;
CREATE POLICY "Allow public insert on students" ON students FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on students" ON students;
CREATE POLICY "Allow public update on students" ON students FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow public delete on students" ON students;
CREATE POLICY "Allow public delete on students" ON students FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select on teachers" ON teachers;
CREATE POLICY "Allow public select on teachers" ON teachers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on teachers" ON teachers;
CREATE POLICY "Allow public insert on teachers" ON teachers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on teachers" ON teachers;
CREATE POLICY "Allow public update on teachers" ON teachers FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow public delete on teachers" ON teachers;
CREATE POLICY "Allow public delete on teachers" ON teachers FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select on pointage_logs" ON pointage_logs;
CREATE POLICY "Allow public select on pointage_logs" ON pointage_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on pointage_logs" ON pointage_logs;
CREATE POLICY "Allow public insert on pointage_logs" ON pointage_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on pointage_logs" ON pointage_logs;
CREATE POLICY "Allow public update on pointage_logs" ON pointage_logs FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow public delete on pointage_logs" ON pointage_logs;
CREATE POLICY "Allow public delete on pointage_logs" ON pointage_logs FOR DELETE USING (true);


-- ==========================================
-- 5. PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id_camel ON students("classId");
CREATE INDEX IF NOT EXISTS idx_teachers_payment_status ON teachers(payment_status);
CREATE INDEX IF NOT EXISTS idx_pointage_logs_tokenId ON pointage_logs("tokenId");


-- =========================================================
-- 6. INITIAL SEED DATA WITH REALISTIC ALGERIAN ACADEMY VALUE
-- =========================================================

-- Clear existing data if you want a complete fresh restart
-- TRUNCATE classes, students, teachers, pointage_logs CASCADE;

-- Default Classes
INSERT INTO classes (id, name, price, description) VALUES
('class-1', 'Terminale - Mathématiques', 2500, 'Préparation intensive au Baccalauréat, analyse, algèbre et probabilités.'),
('class-2', 'Terminale - Physique & Chimie', 2500, 'Programme officiel du Bac, mécanique, électricité et réactions chimiques.'),
('class-3', 'BEM - Mathématiques', 1800, 'Préparation complète à l''épreuve de maths du Brevet BEM.'),
('class-4', 'Lycée - Anglais Général', 1500, 'Amélioration de l''anglais écrit, parlé et grammaire de niveau secondaire.'),
('class-5', 'Français - Soutien Moyen', 1600, 'Vocabulaire, conjugaison et productions d''écrits pour le collège.')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  price = EXCLUDED.price, 
  description = EXCLUDED.description;

-- Default Teachers with Token IDs
INSERT INTO teachers (id, name, email, subject, salary, payment_status, last_payment_date, token_id) VALUES
('teacher-1', 'Prof. Slimane Belkacem', 's.belkacem@everest.dz', 'Mathematics', 45000, 'Paid', '2026-06-05', 'T201'),
('teacher-2', 'Dr. Yasmina Mansouri', 'y.mansouri@everest.dz', 'Physics', 48050, 'Unpaid', NULL, 'T202'),
('teacher-3', 'Prof. Mourad Bouzidi', 'm.bouzidi@everest.dz', 'French', 38000, 'Pending', NULL, 'T203'),
('teacher-4', 'Prof. Amina Ouchene', 'a.ouchene@everest.dz', 'English', 35000, 'Paid', '2026-06-08', 'T204')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  email = EXCLUDED.email, 
  subject = EXCLUDED.subject, 
  salary = EXCLUDED.salary, 
  payment_status = EXCLUDED.payment_status, 
  last_payment_date = EXCLUDED.last_payment_date,
  token_id = EXCLUDED.token_id;

-- Default Students with Token IDs
INSERT INTO students (id, name, parent_phone, payment_status, class_id, token_id) VALUES
('student-1', 'Abderrahmane Zaiti', '0661245892', 'Paid', 'class-1', 'S101'),
('student-2', 'Leila Kaddour', '0555321456', 'Pending', 'class-1', 'S102'),
('student-3', 'Yanis Amrani', '0772183495', 'Unpaid', 'class-2', 'S103'),
('student-4', 'Fatma-Zohra Mansouri', '0561234567', 'Paid', 'class-3', 'S104'),
('student-5', 'Mohamed Amine Bouzidi', '0662895412', 'Pending', 'class-4', 'S105'),
('student-6', 'Meriem Ouchene', '0770987654', 'Paid', 'class-5', 'S106'),
('student-7', 'Anis Belkacem', '0551743621', 'Unpaid', 'class-2', 'S107'),
('student-8', 'Khadidja Haddad', '0663152436', 'Paid', 'class-3', 'S108'),
('student-9', 'Oussama Sifi', '0792345678', 'Unpaid', 'class-5', 'S109')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  parent_phone = EXCLUDED.parent_phone, 
  payment_status = EXCLUDED.payment_status, 
  class_id = EXCLUDED.class_id,
  token_id = EXCLUDED.token_id;
