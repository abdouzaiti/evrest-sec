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
-- DROP FUNCTION IF EXISTS sync_students_keys();
-- DROP FUNCTION IF EXISTS sync_teachers_keys();
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

-- B. CREATE students TABLE (Supporting Dual Case naming)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "parentPhone" TEXT,
  parent_phone TEXT,
  "paymentStatus" TEXT DEFAULT 'Pending' CHECK ("paymentStatus" IN ('Paid', 'Pending', 'Unpaid')),
  payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Unpaid')),
  "classId" TEXT NOT NULL,
  class_id TEXT
);

-- C. CREATE teachers TABLE (Supporting Dual Case naming)
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT,
  subject TEXT NOT NULL,
  salary NUMERIC NOT NULL DEFAULT 0,
  "paymentStatus" TEXT DEFAULT 'Unpaid' CHECK ("paymentStatus" IN ('Paid', 'Pending', 'Unpaid')),
  payment_status TEXT DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Pending', 'Unpaid')),
  "lastPaymentDate" TEXT,
  last_payment_date TEXT
);


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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_teachers_keys
BEFORE INSERT OR UPDATE ON teachers
FOR EACH ROW
EXECUTE FUNCTION sync_teachers_keys();


-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable security rules
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Dynamic policies allowing unrestricted operations for the Director / Admin Dashboard
CREATE POLICY "Allow public select on classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on classes" ON classes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on classes" ON classes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on classes" ON classes FOR DELETE USING (true);

CREATE POLICY "Allow public select on students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public insert on students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on students" ON students FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on students" ON students FOR DELETE USING (true);

CREATE POLICY "Allow public select on teachers" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow public insert on teachers" ON teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on teachers" ON teachers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on teachers" ON teachers FOR DELETE USING (true);


-- ==========================================
-- 5. PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id_camel ON students("classId");
CREATE INDEX IF NOT EXISTS idx_teachers_payment_status ON teachers(payment_status);


-- =========================================================
-- 6. INITIAL SEED DATA WITH REALISTIC ALGERIAN ACADEMY VALUE
-- =========================================================

-- Clear existing data if you want a complete fresh restart
-- TRUNCATE classes, students, teachers CASCADE;

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

-- Default Teachers
INSERT INTO teachers (id, name, email, subject, salary, payment_status, last_payment_date) VALUES
('teacher-1', 'Prof. Slimane Belkacem', 's.belkacem@everest.dz', 'Mathematics', 45000, 'Paid', '2026-06-05'),
('teacher-2', 'Dr. Yasmina Mansouri', 'y.mansouri@everest.dz', 'Physics', 48050, 'Unpaid', NULL),
('teacher-3', 'Prof. Mourad Bouzidi', 'm.bouzidi@everest.dz', 'French', 38000, 'Pending', NULL),
('teacher-4', 'Prof. Amina Ouchene', 'a.ouchene@everest.dz', 'English', 35000, 'Paid', '2026-06-08')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  email = EXCLUDED.email, 
  subject = EXCLUDED.subject, 
  salary = EXCLUDED.salary, 
  payment_status = EXCLUDED.payment_status, 
  last_payment_date = EXCLUDED.last_payment_date;

-- Default Students
INSERT INTO students (id, name, parent_phone, payment_status, class_id) VALUES
('student-1', 'Abderrahmane Zaiti', '0661245892', 'Paid', 'class-1'),
('student-2', 'Leila Kaddour', '0555321456', 'Pending', 'class-1'),
('student-3', 'Yanis Amrani', '0772183495', 'Unpaid', 'class-2'),
('student-4', 'Fatma-Zohra Mansouri', '0561234567', 'Paid', 'class-3'),
('student-5', 'Mohamed Amine Bouzidi', '0662895412', 'Pending', 'class-4'),
('student-6', 'Meriem Ouchene', '0770987654', 'Paid', 'class-5'),
('student-7', 'Anis Belkacem', '0551743621', 'Unpaid', 'class-2'),
('student-8', 'Khadidja Haddad', '0663152436', 'Paid', 'class-3'),
('student-9', 'Oussama Sifi', '0792345678', 'Unpaid', 'class-5')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  parent_phone = EXCLUDED.parent_phone, 
  payment_status = EXCLUDED.payment_status, 
  class_id = EXCLUDED.class_id;
