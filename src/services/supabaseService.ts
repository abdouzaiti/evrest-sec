import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SchoolClass, Student, Teacher, PaymentRecord, Expense, RentVaultDeposit, RentVaultConfig, AttendanceRecord, TimetableConfig, TimetableCell } from '../types';

const defaultRentVault: RentVaultConfig = {
  targetAnnualRent: 180000, // Default annual rent e.g., 180,000 DA (18 M)
  deposits: [
    { id: 'rvd-1', amount: 15000, date: '2026-01-10', month: 1, year: 2026, note: 'Épargne mensuelle du loyer - Janvier' },
    { id: 'rvd-2', amount: 15000, date: '2026-02-12', month: 2, year: 2026, note: 'Épargne mensuelle du loyer - Février' },
    { id: 'rvd-3', amount: 15000, date: '2026-03-08', month: 3, year: 2026, note: 'Épargne mensuelle du loyer - Mars' },
    { id: 'rvd-4', amount: 15000, date: '2026-04-10', month: 4, year: 2026, note: 'Épargne mensuelle du loyer - Avril' },
  ]
};

// Default annual expenses for financial simulation
const defaultExpenses: Expense[] = [
  { id: 'exp-1', title: 'Loyer annuel des locaux de l\'école', amount: 150000, category: 'rent', date: '2026-01-05', month: 1, year: 2026, notes: 'Premier versement du loyer' },
  { id: 'exp-2', title: 'Factures d\'électricité et d\'eau (Sonelgaz/ADE)', amount: 24500, category: 'utilities', date: '2026-02-10', month: 2, year: 2026, notes: 'Consommation éclairage et climatisation' },
  { id: 'exp-3', title: 'Abonnement Internet & Fibre (Algérie Télécom)', amount: 7500, category: 'utilities', date: '2026-03-01', month: 3, year: 2026, notes: 'Abonnement mensuel Fibre 100 Mega' },
  { id: 'exp-4', title: 'Fournitures scolaires, papier & impression', amount: 32000, category: 'supplies', date: '2026-03-15', month: 3, year: 2026, notes: 'Feutres, rames de papier et cahiers' },
  { id: 'exp-5', title: 'Entretien de la climatisation et mobilier', amount: 18000, category: 'maintenance', date: '2026-04-12', month: 4, year: 2026, notes: 'Maintenance périodique des salles de cours' },
  { id: 'exp-6', title: 'Campagnes publicitaires & flyers', amount: 15000, category: 'marketing', date: '2026-05-02', month: 5, year: 2026, notes: 'Publicité pour révision du Bac et BEM' }
];

// Mock/Local Storage fallback default databases (Algerian/Academy Focused)
const defaultClasses: SchoolClass[] = [
  { id: 'class-1', name: 'Terminale - Mathématiques', price: 2500, description: 'Préparation intensive au Baccalauréat, analyse, algèbre et probabilités.', teacherId: 'teacher-1' },
  { id: 'class-2', name: 'Terminale - Physique & Chimie', price: 2500, description: 'Programme officiel du Bac, mécanique, électricité et réactions chimiques.', teacherId: 'teacher-2' },
  { id: 'class-3', name: 'BEM - Mathématiques', price: 1800, description: 'Préparation complète à l\'épreuve de maths du Brevet BEM.', teacherId: 'teacher-1' },
  { id: 'class-4', name: 'Lycée - Anglais Général', price: 1500, description: 'Amélioration de l\'anglais écrit, parlé et grammaire de niveau secondaire.', teacherId: 'teacher-4' },
  { id: 'class-5', name: 'Français - Soutien Moyen', price: 1600, description: 'Vocabulaire, conjugaison et productions d\'écrits pour le collège.', teacherId: 'teacher-3' }
];

const defaultStudents: Student[] = [
  { id: 'student-1', name: 'Abderrahmane Zaiti', parentPhone: '0661245892', classId: 'class-1', classIds: ['class-1', 'class-2'], tokenId: 'S101', currentMonth: 1, sessionsCompleted: 0, paymentStatus: 'Paid', paidMonths: [1], attendance: { 'class-1': [{ date: '2026-01-07', present: true }, { date: '2026-01-14', present: false }, { date: '2026-01-21', present: false }, { date: '2026-01-28', present: false }] } },
  { id: 'student-2', name: 'Leila Kaddour', parentPhone: '0555321456', classId: 'class-1', classIds: ['class-1', 'class-3'], tokenId: 'S102', currentMonth: 1, sessionsCompleted: 0, paymentStatus: 'Paid', paidMonths: [1], attendance: { 'class-1': [{ date: '2026-01-07', present: true }, { date: '2026-01-14', present: false }, { date: '2026-01-21', present: false }, { date: '2026-01-28', present: false }] } },
  { id: 'student-3', name: 'Yanis Amrani', parentPhone: '0772183495', classId: 'class-2', classIds: ['class-2'], tokenId: 'S103', currentMonth: 1, sessionsCompleted: 0, paymentStatus: 'Paid', paidMonths: [1], attendance: { 'class-2': [{ date: '2026-01-07', present: true }, { date: '2026-01-14', present: false }, { date: '2026-01-21', present: false }, { date: '2026-01-28', present: false }] } },
  { id: 'student-4', name: 'Fatma-Zohra Mansouri', parentPhone: '0561234567', classId: 'class-3', classIds: ['class-3', 'class-4'], tokenId: 'S104', currentMonth: 1, sessionsCompleted: 0, paymentStatus: 'Paid', paidMonths: [1], attendance: { 'class-3': [{ date: '2026-01-07', present: true }, { date: '2026-01-14', present: false }, { date: '2026-01-21', present: false }, { date: '2026-01-28', present: false }] } },
  { id: 'student-5', name: 'Mohamed Amine Bouzidi', parentPhone: '0662895412', classId: 'class-4', classIds: ['class-4', 'class-5'], tokenId: 'S105', currentMonth: 1, sessionsCompleted: 0, paymentStatus: 'Paid', paidMonths: [1], attendance: { 'class-4': [{ date: '2026-01-07', present: true }, { date: '2026-01-14', present: false }, { date: '2026-01-21', present: false }, { date: '2026-01-28', present: false }] } },
  { id: 'student-6', name: 'Meriem Ouchene', parentPhone: '0770987654', classId: 'class-5', classIds: ['class-5'], tokenId: 'S106', currentMonth: 1, sessionsCompleted: 0, paymentStatus: 'Paid', paidMonths: [1], attendance: { 'class-5': [{ date: '2026-01-07', present: true }, { date: '2026-01-14', present: false }, { date: '2026-01-21', present: false }, { date: '2026-01-28', present: false }] } },
  { id: 'student-7', name: 'Anis Belkacem', parentPhone: '0551743621', classId: 'class-2', classIds: ['class-2', 'class-1'], tokenId: 'S107', currentMonth: 1, sessionsCompleted: 0, paymentStatus: 'Paid', paidMonths: [1], attendance: { 'class-2': [{ date: '2026-01-07', present: true }, { date: '2026-01-14', present: false }, { date: '2026-01-21', present: false }, { date: '2026-01-28', present: false }] } },
  { id: 'student-8', name: 'Khadidja Haddad', parentPhone: '0663152436', classId: 'class-3', classIds: ['class-3'], tokenId: 'S108', currentMonth: 1, sessionsCompleted: 0, paymentStatus: 'Paid', paidMonths: [1], attendance: { 'class-3': [{ date: '2026-01-07', present: true }, { date: '2026-01-14', present: false }, { date: '2026-01-21', present: false }, { date: '2026-01-28', present: false }] } },
  { id: 'student-9', name: 'Oussama Sifi', parentPhone: '0792345678', classId: 'class-5', classIds: ['class-5'], tokenId: 'S109', currentMonth: 1, sessionsCompleted: 0, paymentStatus: 'Paid', paidMonths: [1], attendance: { 'class-5': [{ date: '2026-01-07', present: true }, { date: '2026-01-14', present: false }, { date: '2026-01-21', present: false }, { date: '2026-01-28', present: false }] } }
];

