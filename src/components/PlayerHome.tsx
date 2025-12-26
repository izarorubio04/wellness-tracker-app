import { Calendar, Activity, TrendingUp } from 'lucide-react';

interface PlayerHomeProps {
  playerName: string;
  onNavigate: (screen: string) => void;
  wellnessCompleted: boolean;
  weeklyReadiness: number;
}

export function PlayerHome({ playerName, onNavigate, wellnessCompleted, weeklyReadiness }: PlayerHomeProps) {
  const readinessPercentage = (weeklyReadiness / 10) * 100;
  const readinessColor = weeklyReadiness >= 7 ? '#10B981' : weeklyReadiness >= 5 ? '#F59E0B' : '#EF4444';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B2149] to-[#1a3a6b] pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-8">
        <h1 className="text-white text-3xl mb-2">Hola, {playerName}</h1>
        <p className="text-blue-200">¿Lista para entrenar hoy?</p>
      </div>

      {/* Action Card - Daily Wellness */}
      {!wellnessCompleted && (
        <div className="mx-6 mb-6">
          <button
            onClick={() => onNavigate('wellness')}
            className="w-full bg-white rounded-2xl p-6 shadow-lg active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#0B2149] to-[#1a3a6b] rounded-full flex items-center justify-center">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg mb-1 text-[#0B2149]">Completa tu Wellness Diario</h3>
                <p className="text-sm text-[#64748B]">Ayúdanos a cuidar de ti</p>
              </div>
              <div className="text-3xl">→</div>
            </div>
          </button>
        </div>
      )}

      {wellnessCompleted && (
        <div className="mx-6 mb-6">
          <div className="w-full bg-[#10B981] rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg mb-1 text-white">✓ Wellness Completado</h3>
                <p className="text-sm text-white/80">¡Gracias por tu feedback!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Readiness Widget */}
      <div className="mx-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg mb-6 text-[#0B2149]">Estado de la Semana</h3>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32">
              {/* Background Circle */}
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#E2E8F0"
                  strokeWidth="12"
                  fill="none"
                />
                {/* Progress Circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={readinessColor}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(readinessPercentage / 100) * 351.86} 351.86`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl" style={{ color: readinessColor }}>{weeklyReadiness.toFixed(1)}</div>
                <div className="text-xs text-[#64748B]">/ 10</div>
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: readinessColor }}></div>
                  <span className="text-sm">
                    {weeklyReadiness >= 7 ? 'Óptimo' : weeklyReadiness >= 5 ? 'Moderado' : 'Precaución'}
                  </span>
                </div>
                <p className="text-xs text-[#64748B]">
                  {weeklyReadiness >= 7 
                    ? 'Tu cuerpo está listo para el entrenamiento' 
                    : weeklyReadiness >= 5 
                    ? 'Monitorea tu recuperación' 
                    : 'Considera descanso adicional'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="mx-6">
        <h3 className="text-white mb-4">Acceso Rápido</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate('rpe')}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-white text-sm">RPE Post-Entreno</h4>
          </button>
          <button className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 active:scale-95 transition-transform">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-white text-sm">Calendario</h4>
          </button>
        </div>
      </div>
    </div>
  );
}
