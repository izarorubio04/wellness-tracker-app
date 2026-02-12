import { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Clock, Save, Info, Calendar as CalendarIcon } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { DEFAULT_SCHEDULE, UserPreferences, NotificationSchedule } from '../types/user';
import { Checkbox } from './ui/checkbox'; // <--- CAMBIO: Importamos Checkbox en lugar de Switch

interface NotificationSettingsProps {
  playerName: string;
  onBack: () => void;
}

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const HOURS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 7;
  return `${h.toString().padStart(2, '0')}:00`;
});

export function NotificationSettings({ playerName, onBack }: NotificationSettingsProps) {
  const [activeTab, setActiveTab] = useState<'wellness' | 'rpe'>('wellness');
  const [loading, setLoading] = useState(true);
  
  // Estado completo de preferencias
  const [preferences, setPreferences] = useState<UserPreferences>({
    wellness: { ...DEFAULT_SCHEDULE },
    rpe: { ...DEFAULT_SCHEDULE },
    calendarEnabled: false
  });

  useEffect(() => {
    loadPreferences();
  }, [playerName]);

  const loadPreferences = async () => {
    try {
      const docRef = doc(db, 'users', playerName);
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().preferences) {
        // Fusionamos con los valores por defecto para evitar errores
        setPreferences({
            ...{
                wellness: { ...DEFAULT_SCHEDULE },
                rpe: { ...DEFAULT_SCHEDULE },
                calendarEnabled: false
            },
            ...snap.data().preferences
        });
      }
    } catch (error) {
      console.error("Error cargando preferencias:", error);
      toast.error("No se pudieron cargar tus horarios");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (type: 'wellness' | 'rpe', dayKey: string, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [dayKey as keyof NotificationSchedule]: value
      }
    }));
  };

  const handleCalendarToggle = (checked: boolean) => {
    setPreferences(prev => ({
        ...prev,
        calendarEnabled: checked
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'users', playerName);
      await setDoc(docRef, { preferences }, { merge: true });
      toast.success("Preferencias actualizadas");
    } catch (error) {
      console.error("Error guardando:", error);
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const currentSchedule = activeTab === 'wellness' ? preferences.wellness : preferences.rpe;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#0B2149]">Notificaciones</h1>
            <p className="text-slate-500 text-sm">Configura tus alertas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('wellness')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'wellness' ? 'bg-white text-[#0B2149] shadow-sm' : 'text-slate-500'
            }`}
          >
            Wellness
          </button>
          <button
            onClick={() => setActiveTab('rpe')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'rpe' ? 'bg-white text-[#0B2149] shadow-sm' : 'text-slate-500'
            }`}
          >
            RPE
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        
        {loading ? (
          <div className="text-center py-10 text-slate-400">Cargando configuración...</div>
        ) : (
          <>
            {/* SECCIÓN CALENDARIO (GLOBAL) */}
            <div 
                className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 cursor-pointer"
                onClick={() => handleCalendarToggle(!preferences.calendarEnabled)} // Hace clicable toda la tarjeta
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-[#0B2149]">Cambios en Agenda</h3>
                            <p className="text-xs text-slate-500">Avísame si hay nuevos eventos o cambios</p>
                        </div>
                    </div>
                    
                    {/* AQUÍ ESTÁ EL CAMBIO: Checkbox cuadrado */}
                    <Checkbox 
                        checked={preferences.calendarEnabled}
                        onCheckedChange={handleCalendarToggle}
                        className="w-6 h-6 border-2 border-slate-300 data-[state=checked]:bg-[#89eb98] data-[state=checked]:border-[#d3dbeb]"
                    />
                </div>
            </div>

            {/* SECCIÓN HORARIOS (WELLNESS/RPE) */}
            <div>
                <h3 className="font-bold text-[#0B2149] mb-3 ml-1 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Horarios {activeTab === 'wellness' ? 'Wellness' : 'RPE'}
                </h3>
                
                <div className="space-y-3">
                    {DAYS.map((day) => (
                    <div key={day.key} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <span className="font-medium text-slate-700 w-24">{day.label}</span>
                        
                        <div className="relative flex-1 max-w-[140px]">
                        <select
                            value={currentSchedule[day.key as keyof NotificationSchedule] || "disabled"}
                            onChange={(e) => handleTimeChange(activeTab, day.key, e.target.value)}
                            className={`w-full p-2 pl-9 rounded-lg appearance-none outline-none font-medium text-sm border transition-colors ${
                            currentSchedule[day.key as keyof NotificationSchedule] === "disabled"
                                ? "bg-slate-50 text-slate-400 border-slate-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                        >
                            <option value="disabled">No enviar</option>
                            {HOURS.map(h => (
                            <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                        {currentSchedule[day.key as keyof NotificationSchedule] === "disabled" ? (
                            <Bell className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        ) : (
                            <Clock className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
                        )}
                        </div>
                    </div>
                    ))}
                </div>
            </div>
          </>
        )}
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-6 left-0 right-0 px-6">
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-[#0B2149] text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {loading ? "Guardando..." : (
            <>
              <Save className="w-5 h-5" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}