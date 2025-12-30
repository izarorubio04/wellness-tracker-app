import { useState } from 'react';
import { Moon, Zap, Dumbbell, Brain, Smile, ArrowLeft, FileText } from 'lucide-react';

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
    onBack(); // Volver a la home después de guardar
  };

  const getSliderColor = (value: number, inverted = false) => {
    if (inverted) {
      if (value <= 3) return '#10B981';
      if (value <= 6) return '#F59E0B';
      return '#EF4444';
    } else {
      if (value >= 7) return '#10B981';
      if (value >= 4) return '#F59E0B';
      return '#EF4444';
    }
  };

  const SliderInput = ({ 
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
    const color = getSliderColor(value, inverted);
    
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm text-[#0B2149]">{label}</h4>
          </div>
          <div className="text-2xl" style={{ color }}>{value}</div>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - 1) / 9) * 100}%, #E2E8F0 ${((value - 1) / 9) * 100}%, #E2E8F0 100%)`
          }}
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs text-[#64748B]">1</span>
          <span className="text-xs text-[#64748B]">10</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0B2149] to-[#1a3a6b] px-6 pt-12 pb-8">
        <button onClick={onBack} className="mb-4 text-white flex items-center gap-2 active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5" />
          <span>Volver</span>
        </button>
        <h1 className="text-white text-2xl mb-2">Wellness Diario</h1>
        <p className="text-blue-200 text-sm">¿Cómo te sientes hoy?</p>
      </div>

      {/* Form */}
      <div className="px-6 -mt-4 space-y-4">
        <SliderInput
          icon={Moon}
          label="Calidad del Sueño"
          value={sleepQuality}
          onChange={setSleepQuality}
        />

        <SliderInput
          icon={Zap}
          label="Nivel de Fatiga"
          value={fatigueLevel}
          onChange={setFatigueLevel}
          inverted
        />

        <SliderInput
          icon={Dumbbell}
          label="Dolor Muscular"
          value={muscleSoreness}
          onChange={setMuscleSoreness}
          inverted
        />

        <SliderInput
          icon={Brain}
          label="Nivel de Estrés"
          value={stressLevel}
          onChange={setStressLevel}
          inverted
        />

        <SliderInput
          icon={Smile}
          label="Estado de Ánimo"
          value={mood}
          onChange={setMood}
        />

        {/* Menstruation Status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm text-[#0B2149] mb-3">Estado Menstrual</h4>
          <div className="grid grid-cols-3 gap-2">
            {['none', 'active', 'pms'].map((status) => (
              <button
                key={status}
                onClick={() => setMenstruationStatus(status)}
                className={`py-3 px-4 rounded-xl transition-all text-sm font-medium capitalize ${
                  menstruationStatus === status
                    ? 'bg-[#0B2149] text-white'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:bg-slate-100'
                }`}
              >
                {status === 'none' ? 'Ninguno' : status === 'active' ? 'Activo' : 'SPM'}
              </button>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-[#0B2149]" />
            <h4 className="text-sm text-[#0B2149]">Otra información relevante</h4>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="¿Alguna molestia, dolor o comentario para el staff?"
            className="w-full h-24 bg-[#F8FAFC] rounded-xl p-4 resize-none text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#0B2149] placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-6 z-10">
        <button
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-[#0B2149] to-[#1a3a6b] text-white py-4 rounded-2xl active:scale-95 transition-transform shadow-lg font-medium text-lg"
        >
          Guardar Wellness
        </button>
      </div>
    </div>
  );
}