import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, 
  Search, 
  Bell, 
  User, 
  Map as MapIcon, 
  CalendarCheck, 
  Library, 
  Settings, 
  DoorOpen, 
  Lock, 
  Clock, 
  Users, 
  Plus, 
  Minus, 
  Crosshair,
  Wifi,
  Plug,
  Monitor,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Trash2,
  Calendar,
  ChevronLeft,
  Projector,
  Wind,
  Image as ImageIcon,
  Filter,
  MoreVertical,
  Check,
  RotateCcw,
  Upload,
  Save,
  ArrowRight,
  Sun,
  Moon,
  Globe,
  ShieldCheck,
  UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Cookies from 'js-cookie';
import { translations, Language } from '../translations';

type RoomStatus = 'Available' | 'Pending' | 'Occupied';
type OperationalStatus = 'Active' | 'Maintenance' | 'Inactive';


const getAvailableAmenities = (t: any) => [
  { id: 'Eduroam', icon: <Wifi size={14} />, label: 'Eduroam' },
  { id: 'Tomadas', icon: <Plug size={14} />, label: 'Tomadas' },
  { id: 'Smart Screen', icon: <Monitor size={14} />, label: t.smartScreen },
  { id: 'Projetor', icon: <Projector size={14} />, label: 'Projetor' },
  { id: 'Ar Condicionado', icon: <Wind size={14} />, label: 'Ar Condicionado' },
  { id: 'Smart TV', icon: <Monitor size={14} />, label: 'Smart TV' },
];

interface Room {
  id: string;
  name: string;
  building: string;
  floor: string;
  section: string;
  department: string;
  status: RoomStatus;
  operationalStatus: OperationalStatus;
  capacity: number;
  amenities: string[];
  image: string;
  top: string;
  left: string;
}

interface Reservation {
  id: string;
  roomId: string;
  roomName: string;
  userId: string;
  date: string;
  startTime: string;
  duration: string;
  subject?: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Occupied';
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'bibliotecário' | 'admin' | 'blocked';
}

const APP_TIMEZONE = import.meta.env.VITE_TIME_ZONE || 'Europe/Lisbon';

const getAppNow = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  return new Date(
    parseInt(getPart('year')),
    parseInt(getPart('month')) - 1,
    parseInt(getPart('day')),
    parseInt(getPart('hour')),
    parseInt(getPart('minute')),
    parseInt(getPart('second'))
  );
};

const getAppDate = (date: Date = getAppNow()) => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getAppNextSlot = () => {
  const appNow = getAppNow();
  const minute = appNow.getMinutes();
  
  const minutesToNextSlot = 15 - (minute % 15);
  const nextSlotDate = new Date(appNow.getTime() + minutesToNextSlot * 60000);
  
  const y = nextSlotDate.getFullYear();
  const m = (nextSlotDate.getMonth() + 1).toString().padStart(2, '0');
  const d = nextSlotDate.getDate().toString().padStart(2, '0');
  const hh = nextSlotDate.getHours().toString().padStart(2, '0');
  const mm = nextSlotDate.getMinutes().toString().padStart(2, '0');
  
  return {
    date: `${y}-${m}-${d}`,
    time: `${hh}:${mm}`
  };
};

const OPERATING_HOURS = (() => {
  try {
    const raw = import.meta.env.VITE_OPERATING_HOURS || '{}';
    // Remove single quotes if they wrap the JSON string (common in .env)
    const cleaned = raw.startsWith("'") && raw.endsWith("'") ? raw.slice(1, -1) : raw;
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse VITE_OPERATING_HOURS:", e);
    return {};
  }
})();

const MAX_BOOKING_DURATION_MINS = parseInt(import.meta.env.VITE_MAX_BOOKING_DURATION_MINS || '240');
const BUFFER_DURATION_MINS = 15;

const isTimeAllowed = (buildingId: string, dateStr: string, timeStr: string) => {
  const hoursConfig = OPERATING_HOURS[buildingId];
  if (!hoursConfig) return true;

  const date = new Date(dateStr + 'T00:00:00');
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayName = dayNames[date.getDay()];
  
  const dayHours = hoursConfig[dayName];
  if (!dayHours) return false;

  const [start, end] = dayHours.split('-');
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const [currentH, currentM] = timeStr.split(':').map(Number);

  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  const currentTotal = currentH * 60 + currentM;

  return currentTotal >= startTotal && currentTotal <= endTotal;
};

const DURATION_OPTIONS = [
  { label: '15 Minutos', value: '15 Minutos', mins: 15 },
  { label: '30 Minutos', value: '30 Minutos', mins: 30 },
  { label: '45 Minutos', value: '45 Minutos', mins: 45 },
  { label: '1 Hora', value: '1 Hora', mins: 60 },
  { label: '1 Hora e 15', value: '1 Hora e 15', mins: 75 },
  { label: '1 Hora e 30', value: '1 Hora e 30', mins: 90 },
  { label: '1 Hora e 45', value: '1 Hora e 45', mins: 105 },
  { label: '2 Horas', value: '2 Horas', mins: 120 },
  { label: '2 Horas e 15', value: '2 Horas e 15', mins: 135 },
  { label: '2 Horas e 30', value: '2 Horas e 30', mins: 150 },
  { label: '2 Horas e 45', value: '2 Horas e 45', mins: 165 },
  { label: '3 Horas', value: '3 Horas', mins: 180 },
  { label: '4 Horas', value: '4 Horas', mins: 240 },
];

const ThemeToggle = ({ theme, toggleTheme }: { theme: 'light' | 'dark', toggleTheme: () => void }) => (
  <button
    onClick={toggleTheme}
    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
    title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
  >
    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
  </button>
);

const LanguageToggle = ({ lang, setLang }: { lang: Language, setLang: (l: Language) => void }) => (
  <button
    onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-bold text-slate-600 dark:text-slate-400"
  >
    <Globe size={14} />
    {lang.toUpperCase()}
  </button>
);
import { supabase } from './supabase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function handleSupabaseError(error: any, operationType: OperationType, path: string | null) {
  const errInfo: SupabaseErrorInfo = {
    error: error?.message || String(error),
    operationType,
    path
  }
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const Login = ({ 
  onLoginSuccess, 
  lang, 
  setLang, 
  theme, 
  toggleTheme 
}: { 
  onLoginSuccess: (user: UserData) => void,
  lang: Language,
  setLang: (l: Language) => void,
  theme: 'light' | 'dark',
  toggleTheme: () => void
}) => {
  const t = translations[lang];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'register'>('email');
  const [name, setName] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '']);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith('@ua.pt') && email !== 'filben@gmail.com') {
      setError(t.restrictedDomain);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang })
      });
      const data = await response.json();
      if (data.success) {
        setStep('otp');
        setOtpValues(['', '', '', '', '']);
      } else {
        setError(data.message || t.errorOccurred);
      }
    } catch (err: any) {
      setError(t.connectionError);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith('@ua.pt') && email !== 'filben@gmail.com') {
      setError(t.restrictedDomain);
      return;
    }
    if (!name.trim()) {
      setError(t.namePlaceholder);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        setError(t.emailAlreadyRegistered);
        setLoading(false);
        return;
      }

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          name,
          email,
          role: email === 'filben@gmail.com' ? 'admin' : 'user'
        })
        .select()
        .single();

      if (insertError) {
        handleSupabaseError(insertError, OperationType.WRITE, `users/${email}`);
        return;
      }

      // After registration, send OTP to login
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang })
      });
      const data = await response.json();
      if (data.success) {
        setStep('otp');
        setOtpValues(['', '', '', '', '']);
      } else {
        setError(data.message || t.errorOccurred);
      }
    } catch (err: any) {
      setError(t.connectionError);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newValues = [...otpValues];
    newValues[index] = value;
    setOtpValues(newValues);
    setOtp(newValues.join(''));

    if (value && index < 4) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, 5).replace(/\D/g, '');
    if (!pastedData) return;

    const newValues = [...otpValues];
    pastedData.split('').forEach((char, i) => {
      if (i < 5) newValues[i] = char;
    });
    setOtpValues(newValues);
    setOtp(newValues.join(''));

    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, 4);
    otpInputs.current[nextIndex]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpValues.join('');
    if (fullOtp.length < 5) {
      setError(t.enterOtp);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: fullOtp, lang })
      });
      const data = await response.json();
      if (data.success) {
        const { data: userSnap, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (fetchError) {
          handleSupabaseError(fetchError, OperationType.GET, `users/${email}`);
          return;
        }
        
        onLoginSuccess(userSnap as UserData);
      } else {
        setError(data.message || t.incorrectOtp);
      }
    } catch (err: any) {
      setError(t.connectionError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans transition-colors">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 flex flex-col items-center relative"
      >
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <LanguageToggle lang={lang} setLang={setLang} />
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>

        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center overflow-hidden mb-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <img 
            src="https://salina.web.ua.pt/ua.png" 
            alt="UA Logo" 
            className="w-10 h-10 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 text-center">
          <span className="hidden md:inline">{t.loginTitle}</span>
          <span className="md:hidden">{t.loginTitleMobile}</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 text-center">
          {step === 'email' ? t.loginSubtitle : step === 'register' ? t.registerSubtitle : t.enterOtp}
        </p>

        <form onSubmit={step === 'email' ? handleSendOtp : step === 'register' ? handleRegister : handleVerifyOtp} className="w-full space-y-4">
          {step === 'email' ? (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                {t.emailLabel}
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@ua.pt"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                  required
                />
              </div>
            </div>
          ) : step === 'register' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                  {t.nameLabel}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                  {t.emailLabel}
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@ua.pt"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                    required
                  />
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setStep('email')}
                className="text-xs text-blue-600 hover:underline ml-1"
              >
                {t.backToLogin}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 block text-center">
                {t.verifyOtp}
              </label>
              <div className="flex justify-between gap-2">
                {otpValues.map((val, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpInputs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    value={val}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className="w-12 h-16 text-center text-2xl font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                    maxLength={1}
                    required
                  />
                ))}
              </div>
              <div className="flex justify-between items-center px-1">
                <button 
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {t.backToLogin}
                </button>
                <button 
                  type="button"
                  onClick={handleSendOtp}
                  className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                >
                  {t.resendCode}
                </button>
              </div>
            </div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm"
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#0066cc] hover:bg-[#0052a3] text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {step === 'email' ? t.receiveOtp : step === 'register' ? t.register : t.verifyOtp}
                <ChevronRight size={20} />
              </>
            )}
          </button>
          
          {step === 'email' && (
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setStep('register')}
                className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
              >
                {t.noAccount} <span className="text-blue-600 font-semibold">{t.register}</span>
              </button>
            </div>
          )}
        </form>
        
        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center w-full mt-8 flex flex-col gap-4">
          <p className="text-xs font-bold text-slate-300 dark:text-slate-600 tracking-widest uppercase">{t.restrictedDomain}</p>
          <a href="#" className="text-xs text-slate-400 hover:text-blue-600 transition-colors">{t.helpAccess}</a>
        </div>
      </motion.div>
    </div>
  );
};

