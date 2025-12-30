import { useState } from 'react';
import { Moon, Zap, Dumbbell, Brain, Smile, ArrowLeft, FileText } from 'lucide-react';
import { cn } from './ui/utils'; // Asegúrate de tener esta utilidad (o usa clsx/tailwind-merge)

export interface WellnessData {
  sleepQuality: number;
  fatigueLevel: number;
  muscleSoreness: number;
  stressLevel: number;
  mood: number;
  menstruationStatus: string;
  notes: string;
}

interface DailyWellnessProps {
  onBack: () => void;
  onSubmit: (data: WellnessData) => void;
}

export function DailyWellness({ onBack, onSubmit }: DailyWellnessProps) {
  // Inicializamos con valores por defecto
  const [sleepQuality, setSleepQuality] = useState(7);
  const [fatigueLevel, setFatigueLevel] = useState(5);
  const [muscleSoreness, setMuscleSoreness] = useState(5);
  const [stressLevel, setStressLevel] = useState(5);
  const [mood, setMood] = useState(7);
  
  const [menstruationStatus, setMenstruationStatus] = useState('none');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit({
      sleepQuality,
      fatigueLevel,
      muscleSoreness,
      stressLevel,
      mood,
      menstruationStatus,
      notes
    });
    onBack();
  };

  // Lógica de colores para los botones
  const getColorClass = (val: number, inverted = false) => {
    if (inverted) {
      if (val <= 3) return 'bg-emerald-500 text-white border-emerald-600'; // Bien (Bajo)
      if (val <= 6) return 'bg-amber-400 text-white border-amber-500';     // Regular
      return 'bg-red-500 text-white border-red-600';                       // Mal (Alto)
    } else {
      if (val >= 7) return 'bg-emerald-500 text-white border-emerald-600'; // Bien (Alto)
      if (val >= 4) return 'bg-amber-400 text-white border-amber-500';     // Regular
      return 'bg-red-500 text-white border-red-600';                       // Mal (Bajo)
    }
  };

  // Componente de Selección Numérica (Botones 1-10)
  const NumberSelector = ({ 
    icon: Icon, 
    label, 
    value, 
    onChange, 
    inverted = false 
  }: { 
    icon: any, 
    label: string, 
    value: number, 
    onChange: (val: number) => void, 
    inverted?: boolean 
  }) => {
    // Calculamos el color del icono basado en el valor actual
    const currentIconColor = inverted 
        ? (value <= 3 ? '#10B981' : value <= 6 ? '#F59E0B' : '#EF4444')
        : (value >= 7 ? '#10B981' : value >= 4 ? '#F59E0B' : '#EF4444');

    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 transition-colors duration-300">
            <Icon className="w-5 h-5 transition-colors duration-300" style={{ color: currentIconColor }} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#0B2149]">{label}</h4>
          </div>
          <div className="text-2xl font-black text-[#0B2149]">{value}</div>
        </div>

        {/* Rejilla de botones */}
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
            const isSelected = value === num;
            const colorClass = isSelected 
              ? getColorClass(num, inverted) 
              : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100';

            return (
              <button
                key={num}
                onClick={() => onChange(num)}
                className={cn(
                  "h-10 w-full rounded-lg font-bold text-sm transition-all duration-200 border-b-2 active:scale-95 flex items-center justify-center",
                  colorClass
                )}
              >
                {num}
              </button>
            );
          })}
        </div>
        
        <div className="flex justify-between mt-2 px-1">
           <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
             {inverted ? 'Mejor' : 'Peor'}
           </span>
           <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
             {inverted ? 'Peor' : 'Mejor'}
           </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0B2149] to-[#1a3a6b] px-6 pt-12 pb-10 rounded-b-[2.5rem] shadow-xl text-white mb-6">
        <button 
            onClick={onBack} 
            className="mb-6 flex items-center gap-2 text-blue-100 hover:text-white transition-colors active:scale-95 w-fit"
        >
          <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm">
             <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="font-medium">Volver</span>
        </button>
        <h1 className="text-3xl font-bold mb-2">Wellness Diario</h1>
        <p className="text-blue-200 text-sm">Registra tus sensaciones pulsando del 1 al 10.</p>
      </div>

      {/* Formulario */}
      <div className="px-5 space-y-4">
        <NumberSelector
          icon={Moon}
          label="Calidad del Sueño"
          value={sleepQuality}
          onChange={setSleepQuality}
        />

        <NumberSelector
          icon={Zap}
          label="Nivel de Fatiga"
          value={fatigueLevel}
          onChange={setFatigueLevel}
          inverted
        />

        <NumberSelector
          icon={Dumbbell}
          label="Dolor Muscular"
          value={muscleSoreness}
          onChange={setMuscleSoreness}
          inverted
        />

        <NumberSelector
          icon={Brain}
          label="Nivel de Estrés"
          value={stressLevel}
          onChange={setStressLevel}
          inverted
        />

        <NumberSelector
          icon={Smile}
          label="Estado de Ánimo"
          value={mood}
          onChange={setMood}
        />

        {/* Estado Menstrual */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h4 className="text-sm font-bold text-[#0B2149] mb-4">Estado Menstrual</h4>
          <div className="grid grid-cols-3 gap-2">
            {['none', 'active', 'pms'].map((status) => (
              <button
                key={status}
                onClick={() => setMenstruationStatus(status)}
                className={cn(
                  "py-3 px-2 rounded-xl transition-all text-xs font-bold uppercase tracking-wide border-b-2",
                  menstruationStatus === status
                    ? 'bg-[#0B2149] text-white border-[#071633] shadow-md transform scale-[1.02]'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                )}
              >
                {status === 'none' ? 'Ninguno' : status === 'active' ? 'Regla' : 'SPM'}
              </button>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="text-sm font-bold text-[#0B2149]">Notas Adicionales</h4>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="¿Alguna molestia, dolor o comentario para el staff?"
            className="w-full h-24 bg-slate-50 rounded-xl p-4 resize-none text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2149] placeholder:text-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Botón Guardar Flotante */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-6 z-50">
        <button
          onClick={handleSubmit}
          className="w-full bg-[#0B2149] hover:bg-[#1a3a6b] text-white py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-900/20 font-bold text-lg flex items-center justify-center gap-2"
        >
          <span>Guardar Datos</span>
        </button>
      </div>
    </div>
  );
}