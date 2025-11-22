import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // Import Tailwind CSS directives
import { 
  Plus, Calendar, FileText, Clock, History, Settings, 
  Trash2, Edit2, Check, X, Share, Copy, Moon, Sun, 
  Download, Upload, Search, ChevronRight, User, MoreVertical,
  Smartphone, Tablet, Monitor, ChevronDown, AlertCircle, Briefcase, BadgeCheck,
  MapPin, Users, Save, HardDrive, CheckCircle, Wifi, WifiOff
} from 'lucide-react';

// --- Types ---

type PermissionType = 'KBM' | 'Halaqah' | 'Kajian' | 'Rapat' | string;
type ViewMode = 'mobile' | 'tablet' | 'desktop';

interface Schedule {
  id: string;
  day: string;
  subject: string;
  className: string;
  level: string;
  startTime: string;
  endTime: string;
  note: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
  type?: string; // Optional mapping to permission type
}

interface HistoryItem {
  id: string;
  timestamp: number;
  type: PermissionType;
  content: string;
}

interface UserProfile {
  name: string; // Nama Pegawai
  idNumber: string; // No Induk Karyawan
  unit: string; // Unit/Bagian
  employeeStatus: string; // Status Karyawan (GHY, etc)
  functionalPosition: string; // Jabatan Fungsional
  structuralPosition: string; // Jabatan Struktural
  workload: string; // Beban Jam Kerja
  startTime: string; // Jam Masuk
  endTime: string; // Jam Pulang
}

interface AppData {
  profile: UserProfile;
  schedules: Schedule[];
  templates: Template[];
  history: HistoryItem[];
  customTypes: string[];
  theme: 'light' | 'dark' | 'system';
  viewMode: ViewMode;
}

// --- Constants ---

const INITIAL_DATA: AppData = {
  profile: { 
    name: 'Agus Rinaldi', 
    idNumber: '1998202507011160', 
    unit: 'Ponpes', 
    employeeStatus: 'GHY',
    functionalPosition: 'Staff TU Pondok',
    structuralPosition: 'Guru',
    workload: '29 JP',
    startTime: '07.30 WIB',
    endTime: '16.00 WIB'
  },
  schedules: [],
  templates: [
    {
      id: 'tpl_kbm',
      name: 'Izin KBM (Default)',
      type: 'KBM',
      content: `SURAT IZIN TIDAK MENGIKUTI KBM

Yth. Bapak Kepala {{unit}}
di tempat

Assalamu'alaikum warahmatullahi wabarokatuh

Dengan surat ini saya memberitahukan bahwa :

Nama : {{nama}}
Guru : {{jabatan_struktural}}

Meminta izin karena tidak bisa mengikuti kegiatan belajar mengajar pada :

Hari/Tanggal : {{tanggal}}
Alasan Izin : {{alasan}}


Mapel terjadwal :
{{jadwal_kbm}}

untuk tugas insyaAllah akan kami konfirmasikan ke guru piket hari ini.

Demikian surat ini kami buat dan kami sampaikan dengan sebenar – benarnya.
Atas perhatianya Kami ucapkan jazaakumullah khairan katsiran.

Hormat Kami.


{{nama}}`
    },
    {
      id: 'tpl_halaqah',
      name: 'Izin Halaqah (Default)',
      type: 'Halaqah',
      content: `PESAN IZIN TIDAK MASUK HALAQAH
Assalamu'alaikum Warahmatullahi Wabarakatuh.

Nama : {{nama}}
Hari/Tanggal : {{tanggal}}
Waktu Halaqah : {{waktu_halaqah}}
Tempat Halaqah : {{tempat_halaqah}}

Pesan & Keterangan Izin:
Bismillah ...
{{alasan}}

Solusi Badal:
{{solusi_badal}}

Jazaakumullahu khoiron atas pengertiannya.
Mohon maaf dan semoga Allah menjaga halaqah kita semua.
Wassalamu'alaikum warahmatullahi wabarakatuh.`
    }
  ],
  history: [],
  customTypes: ['KBM', 'Halaqah', 'Kajian', 'Rapat'],
  theme: 'light',
  viewMode: 'mobile'
};

const DAYS = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const VARIABLES = [
  '{{nama}}', '{{nip}}', '{{unit}}', 
  '{{status}}', '{{jabatan_struktural}}', '{{jabatan_fungsional}}',
  '{{alasan}}', '{{tanggal}}', '{{jadwal_kbm}}',
  '{{jam_masuk}}', '{{jam_pulang}}',
  '{{waktu_halaqah}}', '{{tempat_halaqah}}', '{{solusi_badal}}'
];

// --- Hooks ---

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        // Deep merge/Simple merge to ensure new fields in initialValue exist in stored data
        return { ...initialValue, ...parsed, profile: { ...initialValue['profile' as keyof T], ...(parsed.profile || {}) } };
      }
      return initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// --- Helper ---
const calculateJP = (start: string, end: string) => {
  if(!start || !end || typeof start !== 'string' || typeof end !== 'string') return 0;
  try {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
    const jp = Math.round(diffMins / 40); 
    return jp > 0 ? jp : 0;
  } catch (e) { return 0; }
};

const formatTime = (time: string) => {
  if(!time || typeof time !== 'string') return '';
  return time.replace(':', '.');
};

// --- Components ---

const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-ios-cardDark w-full max-w-xs rounded-3xl shadow-2xl p-6 text-center transform transition-all scale-100 border border-white/10 animate-scale-fade">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">{message}</p>
        <div className="grid grid-cols-2 gap-3">
           <button onClick={onCancel} className="py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 active:scale-95 transition-transform">Batal</button>
           <button onClick={onConfirm} className="py-3 rounded-xl font-semibold text-white bg-ios-blue shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">Ya, Lanjut</button>
        </div>
      </div>
    </div>
  );
}

