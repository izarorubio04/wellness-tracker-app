// src/components/StaffDashboard.tsx
import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, Users, ArrowLeft, RefreshCw } from 'lucide-react';
import { db } from '../firebase'; // Importamos tu base de datos
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

// Definimos la forma que tendrá cada jugadora en la lista
interface PlayerData {
  id: string;
  name: string;
  position: string; // Dato simulado por ahora
  status: 'ready' | 'warning' | 'risk';
  readiness: number;
  fatigue: number;
  stress: number;
  lastUpdate: string;
}

interface StaffDashboardProps {
  onBack: () => void;
}

export function StaffDashboard({ onBack }: StaffDashboardProps) {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);

  // Función para cargar datos de Firebase
  const fetchTodayData = async () => {
    setLoading(true);
    try {
      // 1. Calculamos el inicio del día de hoy (00:00h)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // 2. Pedimos a Firebase: "Trae logs donde la fecha sea mayor o igual a hoy a las 00:00"
      // NOTA: Firestore guarda las fechas como Timestamps
      const q = query(
        collection(db, "wellness_logs"),
        where("timestamp", ">=", startOfDay.getTime()) 
      );

      const querySnapshot = await getDocs(q);
      
      // 3. Transformamos los datos "crudos" de Firebase a lo que necesita tu pantalla
      const todaysPlayers: PlayerData[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Lógica simple para determinar el estado (Semáforo)
        let status: 'ready' | 'warning' | 'risk' = 'ready';
        if (data.fatigueLevel >= 8 || data.stressLevel >= 8 || data.muscleSoreness >= 8) {
          status = 'risk'; // Rojo si algo está muy mal
        } else if (data.fatigueLevel >= 6 || data.readinessScore < 5) {
          status = 'warning'; // Amarillo
        }

        todaysPlayers.push({
          id: doc.id,
          name: data.playerName || "Jugadora Anónima",
          position: "JUG", // Como no tenemos base de datos de perfiles aún, ponemos esto genérico
          status: status,
          readiness: Number(data.readinessScore.toFixed(1)),
          fatigue: data.fatigueLevel,
          stress: data.stressLevel,
          lastUpdate: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      });

      setPlayers(todaysPlayers);
    } catch (error) {
      console.error("Error cargando datos del staff:", error);
    } finally {
      setLoading(false);
    }
  };

  // useEffect hace que esto se ejecute nada más abrir la pantalla
  useEffect(() => {
    fetchTodayData();
  }, []);

  // Cálculos para las tarjetas de resumen (contadores de arriba)
  const readyCount = players.filter(p => p.status === 'ready').length;
  const warningCount = players.filter(p => p.status === 'warning').length;
  const riskCount = players.filter(p => p.status === 'risk').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return '#10B981';   // Verde
      case 'warning': return '#F59E0B'; // Naranja
      case 'risk': return '#EF4444';    // Rojo
      default: return '#64748B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ready': return 'Lista';
      case 'warning': return 'Atención';
      case 'risk': return 'Riesgo';
      default: return 'Sin datos';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0B2149] to-[#1a3a6b] px-6 pt-12 pb-8">
        <div className="flex justify-between items-start mb-4">
          <button onClick={onBack} className="text-white flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <button onClick={fetchTodayData} className="text-white/80 hover:text-white">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <h1 className="text-white text-2xl mb-2">Panel del Staff</h1>
        <p className="text-blue-200 text-sm">
          {loading ? 'Cargando datos...' : `Datos de hoy (${new Date().toLocaleDateString()})`}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="px-6 -mt-4 grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-[#10B981]">{readyCount}</div>
          <div className="text-xs text-[#64748B]">Listas</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-[#F59E0B]">{warningCount}</div>
          <div className="text-xs text-[#64748B]">Atención</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-[#EF4444]">{riskCount}</div>
          <div className="text-xs text-[#64748B]">Riesgo</div>
        </div>
      </div>

      {/* Team Overview Title */}
      <div className="px-6 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-[#0B2149]" />
        <h2 className="text-lg text-[#0B2149]">Estado de Jugadoras</h2>
      </div>

      {/* Players List */}
      <div className="px-6 space-y-3">
        {players.length === 0 && !loading && (
          <div className="text-center py-10 text-gray-400 text-sm">
            <p>No hay registros de hoy.</p>
            <p>¡Dile a las jugadoras que rellenen el Wellness!</p>
          </div>
        )}

        {players.map((player) => (
          <div key={player.id} className="bg-white rounded-2xl p-5 shadow-sm border-l-4" style={{ borderLeftColor: getStatusColor(player.status) }}>
            <div className="flex items-center gap-4">
              
              {/* Información principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#0B2149]">{player.name}</h3>
                    <span className="text-xs text-gray-400">{player.lastUpdate}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${getStatusColor(player.status)}20`, color: getStatusColor(player.status) }}>
                    {getStatusLabel(player.status)}
                  </span>
                  <span className="text-xs text-[#64748B]">Score: {player.readiness}</span>
                </div>
              </div>

            </div>

            {/* Alertas específicas (Solo si hay valores altos) */}
            {(player.fatigue >= 7 || player.stress >= 7 || player.readiness < 5) && (
              <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex flex-wrap gap-2">
                {player.fatigue >= 7 && (
                  <div className="flex items-center gap-1 text-[#EF4444]">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-xs font-medium">Fatiga Alta ({player.fatigue})</span>
                  </div>
                )}
                {player.stress >= 7 && (
                  <div className="flex items-center gap-1 text-[#F59E0B]">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-xs font-medium">Estrés Alto ({player.stress})</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recomendación Automática */}
      {players.length > 0 && (
        <div className="px-6 mt-6">
          <div className="bg-gradient-to-br from-[#0B2149] to-[#1a3a6b] rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-6 h-6" />
              <h3 className="text-lg font-bold">Insight del Staff</h3>
            </div>
            <p className="text-sm text-blue-100 leading-relaxed">
              {riskCount > 0 
                ? `⚠️ ALERTA: Tienes ${riskCount} jugadora(s) en zona de riesgo. Revisa sus niveles de fatiga antes del entreno.`
                : warningCount > 0
                ? `👁️ OJO: ${warningCount} jugadora(s) muestran valores de atención. Considera reducir su carga hoy.`
                : '✅ LUZ VERDE: El equipo presenta buena disponibilidad para entrenar.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}