const ManageUsersView = ({ lang, onBack }: { lang: string, onBack: () => void }) => {
  const t = translations[lang as keyof typeof translations];
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<UserData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail) return;

    setIsSearching(true);
    setError(null);
    setSuccess(null);
    setFoundUser(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', searchEmail)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error(t.errorOccurred);
        }
        handleSupabaseError(fetchError, OperationType.GET, 'users');
      }

      setFoundUser(data as UserData);
    } catch (err: any) {
      if (err.message === t.errorOccurred) {
        setError(err.message);
      } else {
        setError(t.errorOccurred);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdateRole = async (newRole: string) => {
    if (!foundUser) return;

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', foundUser.id);

      if (updateError) {
        handleSupabaseError(updateError, OperationType.UPDATE, `users/${foundUser.id}`);
      }

      setFoundUser({ ...foundUser, role: newRole as any });
      setSuccess(t.userUpdatedSuccess || 'Role updated successfully');
    } catch (err: any) {
      setError(t.errorOccurred);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t.manageUsers}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t.manageUsersSubtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Search Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder={t.searchUserPlaceholder}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="bg-primary text-white px-8 rounded-2xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSearching ? <Loader2 size={20} className="animate-spin" /> : t.search}
              </button>
            </form>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-medium flex items-center gap-2"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm font-medium flex items-center gap-2"
              >
                <CheckCircle2 size={18} />
                {success}
              </motion.div>
            )}
          </div>

          {/* User Details & Role Update */}
          {foundUser && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-6 mb-8">
                <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary">
                  <User size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{foundUser.name}</h2>
                  <p className="text-slate-500 dark:text-slate-400">{foundUser.email}</p>
                  <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {foundUser.role === 'admin' ? 'Administrator' : foundUser.role === 'bibliotecário' ? t.roleLibrarian : foundUser.role === 'blocked' ? t.roleBlocked : t.roleUser}
                  </div>
                </div>
              </div>

              {foundUser.role !== 'admin' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t.updateRole}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      onClick={() => handleUpdateRole('user')}
                      disabled={isUpdating || foundUser.role === 'user'}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        foundUser.role === 'user'
                          ? 'bg-primary/5 border-primary text-primary'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                    >
                      <User size={24} />
                      <span className="font-bold text-sm">{t.roleUser}</span>
                    </button>

                    <button
                      onClick={() => handleUpdateRole('bibliotecário')}
                      disabled={isUpdating || foundUser.role === 'bibliotecário'}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        foundUser.role === 'bibliotecário'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                    >
                      <ShieldCheck size={24} />
                      <span className="font-bold text-sm">{t.roleLibrarian}</span>
                    </button>

                    <button
                      onClick={() => handleUpdateRole('blocked')}
                      disabled={isUpdating || foundUser.role === 'blocked'}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        foundUser.role === 'blocked'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                    >
                      <UserX size={24} />
                      <span className="font-bold text-sm">{t.roleBlocked}</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

const BackofficeView = ({ 
  reservations, 
  users,
  onUpdateStatus,
  onManageRooms,
  onManageUsers,
  lang
}: { 
  reservations: Reservation[], 
  users: UserData[],
  onUpdateStatus: (id: string, status: string) => void,
  onManageRooms: () => void,
  onManageUsers: () => void,
  lang: string
}) => {
  const t = translations[lang as keyof typeof translations];
  const AVAILABLE_AMENITIES = getAvailableAmenities(t);
  const now = getAppNow();
  
  const futureReservations = reservations.filter(res => {
    const resDateTime = new Date(`${res.date}T${res.startTime}`);
    return resDateTime >= now || res.date === getAppDate(now);
  }).sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());

  return (
    <div className="flex-1 overflow-auto p-6 md:p-10 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t.backofficeTitle}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t.backofficeSubtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onManageRooms}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
            >
              <Settings size={18} className="text-primary" />
              {t.manageRooms}
            </button>
            <button 
              onClick={onManageUsers}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
            >
              <Users size={18} className="text-primary" />
              {t.manageUsers}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.room}</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.user}</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.dateTime}</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.subject}</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.status}</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {futureReservations.map((res) => {
                const user = users.find(u => u.id === res.userId);
                return (
                  <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{res.roomName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">ID: {res.roomId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{user?.name || (lang === 'pt' ? 'Utilizador Desconhecido' : 'Unknown User')}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{user?.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      <div>{res.date}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{res.startTime} ({res.duration})</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {res.subject || (lang === 'pt' ? 'Sem assunto' : 'No subject')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        res.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                        res.status === 'Confirmed' || res.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {res.status === 'Pending' ? t.statusPending : 
                         res.status === 'Confirmed' ? t.statusConfirmed :
                         res.status === 'Occupied' ? t.statusOccupied :
                         res.status === 'Cancelled' ? t.statusCancelled : res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {res.status === 'Pending' && (
                        <>
                          <button 
                            onClick={() => onUpdateStatus(res.id, 'Confirmed')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                            title={t.approve}
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={() => onUpdateStatus(res.id, 'Cancelled')}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            title={t.reject}
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      {res.status === 'Confirmed' && (() => {
                        const resStart = new Date(`${res.date}T${res.startTime}`);
                        const windowStart = new Date(resStart.getTime() - 10 * 60 * 1000);
                        const windowEnd = new Date(resStart.getTime() + 10 * 60 * 1000);
                        const canCheckIn = now >= windowStart && now <= windowEnd;
                        
                        return canCheckIn ? (
                          <button 
                            onClick={() => onUpdateStatus(res.id, 'Occupied')}
                            className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                            title={t.checkIn}
                          >
                            {t.checkIn}
                          </button>
                        ) : null;
                      })()}
                    </td>
                  </tr>
                );
              })}
              {futureReservations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    {t.noFutureReservations}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ManageRoomsView = ({ 
  rooms, 
  onUpdateRoom,
  onCreateRoom,
  onBack,
  lang
}: { 
  rooms: Room[], 
  onUpdateRoom: (id: string, data: Partial<Room>) => Promise<void>,
  onCreateRoom: (data: Partial<Room>) => Promise<any>,
  onBack: () => void,
  lang: string
}) => {
  const t = translations[lang as keyof typeof translations];
  const AVAILABLE_AMENITIES = getAvailableAmenities(t);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(rooms[0]?.id || null);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Maintenance'>('All');
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  
  // Local state for editing
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editTop, setEditTop] = useState('');
  const [editLeft, setEditLeft] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editCapacity, setEditCapacity] = useState(0);
  const [editStatus, setEditStatus] = useState<OperationalStatus>('Active');
  const [editAmenities, setEditAmenities] = useState<string[]>([]);
  const [editImage, setEditImage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedRoom && !isAddingNew) {
      setEditId(selectedRoom.id);
      setEditName(selectedRoom.name || '');
      setEditBuilding(selectedRoom.building || '');
      setEditFloor(selectedRoom.floor || '');
      setEditSection(selectedRoom.section || '');
      setEditTop(selectedRoom.top || '');
      setEditLeft(selectedRoom.left || '');
      setEditDept(selectedRoom.department || '');
      setEditCapacity(selectedRoom.capacity || 0);
      setEditStatus(selectedRoom.operationalStatus || 'Active');
      setEditAmenities(selectedRoom.amenities || []);
      setEditImage(selectedRoom.image || '');
    }
  }, [selectedRoom, isAddingNew]);

  const handleAddNew = () => {
    setIsAddingNew(true);
    setSelectedRoomId(null);
    setEditId('');
    setEditName('');
    setEditBuilding('17');
    setEditFloor('1');
    setEditSection('Frente');
    setEditTop('50%');
    setEditLeft('50%');
    setEditDept('Biblioteca');
    setEditCapacity(1);
    setEditStatus('Active');
    setEditAmenities([]);
    setEditImage('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    const roomData = {
      id: editId,
      name: editName,
      building: editBuilding,
      floor: editFloor,
      section: editSection,
      top: editTop,
      left: editLeft,
      department: editDept,
      capacity: editCapacity,
      operationalStatus: editStatus,
      amenities: editAmenities,
      image: editImage
    };

    if (isAddingNew) {
      const result = await onCreateRoom(roomData);
      if (result) {
        setIsAddingNew(false);
        setSelectedRoomId(result.id);
      }
    } else if (selectedRoomId) {
      await onUpdateRoom(selectedRoomId, roomData);
    }
    setIsSaving(false);
  };

  const filteredRooms = rooms.filter(r => {
    if (filter === 'All') return true;
    if (filter === 'Active') return r.operationalStatus === 'Active';
    if (filter === 'Maintenance') return r.operationalStatus === 'Maintenance';
    return true;
  });

  const toggleAmenity = (id: string) => {
    setEditAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 md:p-8 shrink-0 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t.manageRooms}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{t.manageRoomsSubtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleAddNew}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-sm"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">{t.addNewRoom}</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl transition-colors">
              <button 
                onClick={() => { setFilter('All'); setIsAddingNew(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'All' && !isAddingNew ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {t.all}
              </button>
              <button 
                onClick={() => { setFilter('Active'); setIsAddingNew(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'Active' && !isAddingNew ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {t.active}
              </button>
              <button 
                onClick={() => { setFilter('Maintenance'); setIsAddingNew(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'Maintenance' && !isAddingNew ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {t.maintenance}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">
        {/* Room List */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.roomName}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.building}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.floor}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.section}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.status}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.capacity}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRooms.map((room) => (
                  <tr 
                    key={room.id} 
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      setIsAddingNew(false);
                    }}
                    className={`cursor-pointer transition-colors ${selectedRoomId === room.id && !isAddingNew ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                          room.operationalStatus === 'Active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          room.operationalStatus === 'Maintenance' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        }`}>
                          <Building2 size={20} />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{room.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400">{room.building}</td>
                    <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400">{room.floor}</td>
                    <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400">{room.section}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        room.operationalStatus === 'Active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        room.operationalStatus === 'Maintenance' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${
                          room.operationalStatus === 'Active' ? 'bg-emerald-500' :
                          room.operationalStatus === 'Maintenance' ? 'bg-amber-500' :
                          'bg-slate-400'
                        }`} />
                        {room.operationalStatus === 'Active' ? t.active : 
                         room.operationalStatus === 'Maintenance' ? t.maintenance : t.inactive}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-700 dark:text-slate-300">{room.capacity} {t.pax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Panel */}
        <div className="w-full md:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto p-8 transition-colors">
          {selectedRoom || isAddingNew ? (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isAddingNew ? t.addNewRoom : t.editDetails}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isAddingNew ? t.manageRoomsSubtitle : `${t.editing} "${selectedRoom?.name}"`}
                </p>
              </div>

              {/* Image Section */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.roomImage}</label>
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 group transition-colors">
                  {editImage ? (
                    <>
                      <img src={editImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={() => setEditImage('')}
                          className="p-2 bg-white rounded-full text-rose-500 hover:scale-110 transition-transform"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                      <Upload size={32} className="mb-2" />
                      <span className="text-xs font-medium">{t.uploadPhoto}</span>
                    </div>
                  )}
                  <input 
                    type="text" 
                    placeholder={t.imageUrlPlaceholder}
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-none rounded-lg text-[10px] px-2 py-1 focus:ring-0 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-5">
                {isAddingNew && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">ID (ex: 17.2.14)</label>
                    <input 
                      type="text" 
                      value={editId}
                      onChange={(e) => setEditId(e.target.value)}
                      placeholder="17.2.14"
                      className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.roomName}</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary text-slate-900 dark:text-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.building}</label>
                    <select 
                      value={editBuilding}
                      onChange={(e) => setEditBuilding(e.target.value)}
                      className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:border-primary focus:ring-primary text-slate-900 dark:text-white transition-colors"
                    >
                      <option value="17">17</option>
                      <option value="18">18</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.floor}</label>
                    <input 
                      type="text" 
                      value={editFloor}
                      onChange={(e) => setEditFloor(e.target.value)}
                      className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:border-primary focus:ring-primary text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.section}</label>
                    <select 
                      value={editSection}
                      onChange={(e) => setEditSection(e.target.value)}
                      className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:border-primary focus:ring-primary text-slate-900 dark:text-white transition-colors"
                    >
                      <option value="Frente">{t.front}</option>
                      <option value="Trás">{t.back}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Posição Left (%)</label>
                    <input 
                      type="text" 
                      value={editLeft}
                      onChange={(e) => setEditLeft(e.target.value)}
                      placeholder="Ex: 30%"
                      className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:border-primary focus:ring-primary text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Posição Top (%)</label>
                    <input 
                      type="text" 
                      value={editTop}
                      onChange={(e) => setEditTop(e.target.value)}
                      placeholder="Ex: 20%"
                      className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:border-primary focus:ring-primary text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.department}</label>
                  <select 
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary text-slate-900 dark:text-white transition-colors"
                  >
                    <option value="Biblioteca da UA">Biblioteca da UA</option>
                    <option value="Mediateca">Mediateca</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.capacity} ({t.pax})</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                      <Users size={18} />
                    </div>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={editCapacity}
                      onChange={(e) => setEditCapacity(parseInt(e.target.value) || 0)}
                      className="w-full pl-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:border-primary focus:ring-primary text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.amenities}</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_AMENITIES.map((amenity) => (
                    <button
                      key={amenity.id}
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        editAmenities.includes(amenity.id)
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {amenity.icon}
                      {amenity.label}
                      {editAmenities.includes(amenity.id) && <Check size={12} />}
                    </button>
                  ))}
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                    <Plus size={12} />
                    {t.add}
                  </button>
                </div>
              </div>

              {/* Status Control */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.statusControl}</label>
                <div className="space-y-2">
                  <button 
                    onClick={() => setEditStatus('Active')}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      editStatus === 'Active' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-900 dark:text-emerald-400' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={20} className={editStatus === 'Active' ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-700'} />
                      <span className="text-sm font-bold">{t.activateRoom}</span>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      editStatus === 'Active' ? 'border-emerald-600' : 'border-slate-200 dark:border-slate-800'
                    }`}>
                      {editStatus === 'Active' && <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                    </div>
                  </button>

                  <button 
                    onClick={() => setEditStatus('Maintenance')}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      editStatus === 'Maintenance' 
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-900 dark:text-amber-400' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings size={20} className={editStatus === 'Maintenance' ? 'text-amber-600' : 'text-slate-300 dark:text-slate-700'} />
                      <span className="text-sm font-bold">{t.maintenanceMode}</span>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      editStatus === 'Maintenance' ? 'border-amber-600' : 'border-slate-200 dark:border-slate-800'
                    }`}>
                      {editStatus === 'Maintenance' && <div className="h-2.5 w-2.5 rounded-full bg-amber-600" />}
                    </div>
                  </button>

                  <button 
                    onClick={() => setEditStatus('Inactive')}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      editStatus === 'Inactive' 
                        ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-500 dark:border-slate-400 text-slate-900 dark:text-white' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <X size={20} className={editStatus === 'Inactive' ? 'text-slate-600' : 'text-slate-300 dark:text-slate-700'} />
                      <span className="text-sm font-bold">{t.deactivateRoom}</span>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      editStatus === 'Inactive' ? 'border-slate-600' : 'border-slate-200 dark:border-slate-800'
                    }`}>
                      {editStatus === 'Inactive' && <div className="h-2.5 w-2.5 rounded-full bg-slate-600" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={handleSave}
                  disabled={isSaving || (isAddingNew && !editId)}
                  className="flex-1 bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    isAddingNew ? <Plus size={18} /> : <Save size={18} />
                  )}
                  {isAddingNew ? t.add : t.save}
                </button>
                <button 
                  onClick={() => {
                    setSelectedRoomId(null);
                    setIsAddingNew(false);
                  }}
                  className="px-6 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300 dark:text-slate-700">
                <Building2 size={40} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {lang === 'pt' ? 'Nenhuma sala selecionada' : 'No room selected'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto">
                  {lang === 'pt' 
                    ? 'Selecione uma sala na lista para editar ou clique em "Adicionar Nova Sala".' 
                    : 'Select a room from the list to edit or click "Add New Room".'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SchedulesView = ({ 
  rooms, 
  reservations,
  selectedRoomId, 
  setSelectedRoomId, 
  setBookingDate, 
  setBookingStartTime,
  setBookingDuration,
  onNewBooking,
  lang
}: { 
  rooms: Room[], 
  reservations: Reservation[],
  selectedRoomId: string, 
  setSelectedRoomId: (id: string) => void,
  setBookingDate: (date: string) => void,
  setBookingStartTime: (time: string) => void,
  setBookingDuration: (duration: string) => void,
  onNewBooking: () => void,
  lang: string
}) => {
  const t = translations[lang as keyof typeof translations];
  const [currentDate, setCurrentDate] = useState(getAppNow());
  const [roomSearch, setRoomSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [dragStart, setDragStart] = useState<{ day: number, hour: number, minute: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number, hour: number, minute: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Clear selection when room or date changes
  useEffect(() => {
    setDragStart(null);
    setDragEnd(null);
    setIsDragging(false);
  }, [selectedRoomId, currentDate]);

  const days = lang === 'pt' ? ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const hours = Array.from({ length: 11 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(roomSearch.toLowerCase()) || 
    r.department.toLowerCase().includes(roomSearch.toLowerCase())
  );

  const isSlotOccupied = (dayIndex: number, hourStr: string, minute: number) => {
    const hour = parseInt(hourStr.split(':')[0]);
    const currentTotal = hour * 60 + minute;
    
    return scheduleData.some(item => {
      if (item.day !== dayIndex) return false;
      const startTotal = item.startTotal;
      const endTotal = startTotal + item.duration;
      return currentTotal >= startTotal && currentTotal < endTotal;
    });
  };

  const isSlotInPast = (dayIndex: number, hourStr: string, minute: number) => {
    const now = getAppNow();
    const slotDate = new Date(currentDate);
    // Logic to get the date of the specific dayIndex (0=Mon, 6=Sun)
    slotDate.setDate(slotDate.getDate() - (slotDate.getDay() === 0 ? 6 : slotDate.getDay() - 1) + dayIndex);
    const hour = parseInt(hourStr.split(':')[0]);
    slotDate.setHours(hour, minute, 0, 0);
    return slotDate < now;
  };

  const handleMouseDown = (dayIndex: number, hourStr: string, minute: number) => {
    if (isSlotOccupied(dayIndex, hourStr, minute) || isSlotInPast(dayIndex, hourStr, minute)) return;
    
    const hour = parseInt(hourStr.split(':')[0]);
    setDragStart({ day: dayIndex, hour, minute });
    setDragEnd({ day: dayIndex, hour, minute });
    setIsDragging(true);
  };

  const handleMouseEnter = (dayIndex: number, hourStr: string, minute: number) => {
    if (isDragging && dragStart && dayIndex === dragStart.day) {
      if (isSlotOccupied(dayIndex, hourStr, minute) || isSlotInPast(dayIndex, hourStr, minute)) {
        // Stop dragging if we hit an occupied or past slot
        handleMouseUp();
        return;
      }
      const hour = parseInt(hourStr.split(':')[0]);
      setDragEnd({ day: dayIndex, hour, minute });
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd) {
      const startTotal = dragStart.hour * 60 + dragStart.minute;
      const endTotal = dragEnd.hour * 60 + dragEnd.minute;
      
      const realStart = Math.min(startTotal, endTotal);
      const realEnd = Math.max(startTotal, endTotal) + 15;
      
      const durationMins = realEnd - realStart;
      
      const startH = Math.floor(realStart / 60);
      const startM = realStart % 60;
      const startTimeStr = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
      
      let durationStr = "";
      const h = Math.floor(durationMins / 60);
      const m = durationMins % 60;
      
      if (h > 0) {
        durationStr += `${h} ${h > 1 ? t.hoursLabel : t.hourLabel}`;
        if (m > 0) durationStr += ` ${t.andLabel} ${m}`;
      } else {
        durationStr = `${m} ${t.minutesLabel}`;
      }
      
      const d = new Date(currentDate);
      d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1) + dragStart.day);
      setBookingDate(d.toISOString().split('T')[0]);
      setBookingStartTime(startTimeStr);
      
      // Find matching duration in options to ensure the select dropdown updates correctly
      const matchedOption = DURATION_OPTIONS.find(opt => opt.mins === durationMins);
      if (matchedOption) {
        setBookingDuration(matchedOption.value);
      } else {
        setBookingDuration(durationStr);
      }
    }
    setIsDragging(false); // Stop dragging mode
  };

  const isSlotSelected = (dayIndex: number, hourStr: string, minute: number) => {
    if (!dragStart || !dragEnd || dayIndex !== dragStart.day) return false;
    
    const hour = parseInt(hourStr.split(':')[0]);
    const currentTotal = hour * 60 + minute;
    const startTotal = dragStart.hour * 60 + dragStart.minute;
    const endTotal = dragEnd.hour * 60 + dragEnd.minute;
    
    const min = Math.min(startTotal, endTotal);
    const max = Math.max(startTotal, endTotal);
    
    return currentTotal >= min && currentTotal <= max;
  };

  const getSelectionInterval = () => {
    if (!dragStart || !dragEnd) return null;
    const startTotal = dragStart.hour * 60 + dragStart.minute;
    const endTotal = dragEnd.hour * 60 + dragEnd.minute;
    
    const min = Math.min(startTotal, endTotal);
    const max = Math.max(startTotal, endTotal) + 15;
    
    const format = (total: number) => {
      const h = Math.floor(total / 60);
      const m = total % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    
    return `${format(min)} > ${format(max)}`;
  };

  // Map real reservations to schedule data (including buffers)
  const scheduleData = useMemo(() => {
    const data: any[] = [];
    reservations
      .filter(res => res.roomId === selectedRoomId && res.status !== 'Cancelled')
      .forEach(res => {
        const resDate = new Date(res.date);
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));
        weekStart.setHours(0, 0, 0, 0);
        
        const diffTime = resDate.getTime() - weekStart.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const startH = parseInt(res.startTime.split(':')[0]);
        const startM = parseInt(res.startTime.split(':')[1] || '0');
        const startTotal = startH * 60 + startM;
        
        let durationMins = 60;
        if (res.duration.includes('Hora')) {
          const h = parseInt(res.duration.split(' ')[0]);
          durationMins = h * 60;
          if (res.duration.includes('e')) {
            durationMins += parseInt(res.duration.split('e ')[1]);
          }
        } else {
          durationMins = parseInt(res.duration.split(' ')[0]);
        }

        // Add the reservation itself
        data.push({
          day: diffDays,
          start: res.startTime,
          startTotal,
          duration: durationMins,
          status: res.status === 'Pending' ? 'Pending' : 'Occupied',
          title: res.subject || t.reservation,
          type: 'reservation'
        });

        // Add the 15-minute buffer
        data.push({
          day: diffDays,
          startTotal: startTotal + durationMins,
          duration: BUFFER_DURATION_MINS,
          status: 'Buffer',
          title: lang === 'pt' ? 'Verificação/Preparação' : 'Verification/Preparation',
          type: 'buffer'
        });
      });
    return data.filter(item => item.day >= 0 && item.day < 7);
  }, [reservations, selectedRoomId, currentDate, t, lang]);

  const getWeekRange = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-US')} - ${end.toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-US')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col overflow-hidden p-6 md:p-10 bg-slate-50 dark:bg-slate-950 transition-colors"
    >
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.navSchedules}</h2>
            <p className="text-slate-500 dark:text-slate-400">{t.schedulesSubtitle}</p>
          </div>
          
          <button 
            onClick={onNewBooking}
            className="flex items-center gap-2 px-6 py-3 bg-[#0066cc] text-white rounded-xl font-bold shadow-lg shadow-[#0066cc]/20 hover:bg-[#0052a3] transition-all"
          >
            <Plus size={20} />
            {t.newReservation}
          </button>
        </div>

        {/* Filters & Legend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col gap-2 relative">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.searchSelectRoom}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={14} className="text-slate-400" />
                  </div>
                  <input 
                    type="text"
                    placeholder="Nome da sala..."
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none w-64"
                  />
                </div>
                
                {isSearchFocused && (
                  <>
                    <div className="fixed inset-0 z-10 cursor-pointer" onClick={() => setIsSearchFocused(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-20 max-h-60 overflow-y-auto">
                      {filteredRooms.map(room => (
                        <button
                          key={room.id}
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            setRoomSearch(room.name);
                            setIsSearchFocused(false);
                          }}
                          className={`w-full flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0 ${selectedRoomId === room.id ? 'bg-primary/5' : ''}`}
                        >
                          <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center ${
                            room.status === 'Available' ? 'bg-emerald-100 text-emerald-600' :
                            room.status === 'Pending' ? 'bg-amber-100 text-amber-600' :
                            'bg-rose-100 text-rose-600'
                          }`}>
                            <DoorOpen size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-slate-900 truncate">{room.name}</p>
                              <span className="text-[9px] font-bold text-slate-400 shrink-0">{room.capacity} pax</span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{room.department}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.viewWeek}</label>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const d = new Date(currentDate);
                      d.setDate(d.getDate() - 7);
                      setCurrentDate(d);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft size={20} className="text-slate-600" />
                  </button>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium min-w-[200px] justify-center">
                    <Calendar size={16} className="text-slate-400" />
                    {getWeekRange()}
                  </div>
                  <button 
                    onClick={() => {
                      const d = new Date(currentDate);
                      d.setDate(d.getDate() + 7);
                      setCurrentDate(d);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronRight size={20} className="text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-600">{t.statusAvailable}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-slate-600">{t.statusPending}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <span className="text-xs font-medium text-slate-600">{t.statusOccupied}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-slate-400" />
                <span className="text-xs font-medium text-slate-600">{lang === 'pt' ? 'Preparação' : 'Preparation'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Grid Header */}
          <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50/50">
            <div className="p-4 border-r border-slate-100" />
            {days.map((day, i) => (
              <div key={day} className={`p-4 text-center border-r border-slate-100 last:border-r-0 ${i === 1 ? 'bg-primary/5' : ''}`}>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{day}</span>
                <span className={`text-lg font-bold ${i === 1 ? 'text-primary' : 'text-slate-900'}`}>
                  {(() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1) + i);
                    return d.getDate();
                  })()}
                </span>
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-8 min-h-full">
              {/* Time Column */}
              <div className="flex flex-col">
                {hours.map(hour => (
                  <div key={hour} className="h-20 p-4 text-right border-r border-b border-slate-100 text-[10px] font-bold text-slate-400">
                    {hour}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {days.map((_, dayIndex) => (
                <div 
                  key={dayIndex} 
                  className="relative flex flex-col border-r border-slate-100 last:border-r-0 select-none"
                  onMouseLeave={() => isDragging && handleMouseUp()}
                >
                  {hours.map(hour => (
                    <div key={hour} className="h-20 border-b border-slate-100 flex flex-col">
                      {[0, 15, 30, 45].map(minute => (
                        <button
                          key={minute}
                          onMouseDown={() => handleMouseDown(dayIndex, hour, minute)}
                          onMouseEnter={() => handleMouseEnter(dayIndex, hour, minute)}
                          onMouseUp={handleMouseUp}
                          disabled={isSlotOccupied(dayIndex, hour, minute) || isSlotInPast(dayIndex, hour, minute)}
                          className={`flex-1 transition-colors border-b border-slate-50 last:border-0 group relative ${
                            isSlotSelected(dayIndex, hour, minute) ? 'bg-primary/20' : 
                            isSlotOccupied(dayIndex, hour, minute) ? 'cursor-not-allowed' : 
                            isSlotInPast(dayIndex, hour, minute) ? 'bg-slate-50 cursor-not-allowed' : 'hover:bg-primary/5'
                          }`}
                        >
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none z-20">
                            <span className="text-[10px] font-bold text-primary bg-white px-2 py-1 rounded-lg shadow-xl border border-primary/20 whitespace-nowrap">
                              {isSlotSelected(dayIndex, hour, minute) && getSelectionInterval() 
                                ? getSelectionInterval() 
                                : `${hour.split(':')[0]}:${minute.toString().padStart(2, '0')}`}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                  
                  {/* Render Schedule Blocks */}
                  {scheduleData.filter(item => item.day === dayIndex).map((item, idx) => {
                    const top = (item.startTotal - 8 * 60) * (80 / 60);
                    const height = item.duration * (80 / 60);
                    
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`absolute left-1 right-1 rounded-xl p-3 border-l-4 shadow-sm z-10 ${
                          item.status === 'Occupied' 
                            ? 'bg-rose-50 border-rose-500 text-rose-900' 
                            : item.status === 'Pending'
                            ? 'bg-amber-50 border-amber-500 text-amber-900'
                            : 'bg-slate-100 border-slate-400 text-slate-600'
                        }`}
                        style={{ top: `${top + 4}px`, height: `${height - 8}px` }}
                      >
                        <div className="flex flex-col h-full overflow-hidden">
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                            {item.status === 'Occupied' ? 'OCUPADO' : item.status === 'Pending' ? 'PENDENTE' : 'BUFFER'}
                          </span>
                          <span className="text-xs font-bold truncate mt-1">{item.title}</span>
                          {item.status !== 'Buffer' && (
                            <span className="text-[10px] mt-auto opacity-70">
                              {item.start} - {Math.floor((item.startTotal + item.duration) / 60)}:{(item.startTotal + item.duration) % 60 === 0 ? '00' : ((item.startTotal + item.duration) % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = Cookies.get('sirs_lang');
    return (saved === 'pt' || saved === 'en') ? saved as Language : 'pt';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = Cookies.get('sirs_theme');
    return (saved === 'light' || saved === 'dark') ? saved as 'light' | 'dark' : 'light';
  });

  const t = translations[lang];
  const AVAILABLE_AMENITIES = getAvailableAmenities(t);

  useEffect(() => {
    Cookies.set('sirs_lang', lang, { expires: 365 });
  }, [lang]);

  useEffect(() => {
    Cookies.set('sirs_theme', theme, { expires: 365 });
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<'map' | 'reservations' | 'schedules' | 'backoffice' | 'manage-rooms' | 'manage-users'>('map');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floorPlanMaps, setFloorPlanMaps] = useState<Record<string, string>>({});
  const [selectedRoomId, setSelectedRoomId] = useState<string>('101');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserSwitcher(false);
      }
    };

    if (showUserSwitcher) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserSwitcher]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mapScale, setMapScale] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768 ? 0.6 : 1);
  const [mobileShowDetails, setMobileShowDetails] = useState(false);
  
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [bookingMessage, setBookingMessage] = useState<string>('');
  
  const [selectedBuilding, setSelectedBuilding] = useState('17');
  const [selectedFloor, setSelectedFloor] = useState('2');
  const [selectedSection, setSelectedSection] = useState('Trás');

  const availableFloors = useMemo(() => {
    const floors = new Set<string>();
    Object.keys(floorPlanMaps).forEach(key => {
      const [b, f, s] = key.split('-');
      if (b === selectedBuilding && s === selectedSection) {
        floors.add(f);
      }
    });
    return Array.from(floors).sort((a, b) => parseInt(a) - parseInt(b));
  }, [floorPlanMaps, selectedBuilding, selectedSection]);

  useEffect(() => {
    if (availableFloors.length > 0 && !availableFloors.includes(selectedFloor)) {
      setSelectedFloor(availableFloors[0]);
    }
  }, [availableFloors, selectedFloor]);

  const initialSlot = useMemo(() => getAppNextSlot(), []);

  const filteredRoomsForMap = useMemo(() => {
    return rooms.filter(room => 
      room.building === selectedBuilding && 
      room.floor === selectedFloor && 
      room.section === selectedSection &&
      room.operationalStatus === 'Active'
    );
  }, [rooms, selectedBuilding, selectedFloor, selectedSection]);

  const getFloorPlanImage = (building: string, floor: string, section: string) => {
    const key = `${building}-${floor}-${section}`;
    if (floorPlanMaps[key]) {
      return floorPlanMaps[key];
    }
    // Fallback to placeholder if not in maps.txt
    return `https://picsum.photos/seed/ua-floorplan-${building}-${floor}-${section}/1200/800?grayscale&blur=2`;
  };

  const [bookingDate, setBookingDate] = useState<string>(initialSlot.date);
  const [bookingStartTime, setBookingStartTime] = useState<string>(initialSlot.time);
  const [bookingDuration, setBookingDuration] = useState<string>('1 Hora');
  const [bookingSubject, setBookingSubject] = useState<string>('');

  useEffect(() => {
    if (!isTimeAllowed(selectedBuilding, bookingDate, bookingStartTime)) {
      for (let h = 8; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
          const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          if (isTimeAllowed(selectedBuilding, bookingDate, time)) {
            setBookingStartTime(time);
            return;
          }
        }
      }
    }
  }, [selectedBuilding, bookingDate, bookingStartTime]);

  useEffect(() => {
    const durationOpt = DURATION_OPTIONS.find(opt => opt.value === bookingDuration);
    if (durationOpt && durationOpt.mins > MAX_BOOKING_DURATION_MINS) {
      const firstValid = DURATION_OPTIONS.find(opt => opt.mins <= MAX_BOOKING_DURATION_MINS);
      if (firstValid) setBookingDuration(firstValid.value);
    }
  }, [bookingDuration]);
  
  const [reservationToDelete, setReservationToDelete] = useState<string | null>(null);
  const [conflictModal, setConflictModal] = useState<{
    isOpen: boolean;
    type: 'room' | 'user_start' | 'user_end';
    availableUntil?: string;
    availableFrom?: string;
    originalDuration: number;
    newDuration: number;
    newStartTime?: string;
  }>({ isOpen: false, type: 'room', originalDuration: 0, newDuration: 0 });

  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('sirs_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsLoggedIn(true);
      setIsAuthReady(true);
    } else {
      setIsAuthReady(true);
    }
  }, []);

  const handleLoginSuccess = (user: UserData) => {
    localStorage.setItem('sirs_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsLoggedIn(true);
    setIsAuthReady(true);
  };

  const handleLogout = async () => {
    localStorage.removeItem('sirs_user');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  useEffect(() => {
    console.log("Current allUsers state:", allUsers);
  }, [allUsers]);

  useEffect(() => {
    if (!isLoggedIn || !isAuthReady) return;

    // Fetch maps config from server
    fetch('/api/maps')
      .then(res => res.json())
      .then(data => setFloorPlanMaps(data))
      .catch(err => console.error("Failed to fetch maps:", err));

    const fetchInitialData = async () => {
      try {
        const { data: roomsData, error: roomsError } = await supabase.from('rooms').select('*');
        if (roomsError) throw roomsError;
        const mappedRooms = roomsData.map((r: any) => ({
          ...r,
          operationalStatus: r.operationalStatus || r.operational_status || 'Active',
          amenities: Array.isArray(r.amenities) ? r.amenities : (r.amenities ? JSON.parse(r.amenities) : ['Eduroam', 'Tomadas']),
          image: r.image || 'https://picsum.photos/seed/' + r.id + '/800/600',
          top: r.top || (r.id === '101' ? '20%' : r.id === '102' ? '20%' : r.id === '201' ? '50%' : '70%'),
          left: r.left || (r.id === '101' ? '15%' : r.id === '102' ? '30%' : r.id === '201' ? '45%' : '70%')
        }));
        setRooms(mappedRooms);

        const { data: usersData, error: usersError } = await supabase.from('users').select('*');
        if (usersError) throw usersError;
        setAllUsers(usersData);

        const { data: reservationsData, error: reservationsError } = await supabase.from('reservations').select('*');
        if (reservationsError) throw reservationsError;
        const mappedReservations = reservationsData.map((r: any) => {
          const room = mappedRooms.find((rm: any) => rm.id === (r.roomId || r.room_id));
          return {
            id: r.id,
            roomId: r.roomId || r.room_id,
            roomName: room?.name || r.roomId || r.room_id,
            userId: r.userId || r.user_id,
            date: r.date,
            startTime: r.startTime || r.start_time,
            duration: r.duration >= 60 ? `${Math.floor(r.duration / 60)} Hora${r.duration >= 120 ? 's' : ''}${r.duration % 60 > 0 ? ' e ' + (r.duration % 60) : ''}` : `${r.duration} Minutos`,
            subject: r.subject,
            status: r.status
          };
        });
        setReservations(mappedReservations);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();

    const roomsSubscription = supabase
      .channel('rooms-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchInitialData())
      .subscribe();

    const usersSubscription = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchInitialData())
      .subscribe();

    const reservationsSubscription = supabase
      .channel('reservations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => fetchInitialData())
      .subscribe();

    return () => {
      supabase.removeChannel(roomsSubscription);
      supabase.removeChannel(usersSubscription);
      supabase.removeChannel(reservationsSubscription);
    };
  }, [isLoggedIn, isAuthReady]);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];

  const getDynamicRoomStatus = (roomId: string, date: string, startTime: string) => {
    const startH = parseInt(startTime.split(':')[0]);
    const startM = parseInt(startTime.split(':')[1] || '0');
    const startTotal = startH * 60 + startM;

    const overlapping = reservations.find(res => {
      if (res.roomId !== roomId || res.date !== date) return false;
      
      const resStartH = parseInt(res.startTime.split(':')[0]);
      const resStartM = parseInt(res.startTime.split(':')[1] || '0');
      const resStartTotal = resStartH * 60 + resStartM;
      
      let resDurationMins = 0;
      if (res.duration.includes('Hora')) {
        const h = parseInt(res.duration.split(' ')[0]);
        resDurationMins = h * 60;
        if (res.duration.includes('e')) resDurationMins += parseInt(res.duration.split('e ')[1]);
      } else {
        resDurationMins = parseInt(res.duration.split(' ')[0]);
      }
      
      const resEndTotal = resStartTotal + resDurationMins;
      // Include 15 min buffer in the occupied check
      return startTotal >= resStartTotal && startTotal < (resEndTotal + BUFFER_DURATION_MINS);
    });

    if (overlapping) {
      return overlapping.status === 'Pending' ? 'Pending' : 'Occupied';
    }
    return 'Available';
  };

  const filteredRooms = searchQuery.trim() === '' 
    ? [] 
    : rooms.filter(room => 
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        room.department.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleConfirmBooking = async (forcedDuration?: number, forcedStartTime?: string) => {
    const now = getAppNow();
    const activeStartTime = forcedStartTime || bookingStartTime;
    const [h, m] = activeStartTime.split(':').map(Number);
    const bDate = new Date(bookingDate + 'T00:00:00');
    bDate.setHours(h, m, 0, 0);
    
    if (bDate < now) {
      setBookingStatus('error');
      setBookingMessage(t.pastBookingError);
      return;
    }

    if (!isTimeAllowed(selectedBuilding, bookingDate, activeStartTime)) {
      setBookingStatus('error');
      setBookingMessage(t.outsideOperatingHours);
      return;
    }

    setBookingStatus('checking');
    setBookingMessage(t.checkingAvailability);

    const currentRoom = rooms.find(r => r.id === selectedRoomId);
    if (!currentRoom) return;

    // Parse duration string to minutes
    let durationMins = forcedDuration || 60;
    if (!forcedDuration) {
      if (bookingDuration.includes('Hora')) {
        const h = parseInt(bookingDuration.split(' ')[0]);
        durationMins = h * 60;
        if (bookingDuration.includes('e')) {
          durationMins += parseInt(bookingDuration.split('e ')[1]);
        }
      } else {
        durationMins = parseInt(bookingDuration.split(' ')[0]);
      }
    }

    const startH = parseInt(activeStartTime.split(':')[0]);
    const startM = parseInt(activeStartTime.split(':')[1] || '0');
    const startTotal = startH * 60 + startM;
    const requestedEndTotal = startTotal + durationMins;

    if (durationMins > MAX_BOOKING_DURATION_MINS) {
      setBookingStatus('error');
      setBookingMessage(t.maxDurationError.replace('{h}', (MAX_BOOKING_DURATION_MINS / 60).toString()));
      return;
    }

    // 1. Check for USER'S OWN schedule conflicts (across all rooms)
    if (!forcedDuration && !forcedStartTime) {
      const userReservations = reservations
        .filter(res => res.userId === currentUser?.id && res.date === bookingDate && res.status !== 'Cancelled')
        .map(res => {
          const resStartH = parseInt(res.startTime.split(':')[0]);
          const resStartM = parseInt(res.startTime.split(':')[1] || '0');
          const resStartTotal = resStartH * 60 + resStartM;
          
          let resDurationMins = 60;
          if (res.duration.includes('Hora')) {
            const h = parseInt(res.duration.split(' ')[0]);
            resDurationMins = h * 60;
            if (res.duration.includes('e')) {
              resDurationMins += parseInt(res.duration.split('e ')[1]);
            }
          } else {
            resDurationMins = parseInt(res.duration.split(' ')[0]);
          }
          
          return { ...res, startTotal: resStartTotal, endTotal: resStartTotal + resDurationMins };
        });

      // Check for overlap (including buffer)
      const overlappingRes = userReservations.find(res => 
        (startTotal < (res.endTotal + BUFFER_DURATION_MINS) && (requestedEndTotal + BUFFER_DURATION_MINS) > res.startTotal)
      );

      if (overlappingRes) {
        // Try to suggest adjustments
        // Case A: User has a reservation that ends after our requested start (including buffer)
        if ((overlappingRes.endTotal + BUFFER_DURATION_MINS) > startTotal && overlappingRes.startTotal <= startTotal) {
          const newStartTotal = overlappingRes.endTotal + BUFFER_DURATION_MINS;
          const newDuration = requestedEndTotal - newStartTotal;
          
          if (newDuration > 0) {
            const newStartH = Math.floor(newStartTotal / 60);
            const newStartM = newStartTotal % 60;
            const newStartStr = `${newStartH.toString().padStart(2, '0')}:${newStartM.toString().padStart(2, '0')}`;
            
            setConflictModal({
              isOpen: true,
              type: 'user_start',
              availableFrom: newStartStr,
              originalDuration: durationMins,
              newDuration: newDuration,
              newStartTime: newStartStr
            });
            setBookingStatus('idle');
            return;
          }
        }
        
        // Case B: User has a reservation that starts before our requested end (including buffer)
        if (overlappingRes.startTotal < (requestedEndTotal + BUFFER_DURATION_MINS) && (overlappingRes.endTotal + BUFFER_DURATION_MINS) >= (requestedEndTotal + BUFFER_DURATION_MINS)) {
          const newDuration = overlappingRes.startTotal - BUFFER_DURATION_MINS - startTotal;
          
          if (newDuration > 0) {
            const availableUntilH = Math.floor(overlappingRes.startTotal / 60);
            const availableUntilM = overlappingRes.startTotal % 60;
            const availableUntilStr = `${availableUntilH.toString().padStart(2, '0')}:${availableUntilM.toString().padStart(2, '0')}`;
            
            setConflictModal({
              isOpen: true,
              type: 'user_end',
              availableUntil: availableUntilStr,
              originalDuration: durationMins,
              newDuration: newDuration
            });
            setBookingStatus('idle');
            return;
          }
        }

        // Fallback: Strict refusal if no adjustment possible or total overlap
        setBookingStatus('error');
        setBookingMessage(t.overlapUserLongError);
        return;
      }
    }

    // 2. Check for ROOM conflicts (if not already forced)
    if (!forcedDuration && !forcedStartTime) {
      const nextReservation = reservations
        .filter(res => res.roomId === selectedRoomId && res.date === bookingDate && res.status !== 'Cancelled')
        .map(res => {
          const resStartH = parseInt(res.startTime.split(':')[0]);
          const resStartM = parseInt(res.startTime.split(':')[1] || '0');
          return { ...res, startTotal: resStartH * 60 + resStartM };
        })
        .filter(res => res.startTotal > startTotal)
        .sort((a, b) => a.startTotal - b.startTotal)[0];

      if (nextReservation && nextReservation.startTotal < (requestedEndTotal + BUFFER_DURATION_MINS)) {
        const availableMins = nextReservation.startTotal - BUFFER_DURATION_MINS - startTotal;
        const availableUntilH = Math.floor((nextReservation.startTotal - BUFFER_DURATION_MINS) / 60);
        const availableUntilM = (nextReservation.startTotal - BUFFER_DURATION_MINS) % 60;
        const availableUntilStr = `${availableUntilH.toString().padStart(2, '0')}:${availableUntilM.toString().padStart(2, '0')}`;
        
        setConflictModal({
          isOpen: true,
          type: 'room',
          availableUntil: availableUntilStr,
          originalDuration: durationMins,
          newDuration: availableMins
        });
        setBookingStatus('idle');
        return;
      }
    }

    try {
      const { error: insertError } = await supabase
        .from('reservations')
        .insert({
          room_id: selectedRoomId,
          user_id: Number(currentUser?.id || '1'),
          date: bookingDate,
          start_time: activeStartTime,
          duration: durationMins,
          subject: bookingSubject,
          status: 'Pending'
        });

      if (insertError) throw insertError;

      fetch('/api/emails/reservation-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser?.email,
          roomName: selectedRoom.name,
          date: bookingDate,
          startTime: activeStartTime,
          duration: durationMins,
          lang
        })
      }).catch(console.error);

      setBookingStatus('success');
      setBookingMessage(t.bookingSuccess);
      
      setTimeout(() => setBookingStatus('idle'), 3000);
    } catch (error: any) {
      setBookingStatus('error');
      setBookingMessage(error.message || 'Lamentamos, mas ocorreu um erro ao processar a sua reserva.');
      handleSupabaseError(error, OperationType.CREATE, 'reservations');
    }
  };

  const handleCheckIn = async (id: string) => {
    // This function is now handled via handleUpdateReservationStatus in BackofficeView
    // Keeping it for potential future use or removing if fully redundant
  };

  const handleDeleteReservation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReservationToDelete(id);
  };

  const confirmDelete = async () => {
    if (!reservationToDelete) return;
    
    try {
      const res = reservations.find(r => r.id === reservationToDelete);
      const user = allUsers.find(u => u.id === res?.userId);

      const { error: deleteError } = await supabase
        .from('reservations')
        .delete()
        .eq('id', Number(reservationToDelete));

      if (deleteError) throw deleteError;

      if (res && user) {
        fetch('/api/emails/reservation-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            roomName: res.roomName,
            reservation: res,
            status: 'Cancelled',
            lang
          })
        }).catch(console.error);
      }

      setReservationToDelete(null);
      setBookingStatus('success');
      setBookingMessage(t.reservationDeletedSuccess);
      setTimeout(() => setBookingStatus('idle'), 3000);
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, `reservations/${reservationToDelete}`);
    }
  };

  const handleSwitchUser = async (email: string) => {
    try {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userData) {
        setCurrentUser(userData as UserData);
        setShowUserSwitcher(false);
        
        if (userData.role === 'bibliotecário' || userData.role === 'admin') {
          setCurrentView('backoffice');
        } else {
          setCurrentView('map');
        }
      }
    } catch (error) {
      handleSupabaseError(error, OperationType.LIST, 'users');
    }
  };

  const handleUpdateReservationStatus = async (id: any, status: string) => {
    try {
      const { error: updateError } = await supabase
        .from('reservations')
        .update({ status })
        .eq('id', Number(id));

      if (updateError) throw updateError;

      const res = reservations.find(r => r.id === id);
      const user = allUsers.find(u => u.id === res?.userId);
      if (res && user) {
        fetch('/api/emails/reservation-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            roomName: res.roomName,
            reservation: res,
            status,
            lang
          })
        }).catch(console.error);
      }

      setBookingStatus('success');
      setBookingMessage(status === 'Confirmed' ? t.reservationApprovedSuccess : t.reservationRejectedSuccess);
      setTimeout(() => setBookingStatus('idle'), 3000);
    } catch (error) {
      handleSupabaseError(error, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  const handleUpdateRoom = async (roomId: string, updatedData: any) => {
    try {
      const mappedData = { ...updatedData };
      if (mappedData.operationalStatus) {
        mappedData.operational_status = mappedData.operationalStatus;
        delete mappedData.operationalStatus;
      }

      const { error: updateError } = await supabase
        .from('rooms')
        .update(mappedData)
        .eq('id', roomId);

      if (updateError) throw updateError;

      setBookingStatus('success');
      setBookingMessage(t.roomUpdatedSuccess);
      setTimeout(() => setBookingStatus('idle'), 3000);
    } catch (error: any) {
      setBookingStatus('error');
      setBookingMessage(t.errorUpdatingRoom || error.message);
      handleSupabaseError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  const handleCreateRoom = async (newRoomData: any) => {
    try {
      const mappedData = { ...newRoomData };
      if (mappedData.operationalStatus) {
        mappedData.operational_status = mappedData.operationalStatus;
        delete mappedData.operationalStatus;
      }

      const { data, error: insertError } = await supabase
        .from('rooms')
        .insert(mappedData)
        .select()
        .single();

      if (insertError) throw insertError;
      
      setBookingStatus('success');
      setBookingMessage(t.roomCreatedSuccess);
      setTimeout(() => setBookingStatus('idle'), 3000);
      return data;
    } catch (error: any) {
      setBookingStatus('error');
      setBookingMessage(t.errorCreatingRoom || error.message);
      handleSupabaseError(error, OperationType.CREATE, 'rooms');
      return null;
    }
  };

  const getStatusColor = (status: RoomStatus) => {
    switch (status) {
      case 'Available': return 'bg-emerald-500';
      case 'Pending': return 'bg-amber-500';
      case 'Occupied': return 'bg-rose-500';
    }
  };

  const getStatusLabel = (status: RoomStatus) => {
    switch (status) {
      case 'Available': return t.statusAvailable;
      case 'Pending': return t.statusPending;
      case 'Occupied': return t.statusOccupied;
    }
  };

  if (!isLoggedIn) {
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        lang={lang} 
        setLang={setLang} 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-10 shrink-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-[#0066cc]">
            <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
              <img 
                src="https://salina.web.ua.pt/ua.png" 
                alt="UA Logo" 
                className="h-6 w-6 md:h-7 md:w-7 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <h2 className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              <span className="hidden md:inline">{t.uaTitle}</span>
              <span className="md:hidden">SiReS UA</span>
            </h2>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setCurrentView('map')}
              className={`text-sm font-semibold transition-colors ${currentView === 'map' ? 'text-[#0066cc]' : 'text-slate-600 dark:text-slate-400 hover:text-[#0066cc]'}`}
            >
              {t.navMap}
            </button>
            <button 
              onClick={() => setCurrentView('reservations')}
              className={`text-sm font-semibold transition-colors ${currentView === 'reservations' ? 'text-[#0066cc]' : 'text-slate-600 dark:text-slate-400 hover:text-[#0066cc]'}`}
            >
              {t.navMyReservations}
            </button>
            <button 
              onClick={() => setCurrentView('schedules')}
              className={`text-sm font-semibold transition-colors ${currentView === 'schedules' ? 'text-[#0066cc]' : 'text-slate-600 dark:text-slate-400 hover:text-[#0066cc]'}`}
            >
              {t.navSchedules}
            </button>
            {(currentUser?.role === 'admin' || currentUser?.role === 'bibliotecário') && (
              <button 
                onClick={() => setCurrentView('backoffice')}
                className={`text-sm font-semibold transition-colors ${currentView === 'backoffice' ? 'text-[#0066cc]' : 'text-slate-600 dark:text-slate-400 hover:text-[#0066cc]'}`}
              >
                {t.navBackoffice}
              </button>
            )}
          </nav>
        </div>
        
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative hidden sm:block">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 h-10 w-64">
                <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder} 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white"
                />
              </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showSearchResults && searchQuery.trim() !== '' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[60]"
                >
                  {filteredRooms.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                      {filteredRooms.map(room => (
                        <button
                          key={room.id}
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            setSearchQuery('');
                            setShowSearchResults(false);
                            setCurrentView('map');
                          }}
                          className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center ${
                            room.status === 'Available' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                            room.status === 'Pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                            'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                          }`}>
                            <DoorOpen size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{room.name}</p>
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 shrink-0">{room.capacity} pax</span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{room.department}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t.noRoomsFound}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-2">
            <LanguageToggle lang={lang} setLang={setLang} />
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block"></div>

          <div className="flex gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setShowUserSwitcher(!showUserSwitcher)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <User className="h-5 w-5" />
              </button>
              
              <AnimatePresence>
                {showUserSwitcher && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-[100]"
                  >
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.account}</p>
                    </div>
                    <div className="px-4 py-3 mb-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{currentUser?.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser?.email}</p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-[#0066cc]/10 text-[#0066cc] rounded text-[10px] font-bold uppercase">
                        {currentUser?.role}
                      </span>
                    </div>

                    {currentUser?.role === 'admin' && (
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.simulateUser}</p>
                      </div>
                    )}
                    
                    {currentUser?.role === 'admin' && allUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleSwitchUser(u.email)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex flex-col ${currentUser?.id === u.id ? 'bg-[#0066cc]/5' : ''}`}
                      >
                        <span className={`text-sm font-medium ${currentUser?.id === u.id ? 'text-[#0066cc]' : 'text-slate-700 dark:text-slate-300'}`}>
                          {u.name}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{u.email}</span>
                      </button>
                    ))}

                    <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 transition-colors flex items-center gap-2 text-sm font-bold"
                      >
                        <RotateCcw size={16} />
                        {t.logout}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shrink-0 transition-colors">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col">
              <h1 className="text-base font-semibold text-slate-900 dark:text-white">{t.sidebarTitle}</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">{t.systemTitle}</p>
            </div>
            
            <div className="flex flex-col gap-1">
              <SidebarLink 
                icon={<MapIcon size={20} />} 
                label={t.navMap} 
                active={currentView === 'map'} 
                onClick={() => setCurrentView('map')}
              />
              <SidebarLink 
                icon={<Calendar size={20} />} 
                label={t.navSchedules} 
                active={currentView === 'schedules'} 
                onClick={() => setCurrentView('schedules')}
              />
              <SidebarLink 
                icon={<CalendarCheck size={20} />} 
                label={t.navMyReservations} 
                active={currentView === 'reservations'} 
                onClick={() => setCurrentView('reservations')}
              />
              {(currentUser?.role === 'bibliotecário' || currentUser?.role === 'admin') && (
                <SidebarLink 
                  icon={<CheckCircle2 size={20} />} 
                  label={t.navBackoffice} 
                  active={currentView === 'backoffice'} 
                  onClick={() => setCurrentView('backoffice')}
                />
              )}
              <SidebarLink icon={<Library size={20} />} label={t.libraryInfo} />
              <SidebarLink icon={<Settings size={20} />} label={t.settings} />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="relative flex-1 bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col transition-colors">
          <AnimatePresence mode="wait">
            {currentView === 'map' ? (
              <motion.div 
                key="map-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative flex-1 overflow-hidden flex flex-col"
              >
                {/* Mobile Search Bar */}
                <div className="md:hidden p-4 bg-transparent absolute top-0 left-0 right-0 z-30">
                  <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl px-4 h-12 shadow-lg border border-slate-100 dark:border-slate-800 cursor-pointer"
                    onClick={() => setCurrentView('map')}
                  >
                    <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 mr-2" />
                    <input 
                      type="text" 
                      placeholder={t.searchPlaceholder} 
                      className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white"
                    />
                    <Filter className="h-5 w-5 text-[#0066cc] ml-2" />
                  </div>
                </div>

                {/* Map Filters */}
                <div className="absolute top-20 md:top-4 left-4 right-4 z-40 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <div className="flex flex-wrap gap-2 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-xl shadow-lg border border-white dark:border-slate-800">
                      <select 
                        value={selectedBuilding}
                        onChange={(e) => setSelectedBuilding(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer"
                      >
                        <option value="17">{t.biblioteca}</option>
                        <option value="18">{t.mediateca}</option>
                      </select>
                      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 self-center" />
                      <select 
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer"
                      >
                        <option value="Frente">{t.front}</option>
                        <option value="Trás">{t.back}</option>
                      </select>
                      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 self-center" />
                      <select 
                        value={selectedFloor}
                        onChange={(e) => setSelectedFloor(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer"
                      >
                        {availableFloors.map(f => (
                          <option key={f} value={f}>{t.floor} {f}</option>
                        ))}
                      </select>
                      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 self-center" />
                      <input 
                        type="date" 
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-0"
                        min={getAppDate()}
                      />
                      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 self-center" />
                      <select 
                        value={bookingStartTime}
                        onChange={(e) => setBookingStartTime(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-0"
                      >
                        {Array.from({ length: 64 }, (_, i) => {
                          const h = Math.floor(i / 4) + 8;
                          const m = (i % 4) * 15;
                          if (h >= 24) return null;
                          const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                          if (!isTimeAllowed(selectedBuilding, bookingDate, time)) return null;
                          return <option key={time} value={time}>{time}</option>;
                        }).filter(Boolean)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Map Container */}
                <div className="relative flex-1 flex flex-col overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center p-1 md:p-4 bg-[#94b395] dark:bg-[#2d3a2d] cursor-default transition-colors overflow-hidden">
                    <div 
                      className="relative flex items-center justify-center max-w-full max-h-full"
                      style={{ 
                        transform: `scale(${mapScale})`,
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      <div className="relative inline-block max-w-full max-h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/20 dark:bg-white/5 shadow-2xl overflow-hidden">
                        {/* Mock Floor Plan Background */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
                        
                        {/* Floor Plan Image */}
                        <img 
                          src={getFloorPlanImage(selectedBuilding, selectedFloor, selectedSection)} 
                          alt={`Floor Plan ${selectedBuilding}.${selectedFloor} ${selectedSection}`} 
                          className="max-w-full max-h-full object-contain opacity-80 dark:opacity-60 transition-opacity duration-500 block"
                          style={{ maxHeight: 'calc(100vh - 200px)' }}
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Room Markers */}
                        <div className="absolute inset-0">
                          {filteredRoomsForMap.map((room) => {
                          const dynamicStatus = getDynamicRoomStatus(room.id, bookingDate, bookingStartTime);
                          const statusColor = dynamicStatus === 'Available' ? 'bg-emerald-500' : 
                                             dynamicStatus === 'Pending' ? 'bg-amber-500' : 'bg-rose-500';
                          return (
                            <RoomMarker 
                              key={room.id} 
                              room={room} 
                              isSelected={selectedRoomId === room.id}
                              onClick={() => {
                                setSelectedRoomId(room.id);
                                setMobileShowDetails(true);
                              }}
                              statusColor={statusColor}
                              status={dynamicStatus}
                            />
                          );
                        })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Legend below map */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-10">
                    <LegendItem color="bg-emerald-500" label={t.statusAvailable.toUpperCase()} />
                    <LegendItem color="bg-amber-500" label={t.statusPending.toUpperCase()} />
                    <LegendItem color="bg-rose-500" label={t.statusOccupied.toUpperCase()} />
                  </div>
                </div>

                {/* Map Controls */}
                <div className="flex absolute bottom-24 right-4 md:bottom-6 md:right-6 flex-col gap-2 z-10">
                  <button 
                    onClick={() => setMapScale(prev => Math.min(prev + 0.2, 3))}
                    className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Aumentar Zoom"
                  >
                    <Plus size={18} className="md:w-5 md:h-5" />
                  </button>
                  <button 
                    onClick={() => setMapScale(prev => Math.max(prev - 0.2, 0.5))}
                    className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Diminuir Zoom"
                  >
                    <Minus size={18} className="md:w-5 md:h-5" />
                  </button>
                </div>
              </motion.div>
            ) : currentView === 'schedules' ? (
              <SchedulesView 
                rooms={rooms} 
                reservations={reservations}
                selectedRoomId={selectedRoomId}
                setSelectedRoomId={setSelectedRoomId}
                setBookingDate={setBookingDate}
                setBookingStartTime={setBookingStartTime}
                setBookingDuration={setBookingDuration}
                onNewBooking={() => setCurrentView('map')}
                lang={lang}
              />
            ) : currentView === 'reservations' ? (
              <motion.div 
                key="reservations-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50 dark:bg-slate-950 transition-colors"
              >
                <div className="max-w-4xl mx-auto">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.navMyReservations}</h2>
                    <p className="text-slate-500 dark:text-slate-400">{t.reservationsSubtitle}</p>
                  </div>

                  {reservations.filter(r => r.userId === currentUser?.id).length > 0 ? (
                    <div className="space-y-10">
                      {/* Process reservations with current time logic */}
                      {(() => {
                        const now = getAppNow();
                        
                        const processedReservations = reservations
                          .filter(r => r.userId === currentUser?.id)
                          .map(res => {
                            const resDateTime = new Date(`${res.date}T${res.startTime}`);
                            
                            // If reservation is in the past
                            if (resDateTime < now) {
                              if (res.status === 'Confirmed' || res.status === 'Occupied') {
                                return { ...res, status: 'Completed' as const };
                              }
                              if (res.status === 'Pending') {
                                return { ...res, status: 'Cancelled' as const };
                              }
                            }
                            return res;
                          });

                        const active = processedReservations
                          .filter(r => r.status === 'Pending' || r.status === 'Confirmed' || r.status === 'Occupied')
                          .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
                        
                        const completed = processedReservations
                          .filter(r => r.status === 'Completed' || r.status === 'Cancelled')
                          .sort((a, b) => new Date(`${b.date}T${b.startTime}`).getTime() - new Date(`${a.date}T${a.startTime}`).getTime());

                        return (
                          <>
                            {/* Active Reservations */}
                            {active.length > 0 && (
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.activeReservations}</h3>
                                </div>
                                <div className="space-y-4">
                                  {active.map((res) => (
                                    <ReservationCard 
                                      key={res.id} 
                                      res={res} 
                                      onDelete={handleDeleteReservation} 
                                      lang={lang} 
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Completed Reservations */}
                            {completed.length > 0 && (
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.completedReservations}</h3>
                                </div>
                                <div className="space-y-4 opacity-80">
                                  {completed.map((res) => (
                                    <ReservationCard 
                                      key={res.id} 
                                      res={res} 
                                      onDelete={handleDeleteReservation} 
                                      lang={lang} 
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 transition-colors">
                      <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-700">
                        <CalendarCheck size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.noReservations}</h3>
                      <p className="text-slate-500 dark:text-slate-400">{t.noReservationsSubtitle}</p>
                      <button 
                        onClick={() => setCurrentView('map')}
                        className="mt-6 px-6 py-2 bg-[#0066cc] text-white rounded-xl font-bold text-sm hover:bg-[#0052a3] transition-colors"
                      >
                        {t.bookNow}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : currentView === 'backoffice' ? (
              <BackofficeView 
                reservations={reservations}
                users={allUsers}
                onUpdateStatus={handleUpdateReservationStatus}
                onManageRooms={() => setCurrentView('manage-rooms')}
                onManageUsers={() => setCurrentView('manage-users')}
                lang={lang}
              />
            ) : currentView === 'manage-users' ? (
              <ManageUsersView 
                lang={lang} 
                onBack={() => setCurrentView('backoffice')}
              />
            ) : (
              <ManageRoomsView 
                rooms={rooms}
                onUpdateRoom={handleUpdateRoom}
                onCreateRoom={handleCreateRoom}
                onBack={() => setCurrentView('backoffice')}
                lang={lang}
              />
            )}
          </AnimatePresence>
        </main>

        {/* Room Details Sidebar (Desktop) / Bottom Sheet (Mobile) */}
        {(currentView === 'map' || currentView === 'schedules') && selectedRoom && (
          <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-80 flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto shrink-0 transition-colors">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={selectedRoom.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedRoom.name}</h3>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                          {selectedRoom.capacity} pax
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{selectedRoom.department}</p>
                    </div>
                    <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime) === 'Available' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                      getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime) === 'Pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                      'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                    }`}>
                      {getStatusLabel(getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime))}
                    </span>
                  </div>

                  <div className="space-y-6">
                    <div className="aspect-video overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                      <img 
                        src={selectedRoom.image} 
                        alt={selectedRoom.name} 
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div>
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.amenities}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <Amenity icon={<Users size={16} />} label={`${selectedRoom.capacity} pax`} />
                        {AVAILABLE_AMENITIES.filter(a => selectedRoom.amenities.includes(a.id)).map(amenity => (
                          <Amenity key={amenity.id} icon={React.cloneElement(amenity.icon as React.ReactElement, { size: 16 })} label={amenity.label} />
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                      <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.bookThisSpace}</h4>
                      {selectedRoom.operationalStatus !== 'Active' ? (
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-700 dark:text-rose-400 text-sm font-medium flex items-center gap-3">
                          <AlertCircle size={20} />
                          {selectedRoom.operationalStatus === 'Maintenance' 
                            ? t.roomMaintenance 
                            : t.roomInactive}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{t.subjectLabel}</label>
                            <input 
                              type="text" 
                              placeholder={t.subjectPlaceholder}
                              value={bookingSubject}
                              onChange={(e) => setBookingSubject(e.target.value)}
                              className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-[#0066cc] focus:ring-[#0066cc]"
                            />
                          </div>

                          {currentView === 'schedules' && (
                            <>
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{t.selectDate}</label>
                                <input 
                                  type="date" 
                                  value={bookingDate}
                                  onChange={(e) => setBookingDate(e.target.value)}
                                  className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-[#0066cc] focus:ring-[#0066cc]"
                                  min={getAppDate()}
                                />
                              </div>
                              
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{t.startTime}</label>
                                <select 
                                  value={bookingStartTime}
                                  onChange={(e) => setBookingStartTime(e.target.value)}
                                  className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-[#0066cc] focus:ring-[#0066cc]"
                                >
                                  {Array.from({ length: 64 }, (_, i) => {
                                    const h = Math.floor(i / 4) + 8;
                                    const m = (i % 4) * 15;
                                    if (h >= 24) return null;
                                    const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                    if (!isTimeAllowed(selectedBuilding, bookingDate, time)) return null;
                                    return <option key={time} value={time}>{time}</option>;
                                  }).filter(Boolean)}
                                </select>
                              </div>
                            </>
                          )}

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{t.duration}</label>
                            <select 
                              value={bookingDuration}
                              onChange={(e) => setBookingDuration(e.target.value)}
                              className="w-full rounded-lg border-slate-200 bg-slate-50 text-sm focus:border-primary focus:ring-primary"
                            >
                              {DURATION_OPTIONS.filter(opt => opt.mins <= MAX_BOOKING_DURATION_MINS).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>

                          <button 
                            onClick={() => handleConfirmBooking()}
                            disabled={
                              bookingStatus === 'checking' || 
                              selectedRoom.operationalStatus !== 'Active' ||
                              getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime) !== 'Available' ||
                              !isTimeAllowed(selectedBuilding, bookingDate, bookingStartTime) ||
                              (() => {
                                const now = getAppNow();
                                const [h, m] = bookingStartTime.split(':').map(Number);
                                const bDate = new Date(bookingDate + 'T00:00:00');
                                bDate.setHours(h, m, 0, 0);
                                return bDate < now;
                              })()
                            }
                            className={`w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                              selectedRoom.operationalStatus !== 'Active' ||
                              getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime) !== 'Available' ||
                              !isTimeAllowed(selectedBuilding, bookingDate, bookingStartTime) ||
                              (() => {
                                const now = getAppNow();
                                const [h, m] = bookingStartTime.split(':').map(Number);
                                const bDate = new Date(bookingDate + 'T00:00:00');
                                bDate.setHours(h, m, 0, 0);
                                return bDate < now;
                              })()
                                ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                                : 'bg-primary shadow-primary/25 hover:bg-primary/90'
                            }`}
                          >
                            {bookingStatus === 'checking' ? (
                              <>
                                <Loader2 size={18} className="animate-spin" />
                                {t.checking}
                              </>
                            ) : (
                              t.confirmBooking
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </aside>

            {/* Mobile Bottom Sheet */}
            <AnimatePresence>
              {mobileShowDetails && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileShowDetails(false)}
                    className="md:hidden fixed inset-0 bg-black/20 z-40 cursor-pointer"
                  />
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 max-h-[90vh] overflow-y-auto pb-20"
                  >
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4" />
                    <div className="flex justify-center mb-2">
                      <button 
                        onClick={() => setMobileShowDetails(false)}
                        className="text-primary font-bold text-xs uppercase tracking-widest hover:opacity-80 transition-opacity px-4 py-1"
                      >
                        {t.close}
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900">{selectedRoom.name}</h3>
                          <p className="text-sm text-slate-500">{selectedRoom.department}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime) === 'Available' ? 'bg-emerald-100 text-emerald-600' :
                          getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime) === 'Pending' ? 'bg-amber-100 text-amber-600' :
                          'bg-rose-100 text-rose-600'
                        }`}>
                          {getStatusLabel(getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime))}
                        </span>
                      </div>

                      <div className="aspect-video rounded-2xl overflow-hidden mb-6">
                        <img src={selectedRoom.image} alt={selectedRoom.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-8">
                        <Amenity icon={<Users size={16} />} label={`${selectedRoom.capacity} Pers.`} />
                        {AVAILABLE_AMENITIES.filter(a => selectedRoom.amenities.includes(a.id)).map(amenity => (
                          <Amenity key={amenity.id} icon={React.cloneElement(amenity.icon as React.ReactElement, { size: 16 })} label={amenity.label} />
                        ))}
                      </div>

                      <div className="space-y-4 mb-8">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assunto / Porquê</label>
                          <input 
                            type="text" 
                            placeholder={t.subjectPlaceholder}
                            value={bookingSubject}
                            onChange={(e) => setBookingSubject(e.target.value)}
                            className="w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-primary focus:ring-primary"
                          />
                        </div>

                        {currentView === 'schedules' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative overflow-hidden">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Data</p>
                              <div className="flex items-center gap-2 text-slate-900 font-bold pointer-events-none">
                                <Calendar size={18} className="text-primary" />
                                {(() => {
                                  const [y, m, d] = bookingDate.split('-').map(Number);
                                  const date = new Date(y, m - 1, d);
                                  return date.toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' });
                                })()}
                              </div>
                              <input 
                                type="date" 
                                value={bookingDate}
                                onChange={(e) => setBookingDate(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full appearance-none"
                                min={getAppDate()}
                              />
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Hora</p>
                              <select 
                                value={bookingStartTime}
                                onChange={(e) => setBookingStartTime(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              >
                                {Array.from({ length: 64 }, (_, i) => {
                                  const h = Math.floor(i / 4) + 8;
                                  const m = (i % 4) * 15;
                                  if (h >= 24) return null;
                                  const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                  if (!isTimeAllowed(selectedBuilding, bookingDate, time)) return null;
                                  return <option key={time} value={time}>{time}</option>;
                                }).filter(Boolean)}
                              </select>
                              <div className="flex items-center gap-2 text-slate-900 font-bold">
                                <Clock size={18} className="text-primary" />
                                {bookingStartTime}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.durationLabel}</label>
                          <select 
                            value={bookingDuration}
                            onChange={(e) => setBookingDuration(e.target.value)}
                            className="w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-primary focus:ring-primary appearance-none"
                          >
                            {DURATION_OPTIONS.filter(opt => opt.mins <= MAX_BOOKING_DURATION_MINS).map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleConfirmBooking()}
                        disabled={
                          bookingStatus === 'checking' || 
                          selectedRoom.operationalStatus !== 'Active' ||
                          getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime) !== 'Available' ||
                          !isTimeAllowed(selectedBuilding, bookingDate, bookingStartTime) ||
                          (() => {
                            const now = getAppNow();
                            const [h, m] = bookingStartTime.split(':').map(Number);
                            const bDate = new Date(bookingDate + 'T00:00:00');
                            bDate.setHours(h, m, 0, 0);
                            return bDate < now;
                          })()
                        }
                        className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2 ${
                          selectedRoom.operationalStatus !== 'Active' ||
                          getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime) !== 'Available' ||
                          !isTimeAllowed(selectedBuilding, bookingDate, bookingStartTime) ||
                          (() => {
                            const now = getAppNow();
                            const [h, m] = bookingStartTime.split(':').map(Number);
                            const bDate = new Date(bookingDate + 'T00:00:00');
                            bDate.setHours(h, m, 0, 0);
                            return bDate < now;
                          })()
                            ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed' 
                            : 'bg-primary text-white shadow-primary/25 hover:bg-primary/90'
                        }`}
                      >
                        {bookingStatus === 'checking' ? (
                          <>
                            <Loader2 size={20} className="animate-spin" />
                            {t.checking}
                          </>
                        ) : (
                          <>
                            {t.confirmBooking} <ArrowRight size={20} />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-100 flex items-center justify-around px-4 z-[60]">
          <button 
            onClick={() => {
              setCurrentView('map');
              setMobileShowDetails(false);
            }}
            className={`flex flex-col items-center gap-1 ${currentView === 'map' ? 'text-primary' : 'text-slate-400'}`}
          >
            <MapIcon size={24} />
            <span className="text-[10px] font-bold">Mapa</span>
          </button>
          <button 
            onClick={() => {
              setCurrentView('reservations');
              setMobileShowDetails(false);
            }}
            className={`flex flex-col items-center gap-1 ${currentView === 'reservations' ? 'text-primary' : 'text-slate-400'}`}
          >
            <Library size={24} />
            <span className="text-[10px] font-bold">Reservas</span>
          </button>
          <button 
            className={`flex flex-col items-center gap-1 text-slate-400`}
          >
            <Settings size={24} />
            <span className="text-[10px] font-bold">{t.settings}</span>
          </button>
        </nav>

        {/* Global Notifications */}
        <AnimatePresence>
          {bookingStatus !== 'idle' && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
            >
              <div className={`rounded-2xl p-4 shadow-2xl border flex items-start gap-4 ${
                bookingStatus === 'checking' ? 'bg-white border-slate-200 text-slate-900' :
                bookingStatus === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' :
                'bg-rose-50 border-rose-100 text-rose-900'
              }`}>
                <div className="shrink-0 mt-0.5">
                  {bookingStatus === 'checking' && <Loader2 size={24} className="text-primary animate-spin" />}
                  {bookingStatus === 'success' && <CheckCircle2 size={24} className="text-emerald-500" />}
                  {bookingStatus === 'error' && <AlertCircle size={24} className="text-rose-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{bookingMessage}</p>
                </div>
                {bookingStatus !== 'checking' && (
                  <button 
                    onClick={() => setBookingStatus('idle')}
                    className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conflict Modal */}
        <AnimatePresence>
          {conflictModal.isOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 border border-slate-200"
              >
                <div className="h-16 w-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                  <Clock size={32} className="text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{t.conflictModalTitle}</h3>
                <p className="text-slate-600 mb-6">
                  {conflictModal.type === 'room' ? (
                    <>
                      {t.roomAvailableUntil.replace('{time}', conflictModal.availableUntil || '')} 
                      <br />
                      {t.acceptReducedDuration.replace('{duration}', (conflictModal.newDuration || 0).toString())}
                    </>
                  ) : conflictModal.type === 'user_start' ? (
                    <>
                      {t.userReservationEndsAt.replace('{time}', conflictModal.availableFrom || '')} 
                      <br />
                      {t.changeStartTimeTo.replace('{time}', conflictModal.newStartTime || '')}
                    </>
                  ) : (
                    <>
                      {t.userReservationStartsAt.replace('{time}', conflictModal.availableUntil || '')} 
                      <br />
                      {t.reduceDurationTo.replace('{duration}', (conflictModal.newDuration || 0).toString())}
                    </>
                  )}
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      const { newDuration, newStartTime } = conflictModal;
                      setConflictModal({ ...conflictModal, isOpen: false });
                      handleConfirmBooking(newDuration, newStartTime);
                    }}
                    className="w-full py-3.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20"
                  >
                    {t.yesAcceptChange}
                  </button>
                  <button 
                    onClick={() => setConflictModal({ ...conflictModal, isOpen: false })}
                    className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                  >
                    {t.noCancelRequest}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {reservationToDelete && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setReservationToDelete(null)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-slate-200"
              >
                <div className="flex items-center gap-4 mb-4 text-rose-600">
                  <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center">
                    <AlertCircle size={28} />
                  </div>
                  <h3 className="text-lg font-bold">{t.confirmDeletion}</h3>
                </div>
                <p className="text-slate-600 text-sm mb-6">
                  {t.confirmDeletionText}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setReservationToDelete(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
                  >
                    {t.delete}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SidebarLink({ 
  icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon: React.ReactNode, 
  label: string, 
  active?: boolean,
  onClick?: () => void
}) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left ${
        active ? 'bg-[#0066cc]/10 text-[#0066cc]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      <p className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>{label}</p>
    </button>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}

interface RoomMarkerProps {
  key?: string | number;
  room: Room;
  isSelected: boolean;
  onClick: () => void;
  statusColor: string;
  status: RoomStatus;
}

function RoomMarker({ room, isSelected, onClick, statusColor, status }: RoomMarkerProps) {
  return (
    <button 
      onClick={onClick}
      className="absolute group z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ top: room.top, left: room.left }}
    >
      <div className="flex flex-col items-center">
        <motion.div 
          animate={{ scale: isSelected ? 1.1 : 1 }}
          className={`px-3 py-1 text-white text-[10px] font-bold rounded-full shadow-lg border-2 ${isSelected ? 'border-rose-600' : 'border-white'} ${statusColor}`}
        >
          {room.name}
        </motion.div>
      </div>
    </button>
  );
}

function Amenity({ icon, label }: { icon: React.ReactNode, label: string, key?: string | number }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm">
      <div className="text-[#0066cc] shrink-0">{icon}</div>
      <span className="text-[11px] font-bold truncate">{label}</span>
    </div>
  );
}

function ReservationCard({ res, onDelete, lang }: { res: Reservation, onDelete: (id: string, e: React.MouseEvent) => void, lang: string, key?: string | number }) {
  const t = translations[lang as keyof typeof translations];
  
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#0066cc]/10 flex items-center justify-center text-[#0066cc]">
            <CalendarCheck size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">{res.roomName}</h4>
            {res.subject && (
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium italic mb-1">"{res.subject}"</p>
            )}
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center gap-1"><Clock size={14} /> {res.startTime}</span>
              <span className="flex items-center gap-1"><Users size={14} /> {res.duration}</span>
              <span>•</span>
              <span>{new Date(res.date).toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            res.status === 'Pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
            res.status === 'Confirmed' || res.status === 'Occupied' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-amber-400' :
            res.status === 'Completed' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' :
            'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
          }`}>
            {res.status === 'Pending' ? t.statusPending : 
             res.status === 'Confirmed' ? t.statusConfirmed : 
             res.status === 'Occupied' ? t.statusOccupied :
             res.status === 'Completed' ? t.statusCompleted : t.statusCancelled}
          </span>
          
          {(res.status === 'Pending' || res.status === 'Confirmed' || res.status === 'Occupied') && (
            <button 
              onClick={(e) => onDelete(res.id, e)}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors relative z-30"
              title={t.deleteReservation}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