const defaultTeachers: Teacher[] = [
  { id: 'teacher-1', name: 'Prof. Slimane Belkacem', email: 's.belkacem@everest.dz', subject: 'Mathematics', salary: 45000, paymentStatus: 'Paid', lastPaymentDate: '2026-06-05', tokenId: 'T201' },
  { id: 'teacher-2', name: 'Dr. Yasmina Mansouri', email: 'y.mansouri@everest.dz', subject: 'Physics', salary: 48050, paymentStatus: 'Unpaid', tokenId: 'T202' },
  { id: 'teacher-3', name: 'Prof. Mourad Bouzidi', email: 'm.bouzidi@everest.dz', subject: 'French', salary: 38000, paymentStatus: 'Pending', tokenId: 'T203' },
  { id: 'teacher-4', name: 'Prof. Amina Ouchene', email: 'a.ouchene@everest.dz', subject: 'English', salary: 35000, paymentStatus: 'Paid', lastPaymentDate: '2026-06-08', tokenId: 'T204' }
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
const getTeacherMapping = (): Record<string, string> => {
  const raw = localStorage.getItem('class_teacher_mapping');
  if (!raw) {
    const initial: Record<string, string> = {
      'class-1': 'teacher-1',
      'class-2': 'teacher-2',
      'class-3': 'teacher-1',
      'class-4': 'teacher-4',
      'class-5': 'teacher-3'
    };
    try {
      localStorage.setItem('class_teacher_mapping', JSON.stringify(initial));
    } catch {}
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
};

const saveTeacherMapping = (classId: string, teacherId?: string) => {
  if (!classId) return;
  const current = getTeacherMapping();
  if (teacherId) {
    current[classId] = teacherId;
  } else {
    delete current[classId];
  }
  localStorage.setItem('class_teacher_mapping', JSON.stringify(current));
};

const mapToClass = (row: any): SchoolClass => {
  if (!row) return row;
  const mapping = getTeacherMapping();
  const teacherId = (row.teacherId !== undefined && row.teacherId !== null && row.teacherId !== '') 
    ? row.teacherId 
    : ((row.teacher_id !== undefined && row.teacher_id !== null && row.teacher_id !== '') ? row.teacher_id : mapping[row.id]);

  return {
    id: row.id,
    name: row.name || '',
    price: row.price !== undefined ? Number(row.price) : 0,
    description: row.description || '',
    teacherId: teacherId || undefined
  };
};

const parsePaidMonths = (val: any): number[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(Number);
  if (typeof val === 'string') {
    val = val.trim();
    if (val.startsWith('{') && val.endsWith('}')) {
      return val.slice(1, -1).split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    }
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(Number);
    } catch {}
  }
  return [];
};

const parseAttendance = (val: any): Record<string, { date: string, present: boolean }[]> => {
  if (!val) return {};
  
  // If it's already the new structure, return it
  if (typeof val === 'object' && !Array.isArray(val) && Object.values(val).every(v => Array.isArray(v))) {
     // Check if values look like new structure (array of objects)
     const firstVal = Object.values(val)[0];
     if (Array.isArray(firstVal) && (firstVal.length === 0 || (typeof firstVal[0] === 'object' && 'date' in firstVal[0]))) {
         return val;
     }
  }

  // If it's the old structure, convert it
  // Old structure: Record<string, Record<number, (boolean | string)[]>>
  if (typeof val === 'object' && !Array.isArray(val)) {
    const newStructure: Record<string, { date: string, present: boolean }[]> = {};
    for (const [classId, months] of Object.entries(val as Record<string, Record<string, (boolean | string)[]>>)) {
      newStructure[classId] = [];
      for (const [month, sessions] of Object.entries(months)) {
        sessions.forEach((s, index) => {
          newStructure[classId].push({
            date: `2026-${month}-${(index + 1) * 7}`, // Placeholder date calculation
            present: s === true || s === 'true'
          });
        });
      }
    }
    return newStructure;
  }

  return {};
};

const mapToStudent = (row: any): Student => {
  if (!row) return row;

  const parsedPaidMonths = parsePaidMonths(row.paid_months ?? row.paidMonths);
  const parsedAttendance = parseAttendance(row.attendance_data ?? row.attendance);
  
  let parsedClassIds: string[] = [];
  if (Array.isArray(row.classIds) && row.classIds.length > 0) parsedClassIds = row.classIds;
  else if (Array.isArray(row.class_ids) && row.class_ids.length > 0) parsedClassIds = row.class_ids;
  else if (typeof row.classIds === 'string') {
    try { parsedClassIds = JSON.parse(row.classIds); } catch {}
  } else if (typeof row.class_ids === 'string') {
    try { parsedClassIds = JSON.parse(row.class_ids); } catch {}
  }

  const primaryClassId = row.classId !== undefined ? row.classId : (row.class_id !== undefined ? row.class_id : '');
  if (parsedClassIds.length === 0 && primaryClassId) {
    parsedClassIds = [primaryClassId];
  } else if (primaryClassId && !parsedClassIds.includes(primaryClassId)) {
    parsedClassIds = [primaryClassId, ...parsedClassIds];
  }

  return {
    id: row.id,
    name: row.name || '',
    parentPhone: row.parentPhone !== undefined ? row.parentPhone : (row.parent_phone !== undefined ? row.parent_phone : ''),
    secondaryPhone: row.secondaryPhone !== undefined ? row.secondaryPhone : (row.secondary_phone !== undefined ? row.secondary_phone : (row.phone2 !== undefined ? row.phone2 : undefined)),
    email: row.email !== undefined ? row.email : undefined,
    birthDate: row.birthDate !== undefined ? row.birthDate : (row.birth_date !== undefined ? row.birth_date : undefined),
    address: row.address !== undefined ? row.address : undefined,
    classId: primaryClassId,
    classIds: parsedClassIds,
    tokenId: row.tokenId !== undefined ? row.tokenId : (row.token_id !== undefined ? row.token_id : undefined),
    currentMonth: row.currentMonth !== undefined ? Number(row.currentMonth) : (row.current_month !== undefined ? Number(row.current_month) : 1),
    sessionsCompleted: row.sessionsCompleted !== undefined ? Number(row.sessionsCompleted) : (row.sessions_completed !== undefined ? Number(row.sessions_completed) : 0),
    paymentStatus: row.paymentStatus !== undefined ? row.paymentStatus : (row.payment_status !== undefined ? row.payment_status : 'Paid'),
    paidMonths: parsedPaidMonths,
    attendance: parsedAttendance,
    attendanceDates: row.attendance_dates ?? row.attendanceDates ?? {}
  };
};

const mapToTeacher = (row: any): Teacher => {
  if (!row) return row;
  let parsedPaidMonths: number[] = [];
  if (Array.isArray(row.paidMonths)) parsedPaidMonths = row.paidMonths;
  else if (Array.isArray(row.paid_months)) parsedPaidMonths = row.paid_months;
  else if (typeof row.paidMonths === 'string') {
    try { parsedPaidMonths = JSON.parse(row.paidMonths); } catch {}
  } else if (typeof row.paid_months === 'string') {
    try { parsedPaidMonths = JSON.parse(row.paid_months); } catch {}
  }

  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    phone: row.phone !== undefined ? row.phone : (row.parentPhone !== undefined ? row.parentPhone : (row.parent_phone !== undefined ? row.parent_phone : undefined)),
    secondaryPhone: row.secondaryPhone !== undefined ? row.secondaryPhone : (row.secondary_phone !== undefined ? row.secondary_phone : (row.phone2 !== undefined ? row.phone2 : undefined)),
    birthDate: row.birthDate !== undefined ? row.birthDate : (row.birth_date !== undefined ? row.birth_date : undefined),
    address: row.address !== undefined ? row.address : undefined,
    subject: row.subject || '',
    salary: row.salary !== undefined ? Number(row.salary) : 0,
    paymentStatus: row.paymentStatus !== undefined ? row.paymentStatus : (row.payment_status !== undefined ? row.payment_status : 'Unpaid'),
    lastPaymentDate: row.lastPaymentDate !== undefined ? row.lastPaymentDate : (row.last_payment_date !== undefined ? row.last_payment_date : undefined),
    tokenId: row.tokenId !== undefined ? row.tokenId : (row.token_id !== undefined ? row.token_id : undefined),
    currentMonth: row.currentMonth !== undefined ? Number(row.currentMonth) : (row.current_month !== undefined ? Number(row.current_month) : 1),
    paidMonths: parsedPaidMonths
  };
};

