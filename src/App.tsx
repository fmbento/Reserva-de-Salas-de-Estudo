import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Bell, 
  User, 
  Map as MapIcon, 
  CalendarCheck, 
  Library, 
  Settings, 
  Zap, 
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
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type RoomStatus = 'Available' | 'Pending' | 'Occupied';

interface Room {
  id: string;
  name: string;
  department: string;
  status: RoomStatus;
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
  userId: number;
  date: string;
  startTime: string;
  duration: string;
  subject?: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Occupied';
}

interface UserData {
  id: number;
  name: string;
  email: string;
  permission_level: number;
}

const SchedulesView = ({ 
  rooms, 
  reservations,
  selectedRoomId, 
  setSelectedRoomId, 
  setBookingDate, 
  setBookingStartTime,
  setBookingDuration,
  onNewBooking
}: { 
  rooms: Room[], 
  reservations: Reservation[],
  selectedRoomId: string, 
  setSelectedRoomId: (id: string) => void,
  setBookingDate: (date: string) => void,
  setBookingStartTime: (time: string) => void,
  setBookingDuration: (duration: string) => void,
  onNewBooking: () => void
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
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

  const days = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
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
    const now = new Date();
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
        durationStr += `${h} Hora${h > 1 ? 's' : ''}`;
        if (m > 0) durationStr += ` e ${m}`;
      } else {
        durationStr = `${m} Minutos`;
      }
      
      const d = new Date(currentDate);
      d.setDate(d.getDate() - d.getDay() + 1 + dragStart.day);
      setBookingDate(d.toISOString().split('T')[0]);
      setBookingStartTime(startTimeStr);
      setBookingDuration(durationStr);
    }
    setIsDragging(false);
    // We no longer clear dragStart/dragEnd here to keep the selection visible
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

  // Map real reservations to schedule data
  const scheduleData = reservations
    .filter(res => res.roomId === selectedRoomId)
    .map(res => {
      const resDate = new Date(res.date);
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      
      const diffTime = resDate.getTime() - weekStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const startH = parseInt(res.startTime.split(':')[0]);
      const startM = parseInt(res.startTime.split(':')[1] || '0');
      const startTotal = startH * 60 + startM;
      
      // Parse duration string (e.g., "1 Hora", "45 Minutos")
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

      return {
        day: diffDays,
        start: res.startTime,
        startTotal,
        duration: durationMins,
        status: res.status === 'Pending' ? 'Pending' : 'Occupied',
        title: res.subject || 'Reserva'
      };
    })
    .filter(item => item.day >= 0 && item.day < 7);

  const getWeekRange = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('pt-PT')} - ${end.toLocaleDateString('pt-PT')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col overflow-hidden p-6 md:p-10"
    >
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Horários das Salas</h2>
            <p className="text-slate-500">Visualize a ocupação semanal e planeie as suas reservas.</p>
          </div>
          
          <button 
            onClick={onNewBooking}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <Plus size={20} />
            Nova Reserva
          </button>
        </div>

        {/* Filters & Legend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col gap-2 relative">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pesquisar / Selecionar Sala</label>
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
                    <div className="fixed inset-0 z-10" onClick={() => setIsSearchFocused(false)} />
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
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{room.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{room.department}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Semana de Visualização</label>
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
                <span className="text-xs font-medium text-slate-600">Livre</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-slate-600">Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <span className="text-xs font-medium text-slate-600">Ocupado</span>
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
                    d.setDate(d.getDate() - d.getDay() + 1 + i);
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
                            : 'bg-amber-50 border-amber-500 text-amber-900'
                        }`}
                        style={{ top: `${top + 4}px`, height: `${height - 8}px` }}
                      >
                        <div className="flex flex-col h-full">
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{item.status === 'Occupied' ? 'OCUPADO' : 'PENDENTE'}</span>
                          <span className="text-xs font-bold truncate mt-1">{item.title}</span>
                          <span className="text-[10px] mt-auto opacity-70">{item.start} - {Math.floor((item.startTotal + item.duration) / 60)}:{(item.startTotal + item.duration) % 60 === 0 ? '00' : (item.startTotal + item.duration) % 60}</span>
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
  const [currentView, setCurrentView] = useState<'map' | 'reservations' | 'schedules'>('map');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('101');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [bookingMessage, setBookingMessage] = useState<string>('');
  
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookingStartTime, setBookingStartTime] = useState<string>('09:00');
  const [bookingDuration, setBookingDuration] = useState<string>('1 Hora');
  const [bookingSubject, setBookingSubject] = useState<string>('');
  
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

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, reservationsRes, userRes] = await Promise.all([
          fetch('/api/rooms'),
          fetch('/api/reservations'),
          fetch('/api/user/me')
        ]);

        const roomsData = await roomsRes.json();
        const reservationsData = await reservationsRes.json();
        const userData = await userRes.json();

        // Map database rooms to frontend Room interface
        const mappedRooms = roomsData.map((r: any) => ({
          ...r,
          amenities: ['Eduroam', 'Tomadas'], // Default amenities for now
          image: 'https://picsum.photos/seed/' + r.id + '/800/600',
          top: r.id === '101' ? '20%' : r.id === '102' ? '20%' : r.id === '201' ? '50%' : '70%',
          left: r.id === '101' ? '15%' : r.id === '102' ? '30%' : r.id === '201' ? '45%' : '70%'
        }));

        // Map database reservations to frontend Reservation interface
        const mappedReservations = reservationsData.map((r: any) => ({
          id: r.id.toString(),
          roomId: r.room_id,
          roomName: r.room_name,
          userId: r.user_id,
          date: r.date,
          startTime: r.start_time,
          duration: r.duration >= 60 ? `${Math.floor(r.duration / 60)} Hora${r.duration >= 120 ? 's' : ''}${r.duration % 60 > 0 ? ' e ' + (r.duration % 60) : ''}` : `${r.duration} Minutos`,
          subject: r.subject,
          status: r.status
        }));

        setRooms(mappedRooms);
        setReservations(mappedReservations);
        setCurrentUser(userData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, []);

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
      return startTotal >= resStartTotal && startTotal < resEndTotal;
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
    const now = new Date();
    const activeStartTime = forcedStartTime || bookingStartTime;
    const [h, m] = activeStartTime.split(':').map(Number);
    const bDate = new Date(bookingDate + 'T00:00:00');
    bDate.setHours(h, m, 0, 0);
    
    if (bDate < now) {
      setBookingStatus('error');
      setBookingMessage('Não é possível reservar para uma data ou hora anterior à atual.');
      return;
    }

    setBookingStatus('checking');
    setBookingMessage('A verificar disponibilidade em tempo real...');

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

      // Check for overlap
      const overlappingRes = userReservations.find(res => 
        (startTotal < res.endTotal && requestedEndTotal > res.startTotal)
      );

      if (overlappingRes) {
        // Try to suggest adjustments
        // Case A: User has a reservation that ends after our requested start
        if (overlappingRes.endTotal > startTotal && overlappingRes.startTotal <= startTotal) {
          const newStartTotal = overlappingRes.endTotal;
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
        
        // Case B: User has a reservation that starts before our requested end
        if (overlappingRes.startTotal < requestedEndTotal && overlappingRes.endTotal >= requestedEndTotal) {
          const newDuration = overlappingRes.startTotal - startTotal;
          
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
        setBookingMessage('Já possui uma reserva ativa que se sobrepõe a este horário. Se desejar manter esta nova marcação, deverá primeiro apagar a(s) outra(s) reserva(s) que fez antes para parte do tempo que agora estava a marcar, e voltar a inserir a reserva pretendida.');
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

      if (nextReservation && nextReservation.startTotal < requestedEndTotal) {
        const availableMins = nextReservation.startTotal - startTotal;
        const availableUntilH = Math.floor(nextReservation.startTotal / 60);
        const availableUntilM = nextReservation.startTotal % 60;
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
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: selectedRoomId,
          user_id: currentUser?.id || 1,
          date: bookingDate,
          start_time: activeStartTime,
          duration: durationMins,
          subject: bookingSubject
        })
      });

      if (!response.ok) throw new Error("Failed to create reservation");

      const newRes = await response.json();
      
      // Refresh reservations
      const reservationsRes = await fetch('/api/reservations');
      const reservationsData = await reservationsRes.json();
      const mappedReservations = reservationsData.map((r: any) => ({
        id: r.id.toString(),
        roomId: r.room_id,
        roomName: r.room_name,
        date: r.date,
        startTime: r.start_time,
        duration: r.duration >= 60 ? `${Math.floor(r.duration / 60)} Hora${r.duration >= 120 ? 's' : ''}${r.duration % 60 > 0 ? ' e ' + (r.duration % 60) : ''}` : `${r.duration} Minutos`,
        subject: r.subject,
        status: r.status
      }));

      setReservations(mappedReservations);
      setBookingStatus('success');
      setBookingMessage('Reserva efetuada com sucesso! O seu pedido está pendente de aprovação.');
      
      setTimeout(() => setBookingStatus('idle'), 3000);
    } catch (error) {
      setBookingStatus('error');
      setBookingMessage('Lamentamos, mas ocorreu um erro ao processar a sua reserva.');
    }
  };

  const handleDeleteReservation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReservationToDelete(id);
  };

  const confirmDelete = async () => {
    if (!reservationToDelete) return;
    
    try {
      const response = await fetch(`/api/reservations/${reservationToDelete}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error("Failed to delete reservation");

      setReservations(prev => prev.filter(res => res.id !== reservationToDelete));
      setReservationToDelete(null);
      setBookingStatus('success');
      setBookingMessage('Reserva eliminada com sucesso.');
      setTimeout(() => setBookingStatus('idle'), 3000);
    } catch (error) {
      console.error("Delete failed:", error);
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
      case 'Available': return 'Disponível';
      case 'Pending': return 'Pendente';
      case 'Occupied': return 'Ocupada';
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background-light overflow-hidden">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 md:px-10 shrink-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-primary">
            <Building2 className="h-8 w-8" />
            <h2 className="text-lg font-bold tracking-tight text-slate-900">SIRS - UA</h2>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setCurrentView('map')}
              className={`text-sm font-semibold transition-colors ${currentView === 'map' ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}
            >
              Mapa
            </button>
            <button 
              onClick={() => setCurrentView('reservations')}
              className={`text-sm font-semibold transition-colors ${currentView === 'reservations' ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}
            >
              As Minhas Reservas
            </button>
            <button 
              onClick={() => setCurrentView('schedules')}
              className={`text-sm font-semibold transition-colors ${currentView === 'schedules' ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}
            >
              Horários
            </button>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <div className="flex items-center bg-slate-100 rounded-lg px-3 h-10 w-64">
              <Search className="h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Pesquisar salas ou departamentos..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400"
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
                          className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
                        >
                          <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center ${
                            room.status === 'Available' ? 'bg-emerald-100 text-emerald-600' :
                            room.status === 'Pending' ? 'bg-amber-100 text-amber-600' :
                            'bg-rose-100 text-rose-600'
                          }`}>
                            <DoorOpen size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{room.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{room.department}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-slate-500">Nenhuma sala encontrada.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col justify-between border-r border-slate-200 bg-white p-4 shrink-0">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col">
              <h1 className="text-base font-semibold text-slate-900">Universidade de Aveiro</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">SISTEMA DE SALAS DE ESTUDO</p>
            </div>
            
            <div className="flex flex-col gap-1">
              <SidebarLink 
                icon={<MapIcon size={20} />} 
                label="Mapa Interativo" 
                active={currentView === 'map'} 
                onClick={() => setCurrentView('map')}
              />
              <SidebarLink 
                icon={<Calendar size={20} />} 
                label="Horários" 
                active={currentView === 'schedules'} 
                onClick={() => setCurrentView('schedules')}
              />
              <SidebarLink 
                icon={<CalendarCheck size={20} />} 
                label="As Minhas Reservas" 
                active={currentView === 'reservations'} 
                onClick={() => setCurrentView('reservations')}
              />
              <SidebarLink icon={<Library size={20} />} label="Info. Biblioteca" />
              <SidebarLink icon={<Settings size={20} />} label="Definições" />
            </div>
          </div>

          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all">
            <Zap size={18} />
            Reserva Rápida
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="relative flex-1 bg-slate-50 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {currentView === 'map' ? (
              <motion.div 
                key="map-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative flex-1 overflow-hidden"
              >
                {/* Legend */}
                <div className="absolute top-4 left-4 z-10 flex gap-2 rounded-xl border border-white bg-white/90 p-1 shadow-lg backdrop-blur">
                  <LegendItem color="bg-emerald-500" label="Disponível" />
                  <LegendItem color="bg-amber-500" label="Pendente" />
                  <LegendItem color="bg-rose-500" label="Ocupada" />
                </div>

                {/* Map Container */}
                <div className="absolute inset-0 flex items-center justify-center p-8 md:p-12">
                  <div className="relative aspect-[16/9] w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                    {/* Mock Floor Plan Background */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]" />
                    <img 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbxYnpeFgrKCCtNhvNVWYcRUFOtGcXPDnDip-6rl1b1dSDK-8wOtJRcsUlpl15Yrzy7uzXt3e8BZVlpKaRsG6H3McutJ3Plv1dPQftc1vKhmmy2i0sqJwcoRrT1VITZBgTCLQn6ERjESvK6-v-eh0qWKdBXBQxzpLdiYvV6wUZLgTuNfr8z61ULNSYf2_TLqwq2HXRvSlPJdE3qhWflB0Nx7A8SUcHx_yKgDij92uhCNfvB6vPvd0-AMVJbOZ3zWPqy8lphG_2ex0" 
                      alt="Planta do Piso" 
                      className="h-full w-full object-cover opacity-30 grayscale"
                      referrerPolicy="no-referrer"
                    />

                    {/* Room Markers */}
                    {rooms.map((room) => {
                      const dynamicStatus = getDynamicRoomStatus(room.id, bookingDate, bookingStartTime);
                      const statusColor = dynamicStatus === 'Available' ? 'bg-emerald-500' : 
                                         dynamicStatus === 'Pending' ? 'bg-amber-500' : 'bg-rose-500';
                      return (
                        <RoomMarker 
                          key={room.id} 
                          room={room} 
                          isSelected={selectedRoomId === room.id}
                          onClick={() => setSelectedRoomId(room.id)}
                          statusColor={statusColor}
                          status={dynamicStatus}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Map Controls */}
                <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                  <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-lg hover:bg-slate-50">
                    <Plus size={20} />
                  </button>
                  <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-lg hover:bg-slate-50">
                    <Minus size={20} />
                  </button>
                  <button className="mt-2 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-primary shadow-lg hover:bg-slate-50">
                    <Crosshair size={20} />
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
              />
            ) : (
              <motion.div 
                key="reservations-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 overflow-y-auto p-6 md:p-10"
              >
                <div className="max-w-4xl mx-auto">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">As Minhas Reservas</h2>
                    <p className="text-slate-500">Consulte e gira as suas reservas de salas de estudo.</p>
                  </div>

                  {reservations.length > 0 ? (
                    <div className="space-y-10">
                      {/* Process reservations with current time logic */}
                      {(() => {
                        const now = new Date();
                        
                        const processedReservations = reservations.map(res => {
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
                                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Reservas Ativas</h3>
                                </div>
                                <div className="space-y-4">
                                  {active.map((res) => (
                                    <ReservationCard key={res.id} res={res} onDelete={handleDeleteReservation} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Completed Reservations */}
                            {completed.length > 0 && (
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="h-2 w-2 rounded-full bg-slate-300" />
                                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Reservas Concluídas</h3>
                                </div>
                                <div className="space-y-4 opacity-80">
                                  {completed.map((res) => (
                                    <ReservationCard key={res.id} res={res} onDelete={handleDeleteReservation} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                      <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <CalendarCheck size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Sem reservas</h3>
                      <p className="text-slate-500">Ainda não efetuou nenhuma reserva de sala.</p>
                      <button 
                        onClick={() => setCurrentView('map')}
                        className="mt-6 px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
                      >
                        Reservar Agora
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Room Details Sidebar (Only visible on Map and Schedules view) */}
        {(currentView === 'map' || currentView === 'schedules') && selectedRoom && (
          <aside className="w-full md:w-80 flex flex-col border-l border-slate-200 bg-white overflow-y-auto shrink-0">
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
                    <h3 className="text-xl font-bold text-slate-900">{selectedRoom.name}</h3>
                    <p className="text-sm text-slate-500">{selectedRoom.department}</p>
                  </div>
                  <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime) === 'Available' ? 'bg-emerald-100 text-emerald-600' :
                    getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime) === 'Pending' ? 'bg-amber-100 text-amber-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    {getStatusLabel(getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime))}
                  </span>
                </div>

                <div className="space-y-6">
                  <div className="aspect-video overflow-hidden rounded-xl bg-slate-100">
                    <img 
                      src={selectedRoom.image} 
                      alt={selectedRoom.name} 
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div>
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Comodidades</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Amenity icon={<Users size={16} />} label={`Capacidade: ${selectedRoom.capacity}`} />
                      <Amenity icon={<Wifi size={16} />} label="Eduroam" />
                      <Amenity icon={<Plug size={16} />} label="Tomadas" />
                      <Amenity icon={<Monitor size={16} />} label="Ecrã Inteligente" />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Reservar este espaço</h4>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Assunto / Porquê</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Estudo de Grupo, Reunião..."
                          value={bookingSubject}
                          onChange={(e) => setBookingSubject(e.target.value)}
                          className="w-full rounded-lg border-slate-200 bg-slate-50 text-sm focus:border-primary focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Selecionar Data</label>
                        <input 
                          type="date" 
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full rounded-lg border-slate-200 bg-slate-50 text-sm focus:border-primary focus:ring-primary"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-600">Hora de Início</label>
                          <select 
                            value={bookingStartTime}
                            onChange={(e) => setBookingStartTime(e.target.value)}
                            className="w-full rounded-lg border-slate-200 bg-slate-50 text-sm focus:border-primary focus:ring-primary"
                          >
                            {Array.from({ length: 40 }, (_, i) => {
                              const h = Math.floor(i / 4) + 8;
                              const m = (i % 4) * 15;
                              const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                              return <option key={time} value={time}>{time}</option>;
                            })}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-600">Duração</label>
                          <select 
                            value={bookingDuration}
                            onChange={(e) => setBookingDuration(e.target.value)}
                            className="w-full rounded-lg border-slate-200 bg-slate-50 text-sm focus:border-primary focus:ring-primary"
                          >
                            <option value="15 Minutos">15 Minutos</option>
                            <option value="30 Minutos">30 Minutos</option>
                            <option value="45 Minutos">45 Minutos</option>
                            <option value="1 Hora">1 Hora</option>
                            <option value="1 Hora e 15">1 Hora e 15</option>
                            <option value="1 Hora e 30">1 Hora e 30</option>
                            <option value="1 Hora e 45">1 Hora e 45</option>
                            <option value="2 Horas">2 Horas</option>
                            <option value="2 Horas e 15">2 Horas e 15</option>
                            <option value="2 Horas e 30">2 Horas e 30</option>
                            <option value="2 Horas e 45">2 Horas e 45</option>
                            <option value="3 Horas">3 Horas</option>
                            <option value="4 Horas">4 Horas</option>
                            {/* Fallback for custom drag durations */}
                            {!["15 Minutos", "30 Minutos", "45 Minutos", "1 Hora", "1 Hora e 15", "1 Hora e 30", "1 Hora e 45", "2 Horas", "2 Horas e 15", "2 Horas e 30", "2 Horas e 45", "3 Horas", "4 Horas"].includes(bookingDuration) && (
                              <option value={bookingDuration}>{bookingDuration}</option>
                            )}
                          </select>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleConfirmBooking()}
                        disabled={
                          bookingStatus === 'checking' || 
                          getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime) !== 'Available' ||
                          (() => {
                            const now = new Date();
                            const [h, m] = bookingStartTime.split(':').map(Number);
                            const bDate = new Date(bookingDate + 'T00:00:00');
                            bDate.setHours(h, m, 0, 0);
                            return bDate < now;
                          })()
                        }
                        className={`w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                          getDynamicRoomStatus(selectedRoom.id, bookingDate, bookingStartTime) !== 'Available' ||
                          (() => {
                            const now = new Date();
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
                            A verificar...
                          </>
                        ) : (
                          'Confirmar Reserva'
                        )}
                      </button>
                      <p className="text-center text-[10px] text-slate-400">
                        Validação necessária via código QR na entrada da sala.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </aside>
        )}

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
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Conflito de Horário</h3>
                <p className="text-slate-600 mb-6">
                  {conflictModal.type === 'room' ? (
                    <>
                      Esta sala só está disponível até às <span className="font-bold text-slate-900">{conflictModal.availableUntil}</span> devido a outra reserva. 
                      Deseja aceitar a reserva com a duração reduzida para <span className="font-bold text-slate-900">{conflictModal.newDuration} minutos</span>?
                    </>
                  ) : conflictModal.type === 'user_start' ? (
                    <>
                      Já possui outra reserva que termina às <span className="font-bold text-slate-900">{conflictModal.availableFrom}</span>. 
                      Deseja alterar a hora de início para as <span className="font-bold text-slate-900">{conflictModal.newStartTime}</span>?
                    </>
                  ) : (
                    <>
                      Já possui outra reserva que começa às <span className="font-bold text-slate-900">{conflictModal.availableUntil}</span>. 
                      Deseja reduzir a duração desta reserva para <span className="font-bold text-slate-900">{conflictModal.newDuration} minutos</span>?
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
                    Sim, aceitar alteração
                  </button>
                  <button 
                    onClick={() => setConflictModal({ ...conflictModal, isOpen: false })}
                    className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                  >
                    Não, cancelar pedido
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
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
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
                  <h3 className="text-lg font-bold">Confirmar Eliminação</h3>
                </div>
                <p className="text-slate-600 text-sm mb-6">
                  Tem a certeza que deseja eliminar esta reserva? Esta ação não pode ser revertida.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setReservationToDelete(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
                  >
                    Eliminar
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
        active ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      <p className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>{label}</p>
    </button>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-600">
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
      className="absolute group z-20"
      style={{ top: room.top, left: room.left }}
    >
      <div className="flex flex-col items-center">
        <motion.div 
          animate={{ scale: isSelected ? 1.1 : 1 }}
          className={`px-3 py-1 text-white text-[10px] font-bold rounded-t-lg shadow-lg ${statusColor}`}
        >
          {room.name.split(' ')[1]}
        </motion.div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-b-lg border-2 bg-white transition-all group-hover:scale-110 ${
          isSelected ? `border-primary shadow-xl` : `border-slate-200`
        }`}>
          {status === 'Occupied' ? (
            <Lock className="h-5 w-5 text-rose-500" />
          ) : status === 'Pending' ? (
            <Clock className="h-5 w-5 text-amber-500" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          )}
        </div>
      </div>
    </button>
  );
}

function Amenity({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-600">
      <span className="text-slate-400">{icon}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

function ReservationCard({ res, onDelete }: { res: Reservation, onDelete: (id: string, e: React.MouseEvent) => void, key?: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <CalendarCheck size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">{res.roomName}</h4>
            {res.subject && (
              <p className="text-xs text-slate-600 font-medium italic mb-1">"{res.subject}"</p>
            )}
            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1"><Clock size={14} /> {res.startTime}</span>
              <span className="flex items-center gap-1"><Users size={14} /> {res.duration}</span>
              <span>•</span>
              <span>{new Date(res.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            res.status === 'Pending' ? 'bg-amber-100 text-amber-600' :
            res.status === 'Confirmed' || res.status === 'Occupied' ? 'bg-emerald-100 text-emerald-600' :
            res.status === 'Completed' ? 'bg-slate-100 text-slate-600' :
            'bg-rose-100 text-rose-600'
          }`}>
            {res.status === 'Pending' ? 'Pendente' : (res.status === 'Confirmed' || res.status === 'Occupied') ? 'Confirmada' : res.status === 'Completed' ? 'Concluída' : 'Cancelada'}
          </span>
          
          {(res.status === 'Pending' || res.status === 'Confirmed' || res.status === 'Occupied') && (
            <button 
              onClick={(e) => onDelete(res.id, e)}
              className="p-2 text-slate-400 hover:text-rose-500 transition-colors relative z-30"
              title="Eliminar reserva"
            >
              <Trash2 size={18} />
            </button>
          )}
          
          <button className="p-2 text-slate-400 hover:text-primary transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
