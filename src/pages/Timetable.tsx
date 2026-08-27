import React, { useState, useEffect, useRef } from 'react';
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  MapPin, 
  User, 
  GraduationCap, 
  Printer, 
  Download, 
  RotateCcw, 
  Save, 
  X, 
  Check, 
  Search, 
  Filter, 
  Sparkles,
  Maximize2,
  Calendar,
  Layers,
  BookOpen,
  Database,
  Copy,
  CheckCheck
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { SchoolClass, Teacher, TimetableCell, TimetableConfig } from '../types';
import { classesService, teachersService, timetableService } from '../services/supabaseService';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

const COLOR_PALETTES = [
  { name: 'Bleu Royal', value: '#2563eb', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  { name: 'Émeraude', value: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
  { name: 'Violet', value: '#7c3aed', bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  { name: 'Ambre / Or', value: '#d97706', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  { name: 'Rose Fushia', value: '#db2777', bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700' },
  { name: 'Cyan Ciel', value: '#0891b2', bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700' },
  { name: 'Indigo Nuit', value: '#4f46e5', bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700' },
  { name: 'Rouge Corail', value: '#dc2626', bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700' }
];

export function Timetable() {
  const { t, isRTL } = useLanguage();
  const [config, setConfig] = useState<TimetableConfig | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterTeacherName, setFilterTeacherName] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected cell for editing
  const [editingCellKey, setEditingCellKey] = useState<{ day: string; timeSlot: string } | null>(null);
  const [cellForm, setCellForm] = useState<Partial<TimetableCell>>({
    className: '',
    teacherName: '',
    subject: '',
    room: '',
    color: '#2563eb',
    note: ''
  });

  // Modal for adding time slot
  const [isAddTimeSlotModalOpen, setIsAddTimeSlotModalOpen] = useState(false);
  const [newTimeSlotInput, setNewTimeSlotInput] = useState('');

  // Modal for adding room
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [newRoomInput, setNewRoomInput] = useState('');

  // Teacher selection mode in modal
  const [isCustomTeacher, setIsCustomTeacher] = useState(false);
  const [saveNewTeacherToDb, setSaveNewTeacherToDb] = useState(false);

  // Quick edit cell selection
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);

  // Supabase SQL Modal
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isCopiedSql, setIsCopiedSql] = useState(false);

  const supabaseSqlCode = `-- ========================================================
-- SCHEMA SUPABASE: EMPLOI DU TEMPS (TIMETABLE)
-- ÉCOLE LES MAÎTRES / EVEREST SECRETARY
-- ========================================================

-- 1. Création de la table 'timetable_config'
CREATE TABLE IF NOT EXISTS public.timetable_config (
    id TEXT PRIMARY KEY,
    days JSONB NOT NULL DEFAULT '["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]'::jsonb,
    time_slots JSONB NOT NULL DEFAULT '["08:00 - 10:00", "10:00 - 12:00", "13:00 - 15:00", "15:00 - 17:00", "17:00 - 19:00", "19:00 - 21:00"]'::jsonb,
    rooms JSONB NOT NULL DEFAULT '["Salle 1", "Salle 2", "Salle 3", "Salle 4"]'::jsonb,
    cells JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Activation de la sécurité RLS (Row Level Security)
ALTER TABLE public.timetable_config ENABLE ROW LEVEL SECURITY;

-- 3. Suppression préalable des politiques si elles existent déjà (Idempotent)
DROP POLICY IF EXISTS "Lecture publique timetable_config" ON public.timetable_config;
DROP POLICY IF EXISTS "Insertion publique timetable_config" ON public.timetable_config;
DROP POLICY IF EXISTS "Mise à jour publique timetable_config" ON public.timetable_config;
DROP POLICY IF EXISTS "Suppression publique timetable_config" ON public.timetable_config;
DROP POLICY IF EXISTS "Acces total timetable_config" ON public.timetable_config;

-- 4. Politiques d'accès complètes (Lecture & Écriture)
CREATE POLICY "Lecture publique timetable_config"
ON public.timetable_config
FOR SELECT
USING (true);

CREATE POLICY "Insertion publique timetable_config"
ON public.timetable_config
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Mise à jour publique timetable_config"
ON public.timetable_config
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Suppression publique timetable_config"
ON public.timetable_config
FOR DELETE
USING (true);

-- 5. Initialisation du créneau par défaut si la table est vide
INSERT INTO public.timetable_config (id, days, time_slots, rooms, cells)
VALUES (
    'default_timetable',
    '["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]'::jsonb,
    '["08:00 - 10:00", "10:00 - 12:00", "13:00 - 15:00", "15:00 - 17:00", "17:00 - 19:00", "19:00 - 21:00"]'::jsonb,
    '["Salle 1", "Salle 2", "Salle 3", "Salle 4"]'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(supabaseSqlCode);
    setIsCopiedSql(true);
    setTimeout(() => setIsCopiedSql(false), 2000);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [ttData, clData, tcData] = await Promise.all([
        timetableService.getConfig(),
        classesService.getAll(),
        teachersService.getAll()
      ]);
      setConfig(ttData);
      setClasses(clData);
      setTeachers(tcData);
    } catch (err) {
      console.error('Error loading timetable data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (day: string, timeSlot: string) => {
    const key = `${day}_${timeSlot}`;
    const existing = config?.cells[key];
    setEditingCellKey({ day, timeSlot });
    setSaveNewTeacherToDb(false);

    if (existing) {
      const isKnownTeacher = teachers.some(t => t.name.toLowerCase() === (existing.teacherName || '').toLowerCase());
      setIsCustomTeacher(Boolean(existing.teacherName && !isKnownTeacher));

      setCellForm({
        className: existing.className || '',
        teacherName: existing.teacherName || '',
        subject: existing.subject || '',
        room: existing.room || '',
        color: existing.color || '#2563eb',
        note: existing.note || '',
        classId: existing.classId,
        teacherId: existing.teacherId
      });
    } else {
      setIsCustomTeacher(false);
      setCellForm({
        className: '',
        teacherName: '',
        subject: '',
        room: config?.rooms[0] || 'Salle 1',
        color: '#2563eb',
        note: ''
      });
    }
  };

  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCellKey || !config) return;

    try {
      let finalTeacherId = cellForm.teacherId;
      const finalTeacherName = cellForm.teacherName?.trim() || '';

      // If user typed a new custom teacher and asked to register them in the database
      if (isCustomTeacher && saveNewTeacherToDb && finalTeacherName) {
        const exists = teachers.find(t => t.name.toLowerCase() === finalTeacherName.toLowerCase());
        if (!exists) {
          try {
            const createdTeacher = await teachersService.create({
              name: finalTeacherName,
              email: '',
              subject: cellForm.subject?.trim() || 'Général',
              salary: 0,
              paymentStatus: 'Unpaid',
              paidMonths: []
            });
            finalTeacherId = createdTeacher.id;
            setTeachers(prev => [...prev, createdTeacher]);
          } catch (createErr) {
            console.warn('Could not auto-register new teacher in DB:', createErr);
          }
        } else {
          finalTeacherId = exists.id;
        }
      }

      const isEmpty = !cellForm.className?.trim() && !cellForm.subject?.trim() && !finalTeacherName;
      
      const updatedConfig = await timetableService.updateCell(
        editingCellKey.day,
        editingCellKey.timeSlot,
        isEmpty ? null : {
          ...cellForm,
          className: cellForm.className?.trim(),
          teacherName: finalTeacherName,
          teacherId: finalTeacherId,
          subject: cellForm.subject?.trim(),
          room: cellForm.room?.trim(),
          note: cellForm.note?.trim()
        }
      );
      setConfig(updatedConfig);
      setEditingCellKey(null);
    } catch (error) {
      console.error('Failed to update cell:', error);
    }
  };

  const handleDeleteCell = async (day: string, timeSlot: string) => {
    if (!config) return;
    try {
      const updatedConfig = await timetableService.updateCell(day, timeSlot, null);
      setConfig(updatedConfig);
      if (editingCellKey?.day === day && editingCellKey?.timeSlot === timeSlot) {
        setEditingCellKey(null);
      }
    } catch (err) {
      console.error('Failed to delete cell content:', err);
    }
  };

  const handleAddTimeSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimeSlotInput.trim() || !config) return;
    try {
      const updated = await timetableService.addTimeSlot(newTimeSlotInput.trim());
      setConfig(updated);
      setNewTimeSlotInput('');
      setIsAddTimeSlotModalOpen(false);
    } catch (err) {
      console.error('Failed to add time slot:', err);
    }
  };

  const handleRemoveTimeSlot = async (timeSlot: string) => {
    if (!config) return;
    if (window.confirm(`Voulez-vous vraiment supprimer le créneau "${timeSlot}" et toutes ses séances associées ?`)) {
      try {
        const updated = await timetableService.removeTimeSlot(timeSlot);
        setConfig(updated);
      } catch (err) {
        console.error('Failed to remove time slot:', err);
      }
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomInput.trim() || !config) return;
    try {
      const updated = await timetableService.addRoom(newRoomInput.trim());
      setConfig(updated);
      setNewRoomInput('');
      setIsAddRoomModalOpen(false);
    } catch (err) {
      console.error('Failed to add room:', err);
    }
  };

  const handleRemoveRoom = async (room: string) => {
    if (!config) return;
    if (window.confirm(`Voulez-vous vraiment supprimer la salle "${room}" ?`)) {
      try {
        const updated = await timetableService.removeRoom(room);
        setConfig(updated);
        if (filterRoom === room) {
          setFilterRoom('all');
        }
      } catch (err) {
        console.error('Failed to remove room:', err);
      }
    }
  };

  const handleResetToDefault = async () => {
    if (window.confirm('Voulez-vous réinitialiser l\'emploi du temps avec la structure d\'exemple ?')) {
      try {
        const updated = await timetableService.resetToDefault();
        setConfig(updated);
      } catch (err) {
        console.error('Failed to reset timetable:', err);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Quick class select auto-fills teacher and subject
  const handleSelectPresetClass = (classId: string) => {
    const foundClass = classes.find(c => c.id === classId);
    if (!foundClass) return;

    let foundTeacherName = '';
    if (foundClass.teacherId) {
      const tObj = teachers.find(t => t.id === foundClass.teacherId);
      if (tObj) foundTeacherName = tObj.name;
    }

    setCellForm(prev => ({
      ...prev,
      classId: foundClass.id,
      className: foundClass.name,
      teacherName: foundTeacherName || prev.teacherName,
      subject: foundClass.description || prev.subject
    }));
  };

  // Check if a cell matches active filters
  const matchesFilter = (cell?: TimetableCell): boolean => {
    if (!cell) {
      // If we are filtering, empty cells are dimmed
      return filterClassId === 'all' && filterTeacherName === 'all' && filterRoom === 'all' && !searchQuery.trim();
    }

    if (filterClassId !== 'all') {
      if (cell.classId !== filterClassId && cell.className !== filterClassId) {
        return false;
      }
    }

    if (filterTeacherName !== 'all') {
      if (cell.teacherName !== filterTeacherName) {
        return false;
      }
    }

    if (filterRoom !== 'all') {
      if (cell.room !== filterRoom) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = cell.className?.toLowerCase().includes(q);
      const matchTeacher = cell.teacherName?.toLowerCase().includes(q);
      const matchSubject = cell.subject?.toLowerCase().includes(q);
      const matchRoom = cell.room?.toLowerCase().includes(q);
      const matchNote = cell.note?.toLowerCase().includes(q);
      if (!matchName && !matchTeacher && !matchSubject && !matchRoom && !matchNote) {
        return false;
      }
    }

    return true;
  };

  if (loading || !config) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-500">Chargement de l'emploi du temps...</p>
        </div>
      </div>
    );
  }

  // Count active sessions
  const totalSessionsCount = (Object.values(config.cells) as (TimetableCell | undefined)[]).filter(c => c && (c.className || c.subject)).length;

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Header & Control Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <CalendarDays size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  Emploi du Temps Hebdomadaire
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold">
                    {totalSessionsCount} Séances
                  </span>
                </h1>
                <p className="text-xs font-semibold text-slate-500">
                  Grille interactive type Excel — Cliquez sur n'importe quelle case pour ajouter, modifier ou déplacer une séance.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-xs rounded-2xl transition-all flex items-center gap-2 border border-emerald-200 shadow-2xs cursor-pointer active:scale-95"
              title="Voir le code SQL Supabase"
            >
              <Database size={15} className="text-emerald-600" />
              <span>SQL Supabase</span>
            </button>

            <button
              onClick={() => setIsAddTimeSlotModalOpen(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-2xl transition-all flex items-center gap-2 border border-slate-200 shadow-xs"
            >
              <Clock size={15} />
              <span>+ Créneau</span>
            </button>

            <button
              onClick={() => setIsAddRoomModalOpen(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-2xl transition-all flex items-center gap-2 border border-slate-200 shadow-xs"
            >
              <MapPin size={15} />
              <span>+ Salle</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl transition-all flex items-center gap-2 shadow-sm"
            >
              <Printer size={15} />
              <span>Imprimer A4</span>
            </button>

            <button
              onClick={handleResetToDefault}
              title="Réinitialiser"
              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all border border-slate-200"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Filters and Search Strip */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher matière, prof, classe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-all"
            />
          </div>

          <div>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
            >
              <option value="all">Toutes les classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterTeacherName}
              onChange={(e) => setFilterTeacherName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
            >
              <option value="all">Tous les professeurs</option>
              {teachers.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
            >
              <option value="all">Toutes les salles</option>
              {config.rooms.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Interactive Excel-Style Timetable Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Printable Official Header (Visible on print only) */}
        <div className="hidden print:flex items-center justify-between p-6 border-b border-slate-300">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain" />
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">Emploi du Temps Hebdomadaire</h1>
              <p className="text-xs font-semibold text-slate-500">Everest Secretory — Année Académique 2025 / 2026</p>
            </div>
          </div>
          <div className="text-right text-xs font-bold text-slate-600">
            <p>Édition du: {new Date().toLocaleDateString('fr-FR')}</p>
            <p className="text-[11px] text-slate-400">Planning officiel des cours & séances</p>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse min-w-[900px]">
            {/* Table Header: Days of the week */}
            <thead>
              <tr className="bg-slate-900 text-white divide-x divide-slate-800 border-b border-slate-800">
                {/* Time slot column title */}
                <th className="p-3.5 text-center text-xs font-black uppercase tracking-wider w-36 bg-slate-950 sticky left-0 z-20">
                  <div className="flex items-center justify-center gap-1.5 text-slate-300">
                    <Clock size={14} />
                    <span>Créneaux</span>
                  </div>
                </th>

                {/* Day Columns */}
                {config.days.map((day) => (
                  <th key={day} className="p-3.5 text-center text-xs font-black uppercase tracking-wider min-w-[150px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <Calendar size={13} className="text-accent" />
                      <span>{day}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: Interactive Cells */}
            <tbody className="divide-y divide-slate-200">
              {config.timeSlots.map((timeSlot, tsIdx) => (
                <tr key={timeSlot} className="hover:bg-slate-50/50 transition-colors divide-x divide-slate-200 group/row">
                  {/* Left Column: Time Slot Pill with delete button */}
                  <td className="p-3 bg-slate-50 font-mono text-xs font-black text-slate-700 text-center sticky left-0 z-10 border-r border-slate-300 shadow-xs">
                    <div className="flex flex-col items-center justify-center gap-1 group/ts relative">
                      <span className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                        {timeSlot}
                      </span>
                      {config.timeSlots.length > 2 && (
                        <button
                          onClick={() => handleRemoveTimeSlot(timeSlot)}
                          title="Supprimer ce créneau"
                          className="opacity-0 group-hover/ts:opacity-100 transition-opacity text-rose-500 hover:text-rose-700 text-[10px] flex items-center gap-1 pt-0.5 print:hidden"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Days Cells */}
                  {config.days.map((day) => {
                    const cellKey = `${day}_${timeSlot}`;
                    const cell = config.cells[cellKey];
                    const hasContent = cell && (cell.className || cell.subject);
                    const isMatched = matchesFilter(cell);
                    const isSelected = selectedCellKey === cellKey;

                    return (
                      <td
                        key={cellKey}
                        onClick={() => {
                          setSelectedCellKey(cellKey);
                          handleOpenEditModal(day, timeSlot);
                        }}
                        className={cn(
                          "p-2.5 align-top transition-all cursor-pointer relative min-h-[90px] h-[95px]",
                          !isMatched && "opacity-30 grayscale",
                          isSelected && "ring-2 ring-primary ring-inset z-10",
                          !hasContent && "hover:bg-slate-100/70 border-dashed"
                        )}
                      >
                        {hasContent ? (
                          <div 
                            style={{ borderLeftColor: cell.color || '#2563eb' }}
                            className="h-full w-full rounded-xl bg-white border border-slate-200/80 border-l-4 p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all group/card relative"
                          >
                            <div>
                              {/* Top Bar: Subject & Room */}
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-black text-[11px] text-slate-900 truncate leading-snug">
                                  {cell.subject || cell.className}
                                </span>
                                {cell.room && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md shrink-0 border border-slate-200">
                                    {cell.room}
                                  </span>
                                )}
                              </div>

                              {/* Class Name (if different from subject) */}
                              {cell.className && cell.className !== cell.subject && (
                                <p className="text-[10px] font-bold text-slate-600 truncate mb-1">
                                  {cell.className}
                                </p>
                              )}

                              {/* Teacher Name */}
                              {cell.teacherName && (
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 truncate">
                                  <GraduationCap size={12} className="text-primary shrink-0" />
                                  <span className="truncate">{cell.teacherName}</span>
                                </div>
                              )}
                            </div>

                            {/* Note / Tag */}
                            {cell.note && (
                              <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                                <span className="italic truncate">{cell.note}</span>
                              </div>
                            )}

                            {/* Quick Action Overlay on Hover */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-lg border border-slate-200 print:hidden">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(day, timeSlot);
                                }}
                                className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                                title="Modifier"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCell(day, timeSlot);
                                }}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded"
                                title="Vider la case"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full w-full rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all p-2 group/empty">
                            <Plus size={16} className="transition-transform group-hover/empty:scale-125" />
                            <span className="text-[10px] font-bold mt-1 opacity-0 group-hover/empty:opacity-100 transition-opacity">
                              Ajouter
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend & Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        {/* Quick Rooms Availability */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-primary" />
            <span>Salles Configurées</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {config.rooms.map(r => {
              const sessionsInRoom = (Object.values(config.cells) as (TimetableCell | undefined)[]).filter(c => c && c.room === r).length;
              return (
                <span key={r} className="group/rm px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-colors">
                  <span>{r}</span>
                  <span className="px-1.5 py-0.2 bg-slate-200 text-slate-800 text-[10px] font-black rounded-md">
                    {sessionsInRoom}
                  </span>
                  {config.rooms.length > 1 && (
                    <button
                      onClick={() => handleRemoveRoom(r)}
                      title={`Supprimer ${r}`}
                      className="opacity-0 group-hover/rm:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 rounded"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        {/* Quick Classes Legend */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs md:col-span-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-primary" />
            <span>Classes & Effectifs Hebdomadaires</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {classes.map(cl => {
              const count = (Object.values(config.cells) as (TimetableCell | undefined)[]).filter(c => c && (c.classId === cl.id || c.className === cl.name)).length;
              return (
                <button
                  key={cl.id}
                  onClick={() => setFilterClassId(filterClassId === cl.name ? 'all' : cl.name)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2",
                    filterClassId === cl.name
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  <span className="truncate max-w-[160px]">{cl.name}</span>
                  <span className={cn(
                    "px-1.5 py-0.2 text-[10px] font-black rounded-md",
                    filterClassId === cl.name ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
                  )}>
                    {count}h
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Cell Modal */}
      {editingCellKey && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-accent">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    Séance: {editingCellKey.day}
                  </h3>
                  <p className="text-xs font-mono text-slate-300">
                    Horaire : {editingCellKey.timeSlot}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCellKey(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCell} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Quick Select from existing Classes */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-accent" />
                  <span>Remplissage Rapide via Classe Existante</span>
                </label>
                <select
                  onChange={(e) => handleSelectPresetClass(e.target.value)}
                  defaultValue=""
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
                >
                  <option value="" disabled>-- Choisir une classe pour pré-remplir --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Subject / Course Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Matière ou Titre du cours *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Mathématiques, Physique, Français..."
                  value={cellForm.subject || ''}
                  onChange={(e) => setCellForm({ ...cellForm, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
              </div>

              {/* Class / Group Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Classe / Groupe
                </label>
                <input
                  type="text"
                  placeholder="ex: Terminale Math, 4ème AM Groupe 1..."
                  value={cellForm.className || ''}
                  onChange={(e) => setCellForm({ ...cellForm, className: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
              </div>

              {/* Teacher & Room in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <User size={13} className="text-primary" />
                      <span>Enseignant(e)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomTeacher(!isCustomTeacher);
                        if (!isCustomTeacher) {
                          setCellForm(prev => ({ ...prev, teacherId: undefined }));
                        }
                      }}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      {isCustomTeacher ? "📋 Choisir dans la liste" : "➕ Nouveau prof"}
                    </button>
                  </div>

                  {!isCustomTeacher ? (
                    <select
                      value={cellForm.teacherId || (teachers.find(t => t.name.toLowerCase() === (cellForm.teacherName || '').toLowerCase())?.id) || (cellForm.teacherName ? '__other__' : '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__custom__') {
                          setIsCustomTeacher(true);
                          setCellForm(prev => ({ ...prev, teacherId: undefined, teacherName: '' }));
                        } else if (val === '') {
                          setCellForm(prev => ({ ...prev, teacherId: undefined, teacherName: '' }));
                        } else {
                          const selectedTeacher = teachers.find(t => t.id === val);
                          if (selectedTeacher) {
                            setCellForm(prev => ({
                              ...prev,
                              teacherId: selectedTeacher.id,
                              teacherName: selectedTeacher.name,
                              subject: prev.subject || selectedTeacher.subject || prev.subject
                            }));
                          }
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
                    >
                      <option value="">-- Sans enseignant --</option>
                      <optgroup label="Enseignants Réels Enregistrés">
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} {t.subject ? `(${t.subject})` : ''}
                          </option>
                        ))}
                      </optgroup>
                      <option value="__custom__">➕ Saisir un nouveau nom...</option>
                    </select>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        autoFocus
                        placeholder="ex: Prof. Mohamed Ziani"
                        value={cellForm.teacherName || ''}
                        onChange={(e) => setCellForm({ ...cellForm, teacherName: e.target.value, teacherId: undefined })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
                      />
                      <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                        <input
                          type="checkbox"
                          checked={saveNewTeacherToDb}
                          onChange={(e) => setSaveNewTeacherToDb(e.target.checked)}
                          className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="text-[10px] font-bold text-slate-600">
                          Ajouter aussi aux Enseignants enregistrés
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <MapPin size={13} className="text-primary" />
                    <span>Salle de cours</span>
                  </label>
                  <select
                    value={cellForm.room || ''}
                    onChange={(e) => setCellForm({ ...cellForm, room: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
                  >
                    <option value="">-- Sans salle --</option>
                    {config.rooms.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color Tag Picker */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Couleur d'accentuation (Tag)
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {COLOR_PALETTES.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setCellForm({ ...cellForm, color: p.value })}
                      className={cn(
                        "w-8 h-8 rounded-full transition-transform flex items-center justify-center shadow-xs",
                        cellForm.color === p.value ? "scale-110 ring-2 ring-offset-2 ring-slate-900" : "hover:scale-105"
                      )}
                      style={{ backgroundColor: p.value }}
                      title={p.name}
                    >
                      {cellForm.color === p.value && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note / Remarks */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Remarques ou Détails (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="ex: Série d'exercices, Devoir surveillé, etc."
                  value={cellForm.note || ''}
                  onChange={(e) => setCellForm({ ...cellForm, note: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteCell(editingCellKey.day, editingCellKey.timeSlot);
                  }}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-2xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={15} />
                  <span>Effacer la case</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCellKey(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-black text-xs rounded-2xl transition-all shadow-md flex items-center gap-2"
                  >
                    <Save size={15} />
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Time Slot Modal */}
      {isAddTimeSlotModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl">
            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              <span>Nouveau Créneau Horaire</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Indiquez l'intervalle horaire (ex: 14:00 - 16:00 ou 16:30 - 18:00).
            </p>
            <form onSubmit={handleAddTimeSlot} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                placeholder="ex: 16:00 - 18:00"
                value={newTimeSlotInput}
                onChange={(e) => setNewTimeSlotInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTimeSlotModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-black text-xs rounded-xl shadow-xs"
                >
                  Ajouter le créneau
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl">
            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <span>Ajouter une Salle</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Nom ou numéro de la salle (ex: Salle 5, Salle Informatique, Amphi B).
            </p>
            <form onSubmit={handleAddRoom} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                placeholder="ex: Salle 5"
                value={newRoomInput}
                onChange={(e) => setNewRoomInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoomModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-black text-xs rounded-xl shadow-xs"
                >
                  Ajouter la salle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supabase SQL Schema Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Code SQL Supabase — Table Emploi du Temps
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Exécutez ce script dans l'éditeur SQL de votre console Supabase (SQL Editor).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Script PostgreSQL / Supabase :</span>
                <button
                  onClick={handleCopySql}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs active:scale-95",
                    isCopiedSql 
                      ? "bg-emerald-600 text-white" 
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  )}
                >
                  {isCopiedSql ? <CheckCheck size={14} /> : <Copy size={14} />}
                  <span>{isCopiedSql ? "Copié !" : "Copier le code SQL"}</span>
                </button>
              </div>

              <pre className="flex-1 overflow-auto bg-slate-950 text-emerald-400 p-4 rounded-2xl text-xs font-mono border border-slate-800 leading-relaxed select-all">
                {supabaseSqlCode}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Statut : {isSupabaseConfigured() ? '✓ Supabase connecté' : 'Mode local actif (fallback localStorage)'}</span>
              <button
                type="button"
                onClick={() => setIsSqlModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