/**
 * Payload creators that output both styles (snake_case & camelCase fields)
 * so that they seamlessly insert and update regardless of how the user named their tables.
 */
const makeStudentPayload = (s: Omit<Student, 'id'>) => {
  const classIds = Array.isArray(s.classIds) && s.classIds.length > 0 ? s.classIds : (s.classId ? [s.classId] : []);
  const primaryClass = s.classId || (classIds[0] || '');

  let normalizedPaymentStatus: 'Paid' | 'Pending' | 'Unpaid' = 'Pending';
  if (s.paymentStatus) {
    const ps = String(s.paymentStatus).toLowerCase();
    if (ps === 'paid') normalizedPaymentStatus = 'Paid';
    else if (ps === 'unpaid') normalizedPaymentStatus = 'Unpaid';
    else normalizedPaymentStatus = 'Pending';
  }

  return {
    name: s.name ? s.name.trim() : '',
    parent_phone: s.parentPhone ? s.parentPhone.trim() : '',
    parentPhone: s.parentPhone ? s.parentPhone.trim() : '',
    secondary_phone: s.secondaryPhone ? s.secondaryPhone.trim() : null,
    email: s.email ? s.email.trim() : null,
    birth_date: s.birthDate || null,
    address: s.address ? s.address.trim() : null,
    class_id: primaryClass,
    classId: primaryClass,
    class_ids: classIds,
    token_id: s.tokenId ? s.tokenId.trim() : null,
    tokenId: s.tokenId ? s.tokenId.trim() : null,
    sessions_completed: Number(s.sessionsCompleted) || 0,
    payment_status: normalizedPaymentStatus,
    paymentStatus: normalizedPaymentStatus,
    current_month: Number(s.currentMonth) || 1,
    paid_months: Array.isArray(s.paidMonths) ? s.paidMonths : [],
    attendance_data: s.attendance || {},
    attendance_dates: s.attendanceDates || {}
  };
};

const makeTeacherPayload = (t: Omit<Teacher, 'id'>) => {
  return {
    name: t.name ? t.name.trim() : '',
    email: t.email ? t.email.trim() : null,
    phone: t.phone ? t.phone.trim() : null,
    secondary_phone: t.secondaryPhone ? t.secondaryPhone.trim() : null,
    birth_date: t.birthDate || null,
    address: t.address ? t.address.trim() : null,
    subject: t.subject || '',
    salary: Number(t.salary) || 0,
    payment_status: t.paymentStatus || 'Unpaid',
    last_payment_date: t.lastPaymentDate || null,
    token_id: t.tokenId ? t.tokenId.trim() : null,
    current_month: Number(t.currentMonth) || 1,
    paid_months: Array.isArray(t.paidMonths) ? t.paidMonths : []
  };
};

