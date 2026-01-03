import { useState } from 'react';
import { Activity, ArrowLeft } from 'lucide-react';

interface RPEFormProps {
  onBack: () => void;
  onSubmit: (rpe: number, notes: string) => void;
}

export function RPEForm({ onBack, onSubmit }: RPEFormProps) {
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit(rpe, notes);
    onBack();
  };

  const getRPEColor = (value: number) => {
    if (value <= 3) return '#10B981';
    if (value <= 6) return '#F59E0B';
    return '#EF4444';
  };

  const getRPELabel = (value: number) => {
    if (value === 0) return 'Descanso';
    if (value <= 2) return 'Muy Fácil';
    if (value <= 4) return 'Fácil';
    if (value <= 6) return 'Moderado';
    if (value <= 8) return 'Difícil';
    if (value === 9) return 'Muy Difícil';
    return 'Esfuerzo Máximo';
  };

  const color = getRPEColor(rpe);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0B2149] to-[#1a3a6b] px-6 pt-12 pb-8">
        <button onClick={onBack} className="mb-4 text-white flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          <span>Volver</span>
        </button>
        <h1 className="text-white text-2xl mb-2">RPE Post-Entreno</h1>
        <p className="text-blue-200 text-sm">Rate of Perceived Exertion</p>
      </div>

      {/* RPE Content */}
      <div className="px-6 -mt-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-center text-lg text-[#0B2149] mb-6">¿Qué tan dura fue la sesión?</h2>
          
          {/* Visual RPE Display */}
          <div className="flex flex-col items-center mb-8">
            <div 
              className="w-40 h-40 rounded-full flex flex-col items-center justify-center mb-4 transition-all"
              style={{ 
                backgroundColor: `${color}20`,
                border: `4px solid ${color}`
              }}
            >
              <div className="text-6xl" style={{ color }}>{rpe}</div>
              <div className="text-xs text-[#64748B] mt-1">/ 10</div>
            </div>
            <div className="text-center">
              <div className="text-xl mb-1" style={{ color }}>{getRPELabel(rpe)}</div>
              <p className="text-sm text-[#64748B]">
                {rpe <= 3 && 'Sesión de recuperación o técnica'}
                {rpe > 3 && rpe <= 6 && 'Intensidad moderada'}
                {rpe > 6 && rpe <= 8 && 'Alta intensidad'}
                {rpe > 8 && 'Esfuerzo máximo'}
              </p>
            </div>
          </div>

          {/* RPE Slider */}
          <div className="mb-6">
            <input
              type="range"
              min="0"
              max="10"
              value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${color} 0%, ${color} ${(rpe / 10) * 100}%, #E2E8F0 ${(rpe / 10) * 100}%, #E2E8F0 100%)`
              }}
            />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-[#64748B]">0 - Descanso</span>
              <span className="text-xs text-[#64748B]">10 - Máximo</span>
            </div>
          </div>

          {/* RPE Scale Reference */}
          <div className="bg-[#F8FAFC] rounded-xl p-4 space-y-2">
            <div className="text-xs text-[#64748B] mb-2">Escala de Referencia:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-[#10B981] text-white">1-3</div>
                <span className="text-[#64748B]">Fácil</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-[#F59E0B] text-white">4-6</div>
                <span className="text-[#64748B]">Moderado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-[#EF4444] text-white">7-9</div>
                <span className="text-[#64748B]">Difícil</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-[#991B1B] text-white">10</div>
                <span className="text-[#64748B]">Máximo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Notes */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-[#0B2149]" />
            <h3 className="text-sm text-[#0B2149]">Notas Personales (Opcional)</h3>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="¿Cómo te sentiste? ¿Alguna molestia?"
            className="w-full h-24 bg-[#F8FAFC] rounded-xl p-4 resize-none text-base border-none focus:outline-none focus:ring-2 focus:ring-[#0B2149]"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-6">
        <button
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-[#0B2149] to-[#1a3a6b] text-white py-4 rounded-2xl active:scale-95 transition-transform shadow-lg"
        >
          Guardar RPE
        </button>
      </div>
    </div>
  );
}
