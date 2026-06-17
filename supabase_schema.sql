-- SQL Script for creating the Everest Academy Supabase tables
-- Paste this script into your Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Create 'classes' table
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT
);

-- Enable Row Level Security (RLS) on classes
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated/anonymous operations for simple admin dashboard (adjust policies based on real-world needs)
CREATE POLICY "Allow public select on classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on classes" ON classes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on classes" ON classes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on classes" ON classes FOR DELETE USING (true);


-- 2. Create 'students' table supporting both snake_case and camelCase queries
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  -- We include both camelCase and snake_case references so both styles sync seamlessly
  "parentPhone" TEXT,
  parent_phone TEXT,
  "paymentStatus" TEXT DEFAULT 'Pending' CHECK ("paymentStatus" IN ('Paid', 'Pending', 'Unpaid')),
  payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Unpaid')),
  "classId" TEXT NOT NULL,
  class_id TEXT
);

-- Enable RLS on students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
CREATE POLICY "Allow public select on students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public insert on students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on students" ON students FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on students" ON students FOR DELETE USING (true);


-- 3. Create 'teachers' table supporting both styles
CREATE TABLE IF NOT EXISTS teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  subject TEXT NOT NULL,
  salary NUMERIC NOT NULL DEFAULT 0,
  "paymentStatus" TEXT DEFAULT 'Unpaid' CHECK ("paymentStatus" IN ('Paid', 'Pending', 'Unpaid')),
  payment_status TEXT DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Pending', 'Unpaid')),
  "lastPaymentDate" TEXT,
  last_payment_date TEXT
);

-- Enable RLS on teachers
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Policies for teachers
CREATE POLICY "Allow public select on teachers" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow public insert on teachers" ON teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on teachers" ON teachers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on teachers" ON teachers FOR DELETE USING (true);


-- =========================================================
-- INITIAL SEED DATA WITH REALISTIC ALGERIAN SCHOOL VALUES:
-- =========================================================

-- Clear existing data if you want a clean slate
-- TRUNCATE classes, students, teachers CASCADE;

-- Insert Classes
INSERT INTO classes (id, name, price, description) VALUES
('332fa7be-da0b-4835-ab35-26792ed715b1', 'Terminale - Mathématiques', 2500, 'Préparation intensive au Baccalauréat, analyse, algèbre et probabilités.'),
('a059535e-c1bb-4f89-8d8a-94ef7debe900', 'Terminale - Physique & Chimie', 2500, 'Programme officiel du Bac, mécanique, électricité et réactions chimiques.'),
('fca9b841-477d-472c-8805-4f387db2e86b', 'BEM - Mathématiques', 1800, 'Préparation complète à l''épreuve de maths du Brevet BEM.'),
('e76da4fe-4861-424a-8be5-61845eaaeaa5', 'Lycée - Anglais Général', 1500, 'Amélioration de l''anglais écrit, parlé et grammaire de niveau secondaire.'),
('db44c45e-bda5-4ea9-b2db-ff0b6d2a843e', 'Français - Soutien Moyen', 1600, 'Vocabulaire, conjugaison et productions d''écrits pour le collège.')
ON CONFLICT (id) DO NOTHING;

-- Insert Teachers
INSERT INTO teachers (id, name, email, subject, salary, "paymentStatus", payment_status, "lastPaymentDate", last_payment_date) VALUES
('b28669b2-3b02-4ec4-9cbd-d3a987d6cf35', 'Prof. Slimane Belkacem', 's.belkacem@everest.dz', 'Mathematics', 45000, 'Paid', 'Paid', '2026-06-05', '2026-06-05'),
('7070da17-21fb-429f-8557-4b7264ae4b9b', 'Dr. Yasmina Mansouri', 'y.mansouri@everest.dz', 'Physics', 48050, 'Unpaid', 'Unpaid', NULL, NULL),
('cd2142f9-7f9e-4eec-8865-f48efbc37624', 'Prof. Mourad Bouzidi', 'm.bouzidi@everest.dz', 'French', 38000, 'Pending', 'Pending', NULL, NULL),
('1b80dbfe-a7ff-43f1-b9cc-8feba0cbd2bf', 'Prof. Amina Ouchene', 'a.ouchene@everest.dz', 'English', 35000, 'Paid', 'Paid', '2026-06-08', '2026-06-08')
ON CONFLICT (id) DO NOTHING;

-- Insert Students
INSERT INTO students (id, name, "parentPhone", parent_phone, "paymentStatus", payment_status, "classId", class_id) VALUES
('ef7e671b-365a-4b20-ba1b-2628fb607e41', 'Abderrahmane Zaiti', '0661245892', '0661245892', 'Paid', 'Paid', '332fa7be-da0b-4835-ab35-26792ed715b1', '332fa7be-da0b-4835-ab35-26792ed715b1'),
('4e27f0fc-efd6-4444-baa1-36ba5c832fb7', 'Leila Kaddour', '0555321456', '0555321456', 'Pending', 'Pending', '332fa7be-da0b-4835-ab35-26792ed715b1', '332fa7be-da0b-4835-ab35-26792ed715b1'),
('de8ff4c7-1ab6-4993-96b0-f8df7bc2be6a', 'Yanis Amrani', '0772183495', '0772183495', 'Unpaid', 'Unpaid', 'a059535e-c1bb-4f89-8d8a-94ef7debe900', 'a059535e-c1bb-4f89-8d8a-94ef7debe900'),
('ac2dcfa7-ef8a-4952-b8bb-c5bb20857140', 'Fatma-Zohra Mansouri', '0561234567', '0561234567', 'Paid', 'Paid', 'fca9b841-477d-472c-8805-4f387db2e86b', 'fca9b841-477d-472c-8805-4f387db2e86b'),
('30bce7f7-ea98-47c0-bf38-348f98ae7df9', 'Mohamed Amine Bouzidi', '0662895412', '0662895412', 'Pending', 'Pending', 'e76da4fe-4861-424a-8be5-61845eaaeaa5', 'e76da4fe-4861-424a-8be5-61845eaaeaa5'),
('7ba8e8c1-1e24-4f22-bb1d-8ca135ae26b8', 'Meriem Ouchene', '0770987654', '0770987654', 'Paid', 'Paid', 'db44c45e-bda5-4ea9-b2db-ff0b6d2a843e', 'db44c45e-bda5-4ea9-b2db-ff0b6d2a843e'),
('5c7bc8f0-ea4f-4d22-bba3-2ea17578ab61', 'Anis Belkacem', '0551743621', '0551743621', 'Unpaid', 'Unpaid', 'a059535e-c1bb-4f89-8d8a-94ef7debe900', 'a059535e-c1bb-4f89-8d8a-94ef7debe900'),
('cbcedf71-2ed9-411a-abfb-9fc5fe85ae2b', 'Khadidja Haddad', '0663152436', '0663152436', 'Paid', 'Paid', 'fca9b841-477d-472c-8805-4f387db2e86b', 'fca9b841-477d-472c-8805-4f387db2e86b'),
('fb2be80a-fd91-49fa-bd98-7cfdff897ef2', 'Oussama Sifi', '0792345678', '0792345678', 'Unpaid', 'Unpaid', 'db44c45e-bda5-4ea9-b2db-ff0b6d2a843e', 'db44c45e-bda5-4ea9-b2db-ff0b6d2a843e')
ON CONFLICT (id) DO NOTHING;