const makeClassPayload = (c: Omit<SchoolClass, 'id'>) => {
  return {
    name: c.name ? c.name.trim() : '',
    price: Number(c.price) || 0,
    description: c.description || '',
    teacher_id: c.teacherId || null
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
        const fetched = (data || []).map(mapToClass);
        saveLocalData('school_classes', fetched);
        return fetched;
      } catch (err) {
        console.warn('Failed to fetch from Supabase classes table, falling back to LocalStorage', err);
        return getLocalData<SchoolClass>('school_classes', defaultClasses);
      }
    } else {
      const local = getLocalData<SchoolClass>('school_classes', defaultClasses);
      const mapping = getTeacherMapping();
      return local.map(c => ({
        ...c,
        teacherId: c.teacherId || mapping[c.id]
      }));
    }
  },
  async create(schoolClass: Omit<SchoolClass, 'id'>): Promise<SchoolClass> {
    if (isSupabaseConfigured()) {
      try {
        let insertedRow: any = null;

        // Strategy 1: Attempt insert with teacher_id (standard PostgreSQL snake_case)
        const { data: d1, error: e1 } = await supabase
          .from('classes')
          .insert([{
            name: schoolClass.name,
            price: Number(schoolClass.price),
            description: schoolClass.description || '',
            teacher_id: schoolClass.teacherId || null
          }])
          .select()
          .single();

        if (!e1 && d1) {
          insertedRow = d1;
        } else {
          // Strategy 2: Attempt insert with teacherId (camelCase)
          const { data: d2, error: e2 } = await supabase
            .from('classes')
            .insert([{
              name: schoolClass.name,
              price: Number(schoolClass.price),
              description: schoolClass.description || '',
              teacherId: schoolClass.teacherId || null
            }])
            .select()
            .single();

          if (!e2 && d2) {
            insertedRow = d2;
          } else {
            // Strategy 3: Insert base class fields if column does not exist on Supabase DB yet
            const { data: d3, error: e3 } = await supabase
              .from('classes')
              .insert([{
                name: schoolClass.name,
                price: Number(schoolClass.price),
                description: schoolClass.description || ''
              }])
              .select()
              .single();

            if (e3) throw e3;
            insertedRow = d3;
          }
        }

        if (insertedRow && schoolClass.teacherId) {
          saveTeacherMapping(insertedRow.id, schoolClass.teacherId);
        }

        const mapped = mapToClass(insertedRow);
        if (schoolClass.teacherId && !mapped.teacherId) {
          mapped.teacherId = schoolClass.teacherId;
        }
        return mapped;
      } catch (err: any) {
        throw new Error(err.message || 'Error inserting school class to Supabase');
      }
    } else {
      const local = getLocalData<SchoolClass>('school_classes', defaultClasses);
      const newClass: SchoolClass = {
        ...schoolClass,
        id: 'class-' + Date.now() + Math.random().toString(36).substring(2, 6)
      };
      if (schoolClass.teacherId) {
        saveTeacherMapping(newClass.id, schoolClass.teacherId);
      }
      local.push(newClass);
      saveLocalData('school_classes', local);
      return newClass;
    }
  },
  async delete(id: string): Promise<void> {
    saveTeacherMapping(id, undefined);
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
  },
  async update(id: string, schoolClass: Omit<SchoolClass, 'id'>): Promise<SchoolClass> {
    if (schoolClass.teacherId && schoolClass.teacherId !== '') {
      saveTeacherMapping(id, schoolClass.teacherId);
    } else {
      saveTeacherMapping(id, undefined);
    }

    if (isSupabaseConfigured()) {
      try {
        let updatedRow: any = null;

        const { data: d1, error: e1 } = await supabase
          .from('classes')
          .update({
            name: schoolClass.name,
            price: Number(schoolClass.price),
            description: schoolClass.description || '',
            teacher_id: schoolClass.teacherId || null
          })
          .eq('id', id)
          .select()
          .single();

        if (!e1 && d1) {
          updatedRow = d1;
        } else {
          // Strategy 2: Attempt update with teacherId (camelCase)
          const { data: d2, error: e2 } = await supabase
            .from('classes')
            .update({
              name: schoolClass.name,
              price: Number(schoolClass.price),
              description: schoolClass.description || '',
              teacherId: schoolClass.teacherId || null
            })
            .eq('id', id)
            .select()
            .single();

          if (!e2 && d2) {
            updatedRow = d2;
          } else {
            // Strategy 3: Update base class fields if column does not exist on Supabase DB yet
            const { data: d3, error: e3 } = await supabase
              .from('classes')
              .update({
                name: schoolClass.name,
                price: Number(schoolClass.price),
                description: schoolClass.description || ''
              })
              .eq('id', id)
              .select()
              .single();

            if (e3) throw e3;
            updatedRow = d3;
          }
        }

        const mapped = mapToClass(updatedRow);
        if (schoolClass.teacherId && !mapped.teacherId) {
          mapped.teacherId = schoolClass.teacherId;
        }
        return mapped;
      } catch (err: any) {
        throw new Error(err.message || 'Error updating school class on Supabase');
      }
    } else {
      const local = getLocalData<SchoolClass>('school_classes', defaultClasses);
      const index = local.findIndex(c => c.id === id);
      if (index !== -1) {
        local[index] = { ...schoolClass, id };
        saveLocalData('school_classes', local);
        return local[index];
      }
      throw new Error('Class not found');
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
        const fetched = (data || []).map(mapToStudent);
        saveLocalData('school_students', fetched);
        return fetched;
      } catch (err) {
        console.warn('Failed to fetch from Supabase students table, falling back to LocalStorage', err);
        return getLocalData<Student>('school_students', defaultStudents);
      }
    } else {
      return getLocalData<Student>('school_students', defaultStudents);
    }
  },
  async getByClass(classId: string): Promise<Student[]> {
    const allStudents = await this.getAll();
    return allStudents.filter(s => s.classId === classId || (s.classIds && s.classIds.includes(classId)));
  },
  async create(student: Omit<Student, 'id'>): Promise<Student> {
    const local = getLocalData<Student>('school_students', defaultStudents);

    if (isSupabaseConfigured()) {
      try {
        const payload = makeStudentPayload(student);

        // Attempt 1: Full verified schema payload
        const { data: d1, error: e1 } = await supabase
          .from('students')
          .insert([payload])
          .select()
          .single();

        if (!e1 && d1) {
          const created = mapToStudent(d1);
          local.push(created);
          saveLocalData('school_students', local);
          return created;
        }

        console.warn('Attempt 1 student creation failed, retrying with core payload:', e1);

        // Attempt 2: Core payload with essential and safe columns
        const classIds = Array.isArray(student.classIds) && student.classIds.length > 0 ? student.classIds : (student.classId ? [student.classId] : []);
        const primaryClass = student.classId || (classIds[0] || '');
        const corePayload = {
          name: student.name ? student.name.trim() : '',
          parent_phone: student.parentPhone ? student.parentPhone.trim() : '',
          secondary_phone: student.secondaryPhone ? student.secondaryPhone.trim() : null,
          email: student.email ? student.email.trim() : null,
          birth_date: student.birthDate || null,
          address: student.address ? student.address.trim() : null,
          class_id: primaryClass,
          class_ids: classIds,
          token_id: student.tokenId ? student.tokenId.trim() : null,
          sessions_completed: Number(student.sessionsCompleted) || 0,
          payment_status: student.paymentStatus || 'Pending',
          current_month: Number(student.currentMonth) || 1,
          paid_months: Array.isArray(student.paidMonths) ? student.paidMonths : [],
          attendance_data: student.attendance || {},
          attendance_dates: student.attendanceDates || {}
        };

        const { data: d2, error: e2 } = await supabase
          .from('students')
          .insert([corePayload])
          .select()
          .single();

        if (!e2 && d2) {
          const created = mapToStudent(d2);
          local.push(created);
          saveLocalData('school_students', local);
          return created;
        }

        console.warn('Attempt 2 student creation failed, retrying with minimal payload:', e2);

        // Attempt 3: Minimal essential payload (name, parent_phone, class_id)
        const minimalPayload = {
          name: student.name ? student.name.trim() : '',
          parent_phone: student.parentPhone ? student.parentPhone.trim() : '',
          class_id: primaryClass
        };

        const { data: d3, error: e3 } = await supabase
          .from('students')
          .insert([minimalPayload])
          .select()
          .single();

        if (!e3 && d3) {
          const created = mapToStudent(d3);
          const finalCreated = {
            ...created,
            ...student,
            id: created.id,
            classId: primaryClass,
            classIds: classIds
          };
          local.push(finalCreated);
          saveLocalData('school_students', local);
          return finalCreated;
        }

        console.error('All Supabase student insert attempts failed:', { e1, e2, e3 });
        throw new Error(e1?.message || e2?.message || e3?.message || 'Erreur lors de la création de l\'élève dans Supabase');
      } catch (err: any) {
        console.error('Error inserting student to Supabase:', err);
        throw err;
      }
    } else {
      const newStudent: Student = {
        ...student,
        id: 'student-' + Date.now() + Math.random().toString(36).substring(2, 6)
      };
      local.push(newStudent);
      saveLocalData('school_students', local);
      return newStudent;
    }
  },
  async delete(id: string): Promise<void> {
    const local = getLocalData<Student>('school_students', defaultStudents);
    const filtered = local.filter(s => s.id !== id);
    saveLocalData('school_students', filtered);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', id);
        if (error) console.warn('Deleting student from Supabase notice:', error);
      } catch (err: any) {
        console.warn('Error deleting student from Supabase:', err);
      }
    }
  },
  async update(id: string, student: Omit<Student, 'id'>): Promise<Student> {
    const updatedStudentObj: Student = { ...student, id };

    // Update local cache
    const local = getLocalData<Student>('school_students', defaultStudents);
    const idx = local.findIndex(s => s.id === id);
    if (idx !== -1) {
      local[idx] = updatedStudentObj;
    } else {
      local.push(updatedStudentObj);
    }
    saveLocalData('school_students', local);

    if (isSupabaseConfigured()) {
      try {
        // Attempt 1: Full clean payload
        const fullPayload = makeStudentPayload(student);

        const { data: d1, error: e1 } = await supabase
          .from('students')
          .update(fullPayload)
          .eq('id', id)
          .select()
          .single();

        if (!e1 && d1) {
          const res = mapToStudent(d1);
          return {
            ...res,
            ...updatedStudentObj,
            classIds: (updatedStudentObj.classIds && updatedStudentObj.classIds.length > 0) ? updatedStudentObj.classIds : res.classIds
          };
        }

        console.warn('Attempt 1 update failed, retrying with core snake_case payload:', e1);

        // Attempt 2: Core snake_case payload
        const classIds = Array.isArray(student.classIds) && student.classIds.length > 0 ? student.classIds : (student.classId ? [student.classId] : []);
        const primaryClass = student.classId || (classIds[0] || '');
        const corePayload = {
          name: student.name ? student.name.trim() : '',
          parent_phone: student.parentPhone ? student.parentPhone.trim() : '',
          secondary_phone: student.secondaryPhone ? student.secondaryPhone.trim() : null,
          email: student.email ? student.email.trim() : null,
          birth_date: student.birthDate || null,
          address: student.address ? student.address.trim() : null,
          class_id: primaryClass,
          class_ids: classIds,
          token_id: student.tokenId ? student.tokenId.trim() : null,
          sessions_completed: Number(student.sessionsCompleted) || 0,
          payment_status: student.paymentStatus || 'Pending',
          current_month: Number(student.currentMonth) || 1,
          paid_months: Array.isArray(student.paidMonths) ? student.paidMonths : [],
          attendance_data: student.attendance || {},
          attendance_dates: student.attendanceDates || {}
        };

        const { data: d2, error: e2 } = await supabase
          .from('students')
          .update(corePayload)
          .eq('id', id)
          .select()
          .single();

        if (!e2 && d2) {
          const res = mapToStudent(d2);
          return {
            ...res,
            ...updatedStudentObj,
            classIds: (updatedStudentObj.classIds && updatedStudentObj.classIds.length > 0) ? updatedStudentObj.classIds : res.classIds
          };
        }

        console.warn('Attempt 2 update failed, retrying with minimal payload:', e2);

        // Attempt 3: Minimal essential payload
        const minimalPayload = {
          name: student.name ? student.name.trim() : '',
          parent_phone: student.parentPhone ? student.parentPhone.trim() : '',
          class_id: primaryClass,
          class_ids: classIds
        };

        const { data: d3, error: e3 } = await supabase
          .from('students')
          .update(minimalPayload)
          .eq('id', id)
          .select()
          .single();

        if (e3) {
          console.error('All Supabase update attempts failed:', { e1, e2, e3 });
        }

        return updatedStudentObj;
      } catch (err: any) {
        console.error('Error updating student on Supabase:', err);
        return updatedStudentObj;
      }
    } else {
      return updatedStudentObj;
    }
  },
};

