import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SchoolClass, Student, Teacher } from '../types';

// Mock/Local Storage fallback default databases (Algerian/Academy Focused)
const defaultClasses: SchoolClass[] = [
  { id: 'class-1', name: 'Terminale - Mathématiques', price: 2500, description: 'Préparation intensive au Baccalauréat, analyse, algèbre et probabilités.' },
  { id: 'class-2', name: 'Terminale - Physique & Chimie', price: 2500, description: 'Programme officiel du Bac, mécanique, électricité et réactions chimiques.' },
  { id: 'class-3', name: 'BEM - Mathématiques', price: 1800, description: 'Préparation complète à l\'épreuve de maths du Brevet BEM.' },
  { id: 'class-4', name: 'Lycée - Anglais Général', price: 1500, description: 'Amélioration de l\'anglais écrit, parlé et grammaire de niveau secondaire.' },
  { id: 'class-5', name: 'Français - Soutien Moyen', price: 1600, description: 'Vocabulaire, conjugaison et productions d\'écrits pour le collège.' }
];

const defaultStudents: Student[] = [
  { id: 'student-1', name: 'Abderrahmane Zaiti', parentPhone: '0661245892', paymentStatus: 'Paid', classId: 'class-1' },
  { id: 'student-2', name: 'Leila Kaddour', parentPhone: '0555321456', paymentStatus: 'Pending', classId: 'class-1' },
  { id: 'student-3', name: 'Yanis Amrani', parentPhone: '0772183495', paymentStatus: 'Unpaid', classId: 'class-2' },
  { id: 'student-4', name: 'Fatma-Zohra Mansouri', parentPhone: '0561234567', paymentStatus: 'Paid', classId: 'class-3' },
  { id: 'student-5', name: 'Mohamed Amine Bouzidi', parentPhone: '0662895412', paymentStatus: 'Pending', classId: 'class-4' },
  { id: 'student-6', name: 'Meriem Ouchene', parentPhone: '0770987654', paymentStatus: 'Paid', classId: 'class-5' },
  { id: 'student-7', name: 'Anis Belkacem', parentPhone: '0551743621', paymentStatus: 'Unpaid', classId: 'class-2' },
  { id: 'student-8', name: 'Khadidja Haddad', parentPhone: '0663152436', paymentStatus: 'Paid', classId: 'class-3' },
  { id: 'student-9', name: 'Oussama Sifi', parentPhone: '0792345678', paymentStatus: 'Unpaid', classId: 'class-5' }
];

const defaultTeachers: Teacher[] = [
  { id: 'teacher-1', name: 'Prof. Slimane Belkacem', email: 's.belkacem@everest.dz', subject: 'Mathematics', salary: 45000, paymentStatus: 'Paid', lastPaymentDate: '2026-06-05' },
  { id: 'teacher-2', name: 'Dr. Yasmina Mansouri', email: 'y.mansouri@everest.dz', subject: 'Physics', salary: 48050, paymentStatus: 'Unpaid' },
  { id: 'teacher-3', name: 'Prof. Mourad Bouzidi', email: 'm.bouzidi@everest.dz', subject: 'French', salary: 38000, paymentStatus: 'Pending' },
  { id: 'teacher-4', name: 'Prof. Amina Ouchene', email: 'a.ouchene@everest.dz', subject: 'English', salary: 35000, paymentStatus: 'Paid', lastPaymentDate: '2026-06-08' }
];

// Helper to load and store data in local storage when Supabase is not configured
const getLocalData = <T>(key: string, defaults: T[]): T[] => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaults;
  }
};

const saveLocalData = <T>(key: string, items: T[]) => {
  localStorage.setItem(key, JSON.stringify(items));
};

/**
 * Robust database mappers.
 * Supabase/PostgreSQL databases often standardise on snake_case (e.g. `parent_phone`)
 * whereas our front-end relies on camelCase (e.g. `parentPhone`).
 * These mappers abstract database column layouts.
 */
const mapToClass = (row: any): SchoolClass => {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name || '',
    price: row.price !== undefined ? Number(row.price) : 0,
    description: row.description || ''
  };
};

const mapToStudent = (row: any): Student => {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name || '',
    parentPhone: row.parentPhone !== undefined ? row.parentPhone : (row.parent_phone !== undefined ? row.parent_phone : ''),
    paymentStatus: row.paymentStatus !== undefined ? row.paymentStatus : (row.payment_status !== undefined ? row.payment_status : 'Pending'),
    classId: row.classId !== undefined ? row.classId : (row.class_id !== undefined ? row.class_id : '')
  };
};

const mapToTeacher = (row: any): Teacher => {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    subject: row.subject || '',
    salary: row.salary !== undefined ? Number(row.salary) : 0,
    paymentStatus: row.paymentStatus !== undefined ? row.paymentStatus : (row.payment_status !== undefined ? row.payment_status : 'Unpaid'),
    lastPaymentDate: row.lastPaymentDate !== undefined ? row.lastPaymentDate : (row.last_payment_date !== undefined ? row.last_payment_date : undefined)
  };
};

