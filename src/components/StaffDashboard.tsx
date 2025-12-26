import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, Users, RefreshCw } from 'lucide-react'; // Quitamos ArrowLeft
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface PlayerData {
  id: string;
  name: string;
  position: string;
  status: 'ready' | 'warning' | 'risk';
  readiness: number;
  fatigue: number;
  stress: number;
  lastUpdate: string;
}

// Ya no necesitamos props de onBack porque no hay botón de volver
export function StaffDashboard() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const q = query(
        collection(db, "wellness_logs"),
        where("timestamp", ">=", startOfDay.getTime()) 
      );

      const querySnapshot = await getDocs(q);
      
      const todaysPlayers: PlayerData[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        let status: 'ready' | 'warning' | 'risk' = 'ready';
        if (data.fatigueLevel >= 8 || data.stressLevel >= 8 || data.muscleSoreness >= 8) {
          status = 'risk';
        } else if (data.fatigueLevel >= 6 || data.readinessScore < 5) {
          status = 'warning';
        }

        todaysPlayers.push({
          id: doc.id,
          name: data.playerName || "Jugadora Anónima",
          position: "JUG",
          status: status,
          readiness: Number(data.readinessScore.toFixed(1)),
          fatigue: data.fatigueLevel,
          stress: data.stressLevel,
          lastUpdate: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      });

      setPlayers(todaysPlayers);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const readyCount = players.filter(p => p.status === 'ready').length;
  const warningCount = players.filter(p => p.status === 'warning').length;
  const riskCount = players.filter(p => p.status === 'risk').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'risk': return '#EF4444';
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
    <div className="min-h-screen bg-[#F8FAFC] pb-24"> {/* pb-24 para dejar espacio al botón flotante de salir */}
      
      {/* Header Simplificado */}
      <div className="bg-gradient-to-b from-[#0B2149] to-[#1a3a6b] px-6 pt-12 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-white text-2xl font-bold">Panel Técnico</h1>
            <p className="text-blue-200 text-sm">
              {loading ? 'Sincronizando...' : `Resumen de hoy (${new Date().toLocaleDateString()})`}
            </p>
          </div>
          <button onClick={fetchTodayData} className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20 transition-colors">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 -mt-6 grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-3 shadow-md text-center border border-gray-100">
          <div className="text-2xl font-bold text-[#10B981]">{readyCount}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Listas</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-md text-center border border-gray-100">
          <div className="text-2xl font-bold text-[#F59E0B]">{warningCount}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Atención</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-md text-center border border-gray-100">
          <div className="text-2xl font-bold text-[#EF4444]">{riskCount}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Riesgo</div>
        </div>
      </div>

      <div className="px-6 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-[#0B2149]" />
        <h2 className="text-lg font-bold text-[#0B2149]">Estado de la Plantilla</h2>
      </div>

      {/* Players List */}
      <div className="px-6 space-y-3">
        {players.length === 0 && !loading && (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">
            <p className="text-gray-400 text-sm">Aún no hay registros de hoy.</p>
          </div>
        )}

        {players.map((player) => (
          <div key={player.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
            {/* Indicador lateral de color */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: getStatusColor(player.status) }} />
            
            <div className="pl-3">
              <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold text-gray-800">{player.name}</h3>
                  <span className="text-xs font-mono text-gray-400">{player.lastUpdate}</span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: `${getStatusColor(player.status)}15`, color: getStatusColor(player.status) }}>
                  {getStatusLabel(player.status)}
                </span>
                <span className="text-xs text-gray-500">Readiness: <strong>{player.readiness}</strong></span>
              </div>

              {/* Alertas Compactas */}
              {(player.fatigue >= 7 || player.stress >= 7) && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-50">
                   {player.fatigue >= 7 && (
                     <div className="flex items-center gap-1 text-[#EF4444] text-xs font-medium">
                       <AlertTriangle className="w-3 h-3" /> Fatiga {player.fatigue}
                     </div>
                   )}
                   {player.stress >= 7 && (
                     <div className="flex items-center gap-1 text-[#F59E0B] text-xs font-medium">
                       <AlertTriangle className="w-3 h-3" /> Estrés {player.stress}
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}