export const teachersService = {
  async getAll(): Promise<Teacher[]> {
    const local = getLocalData<Teacher>('school_teachers', defaultTeachers);
    const localMap = new Map(local.map(t => [t.id, t]));

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('teachers')
          .select('*');
        if (error) throw error;
        
        const fetched = (data || []).map(mapToTeacher);
        return fetched.map(t => {
          const loc = localMap.get(t.id);
          const currentMonth = loc?.currentMonth || t.currentMonth || 1;
          const paidMonths = (loc?.paidMonths && loc.paidMonths.length > 0) ? loc.paidMonths : (t.paidMonths || []);
          return { ...t, currentMonth, paidMonths };
        });
      } catch (err) {
        console.warn('Failed to fetch from Supabase teachers table, falling back to LocalStorage', err);
        return local;
      }
    } else {
      return local;
    }
  },
  async create(teacher: Omit<Teacher, 'id'>): Promise<Teacher> {
    const local = getLocalData<Teacher>('school_teachers', defaultTeachers);

    if (isSupabaseConfigured()) {
      try {
        const payload = makeTeacherPayload(teacher);
        const { data, error } = await supabase
          .from('teachers')
          .insert([payload])
          .select()
          .single();

        if (!error && data) {
          const created = mapToTeacher(data);
          local.push(created);
          saveLocalData('school_teachers', local);
          return created;
        }

        // Retry with basic payload if new columns not present on Supabase yet
        const basicPayload = {
          name: teacher.name,
          email: teacher.email || null,
          subject: teacher.subject,
          salary: Number(teacher.salary),
          payment_status: teacher.paymentStatus,
          last_payment_date: teacher.lastPaymentDate || null,
          token_id: teacher.tokenId || null,
          current_month: teacher.currentMonth || 1
        };

        const { data: retryData, error: retryError } = await supabase
          .from('teachers')
          .insert([basicPayload])
          .select()
          .single();

        if (!retryError && retryData) {
          const res = mapToTeacher(retryData);
          const finalCreated = {
            ...res,
            phone: teacher.phone,
            secondaryPhone: teacher.secondaryPhone,
            birthDate: teacher.birthDate,
            address: teacher.address
          };
          local.push(finalCreated);
          saveLocalData('school_teachers', local);
          return finalCreated;
        }

        console.warn('Teacher insert error on Supabase, saving to local cache:', error || retryError);
        const newTeacher: Teacher = {
          ...teacher,
          id: 'teacher-' + Date.now() + Math.random().toString(36).substring(2, 6)
        };
        local.push(newTeacher);
        saveLocalData('school_teachers', local);
        return newTeacher;
      } catch (err: any) {
        console.warn('Error inserting teacher to Supabase, fallback to local cache:', err);
        const newTeacher: Teacher = {
          ...teacher,
          id: 'teacher-' + Date.now() + Math.random().toString(36).substring(2, 6)
        };
        local.push(newTeacher);
        saveLocalData('school_teachers', local);
        return newTeacher;
      }
    } else {
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
  },
  async update(id: string, teacher: Omit<Teacher, 'id'>): Promise<Teacher> {
    const updatedTeacher: Teacher = { ...teacher, id };

    // Always update local cache
    const local = getLocalData<Teacher>('school_teachers', defaultTeachers);
    const index = local.findIndex(t => t.id === id);
    if (index !== -1) {
      local[index] = updatedTeacher;
      saveLocalData('school_teachers', local);
    } else {
      local.push(updatedTeacher);
      saveLocalData('school_teachers', local);
    }

    if (isSupabaseConfigured()) {
      try {
        const payload = makeTeacherPayload(teacher);
        const { data, error } = await supabase
          .from('teachers')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return mapToTeacher(data);
        }

        // Retry with basic payload if new columns not present on Supabase DB
        const basicPayload = {
          name: teacher.name,
          email: teacher.email || null,
          subject: teacher.subject,
          salary: Number(teacher.salary),
          payment_status: teacher.paymentStatus,
          last_payment_date: teacher.lastPaymentDate || null,
          token_id: teacher.tokenId || null,
          current_month: teacher.currentMonth || 1
        };

        const { data: retryData, error: retryError } = await supabase
          .from('teachers')
          .update(basicPayload)
          .eq('id', id)
          .select()
          .single();

        if (!retryError && retryData) {
          const res = mapToTeacher(retryData);
          return {
            ...updatedTeacher,
            ...res
          };
        }

        console.warn('Teacher update on Supabase encountered error:', error || retryError);
        return updatedTeacher;
      } catch (err: any) {
        console.warn('Teacher update fallback:', err);
        return updatedTeacher;
      }
    } else {
      return updatedTeacher;
    }
  }
};