const PromptDialog = ({
  isOpen,
  title,
  placeholder,
  onSubmit,
  onCancel
}: {
  isOpen: boolean,
  title: string,
  placeholder: string,
  onSubmit: (value: string) => void,
  onCancel: () => void
}) => {
  const [value, setValue] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-ios-cardDark w-full max-w-xs rounded-3xl shadow-2xl p-6 transform transition-all scale-100 border border-white/10 animate-scale-fade">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">{title}</h3>
        <input 
          autoFocus
          className="w-full p-3 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl outline-none text-gray-900 dark:text-white font-medium"
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
           <button onClick={() => { setValue(''); onCancel(); }} className="py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 active:scale-95 transition-transform">Batal</button>
           <button onClick={() => { if(value.trim()) { onSubmit(value); setValue(''); } }} className="py-3 rounded-xl font-semibold text-white bg-ios-blue shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">Simpan</button>
        </div>
      </div>
    </div>
  );
}

const NetworkStatus = ({ isOnline }: { isOnline: boolean }) => {
  if (isOnline) return null;
  return (
    <div className="bg-red-500 text-white px-4 py-1 text-[10px] font-bold text-center flex items-center justify-center gap-2 animate-slide-up">
      <WifiOff size={12} />
      <span>Mode Offline - Data tersimpan di perangkat</span>
    </div>
  );
};