/**
 * Payload creators that output both styles (snake_case & camelCase fields)
 * so that they seamlessly insert and update regardless of how the user named their tables.
 */
const makeStudentPayload = (s: Omit<Student, 'id'>) => {
  return {
    name: s.name,
    parentPhone: s.parentPhone,
    parent_phone: s.parentPhone,
    paymentStatus: s.paymentStatus,
    payment_status: s.paymentStatus,
    classId: s.classId,
    class_id: s.classId
  };
};

const makeTeacherPayload = (t: Omit<Teacher, 'id'>) => {
  return {
    name: t.name,
    email: t.email,
    subject: t.subject,
    salary: Number(t.salary),
    paymentStatus: t.paymentStatus,
    payment_status: t.paymentStatus,
    lastPaymentDate: t.lastPaymentDate,
    last_payment_date: t.lastPaymentDate
  };
};

export const classesService = {
  async getAll(): Promise<SchoolClass[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*');
        if (error) throw error;
        return (data || []).map(mapToClass);
      } catch (err) {
        console.warn('Failed to fetch from Supabase classes table, falling back to LocalStorage', err);
        return getLocalData<SchoolClass>('school_classes', defaultClasses);
      }
    } else {
      return getLocalData<SchoolClass>('school_classes', defaultClasses);
    }
  },
  async create(schoolClass: Omit<SchoolClass, 'id'>): Promise<SchoolClass> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('classes')
          .insert([schoolClass])
          .select()
          .single();
        if (error) throw error;
        return mapToClass(data);
      } catch (err: any) {
        throw new Error(err.message || 'Error inserting school class to Supabase');
      }
    } else {
      const local = getLocalData<SchoolClass>('school_classes', defaultClasses);
      const newClass: SchoolClass = {
        ...schoolClass,
        id: 'class-' + Date.now() + Math.random().toString(36).substring(2, 6)
      };
      local.push(newClass);
      saveLocalData('school_classes', local);
      return newClass;
    }
  },
  async delete(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('classes')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (err: any) {
        throw new Error(err.message || 'Error deleting school class from Supabase');
      }
    } else {
      const local = getLocalData<SchoolClass>('school_classes', defaultClasses);
      const filtered = local.filter(c => c.id !== id);
      saveLocalData('school_classes', filtered);
    }
  }
};

export const studentsService = {
  async getAll(): Promise<Student[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*');
        if (error) throw error;
        return (data || []).map(mapToStudent);
      } catch (err) {
        console.warn('Failed to fetch from Supabase students table, falling back to LocalStorage', err);
        return getLocalData<Student>('school_students', defaultStudents);
      }
    } else {
      return getLocalData<Student>('school_students', defaultStudents);
    }
  },
  async getByClass(classId: string): Promise<Student[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*');
        if (error) throw error;
        
        const studentsList = (data || []).map(mapToStudent);
        return studentsList.filter(s => s.classId === classId);
      } catch (err) {
        console.warn('Failed to filter students via class query, falling back to filtering local/retrieved lists', err);
        const local = getLocalData<Student>('school_students', defaultStudents);
        return local.filter(s => s.classId === classId);
      }
    } else {
      const local = getLocalData<Student>('school_students', defaultStudents);
      return local.filter(s => s.classId === classId);
    }
  },
  async create(student: Omit<Student, 'id'>): Promise<Student> {
    if (isSupabaseConfigured()) {
      try {
        // Construct dynamic payload
        const payload = makeStudentPayload(student);
        const { data, error } = await supabase
          .from('students')
          .insert([payload])
          .select()
          .single();
        if (error) {
          // If inserting with BOTH camelCase & snake_case fails due to Postgres column validation, fallback to clean JSON
          console.warn('Dual-property insert failed. Retrying with camelCase structure only...');
          const { data: retryData, error: retryError } = await supabase
            .from('students')
            .insert([{
              name: student.name,
              parentPhone: student.parentPhone,
              paymentStatus: student.paymentStatus,
              classId: student.classId
            }])
            .select()
            .single();
          if (retryError) throw retryError;
          return mapToStudent(retryData);
        }
        return mapToStudent(data);
      } catch (err: any) {
        throw new Error(err.message || 'Error inserting student to Supabase');
      }
    } else {
      const local = getLocalData<Student>('school_students', defaultStudents);
      const newStudent: Student = {
        ...student,
        id: 'student-' + Date.now() + Math.random().toString(36).substring(2, 6)
      };
      local.push(newStudent);
      saveLocalData('school_students', local);
      return newStudent;
    }
  },
  async updateStatus(id: string, paymentStatus: Student['paymentStatus']): Promise<Student> {
    if (isSupabaseConfigured()) {
      try {
        // Try both mapping formats for update payload
        const { data, error } = await supabase
          .from('students')
          .update({
            paymentStatus,
            payment_status: paymentStatus
          })
          .eq('id', id)
          .select()
          .single();
        if (error) {
          console.warn('Dual-property update failed. Retrying with nested camelCase...');
          const { data: retryData, error: retryError } = await supabase
            .from('students')
            .update({ paymentStatus })
            .eq('id', id)
            .select()
            .single();
          if (retryError) throw retryError;
          return mapToStudent(retryData);
        }
        return mapToStudent(data);
      } catch (err: any) {
        throw new Error(err.message || 'Error updating student status on Supabase');
      }
    } else {
      const local = getLocalData<Student>('school_students', defaultStudents);
      const studentIndex = local.findIndex(s => s.id === id);
      if (studentIndex !== -1) {
        local[studentIndex].paymentStatus = paymentStatus;
        saveLocalData('school_students', local);
        return local[studentIndex];
      }
      throw new Error('Student not found');
    }
  },
  async delete(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (err: any) {
        throw new Error(err.message || 'Error deleting student from Supabase');
      }
    } else {
      const local = getLocalData<Student>('school_students', defaultStudents);
      const filtered = local.filter(s => s.id !== id);
      saveLocalData('school_students', filtered);
    }
  }
};