// ==========================================
// Pointage / Jeton Attendance Log service
// ==========================================
import { PointageLog } from '../types';

const defaultPointageLogs: PointageLog[] = [
  {
    id: 'p-1',
    personId: 'student-1',
    personType: 'student',
    personName: 'Abderrahmane Zaiti',
    tokenId: 'S101',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    details: 'Status: Paid'
  },
  {
    id: 'p-2',
    personId: 'teacher-1',
    personType: 'teacher',
    personName: 'Prof. Slimane Belkacem',
    tokenId: 'T201',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    details: 'Clock-In Pointage successful'
  }
];

const mapToPointageLog = (row: any): PointageLog => {
  return {
    id: row.id,
    personId: row.personId !== undefined ? row.personId : (row.person_id !== undefined ? row.person_id : ''),
    personType: row.personType !== undefined ? row.personType : (row.person_type !== undefined ? row.person_type : 'student'),
    personName: row.personName !== undefined ? row.personName : (row.person_name !== undefined ? row.person_name : ''),
    tokenId: row.tokenId !== undefined ? row.tokenId : (row.token_id !== undefined ? row.token_id : ''),
    timestamp: row.timestamp || new Date().toISOString(),
    details: row.details || ''
  };
};
export const pointageService = {
  async getAll(): Promise<PointageLog[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('pointage_logs')
          .select('*')
          .order('timestamp', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapToPointageLog);
      } catch (err) {
        console.warn('Failed to fetch pointage logs from Supabase, falling back to LocalStorage', err);
        return getLocalData<PointageLog>('pointage_logs', defaultPointageLogs);
      }
    } else {
      const logs = getLocalData<PointageLog>('pointage_logs', defaultPointageLogs);
      // Sort descending by timestamp
      return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  },

  async getByPerson(personId: string): Promise<PointageLog[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('pointage_logs')
          .select('*')
          .eq('personId', personId)
          .order('timestamp', { ascending: false });
        if (error) {
          // Retry with snake_case
          const { data: retryData, error: retryError } = await supabase
            .from('pointage_logs')
            .select('*')
            .eq('person_id', personId)
            .order('timestamp', { ascending: false });
          if (retryError) throw retryError;
          return (retryData || []).map(mapToPointageLog);
        }
        return (data || []).map(mapToPointageLog);
      } catch (err) {
        console.warn('Failed to fetch pointage logs by person from Supabase, falling back to LocalStorage', err);
        const local = getLocalData<PointageLog>('pointage_logs', defaultPointageLogs);
        return local.filter(l => l.personId === personId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } else {
      const local = getLocalData<PointageLog>('pointage_logs', defaultPointageLogs);
      return local.filter(l => l.personId === personId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  },

  async log(logItem: Omit<PointageLog, 'id' | 'timestamp'>): Promise<PointageLog> {
    const timestamp = new Date().toISOString();
    if (isSupabaseConfigured()) {
      try {
        const payload = {
          personId: logItem.personId,
          person_id: logItem.personId,
          personType: logItem.personType,
          person_type: logItem.personType,
          personName: logItem.personName,
          person_name: logItem.personName,
          tokenId: logItem.tokenId,
          token_id: logItem.tokenId,
          timestamp: timestamp,
          details: logItem.details
        };
        const { data, error } = await supabase
          .from('pointage_logs')
          .insert([payload])
          .select()
          .single();
        if (error) {
          // Retry simple camelCase structure
          const { data: retryData, error: retryError } = await supabase
            .from('pointage_logs')
            .insert([{
              personId: logItem.personId,
              personType: logItem.personType,
              personName: logItem.personName,
              tokenId: logItem.tokenId,
              timestamp: timestamp,
              details: logItem.details
            }])
            .select()
            .single();
          if (retryError) throw retryError;
          return mapToPointageLog(retryData);
        }
        return mapToPointageLog(data);
      } catch (err: any) {
        console.error('Error logging pointage on Supabase:', err);
        // Fallback to local
        const local = getLocalData<PointageLog>('pointage_logs', defaultPointageLogs);
        const newLog: PointageLog = {
          ...logItem,
          id: 'log-' + Date.now(),
          timestamp
        };
        local.push(newLog);
        saveLocalData('pointage_logs', local);
        return newLog;
      }
    } else {
      const local = getLocalData<PointageLog>('pointage_logs', defaultPointageLogs);
      const newLog: PointageLog = {
        ...logItem,
        id: 'log-' + Date.now(),
        timestamp
      };
      local.push(newLog);
      saveLocalData('pointage_logs', local);
      return newLog;
    }
  },

  async clearAll(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('pointage_logs')
          .delete()
          .neq('id', '0'); // Safe delete all
        if (error) throw error;
      } catch (err) {
        console.warn('Error flushing Supabase logs, clearing LocalStorage instead', err);
        saveLocalData('pointage_logs', []);
      }
    } else {
      saveLocalData('pointage_logs', []);
    }
  },

  async deleteLog(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('pointage_logs')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn('Error deleting log from Supabase, falling back to LocalStorage', err);
        const local = getLocalData<PointageLog>('pointage_logs', defaultPointageLogs);
        const filtered = local.filter(l => l.id !== id);
        saveLocalData('pointage_logs', filtered);
      }
    } else {
      const local = getLocalData<PointageLog>('pointage_logs', defaultPointageLogs);
      const filtered = local.filter(l => l.id !== id);
      saveLocalData('pointage_logs', filtered);
    }
  }
};

export const attendanceService = {
  async getByStudent(studentId: string): Promise<AttendanceRecord[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .order('session_date', { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        student_id: row.student_id,
        session_date: row.session_date,
        is_present: row.is_present
      }));
    }
    return [];
  },
  
  async add(studentId: string, isPresent: boolean): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('attendance_records')
        .insert([{ student_id: studentId, is_present: isPresent, session_date: new Date().toISOString() }]);
      if (error) throw error;
    }
  }
};

