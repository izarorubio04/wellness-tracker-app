import { Calendar, Activity, TrendingUp, Check, Settings, LogOut } from 'lucide-react';

interface PlayerHomeProps {
  playerName: string;
  onNavigate: (screen: 'wellness' | 'rpe' | 'player-home' | 'settings') => void;
  onLogout: () => void; // <--- AÑADIDO: Recibimos la función de cerrar sesión
  wellnessCompleted: boolean;
  rpeCompleted: boolean;
  weeklyReadiness: number;
}

export function PlayerHome({ 
  playerName, 
  onNavigate,
  onLogout, 
  wellnessCompleted, 
  rpeCompleted, 
  weeklyReadiness 
}: PlayerHomeProps) {
  const readinessPercentage = (weeklyReadiness / 10) * 100;
  const readinessColor = weeklyReadiness >= 7 ? '#10B981' : weeklyReadiness >= 5 ? '#F59E0B' : '#EF4444';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B2149] to-[#1a3a6b] pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 flex justify-between items-start">
        <div>
          <h1 className="text-white text-3xl mb-2 font-bold">Hola, {playerName.split(' ')[0]}</h1>
          <p className="text-blue-200">Deportivo Alavés</p>
        </div>
        
        {/* BOTONES DE ACCIÓN (Agrupados) */}
        <div className="flex gap-3">
          {/* Botón Ajustes */}
          <button 
            onClick={() => onNavigate('settings')}
            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
            aria-label="Ajustes"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Botón Logout */}
          <button 
            onClick={onLogout}
            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-red-200 hover:bg-red-500/20 hover:text-white active:scale-95 transition-all"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Action Card - Daily Wellness */}
      {!wellnessCompleted && (
        <div className="mx-6 mb-6">
          <button
            onClick={() => onNavigate('wellness')}
            className="w-full bg-white rounded-2xl p-6 shadow-lg active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#0B2149] to-[#1a3a6b] rounded-full flex items-center justify-center shadow-md">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold mb-1 text-[#0B2149]">Completa tu Wellness</h3>
                <p className="text-sm text-slate-500">Ayúdanos a cuidar de ti</p>
              </div>
              <div className="text-3xl text-slate-300">→</div>
            </div>
          </button>
        </div>
      )}

      {/* Wellness Completado (Estado Verde) */}
      {wellnessCompleted && (
        <div className="mx-6 mb-6">
          <div className="w-full bg-[#10B981] rounded-2xl p-6 shadow-lg border border-green-400/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Check className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold mb-1 text-white">Wellness Enviado</h3>
                <p className="text-sm text-green-50">¡Gracias por tu feedback!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Readiness Widget */}
      <div className="mx-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold mb-6 text-[#0B2149]">Estado de la Semana</h3>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#E2E8F0" strokeWidth="12" fill="none" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={readinessColor}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(readinessPercentage / 100) * 351.86} 351.86`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold" style={{ color: readinessColor }}>{weeklyReadiness.toFixed(1)}</div>
                <div className="text-xs text-slate-400 font-medium">/ 10</div>
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: readinessColor }}></div>
                  <span className="text-sm font-bold text-slate-700">
                    {weeklyReadiness >= 7 ? 'Óptimo' : weeklyReadiness >= 5 ? 'Moderado' : 'Precaución'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {weeklyReadiness >= 7 
                    ? 'Tu cuerpo está listo para rendir al máximo nivel.' 
                    : weeklyReadiness >= 5 
                    ? 'Monitoriza tu carga y prioriza el descanso hoy.' 
                    : 'Es recomendable hablar con el fisio antes de entrenar.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="mx-6">
        <h3 className="text-white font-bold mb-4 ml-1">Acceso Rápido</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate('rpe')}
            className={`backdrop-blur-md rounded-2xl p-6 active:scale-95 transition-all border ${
              rpeCompleted 
                ? 'bg-[#10B981] border-green-400/50 shadow-lg shadow-green-900/20' 
                : 'bg-white/10 border-white/10 hover:bg-white/15'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${rpeCompleted ? 'bg-white/20' : 'bg-white/10'}`}>
              {rpeCompleted ? <Check className="w-6 h-6 text-white" /> : <TrendingUp className="w-6 h-6 text-white" />}
            </div>
            <h4 className="text-white text-sm font-medium text-left">
              {rpeCompleted ? 'RPE Guardado' : 'RPE Post-Entreno'}
            </h4>
          </button>

          <button className="bg-white/10 backdrop-blur-md rounded-2xl p-6 active:scale-95 transition-all border border-white/10 hover:bg-white/15">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-white text-sm font-medium text-left">Calendario</h4>
          </button>
        </div>
      </div>
    </div>
  );
}