export const teachersService = {
  async getAll(): Promise<Teacher[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('teachers')
          .select('*');
        if (error) throw error;
        return (data || []).map(mapToTeacher);
      } catch (err) {
        console.warn('Failed to fetch from Supabase teachers table, falling back to LocalStorage', err);
        return getLocalData<Teacher>('school_teachers', defaultTeachers);
      }
    } else {
      return getLocalData<Teacher>('school_teachers', defaultTeachers);
    }
  },
  async create(teacher: Omit<Teacher, 'id'>): Promise<Teacher> {
    if (isSupabaseConfigured()) {
      try {
        const payload = makeTeacherPayload(teacher);
        const { data, error } = await supabase
          .from('teachers')
          .insert([payload])
          .select()
          .single();
        if (error) {
          console.warn('Dual-property insert failed on teacher. Retrying with nested camelCase...');
          const { data: retryData, error: retryError } = await supabase
            .from('teachers')
            .insert([{
              name: teacher.name,
              email: teacher.email,
              subject: teacher.subject,
              salary: Number(teacher.salary),
              paymentStatus: teacher.paymentStatus,
              lastPaymentDate: teacher.lastPaymentDate
            }])
            .select()
            .single();
          if (retryError) throw retryError;
          return mapToTeacher(retryData);
        }
        return mapToTeacher(data);
      } catch (err: any) {
        throw new Error(err.message || 'Error inserting teacher to Supabase');
      }
    } else {
      const local = getLocalData<Teacher>('school_teachers', defaultTeachers);
      const newTeacher: Teacher = {
        ...teacher,
        id: 'teacher-' + Date.now() + Math.random().toString(36).substring(2, 6)
      };
      local.push(newTeacher);
      saveLocalData('school_teachers', local);
      return newTeacher;
    }
  },
  async updatePayment(id: string, status: Teacher['paymentStatus']): Promise<Teacher> {
    const today = new Date().toISOString().split('T')[0];
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('teachers')
          .update({ 
            paymentStatus: status,
            payment_status: status,
            lastPaymentDate: status === 'Paid' ? today : null,
            last_payment_date: status === 'Paid' ? today : null
          })
          .eq('id', id)
          .select()
          .single();
        if (error) {
          console.warn('Dual-property update failed on teacher. Retrying with nested camelCase...');
          const { data: retryData, error: retryError } = await supabase
            .from('teachers')
            .update({ 
              paymentStatus: status,
              lastPaymentDate: status === 'Paid' ? today : null
            })
            .eq('id', id)
            .select()
            .single();
          if (retryError) throw retryError;
          return mapToTeacher(retryData);
        }
        return mapToTeacher(data);
      } catch (err: any) {
        throw new Error(err.message || 'Error updating teacher payment status on Supabase');
      }
    } else {
      const local = getLocalData<Teacher>('school_teachers', defaultTeachers);
      const teacherIndex = local.findIndex(t => t.id === id);
      if (teacherIndex !== -1) {
        local[teacherIndex].paymentStatus = status;
        local[teacherIndex].lastPaymentDate = status === 'Paid' ? today : undefined;
        saveLocalData('school_teachers', local);
        return local[teacherIndex];
      }
      throw new Error('Teacher not found');
    }
  },
  async delete(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('teachers')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (err: any) {
        throw new Error(err.message || 'Error deleting teacher from Supabase');
      }
    } else {
      const local = getLocalData<Teacher>('school_teachers', defaultTeachers);
      const filtered = local.filter(t => t.id !== id);
      saveLocalData('school_teachers', filtered);
    }
  }
};