export const paymentsService = {
  async create(record: Omit<PaymentRecord, 'id'>): Promise<PaymentRecord> {
    const local = getLocalData<PaymentRecord>('payments', []);
    const newRecord: PaymentRecord = {
      ...record,
      id: 'pay-' + Date.now()
    };
    local.push(newRecord);
    saveLocalData('payments', local);
    return newRecord;
  },
  async getAll(): Promise<PaymentRecord[]> {
      return getLocalData<PaymentRecord>('payments', []);
  }
};

export const expensesService = {
  async getAll(): Promise<Expense[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .order('date', { ascending: false });
        if (error) throw error;
        return (data || []).map((row: any) => ({
          id: row.id,
          title: row.title || row.name || '',
          amount: Number(row.amount || 0),
          category: row.category || 'other',
          date: row.date || new Date().toISOString().split('T')[0],
          month: Number(row.month || new Date(row.date || Date.now()).getMonth() + 1),
          year: Number(row.year || new Date(row.date || Date.now()).getFullYear()),
          notes: row.notes || ''
        }));
      } catch (err) {
        console.warn('Failed to fetch expenses from Supabase, falling back to LocalStorage', err);
        return getLocalData<Expense>('school_expenses', defaultExpenses);
      }
    } else {
      return getLocalData<Expense>('school_expenses', defaultExpenses);
    }
  },

  async create(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const local = getLocalData<Expense>('school_expenses', defaultExpenses);
    const newExpense: Expense = {
      ...expense,
      id: 'exp-' + Date.now()
    };

    if (isSupabaseConfigured()) {
      try {
        const payload = {
          title: expense.title,
          amount: Number(expense.amount),
          category: expense.category,
          date: expense.date,
          month: Number(expense.month),
          year: Number(expense.year),
          notes: expense.notes || ''
        };

        const { data, error } = await supabase
          .from('expenses')
          .insert([payload])
          .select()
          .single();

        if (!error && data) {
          const created: Expense = {
            id: data.id,
            title: data.title || expense.title,
            amount: Number(data.amount || expense.amount),
            category: data.category || expense.category,
            date: data.date || expense.date,
            month: Number(data.month || expense.month),
            year: Number(data.year || expense.year),
            notes: data.notes || expense.notes
          };
          local.push(created);
          saveLocalData('school_expenses', local);
          return created;
        }
      } catch (err) {
        console.warn('Failed to create expense on Supabase, saving locally', err);
      }
    }

    local.push(newExpense);
    saveLocalData('school_expenses', local);
    return newExpense;
  },

  async delete(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('expenses')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('Error deleting expense on Supabase', err);
      }
    }
    const local = getLocalData<Expense>('school_expenses', defaultExpenses);
    const filtered = local.filter(e => e.id !== id);
    saveLocalData('school_expenses', filtered);
  },

  async update(id: string, updates: Partial<Expense>): Promise<Expense> {
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('expenses')
          .update({
            ...(updates.title !== undefined && { title: updates.title }),
            ...(updates.amount !== undefined && { amount: Number(updates.amount) }),
            ...(updates.category !== undefined && { category: updates.category }),
            ...(updates.date !== undefined && { date: updates.date }),
            ...(updates.month !== undefined && { month: Number(updates.month) }),
            ...(updates.year !== undefined && { year: Number(updates.year) }),
            ...(updates.notes !== undefined && { notes: updates.notes })
          })
          .eq('id', id);
      } catch (err) {
        console.warn('Error updating expense on Supabase', err);
      }
    }
    const local = getLocalData<Expense>('school_expenses', defaultExpenses);
    const index = local.findIndex(e => e.id === id);
    let updatedExpense: Expense;
    if (index !== -1) {
      local[index] = { ...local[index], ...updates };
      updatedExpense = local[index];
    } else {
      updatedExpense = { id, title: '', amount: 0, category: 'other', date: '', month: 1, year: 2026, ...updates } as Expense;
      local.push(updatedExpense);
    }
    saveLocalData('school_expenses', local);
    return updatedExpense;
  }
};

const getRentVaultLocalData = (): RentVaultConfig => {
  const data = localStorage.getItem('rent_vault_config');
  if (!data) {
    localStorage.setItem('rent_vault_config', JSON.stringify(defaultRentVault));
    return defaultRentVault;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaultRentVault;
  }
};

const saveRentVaultLocalData = (data: RentVaultConfig): void => {
  localStorage.setItem('rent_vault_config', JSON.stringify(data));
};

export const rentVaultService = {
  async getConfig(): Promise<RentVaultConfig> {
    return getRentVaultLocalData();
  },

  async updateTarget(targetAnnualRent: number): Promise<RentVaultConfig> {
    const config = getRentVaultLocalData();
    const updated: RentVaultConfig = { ...config, targetAnnualRent };
    saveRentVaultLocalData(updated);
    return updated;
  },

  async addDeposit(deposit: Omit<RentVaultDeposit, 'id'>): Promise<RentVaultConfig> {
    const config = getRentVaultLocalData();
    const newDeposit: RentVaultDeposit = {
      ...deposit,
      id: 'rvd-' + Date.now()
    };
    const updated: RentVaultConfig = {
      ...config,
      deposits: [newDeposit, ...(config.deposits || [])]
    };
    saveRentVaultLocalData(updated);
    return updated;
  },

  async deleteDeposit(id: string): Promise<RentVaultConfig> {
    const config = getRentVaultLocalData();
    const updated: RentVaultConfig = {
      ...config,
      deposits: (config.deposits || []).filter(d => d.id !== id)
    };
    saveRentVaultLocalData(updated);
    return updated;
  }
};

const defaultTimetableConfig: TimetableConfig = {
  days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  timeSlots: [
    '08:00 - 10:00',
    '10:00 - 12:00',
    '13:00 - 15:00',
    '15:00 - 17:00',
    '17:00 - 19:00',
    '19:00 - 21:00'
  ],
  rooms: ['Salle 1', 'Salle 2', 'Salle 3', 'Salle 4'],
  cells: {
    'Dimanche_08:00 - 10:00': {
      id: 'cell-1',
      day: 'Dimanche',
      timeSlot: '08:00 - 10:00',
      classId: 'class-1',
      className: 'Terminale - Mathématiques',
      teacherName: 'Prof. Amine Benali',
      subject: 'Mathématiques',
      room: 'Salle 1',
      color: '#3b82f6',
      note: 'Groupe A'
    },
    'Dimanche_10:00 - 12:00': {
      id: 'cell-2',
      day: 'Dimanche',
      timeSlot: '10:00 - 12:00',
      classId: 'class-2',
      className: 'Terminale - Sciences Physiques',
      teacherName: 'Prof. Sarah Mansouri',
      subject: 'Physique & Chimie',
      room: 'Salle 2',
      color: '#8b5cf6',
      note: 'Cours & Exercices'
    },
    'Mardi_13:00 - 15:00': {
      id: 'cell-3',
      day: 'Mardi',
      timeSlot: '13:00 - 15:00',
      classId: 'class-3',
      className: '1ère AS - Tronc Commun Sciences',
      teacherName: 'Prof. Karim Dahmani',
      subject: 'Sciences Naturelles',
      room: 'Salle 3',
      color: '#10b981',
      note: 'TP & Synthèse'
    },
    'Mercredi_15:00 - 17:00': {
      id: 'cell-4',
      day: 'Mercredi',
      timeSlot: '15:00 - 17:00',
      classId: 'class-4',
      className: '4ème AM - BEM Préparation',
      teacherName: 'Prof. Nassim Brahimi',
      subject: 'Français & Anglais',
      room: 'Salle 1',
      color: '#f59e0b',
      note: 'Révision BEM'
    },
    'Samedi_08:00 - 10:00': {
      id: 'cell-5',
      day: 'Samedi',
      timeSlot: '08:00 - 10:00',
      classId: 'class-1',
      className: 'Terminale - Mathématiques',
      teacherName: 'Prof. Amine Benali',
      subject: 'Mathématiques',
      room: 'Salle 1',
      color: '#3b82f6',
      note: 'Série Bac Blanc'
    },
    'Samedi_10:00 - 12:00': {
      id: 'cell-6',
      day: 'Samedi',
      timeSlot: '10:00 - 12:00',
      classId: 'class-5',
      className: 'Langues Étrangères - Anglais Intensif',
      teacherName: 'Prof. Houda Meziani',
      subject: 'Anglais',
      room: 'Salle 4',
      color: '#ec4899',
      note: 'Expression orale'
    }
  }
};

