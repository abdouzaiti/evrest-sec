import { supabase } from '../lib/supabase';
import { SchoolClass, Student, Teacher } from '../types';

export const classesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('classes')
      .select('*');
    if (error) throw error;
    return data as SchoolClass[];
  },
  async create(schoolClass: Omit<SchoolClass, 'id'>) {
    const { data, error } = await supabase
      .from('classes')
      .insert([schoolClass])
      .select()
      .single();
    if (error) throw error;
    return data as SchoolClass;
  },
  async delete(id: string) {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

export const studentsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('students')
      .select('*');
    if (error) throw error;
    return data as Student[];
  },
  async getByClass(classId: string) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('classId', classId);
    if (error) throw error;
    return data as Student[];
  },
  async create(student: Omit<Student, 'id'>) {
    const { data, error } = await supabase
      .from('students')
      .insert([student])
      .select()
      .single();
    if (error) throw error;
    return data as Student;
  },
  async updateStatus(id: string, paymentStatus: Student['paymentStatus']) {
    const { data, error } = await supabase
      .from('students')
      .update({ paymentStatus })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Student;
  },
  async delete(id: string) {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

export const teachersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('teachers')
      .select('*');
    if (error) throw error;
    return data as Teacher[];
  },
  async create(teacher: Omit<Teacher, 'id'>) {
    const { data, error } = await supabase
      .from('teachers')
      .insert([teacher])
      .select()
      .single();
    if (error) throw error;
    return data as Teacher;
  },
  async updatePayment(id: string, status: Teacher['paymentStatus']) {
    const { data, error } = await supabase
      .from('teachers')
      .update({ 
        paymentStatus: status,
        lastPaymentDate: status === 'Paid' ? new Date().toISOString().split('T')[0] : null
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Teacher;
  },
  async delete(id: string) {
    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