const Header = ({ 
  title, 
  onMenuClick 
}: { 
  title: string, 
  onMenuClick: () => void 
}) => (
  <div className="z-20 w-full bg-white dark:bg-ios-cardDark border-b border-ios-separator/30 dark:border-ios-separatorDark/30 px-6 h-24 pb-4 flex items-end justify-between shadow-sm shrink-0 transition-colors duration-300 rounded-t-[40px]">
    <div className="flex items-center gap-3 mb-1">
      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
         <FileText size={20} className="text-white transform -rotate-12" />
      </div>
      <h1 className="text-xl sm:text-2xl font-semibold tracking-normal bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
        {title}
      </h1>
    </div>
    <button onClick={onMenuClick} className="p-2 mb-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300">
      <MoreVertical size={24} />
    </button>
  </div>
);

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: 'create', label: 'Buat Izin', icon: Edit2 },
    { id: 'schedule', label: 'Jadwal', icon: Calendar },
    { id: 'template', label: 'Template', icon: FileText },
    { id: 'history', label: 'Riwayat', icon: History },
  ];

  return (
    <div className="w-full bg-white dark:bg-ios-cardDark border-t border-ios-separator/30 dark:border-ios-separatorDark/30 pb-safe pt-3 px-6 flex justify-between items-end z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0 transition-colors duration-300 rounded-b-[40px]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 p-2 w-20 transition-all duration-200 ${isActive ? 'text-ios-blue scale-105' : 'text-gray-400 hover:text-gray-500'}`}
          >
            <div className={`p-1.5 rounded-xl transition-colors duration-300 ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-transparent'}`}>
               <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// --- Sub-Views ---

// 1. CREATE VIEW
const CreateView = ({ data, setData, onOpenSettings }: { data: AppData, setData: any, onOpenSettings: () => void }) => {
  const [mode, setMode] = useState<'input' | 'result'>('input');
  const [formData, setFormData] = useState({
    type: 'KBM',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    returnDate: '',
    customType: '',
    halaqahTime: '',
    halaqahPlace: '',
    badalSolution: ''
  });
  
  const [editedMessage, setEditedMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [deleteTypeConfirm, setDeleteTypeConfirm] = useState(false);
  const [addTypeDialogOpen, setAddTypeDialogOpen] = useState(false);

  useEffect(() => {
    const matchedTemplate = data.templates.find(t => t.type === formData.type);
    if (matchedTemplate) {
        setSelectedTemplateId(matchedTemplate.id);
    } else {
        setSelectedTemplateId(data.templates[0]?.id || null);
    }
  }, [formData.type, data.templates]);

  const generateMessage = () => {
    const template = data.templates.find(t => t.id === selectedTemplateId) || data.templates[0];
    if (!template) return '';

    let content = template.content;
    const profile = data.profile || {} as Partial<UserProfile>;

    const vars: Record<string, string> = {
      '{{nama}}': profile.name || '[Nama Pegawai]',
      '{{nip}}': profile.idNumber || '[No Induk]',
      '{{unit}}': profile.unit || '[Unit/Bagian]',
      '{{status}}': profile.employeeStatus || '[Status]',
      '{{jabatan_fungsional}}': profile.functionalPosition || '[Jabatan Fungsional]',
      '{{jabatan_struktural}}': profile.structuralPosition || '[Jabatan Struktural]',
      '{{beban_kerja}}': profile.workload || '[Beban Kerja]',
      '{{jam_masuk}}': profile.startTime || '[Jam Masuk]',
      '{{jam_pulang}}': profile.endTime || '[Jam Pulang]',
      '{{alasan}}': formData.reason || '................',
      '{{jenis_izin}}': formData.type === 'Lainnya' ? (formData.customType || 'Izin') : formData.type,
      '{{waktu_halaqah}}': formData.halaqahTime || '................',
      '{{tempat_halaqah}}': formData.halaqahPlace || '................',
      '{{solusi_badal}}': formData.badalSolution || '-',
    };

    // Fix timezone issue by parsing manually
    const [y, m, d] = formData.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    try {
        vars['{{tanggal}}'] = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch(e) {
        vars['{{tanggal}}'] = formData.date;
    }

    if (formData.returnDate) {
      vars['{{tanggal_kembali}}'] = new Date(formData.returnDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } else {
      vars['{{tanggal_kembali}}'] = '[Tanggal Kembali]';
    }

    if (content.includes('{{jadwal_kbm}}')) {
      const dayIndex = dateObj.getDay();
      const dayName = DAYS[dayIndex] || '';
      const daySchedules = data.schedules.filter(s => s.day === dayName).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      
      let scheduleList = '';
      if (daySchedules.length > 0) {
        scheduleList = daySchedules.map((s) => {
          const jp = calculateJP(s.startTime, s.endTime);
          const notePart = s.note ? `(tugas: ${s.note})` : '';
          const timeStart = formatTime(s.startTime);
          const timeEnd = formatTime(s.endTime);
          return `- ${s.subject} ${s.className} (${s.level}) ${timeStart} - ${timeEnd} / ${jp} JP ${notePart}`;
        }).join('\n');
      } else {
        scheduleList = 'Tidak ada jadwal KBM tercatat.';
      }
      vars['{{jadwal_kbm}}'] = scheduleList;
    }

    Object.keys(vars).forEach(key => {
      content = content.split(key).join(vars[key]);
    });

    return content;
  };

  const handleSwitchToResult = () => {
    const msg = generateMessage();
    setEditedMessage(msg);
    setMode('result');
  };

  const getSelectedDateSchedule = () => {
    if (!formData.date) return { dayName: '', scheds: [] };
    // Fix timezone issue by parsing manually
    const [y, m, d] = formData.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayIndex = dateObj.getDay();
    const dayName = DAYS[dayIndex] || '';
    const scheds = data.schedules.filter(s => s.day === dayName).sort((a, b) => (a.startTime||'').localeCompare(b.startTime||''));
    return { dayName, scheds };
  };

  const { dayName, scheds } = getSelectedDateSchedule();

  const handleSaveAsTemplate = () => {
      const name = prompt("Simpan sebagai Template Baru dengan nama:", `Template ${formData.type}`);
      if(name) {
          const newTpl: Template = {
              id: Date.now().toString(),
              name: name,
              content: editedMessage,
              type: formData.type
          };
          setData((prev: AppData) => ({
              ...prev,
              templates: [...prev.templates, newTpl]
          }));
          alert("Template berhasil disimpan!");
      }
  };

  const handleAddType = (newType: string) => {
      if (data.customTypes.includes(newType)) {
          alert("Jenis izin sudah ada!");
          return;
      }
      setData((prev: AppData) => ({
          ...prev,
          customTypes: [...prev.customTypes, newType]
      }));
      setFormData(prev => ({ ...prev, type: newType }));
      setAddTypeDialogOpen(false);
  };

  const handleDeleteType = () => {
      setDeleteTypeConfirm(true);
  };

  const confirmDeleteTypeAction = () => {
      const typeToDelete = formData.type;
      if(typeToDelete === 'KBM' || typeToDelete === 'Halaqah') return; // Safety
      
      const newTypes = data.customTypes.filter(t => t !== typeToDelete);
      setData((prev: AppData) => ({
          ...prev,
          customTypes: newTypes
      }));
      setFormData(prev => ({ ...prev, type: 'KBM' }));
      setDeleteTypeConfirm(false);
  };

  return (
    <div className="animate-fade-in h-full flex flex-col">
      <div className="p-4 pb-0 shrink-0">
        <div className="bg-white dark:bg-ios-cardDark p-1 rounded-xl flex shadow-sm border border-ios-separator/20 transition-colors duration-300">
          <button 
            onClick={() => setMode('input')}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${mode === 'input' ? 'bg-ios-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Edit2 size={16} /> Isi Data
          </button>
          <button 
            onClick={handleSwitchToResult}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${mode === 'result' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <FileText size={16} /> Edit Hasil
          </button>
        </div>
      </div>

      {mode === 'input' ? (
        <div className="p-4 space-y-6 overflow-y-auto pb-24">
          <div 
            onClick={onOpenSettings}
            className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden cursor-pointer group transition-transform active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
              <Edit2 size={48} />
            </div>
            <p className="text-blue-100 text-[10px] font-bold tracking-wider mb-1 uppercase flex items-center gap-1">
              <BadgeCheck size={12} /> Identitas Pengirim
            </p>
            <h2 className="text-2xl font-bold mb-1 truncate tracking-tight">{data.profile?.name || 'Ketuk untuk isi nama'}</h2>
            <p className="text-blue-100 text-xs mb-2 font-medium">
              {data.profile?.idNumber || 'NIK belum diisi'}
            </p>
            <div className="flex gap-2 text-[10px] font-semibold">
               <span className="bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">{data.profile?.unit || 'Unit -'}</span>
               <span className="bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">{data.profile?.structuralPosition || 'Jabatan -'}</span>
            </div>
            
            <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <Edit2 size={16} />
            </div>
          </div>

          <div className="bg-white dark:bg-ios-cardDark rounded-2xl p-4 shadow-sm border border-ios-separator/20 space-y-4 transition-colors duration-300">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">Jenis Izin</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full appearance-none bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white p-4 rounded-xl outline-none font-medium border border-transparent focus:border-ios-blue transition-colors duration-300 pr-10"
                  >
                    {data.customTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
                <button 
                  onClick={() => setAddTypeDialogOpen(true)}
                  className="w-14 flex items-center justify-center bg-blue-50 dark:bg-gray-800 text-ios-blue rounded-xl hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors duration-300 shadow-sm"
                >
                  <Plus size={24} />
                </button>
                {/* Delete button for custom types or even default types except mandatory ones */}
                {!['KBM', 'Halaqah'].includes(formData.type) && (
                    <button 
                      onClick={handleDeleteType}
                      className="w-14 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors duration-300 shadow-sm"
                    >
                      <Trash2 size={20} />
                    </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">Tanggal Izin</label>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-transparent focus-within:border-ios-blue transition-colors duration-300">
                <Calendar size={20} className="text-gray-400" />
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="bg-transparent w-full outline-none font-medium text-gray-800 dark:text-white"
                />
              </div>
            </div>

            {formData.type === 'Halaqah' && (
               <>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block flex gap-1 items-center"><Clock size={10}/> Waktu Halaqah</label>
                          <input 
                            type="text"
                            value={formData.halaqahTime}
                            onChange={e => setFormData({...formData, halaqahTime: e.target.value})}
                            placeholder="Contoh: Ba'da Maghrib"
                            className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-sm font-medium text-gray-800 dark:text-white border border-transparent focus:border-ios-blue transition-colors duration-300"
                          />
                      </div>
                      <div>
                          <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block flex gap-1 items-center"><MapPin size={10}/> Tempat</label>
                          <input 
                            type="text"
                            value={formData.halaqahPlace}
                            onChange={e => setFormData({...formData, halaqahPlace: e.target.value})}
                            placeholder="Contoh: Masjid Lt 2"
                            className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-sm font-medium text-gray-800 dark:text-white border border-transparent focus:border-ios-blue transition-colors duration-300"
                          />
                      </div>
                  </div>
               </>
            )}
            
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                 {formData.type === 'Halaqah' ? 'Pesan & Keterangan Izin' : 'Alasan'}
              </label>
              <textarea 
                rows={2}
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                placeholder={formData.type === 'Halaqah' ? "Bismillah ... (lanjutkan alasan)" : "Contoh: Badan belum fit..."}
                className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none font-medium text-gray-800 dark:text-white resize-none border border-transparent focus:border-ios-blue transition-colors duration-300"
              />
            </div>

            {formData.type === 'Halaqah' && (
               <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block flex gap-1 items-center"><Users size={10}/> Solusi Badal</label>
                  <textarea 
                    rows={2}
                    value={formData.badalSolution}
                    onChange={e => setFormData({...formData, badalSolution: e.target.value})}
                    placeholder="Contoh: Digantikan oleh Ustadz X"
                    className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none font-medium text-gray-800 dark:text-white resize-none border border-transparent focus:border-ios-blue transition-colors duration-300"
                  />
               </div>
            )}

          </div>

          {/* Schedule Preview Section - Shows relevant schedule automatically */}
          {formData.type !== 'Halaqah' && (
            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-5 transition-colors duration-300">
              <div className="flex items-center gap-2 mb-3 text-orange-600 dark:text-orange-400">
                <Clock size={20} />
                <h3 className="font-bold">Jadwal {dayName}</h3>
              </div>
              {scheds.length > 0 ? (
                <div className="space-y-2">
                  {scheds.map((s, idx) => (
                    <div key={idx} className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300 border-b border-orange-200/50 dark:border-orange-800/30 last:border-0 pb-2 last:pb-0">
                      <div className="flex justify-between">
                          <span className="font-semibold">{s.subject} {s.className} ({s.level})</span>
                          <span className="font-mono text-orange-500 font-bold text-xs">{formatTime(s.startTime)}-{formatTime(s.endTime)}</span>
                      </div>
                      {s.note && <span className="text-xs text-gray-500 italic">{s.note}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic text-sm">Tidak ada jadwal tercatat untuk hari ini.</p>
              )}
            </div>
          )}

        </div>
      ) : (
        <div className="flex flex-col h-full px-4 pb-24 pt-4">
           <div className="flex justify-between items-end px-1 mb-3 shrink-0">
              <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Jenis Draft</p>
                  <h2 className="text-2xl font-bold text-ios-blue">{formData.type}</h2>
              </div>
              <button 
                  onClick={handleSaveAsTemplate}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-ios-blue bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border shadow-sm transition-colors duration-300"
               >
                  <Save size={14} /> Simpan Template
               </button>
           </div>

           <div className="flex-1 bg-white dark:bg-ios-cardDark rounded-2xl shadow-sm border border-ios-separator/20 overflow-hidden flex flex-col relative group transition-colors duration-300 mb-4 min-h-0">
             <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 transition-colors duration-300 shrink-0">
               <div className="flex items-center gap-2 text-gray-500">
                 <FileText size={14} />
                 <span className="text-xs font-bold uppercase">Preview & Edit Hasil</span>
               </div>
               <button 
                  onClick={() => { 
                     const newHistory: HistoryItem = {
                        id: Date.now().toString(),
                        timestamp: Date.now(),
                        type: formData.type,
                        content: editedMessage
                     };
                     setData((prev: AppData) => ({...prev, history: [newHistory, ...prev.history]}));
                     alert("Tersimpan ke Riwayat!");
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-ios-blue bg-white dark:bg-gray-800 px-2 py-1 rounded border shadow-sm transition-colors"
               >
                  <History size={12} /> Simpan ke Riwayat
               </button>
             </div>
             <textarea 
               className="w-full h-full p-4 text-base leading-relaxed outline-none bg-transparent resize-none font-sans text-gray-800 dark:text-gray-200 flex-1"
               value={editedMessage}
               onChange={e => setEditedMessage(e.target.value)}
             />
           </div>

           <div className="grid grid-cols-2 gap-3 shrink-0">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(editedMessage);
                  alert('Teks berhasil disalin!');
                }}
                className="py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Copy size={18} /> Salin
              </button>
              <button 
                onClick={() => {
                  const url = `https://wa.me/?text=${encodeURIComponent(editedMessage)}`;
                  window.open(url, '_blank');
                }}
                className="py-3 bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-green-500/30"
              >
                <Share size={18} /> WhatsApp
              </button>
           </div>
        </div>
      )}

      <PromptDialog 
         isOpen={addTypeDialogOpen}
         title="Tambah Jenis Izin"
         placeholder="Masukkan nama jenis izin baru..."
         onSubmit={handleAddType}
         onCancel={() => setAddTypeDialogOpen(false)}
      />

      <ConfirmDialog 
         isOpen={deleteTypeConfirm}
         title="Hapus Jenis Izin?"
         message={`Apakah Anda yakin ingin menghapus jenis izin "${formData.type}"?`}
         onConfirm={confirmDeleteTypeAction}
         onCancel={() => setDeleteTypeConfirm(false)}
      />
    </div>
  );
};

// 2. SCHEDULE VIEW
const ScheduleView = ({ data, setData }: { data: AppData, setData: any }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  
  const initialFormState: Schedule = { 
    id: '', day: 'Minggu', subject: '', 
    className: '', level: '', 
    startTime: '07:00', endTime: '08:00', 
    note: '' 
  };
  const [form, setForm] = useState<Schedule>(initialFormState);

  const openAddModal = (day?: string) => {
    setForm({ ...initialFormState, day: day || 'Minggu' });
    setEditingSchedule(null);
    setModalOpen(true);
  };

  const openEditModal = (schedule: Schedule) => {
    setForm(schedule);
    setEditingSchedule(schedule);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSchedule) {
      setData((prev: AppData) => ({
        ...prev,
        schedules: prev.schedules.map(s => s.id === editingSchedule.id ? { ...form, id: editingSchedule.id } : s)
      }));
    } else {
      setData((prev: AppData) => ({
        ...prev,
        schedules: [...prev.schedules, { ...form, id: Date.now().toString() }]
      }));
    }
    setModalOpen(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if(editingSchedule) {
       setData((prev: AppData) => ({
         ...prev,
         schedules: prev.schedules.filter(s => s.id !== editingSchedule.id)
       }));
       setModalOpen(false);
       setShowDeleteConfirm(false);
    }
  };

  const grouped = DAYS.map(day => ({
    day,
    items: data.schedules.filter(s => s.day === day).sort((a, b) => (a.startTime||'').localeCompare(b.startTime||''))
  }));

  return (
    <div className="animate-fade-in">
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Atur Jadwal KBM</h2>
        <p className="text-sm text-gray-500 mt-1">Klik pada mapel untuk mengedit detail.</p>
      </div>

      <div className="px-4 space-y-6 pb-24">
        {grouped.map((group) => (
          <div key={group.day} className="bg-white dark:bg-ios-cardDark rounded-2xl shadow-sm border border-ios-separator/20 overflow-hidden transition-colors duration-300">
            <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-ios-blue rounded-full"></div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{group.day}</h3>
              </div>
              <button 
                onClick={() => openAddModal(group.day)}
                className="text-ios-blue text-xs font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors duration-300"
              >
                <Plus size={14} /> Tambah Mapel
              </button>
            </div>

            <div className="p-1">
              {group.items.length === 0 ? (
                <div className="p-6 text-center text-gray-400 italic text-sm bg-gray-50/50 dark:bg-gray-900/20 m-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                  Belum ada jadwal Mapel di hari {group.day}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {group.items.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => openEditModal(item)}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer flex justify-between items-center group"
                    >
                      <div className="flex-1 pr-4">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                            {item.subject} {item.className} ({item.level}) {formatTime(item.startTime)} - {formatTime(item.endTime)} / {calculateJP(item.startTime, item.endTime)} JP
                        </h4>
                        {item.note && <p className="text-xs text-gray-500 mt-1 italic truncate">{item.note}</p>}
                      </div>
                      <ChevronRight size={16} className="text-gray-300 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Add Modal */}
      {modalOpen && (
         <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
           <div className="bg-white dark:bg-ios-cardDark w-full sm:max-w-md rounded-t-2xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto relative">
              {!showDeleteConfirm ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingSchedule ? 'Edit Mapel' : 'Tambah Mapel'}</h2>
                     <button onClick={() => setModalOpen(false)} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-600 dark:text-gray-300"><X size={20}/></button>
                  </div>
                  
                  <form onSubmit={handleSave} className="space-y-4">
                    {editingSchedule && (
                       <div className="flex justify-end">
                          <button type="button" onClick={handleDeleteClick} className="text-red-500 flex items-center gap-1 text-sm font-bold"><Trash2 size={16}/> Hapus Mapel</button>
                       </div>
                    )}

                    <div>
                       <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Hari</label>
                       <select 
                          value={form.day} onChange={e => setForm({...form, day: e.target.value})}
                          className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue font-medium"
                       >
                          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                       </select>
                    </div>

                    <div>
                       <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block flex gap-2 items-center"><FileText size={12}/> Mata Pelajaran</label>
                       <input 
                         required
                         placeholder="Contoh: Aqidah"
                         value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
                         className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border-2 border-ios-blue/20 focus:border-ios-blue transition-colors font-medium"
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block flex gap-2 items-center">Kelas</label>
                         <input 
                           placeholder="X A"
                           value={form.className} onChange={e => setForm({...form, className: e.target.value})}
                           className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue font-medium"
                         />
                       </div>
                       <div>
                         <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block flex gap-2 items-center">Jenjang</label>
                         <input 
                           placeholder="MA"
                           value={form.level} onChange={e => setForm({...form, level: e.target.value})}
                           className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue font-medium"
                         />
                       </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                       <div className="flex justify-between mb-2">
                          <label className="text-xs font-bold text-ios-blue uppercase flex gap-2 items-center"><Clock size={12}/> Waktu KBM</label>
                          <span className="text-[10px] font-bold bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100 px-2 py-0.5 rounded-md">
                            Total: {calculateJP(form.startTime, form.endTime)} JP
                          </span>
                       </div>
                       <div className="flex items-center gap-3">
                          <input 
                            type="time" required
                            step="60"
                            style={{ colorScheme: data.theme === 'dark' ? 'dark' : 'light' }}
                            onClick={(e) => {
                                if('showPicker' in HTMLInputElement.prototype) {
                                    e.preventDefault();
                                    try { e.currentTarget.showPicker(); } catch(err) {}
                                }
                            }}
                            value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})}
                            className="flex-1 p-2 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-center outline-none appearance-none cursor-pointer border border-gray-200 dark:border-gray-700 focus:border-ios-blue focus:ring-1 focus:ring-ios-blue transition-all font-medium"
                          />
                          <span className="font-bold text-gray-400">-</span>
                          <input 
                            type="time" required
                            step="60"
                            style={{ colorScheme: data.theme === 'dark' ? 'dark' : 'light' }}
                            onClick={(e) => {
                                if('showPicker' in HTMLInputElement.prototype) {
                                    e.preventDefault();
                                    try { e.currentTarget.showPicker(); } catch(err) {}
                                }
                            }}
                            value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})}
                            className="flex-1 p-2 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-center outline-none appearance-none cursor-pointer border border-gray-200 dark:border-gray-700 focus:border-ios-blue focus:ring-1 focus:ring-ios-blue transition-all font-medium"
                          />
                       </div>
                    </div>

                    <div>
                       <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block flex gap-2 items-center">Tugas / Catatan</label>
                       <input 
                         placeholder="Contoh: Kerjakan LKS Halaman 10"
                         value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                         className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue font-medium"
                       />
                    </div>

                    <button type="submit" className="w-full py-4 bg-ios-blue text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">
                       Simpan Jadwal
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4 animate-fade-in">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Trash2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Hapus Mapel?</h3>
                    <p className="text-sm text-gray-500 mb-8">
                      Apakah Anda yakin ingin menghapus jadwal <span className="font-bold text-gray-800 dark:text-white">"{editingSchedule?.subject}"</span>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => setShowDeleteConfirm(false)} className="py-3 rounded-xl font-bold text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 transition-colors">
                         Batal
                       </button>
                       <button onClick={confirmDelete} className="py-3 rounded-xl font-bold text-white bg-red-500 shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors">
                         Ya, Hapus
                       </button>
                    </div>
                </div>
              )}
           </div>
         </div>
      )}
    </div>
  );
};

// 3. TEMPLATE & HISTORY
const TemplateView = ({ data, setData }: { data: AppData, setData: any }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<Template | null>(null);
  const [form, setForm] = useState<Template>({ id: '', name: '', content: '', type: '' });

  const openEdit = (t: Template) => {
    setEditingTpl(t);
    setForm(t);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditingTpl(null);
    setForm({ id: Date.now().toString(), name: '', content: '', type: 'KBM' });
    setModalOpen(true);
  };

  const saveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTpl) {
       setData((prev: AppData) => ({
         ...prev,
         templates: prev.templates.map(t => t.id === editingTpl.id ? form : t)
       }));
    } else {
       setData((prev: AppData) => ({
         ...prev,
         templates: [...prev.templates, { ...form, id: Date.now().toString() }]
       }));
    }
    setModalOpen(false);
  };

  const deleteTemplate = () => {
    if (editingTpl && confirm(`Hapus template "${editingTpl.name}"?`)) {
       setData((prev: AppData) => ({
         ...prev,
         templates: prev.templates.filter(t => t.id !== editingTpl.id)
       }));
       setModalOpen(false);
    }
  };

  const insertVariableToTemplate = (varName: string) => {
    setForm(prev => ({...prev, content: prev.content + varName}));
  };

  return (
    <div className="animate-fade-in p-4 space-y-4 pb-24">
      {data.templates.map(t => (
        <div key={t.id} onClick={() => openEdit(t)} className="bg-white dark:bg-ios-cardDark p-4 rounded-2xl shadow-sm border border-ios-separator/20 cursor-pointer active:scale-[0.99] transition-all duration-200">
           <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-900 dark:text-white">{t.name}</h3>
              <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-bold text-gray-500">{t.type || 'Umum'}</div>
           </div>
           <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg font-mono line-clamp-3 whitespace-pre-wrap transition-colors duration-300">
             {t.content}
           </div>
        </div>
      ))}
      <button 
        onClick={openAdd}
        className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
      >
        <Plus size={20} /> Tambah Template
      </button>

      {/* Template Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-ios-cardDark w-full sm:max-w-lg rounded-t-2xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingTpl ? 'Edit Template' : 'Buat Template'}</h2>
                <button onClick={() => setModalOpen(false)} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-600 dark:text-gray-300"><X size={20}/></button>
             </div>
             <form onSubmit={saveTemplate} className="space-y-4">
                <div>
                   <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Nama Template</label>
                   <input 
                     required
                     value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                     className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue font-medium"
                   />
                </div>
                <div>
                   <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Tipe Izin (untuk auto-select)</label>
                   <select 
                     value={form.type || 'KBM'} onChange={e => setForm({...form, type: e.target.value})}
                     className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue font-medium"
                   >
                      {data.customTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      <option value="">Umum</option>
                   </select>
                </div>
                <div>
                   <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Isi Konten</label>
                   <textarea 
                     required
                     rows={10}
                     value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                     className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue font-mono text-sm leading-relaxed"
                   />
                   <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 transition-colors duration-300">
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mb-2">
                           <AlertCircle size={12} />
                           <p className="text-[10px] font-bold uppercase">Cheat Sheet Variabel</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {VARIABLES.map(v => (
                                <button 
                                    key={v} 
                                    type="button"
                                    onClick={() => insertVariableToTemplate(v)}
                                    className="px-2 py-1 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-300 text-[10px] font-mono rounded border border-blue-100 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                   </div>
                </div>
                <div className="flex gap-3 pt-2">
                   {editingTpl && (
                     <button type="button" onClick={deleteTemplate} className="flex-1 py-3 bg-red-100 text-red-600 font-bold rounded-xl">
                        Hapus
                     </button>
                   )}
                   <button type="submit" className="flex-[2] py-3 bg-ios-blue text-white font-bold rounded-xl shadow-lg shadow-blue-500/30">
                      Simpan
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  )
};

const HistoryView = ({ data, setData }: { data: AppData, setData: any }) => {
  return (
    <div className="animate-fade-in pb-24">
      {data.history.length === 0 ? (
        <div className="h-[60vh] flex flex-col items-center justify-center text-gray-400">
          <History size={64} className="mb-4 opacity-20" />
          <p>Belum ada riwayat izin dibuat.</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {data.history.map(h => (
            <div key={h.id} className="bg-white dark:bg-ios-cardDark p-4 rounded-2xl shadow-sm border border-ios-separator/20 transition-colors duration-300">
              <div className="flex justify-between mb-2">
                <span className="bg-blue-100 dark:bg-blue-900/30 text-ios-blue text-xs font-bold px-2 py-0.5 rounded">{h.type}</span>
                <span className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3 whitespace-pre-wrap">{h.content}</p>
              <button 
                onClick={() => {
                  if(confirm("Hapus riwayat ini?")) {
                    setData((prev: AppData) => ({...prev, history: prev.history.filter(x => x.id !== h.id)}));
                  }
                }}
                className="text-red-500 text-xs font-bold flex items-center gap-1"
              >
                <Trash2 size={12} /> Hapus
              </button>
            </div>
          ))}
          <button 
             onClick={() => { 
               if(confirm("Apakah Anda yakin ingin menghapus SEMUA riwayat?")) {
                 setData((prev: AppData) => ({...prev, history: []}));
               }
             }}
             className="w-full py-3 text-red-500 font-medium text-sm"
          >
            Hapus Semua Riwayat
          </button>
        </div>
      )}
    </div>
  )
};

// --- Settings & Menu Modal ---

const MenuModal = ({ 
  isOpen, 
  onClose, 
  data, 
  setData,
  installPrompt,
  onInstall
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  data: AppData, 
  setData: any,
  installPrompt: any,
  onInstall: () => void
}) => {
  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean, 
      title: string, 
      message: string, 
      onConfirm: () => void
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    setConfirmConfig({
        isOpen: true,
        title: 'Backup Data',
        message: 'Apakah Anda yakin ingin mengunduh file backup data ke perangkat Anda?',
        onConfirm: () => {
            const dataStr = JSON.stringify(data);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', `backup_izin_${new Date().toISOString().slice(0,10)}.json`);
            linkElement.click();
            setConfirmConfig(null);
        }
    });
  };

  const handleImportClick = (e: React.MouseEvent) => {
      e.preventDefault();
      setConfirmConfig({
          isOpen: true,
          title: 'Import Data',
          message: 'Peringatan: Data saat ini akan ditimpa sepenuhnya dengan data dari file backup. Lanjutkan?',
          onConfirm: () => {
              setConfirmConfig(null);
              fileInputRef.current?.click();
          }
      });
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const parsed = JSON.parse(evt.target?.result as string);
            setData(parsed);
            alert("Data berhasil diimpor!");
        } catch(err) { alert("Gagal parsing file."); }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleSave = () => {
      setConfirmConfig({
          isOpen: true,
          title: 'Simpan Data',
          message: 'Simpan kondisi data saat ini secara manual ke Penyimpanan Lokal Browser?',
          onConfirm: () => {
              setConfirmConfig(null);
              alert('Data berhasil disimpan secara aman di local storage.');
          }
      });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
        <div className="relative bg-white dark:bg-ios-cardDark w-72 rounded-2xl shadow-2xl p-2 animate-scale-fade flex flex-col gap-1 mt-12 mr-2 border border-gray-100 dark:border-gray-800 origin-top-right transition-colors duration-300">
            
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-2 transition-colors duration-300">
              {(['mobile', 'tablet', 'desktop'] as ViewMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setData((prev: AppData) => ({...prev, viewMode: m}))}
                  className={`flex-1 p-2 rounded-lg flex justify-center items-center transition-all duration-300 ${data.viewMode === m ? 'bg-white dark:bg-gray-600 shadow text-ios-blue' : 'text-gray-400'}`}
                >
                  {m === 'mobile' && <Smartphone size={16} />}
                  {m === 'tablet' && <Tablet size={16} />}
                  {m === 'desktop' && <Monitor size={16} />}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setData((prev: AppData) => ({...prev, theme: prev.theme === 'dark' ? 'light' : 'dark'}))}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors duration-300"
            >
              {data.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              {data.theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            </button>
            
            <button 
              onClick={handleExport}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors duration-300"
            >
              <Download size={18} /> Backup Data
            </button>

            <button
              onClick={handleImportClick}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer transition-colors duration-300 w-full text-left"
            >
              <Upload size={18} /> Import Data
            </button>
            <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleFileChange} />

            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>

            <button 
              onClick={handleSave}
              className="flex items-center gap-3 px-4 py-3 bg-ios-blue text-white rounded-xl text-sm font-bold justify-center shadow-lg shadow-blue-500/20 hover:opacity-90 transition-opacity"
            >
              <HardDrive size={18} /> Simpan Data
            </button>

            {installPrompt && (
               <button 
                 onClick={onInstall}
                 className="flex items-center gap-3 px-4 py-3 mt-2 bg-green-600 text-white rounded-xl text-sm font-bold justify-center shadow-lg shadow-green-500/20 hover:opacity-90 transition-opacity"
               >
                 <Download size={18} /> Install Aplikasi
               </button>
            )}
        </div>
      </div>

      <ConfirmDialog 
        isOpen={!!confirmConfig}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        onConfirm={confirmConfig?.onConfirm || (() => {})}
        onCancel={() => setConfirmConfig(null)}
      />
    </>
  );
};

const ProfileModal = ({ isOpen, onClose, data, setData }: { isOpen: boolean, onClose: () => void, data: AppData, setData: any }) => {
  const [form, setForm] = useState<UserProfile>(data.profile);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync form with data when modal opens
  useEffect(() => {
    setForm(data.profile);
  }, [data.profile, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setData((prev: AppData) => ({ ...prev, profile: form }));
    onClose();
  };

  const handleDelete = () => {
    const emptyProfile: UserProfile = {
        name: '', idNumber: '', unit: '', employeeStatus: '',
        functionalPosition: '', structuralPosition: '',
        workload: '', startTime: '', endTime: ''
    };
    setData((prev: AppData) => ({ ...prev, profile: emptyProfile }));
    setForm(emptyProfile);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-ios-cardDark w-full max-w-md rounded-3xl p-6 shadow-2xl animate-scale-fade max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Identitas Pengirim</h2>
                    <button onClick={onClose} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-600 dark:text-gray-300"><X size={20}/></button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    {/* Inline inputs to prevent focus loss */}
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Nama Pegawai</label>
                        <input 
                            value={form.name || ''} 
                            onChange={e => setForm({...form, name: e.target.value})}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue transition-colors font-medium"
                            placeholder="Nama Lengkap"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">No. Induk Karyawan</label>
                        <input 
                            value={form.idNumber || ''} 
                            onChange={e => setForm({...form, idNumber: e.target.value})}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue transition-colors font-medium"
                            placeholder="NIP / NIK"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Unit / Bagian</label>
                            <input 
                                value={form.unit || ''} 
                                onChange={e => setForm({...form, unit: e.target.value})}
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue transition-colors font-medium"
                                placeholder="Unit"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Status Karyawan</label>
                            <input 
                                value={form.employeeStatus || ''} 
                                onChange={e => setForm({...form, employeeStatus: e.target.value})}
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue transition-colors font-medium"
                                placeholder="GHY / GTY"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Jabatan Fungsional</label>
                        <input 
                            value={form.functionalPosition || ''} 
                            onChange={e => setForm({...form, functionalPosition: e.target.value})}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue transition-colors font-medium"
                            placeholder="Contoh: Staff TU"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Jabatan Struktural</label>
                        <input 
                            value={form.structuralPosition || ''} 
                            onChange={e => setForm({...form, structuralPosition: e.target.value})}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue transition-colors font-medium"
                            placeholder="Contoh: Guru / Kepala Bagian"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Beban Jam Kerja</label>
                        <input 
                            value={form.workload || ''} 
                            onChange={e => setForm({...form, workload: e.target.value})}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue transition-colors font-medium"
                            placeholder="Contoh: 29 JP"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Jam Masuk</label>
                            <input 
                                value={form.startTime || ''} 
                                onChange={e => setForm({...form, startTime: e.target.value})}
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue transition-colors font-medium"
                                placeholder="07.30 WIB"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Jam Pulang</label>
                            <input 
                                value={form.endTime || ''} 
                                onChange={e => setForm({...form, endTime: e.target.value})}
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white outline-none border border-transparent focus:border-ios-blue transition-colors font-medium"
                                placeholder="16.00 WIB"
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowDeleteConfirm(true)} className="px-4 py-3 rounded-xl bg-red-100 text-red-600 font-bold flex items-center justify-center"><Trash2 size={20}/></button>
                        <button type="submit" className="flex-1 py-3 bg-ios-blue text-white font-bold rounded-xl shadow-lg shadow-blue-500/30">Simpan Identitas</button>
                    </div>
                </form>
            </div>
        </div>
        
        <ConfirmDialog 
            isOpen={showDeleteConfirm}
            title="Hapus Identitas?"
            message="Apakah Anda yakin ingin mengosongkan semua data identitas?"
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
        />
    </>
  );
};

// --- App & Main Layout ---

const App = () => {
  const [data, setData] = useLocalStorage<AppData>('izin_generator_v2', INITIAL_DATA);
  const [activeTab, setActiveTab] = useState('create');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Online/Offline Listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
    });

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (data.theme === 'dark' || (data.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [data.theme]);

  const handleInstall = () => {
      if(deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult: any) => {
              if(choiceResult.outcome === 'accepted') {
                  setDeferredPrompt(null);
              }
          });
      }
  };

  const widthClass = {
    'mobile': 'max-w-[400px]',
    'tablet': 'max-w-[700px]',
    'desktop': 'max-w-[1024px]'
  }[data.viewMode] || 'max-w-[400px]';

  return (
    <div className={`h-[100dvh] w-full flex items-center justify-center bg-gray-200 dark:bg-black p-0 sm:p-4 transition-all duration-500 font-sans antialiased`}>
      <div className={`relative w-full ${widthClass} h-full sm:h-[95vh] bg-ios-bg dark:bg-ios-bgDark sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ring-8 ring-black/5`}>
        
        <NetworkStatus isOnline={isOnline} />
        <Header title="Izin Generator" onMenuClick={() => setMenuOpen(true)} />
        
        <div className="flex-1 overflow-y-auto scroll-smooth relative">
           {activeTab === 'create' && <CreateView data={data} setData={setData} onOpenSettings={() => setProfileOpen(true)} />}
           {activeTab === 'schedule' && <ScheduleView data={data} setData={setData} />}
           {activeTab === 'template' && <TemplateView data={data} setData={setData} />}
           {activeTab === 'history' && <HistoryView data={data} setData={setData} />}
        </div>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Modals */}
        <MenuModal 
            isOpen={menuOpen} 
            onClose={() => setMenuOpen(false)} 
            data={data} 
            setData={setData} 
            installPrompt={deferredPrompt}
            onInstall={handleInstall}
        />
        <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} data={data} setData={setData} />

      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