const getTimetableLocalData = (): TimetableConfig => {
  const data = localStorage.getItem('everest_timetable_config');
  if (!data) {
    localStorage.setItem('everest_timetable_config', JSON.stringify(defaultTimetableConfig));
    return defaultTimetableConfig;
  }
  try {
    const parsed: TimetableConfig = JSON.parse(data);
    // Ensure Labo Info and Amphi are removed if present
    if (parsed.rooms && (parsed.rooms.includes('Labo Info') || parsed.rooms.includes('Amphi'))) {
      parsed.rooms = parsed.rooms.filter(r => r !== 'Labo Info' && r !== 'Amphi');
      localStorage.setItem('everest_timetable_config', JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    return defaultTimetableConfig;
  }
};

const saveTimetableLocalData = (data: TimetableConfig): void => {
  localStorage.setItem('everest_timetable_config', JSON.stringify(data));
};

const TIMETABLE_CONFIG_ID = 'default_timetable';

export const timetableService = {
  async getConfig(): Promise<TimetableConfig> {
    const local = getTimetableLocalData();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('timetable_config')
          .select('*')
          .eq('id', TIMETABLE_CONFIG_ID)
          .maybeSingle();

        if (!error && data) {
          const config: TimetableConfig = {
            days: Array.isArray(data.days) && data.days.length > 0 ? data.days : local.days,
            timeSlots: Array.isArray(data.time_slots) && data.time_slots.length > 0 ? data.time_slots : (Array.isArray(data.timeSlots) ? data.timeSlots : local.timeSlots),
            rooms: Array.isArray(data.rooms) && data.rooms.length > 0 ? data.rooms : local.rooms,
            cells: typeof data.cells === 'object' && data.cells !== null ? data.cells : (local.cells || {})
          };
          saveTimetableLocalData(config);
          return config;
        } else if (error && error.code !== 'PGRST116') {
          console.warn('Supabase timetable fetch info:', error.message);
        }
      } catch (err) {
        console.warn('Supabase timetable fetch error (using local storage):', err);
      }
    }
    return local;
  },

  async saveConfig(config: TimetableConfig): Promise<TimetableConfig> {
    saveTimetableLocalData(config);

    if (isSupabaseConfigured()) {
      try {
        const payload = {
          id: TIMETABLE_CONFIG_ID,
          days: config.days,
          time_slots: config.timeSlots,
          rooms: config.rooms,
          cells: config.cells,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('timetable_config')
          .upsert([payload], { onConflict: 'id' });

        if (error) {
          console.warn('Supabase timetable upsert notice:', error.message);
        }
      } catch (err) {
        console.warn('Supabase timetable save error:', err);
      }
    }
    return config;
  },

  async updateCell(day: string, timeSlot: string, cellData: Partial<TimetableCell> | null): Promise<TimetableConfig> {
    const config = getTimetableLocalData();
    const key = `${day}_${timeSlot}`;
    const newCells = { ...config.cells };

    if (!cellData || Object.keys(cellData).length === 0) {
      delete newCells[key];
    } else {
      newCells[key] = {
        id: newCells[key]?.id || `cell-${Date.now()}`,
        day,
        timeSlot,
        ...newCells[key],
        ...cellData
      };
    }

    const updatedConfig: TimetableConfig = {
      ...config,
      cells: newCells
    };
    return this.saveConfig(updatedConfig);
  },

  async addTimeSlot(timeSlot: string): Promise<TimetableConfig> {
    const config = getTimetableLocalData();
    if (config.timeSlots.includes(timeSlot)) return config;
    const updatedConfig: TimetableConfig = {
      ...config,
      timeSlots: [...config.timeSlots, timeSlot]
    };
    return this.saveConfig(updatedConfig);
  },

  async removeTimeSlot(timeSlot: string): Promise<TimetableConfig> {
    const config = getTimetableLocalData();
    const updatedConfig: TimetableConfig = {
      ...config,
      timeSlots: config.timeSlots.filter(ts => ts !== timeSlot)
    };
    // Also remove cells with that timeSlot
    const newCells = { ...config.cells };
    Object.keys(newCells).forEach(key => {
      if (newCells[key]?.timeSlot === timeSlot) {
        delete newCells[key];
      }
    });
    updatedConfig.cells = newCells;
    return this.saveConfig(updatedConfig);
  },

  async addDay(day: string): Promise<TimetableConfig> {
    const config = getTimetableLocalData();
    if (config.days.includes(day)) return config;
    const updatedConfig: TimetableConfig = {
      ...config,
      days: [...config.days, day]
    };
    return this.saveConfig(updatedConfig);
  },

  async removeDay(day: string): Promise<TimetableConfig> {
    const config = getTimetableLocalData();
    const updatedConfig: TimetableConfig = {
      ...config,
      days: config.days.filter(d => d !== day)
    };
    const newCells = { ...config.cells };
    Object.keys(newCells).forEach(key => {
      if (newCells[key]?.day === day) {
        delete newCells[key];
      }
    });
    updatedConfig.cells = newCells;
    return this.saveConfig(updatedConfig);
  },

  async addRoom(room: string): Promise<TimetableConfig> {
    const config = getTimetableLocalData();
    if (config.rooms.includes(room)) return config;
    const updatedConfig: TimetableConfig = {
      ...config,
      rooms: [...config.rooms, room]
    };
    return this.saveConfig(updatedConfig);
  },

  async removeRoom(room: string): Promise<TimetableConfig> {
    const config = getTimetableLocalData();
    const updatedConfig: TimetableConfig = {
      ...config,
      rooms: config.rooms.filter(r => r !== room)
    };
    return this.saveConfig(updatedConfig);
  },

  async resetToDefault(): Promise<TimetableConfig> {
    return this.saveConfig(defaultTimetableConfig);
  }
};



