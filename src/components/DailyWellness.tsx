import { useState } from 'react';
import { Moon, Zap, Dumbbell, Brain, Smile, ArrowLeft, FileText } from 'lucide-react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from './ui/utils';
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

  // Lógica de colores (devuelve clases de Tailwind para rendimiento)
  const getSliderColorClass = (value: number, inverted = false) => {
    if (inverted) {
      if (value <= 3) return 'bg-emerald-500'; // Bien (Bajo)
      if (value <= 6) return 'bg-amber-500';   // Regular
      return 'bg-red-500';                     // Mal (Alto)
    } else {
      if (value >= 7) return 'bg-emerald-500'; // Bien (Alto)
      if (value >= 4) return 'bg-amber-500';   // Regular
      return 'bg-red-500';                     // Mal (Bajo)
    }
  };

  // Componente Slider Optimizado (Usando Radix UI directamente para máximo rendimiento)
  const HighPerformanceSlider = ({ 
    icon: Icon, 
    label, 
    value, 
    onChange, 
    inverted = false 
  }: { 
    icon: any, 
    label: string, 
    value: number, 
    onChange: (value: number) => void, 
    inverted?: boolean 
  }) => {
    const colorClass = getSliderColorClass(value, inverted);
    const iconColor = inverted 
        ? (value <= 3 ? '#10B981' : value <= 6 ? '#F59E0B' : '#EF4444')
        : (value >= 7 ? '#10B981' : value >= 4 ? '#F59E0B' : '#EF4444');
    
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50">
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#0B2149]">{label}</h4>
          </div>
          <div className={`text-2xl font-black ${colorClass.replace('bg-', 'text-')}`}>{value}</div>
        </div>

        <SliderPrimitive.Root
          className="relative flex w-full touch-none select-none items-center"
          value={[value]}
          max={10}
          min={1}
          step={1}
          onValueChange={(vals) => onChange(vals[0])}
        >
          {/* Riel de fondo (Gris) */}
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-100">
            {/* Parte rellena (Color dinámico) */}
            <SliderPrimitive.Range className={cn("absolute h-full transition-colors duration-300", colorClass)} />
          </SliderPrimitive.Track>
          
          {/* Botón deslizante (Thumb) */}
          <SliderPrimitive.Thumb
            className={cn(
              "block h-6 w-6 rounded-full border-2 border-white shadow-lg ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              colorClass
            )}
          />
        </SliderPrimitive.Root>

        <div className="flex justify-between mt-3 px-1">
          <span className="text-xs font-medium text-slate-400">1</span>
          <span className="text-xs font-medium text-slate-400">10</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0B2149] to-[#1a3a6b] px-6 pt-12 pb-10 rounded-b-[2rem] shadow-xl text-white">
        <button 
            onClick={onBack} 
            className="mb-6 flex items-center gap-2 text-blue-100 hover:text-white transition-colors active:scale-95 w-fit"
        >
          <div className="bg-white/10 p-2 rounded-full">
             <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="font-medium">Volver</span>
        </button>
        <h1 className="text-3xl font-bold mb-2">Wellness Diario</h1>
        <p className="text-blue-200 text-sm">Registra tus sensaciones antes de entrenar.</p>
      </div>

      {/* Formulario */}
      <div className="px-5 -mt-6 space-y-4">
        <HighPerformanceSlider
          icon={Moon}
          label="Calidad del Sueño"
          value={sleepQuality}
          onChange={setSleepQuality}
        />

        <HighPerformanceSlider
          icon={Zap}
          label="Nivel de Fatiga"
          value={fatigueLevel}
          onChange={setFatigueLevel}
          inverted
        />

        <HighPerformanceSlider
          icon={Dumbbell}
          label="Dolor Muscular"
          value={muscleSoreness}
          onChange={setMuscleSoreness}
          inverted
        />

        <HighPerformanceSlider
          icon={Brain}
          label="Nivel de Estrés"
          value={stressLevel}
          onChange={setStressLevel}
          inverted
        />

        <HighPerformanceSlider
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
                className={`py-3 px-2 rounded-xl transition-all text-xs font-bold uppercase tracking-wide border ${
                  menstruationStatus === status
                    ? 'bg-[#0B2149] text-white border-[#0B2149] shadow-md'
                    : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                }`}
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

      {/* Botón Guardar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-6 z-10 safe-area-pb">
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