import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, Clock, Plus, StickyNote } from 'lucide-react';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CalendarEvent, EVENT_COLORS, EVENT_LABELS } from '../../types/calendar';
import { EventModal } from './EventModal';
import { toast } from 'sonner';

interface WeeklyCalendarProps {
  isStaff: boolean;
}

export function WeeklyCalendar({ isStaff }: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  // Carga de datos
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "calendar_events"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CalendarEvent[];
      setEvents(loadedEvents);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Guardar (Crear o Editar)
  const handleSaveEvent = async (eventData: Omit<CalendarEvent, 'id'>) => {
    try {
      if (editingEvent) {
        await updateDoc(doc(db, "calendar_events", editingEvent.id), eventData);
        toast.success("Actividad actualizada");
      } else {
        await addDoc(collection(db, "calendar_events"), eventData);
        toast.success("Nueva actividad creada");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    }
  };

  // Eliminar
  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, "calendar_events", id));
      toast.success("Actividad eliminada");
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const openNewEvent = (date: Date) => {
    if (!isStaff) return;
    setSelectedDate(date);
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const openEditEvent = (event: CalendarEvent) => {
    if (!isStaff) return; 
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white shadow-sm border-b border-slate-100">
        <button onClick={prevWeek} className="p-2 hover:bg-slate-100 rounded-full text-[#0B2149]"><ChevronLeft /></button>
        <h2 className="text-lg font-bold text-[#0B2149] capitalize">
          {format(startDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <button onClick={nextWeek} className="p-2 hover:bg-slate-100 rounded-full text-[#0B2149]"><ChevronRight /></button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayEvents = events
              .filter(e => e.date === format(day, 'yyyy-MM-dd'))
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={day.toString()} 
                className={`min-h-[150px] bg-white rounded-xl border p-3 flex flex-col gap-2 ${isToday ? 'border-blue-400 ring-1 ring-blue-100' : 'border-slate-200'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-400 uppercase">
                      {format(day, 'EEEE', { locale: es })}
                    </span>
                    <span className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  {isStaff && (
                    <button 
                      onClick={() => openNewEvent(day)}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditEvent(event);
                      }}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer hover:brightness-95 transition-all shadow-sm ${EVENT_COLORS[event.type]}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold uppercase opacity-75 text-[10px] tracking-wide">{EVENT_LABELS[event.type]}</span>
                        {event.notes && <StickyNote className="w-3 h-3 opacity-50" />}
                      </div>
                      
                      <div className="font-bold text-sm mb-1 leading-tight">{event.title}</div>
                      
                      <div className="flex items-center gap-1 font-medium mb-0.5 opacity-90">
                        <Clock className="w-3 h-3" />
                        {event.startTime} - {event.endTime}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-80 truncate">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </div>
                    </div>
                  ))}
                  {dayEvents.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-slate-300 text-xs italic">
                      -
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isStaff && (
        <EventModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          initialDate={selectedDate}
          editingEvent={editingEvent}
        />
      )}
    </div>
  );
}