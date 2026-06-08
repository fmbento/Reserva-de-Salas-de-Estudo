import React, { useMemo } from 'react';
import { 
  User, 
  LogOut, 
  Globe, 
  Sun, 
  Moon, 
  Calendar, 
  Clock, 
  Info,
  ShieldCheck,
  Building,
  Award
} from 'lucide-react';
import { motion } from 'motion/react';
import { Language, translations } from '../../translations';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'bibliotecário' | 'admin' | 'blocked';
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
  lang?: string;
}

interface ManagementViewProps {
  currentUser: UserData | null;
  reservations: Reservation[];
  lang: Language;
  setLang: (lang: Language) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onLogout: () => void;
}

const parseDurationToHours = (durationStr: string): number => {
  if (!durationStr) return 0;
  if (durationStr.includes('Minutos')) {
    const min = parseInt(durationStr);
    return isNaN(min) ? 0 : min / 60;
  }
  if (durationStr.includes('Hora')) {
    const parts = durationStr.split(' ');
    const hours = parseInt(parts[0]);
    const hz = isNaN(hours) ? 0 : hours;
    if (durationStr.includes('e 15')) return hz + 0.25;
    if (durationStr.includes('e 30')) return hz + 0.5;
    if (durationStr.includes('e 45')) return hz + 0.75;
    return hz;
  }
  return 1.0;
};

export default function ManagementView({
  currentUser,
  reservations,
  lang,
  setLang,
  theme,
  toggleTheme,
  onLogout
}: ManagementViewProps) {
  const t = translations[lang];

  // User details
  const nameInitials = useMemo(() => {
    if (!currentUser?.name) return 'UA';
    const parts = currentUser.name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }, [currentUser?.name]);

  // Statistics
  const stats = useMemo(() => {
    if (!currentUser) return { active: 0, completed: 0, hours: 0 };
    const userRes = reservations.filter(r => r.userId === currentUser.id);
    
    const active = userRes.filter(r => r.status === 'Pending' || r.status === 'Confirmed' || r.status === 'Occupied').length;
    const completed = userRes.filter(r => r.status === 'Completed').length;
    
    const totalHours = userRes
      .filter(r => r.status === 'Completed' || r.status === 'Confirmed' || r.status === 'Occupied')
      .reduce((acc, res) => acc + parseDurationToHours(res.duration), 0);

    return {
      active,
      completed,
      hours: parseFloat(totalHours.toFixed(1))
    };
  }, [reservations, currentUser]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="flex-1 overflow-y-auto px-4 py-6 pb-28 md:p-10 select-none bg-slate-50 dark:bg-slate-950 transition-colors"
      style={{ WebkitUserSelect: 'none' }}
    >
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 android-shadow-2 flex flex-col items-center text-center relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 p-3">
            <span className="bg-[#0066cc]/10 dark:bg-[#0066cc]/25 text-[#0066cc] dark:text-blue-400 text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
              <ShieldCheck size={10} />
              Estudante
            </span>
          </div>

          <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-[#0066cc] to-sky-400 text-white flex items-center justify-center font-bold text-2xl tracking-wide shadow-lg mb-4">
            {nameInitials}
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-full">
            {currentUser?.name || "Estudante UA"}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-2 font-mono">
            {currentUser?.email || "estudante@ua.pt"}
          </p>
        </div>

        {/* Dynamic Booking Statistics Dashboard */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 android-shadow-1 flex flex-col items-center">
            <span className="text-2xl font-black text-[#0066cc] dark:text-blue-400">{stats.active}</span>
            <span className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mt-1 text-center">Ativas</span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 android-shadow-1 flex flex-col items-center">
            <span className="text-2xl font-black text-emerald-500">{stats.completed}</span>
            <span className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mt-1 text-center">Concluídas</span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 android-shadow-1 flex flex-col items-center">
            <span className="text-2xl font-black text-amber-500">{stats.hours}h</span>
            <span className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mt-1 text-center font-sans">Reservadas</span>
          </div>
        </div>

        {/* Control Center Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 android-shadow-1 overflow-hidden transition-colors">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Definições de Aplicação</h4>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/85">
            {/* Language Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0066cc] dark:text-blue-400 flex items-center justify-center">
                  <Globe size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Idioma / Language</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Alternar idioma da interface</p>
                </div>
              </div>
              <button 
                onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
                className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-xs"
                style={{ minWidth: '70px', height: '40px' }}
              >
                {lang.toUpperCase()}
              </button>
            </div>

            {/* Theme Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center">
                  {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tema Visual</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    OLED Dark Mode ativo
                  </p>
                </div>
              </div>
              <button 
                onClick={toggleTheme}
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Operating Rules Guideline Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 android-shadow-1 p-5 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-[#0066cc]" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Regras de Reserva do Estudante</h4>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 leading-relaxed">
            <li className="flex items-start gap-2">
              <Clock size={14} className="mt-0.5 text-slate-400 shrink-0" />
              <span>Duração máxima permitida por reserva: <strong>4 Horas</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <Calendar size={14} className="mt-0.5 text-slate-400 shrink-0" />
              <span>Janela de antecedência de reserva: Até <strong>48 Horas</strong> no futuro.</span>
            </li>
            <li className="flex items-start gap-2">
              <Award size={14} className="mt-0.5 text-slate-400 shrink-0" />
              <span>Limite diário de reservas: Máximo de <strong>3 marcações</strong> por utilizador.</span>
            </li>
          </ul>
        </div>

        {/* Sign Out Action Button */}
        <div className="pt-2">
          <button 
            onClick={onLogout}
            className="w-full h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 border border-transparent dark:border-slate-800 transition-all font-bold text-sm flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Terminar Sessão (Sair)
          </button>
        </div>

      </div>
    </motion.div>
  );
}
