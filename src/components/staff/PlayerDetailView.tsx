import { ArrowLeft, Moon, Zap, Dumbbell, Brain, Smile, Activity, MessageSquare, Clock, Frown } from "lucide-react";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Player } from "./types";
import { cn } from "../ui/utils";

// Helper para las tarjetas de métricas (Lógica unificada: 1=Mejor, 10=Peor)
const MetricCard = ({ icon: Icon, label, value }: { icon: any, label: string, value: number }) => {
  // Escala: 
  // 1-3: Verde (Óptimo)
  // 4-6: Ámbar (Regular)
  // 7-10: Rojo (Malo)
  
  let bgColor = "bg-green-50";
  let textColor = "text-green-700";
  let borderColor = "border-green-100";
  
  if (value >= 7) {
    bgColor = "bg-red-50";
    textColor = "text-red-700";
    borderColor = "border-red-100";
  } else if (value >= 4) {
    bgColor = "bg-amber-50";
    textColor = "text-amber-700";
    borderColor = "border-amber-100";
  }

  return (
    <div className={cn("flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:scale-105", bgColor, borderColor)}>
      <div className="flex items-center gap-1.5 mb-1 opacity-80">
        <Icon className={cn("w-4 h-4", textColor)} />
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", textColor)}>{label}</span>
      </div>
      <span className={cn("text-3xl font-black", textColor)}>{value}</span>
    </div>
  );
};

interface PlayerDetailViewProps {
  player: Player;
  onBack: () => void;
}

export function PlayerDetailView({ player, onBack }: PlayerDetailViewProps) {
  if (!player.wellness) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-10 animate-in slide-in-from-right duration-300">
      
      {/* --- HEADER DE LA PÁGINA DE DETALLE --- */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center gap-4 shadow-sm">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#0B2149] leading-none">{player.name}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-medium">
             <span>{player.position}</span>
             <span className="w-1 h-1 rounded-full bg-slate-300"></span>
             <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {player.wellness.submittedAt}</span>
          </div>
        </div>
        <div className="ml-auto">
           <Badge 
             className={cn(
               "text-xs px-3 py-1 uppercase tracking-wider",
               player.wellness.status === 'ready' ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" : "bg-red-100 text-red-700 hover:bg-red-100 border-red-200"
             )}
             variant="outline"
           >
             {player.wellness.status === 'ready' ? 'Disponible' : 'Revisar'}
           </Badge>
        </div>
      </div>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">
        
        {/* NOTAS DE LA JUGADORA (Si existen) */}
        {player.wellness.notes && (
          <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100 flex gap-4 shadow-sm">
            <div className="bg-yellow-100 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
               <MessageSquare className="w-5 h-5 text-yellow-700" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-yellow-700 uppercase mb-1 tracking-wide">Nota de la jugadora</h5>
              <p className="text-slate-700 italic text-sm leading-relaxed">"{player.wellness.notes}"</p>
            </div>
          </div>
        )}

        {/* GRID DE MÉTRICAS */}
        <div>
           <h3 className="text-[#0B2149] font-bold text-lg mb-4 flex items-center gap-2">
             <Activity className="w-5 h-5 text-blue-500" /> Métricas Wellness
           </h3>
           <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
             <MetricCard icon={Moon} label="Sueño" value={player.wellness.sleep} />
             <MetricCard icon={Zap} label="Fatiga" value={player.wellness.fatigue} />
             <MetricCard icon={Dumbbell} label="Dolor" value={player.wellness.soreness} />
             <MetricCard icon={Brain} label="Estrés" value={player.wellness.stress} />
             <MetricCard icon={Smile} label="Ánimo" value={player.wellness.mood} />
             
             {/* Tarjeta Menstruación */}
             <div className="flex flex-col items-center justify-center p-3 rounded-xl border bg-white border-slate-200 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 opacity-60">
                   <Activity className="w-4 h-4 text-slate-500" />
                   <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ciclo</span>
                </div>
                <span className={`text-lg font-bold capitalize ${player.wellness.menstruation !== 'none' ? 'text-pink-600' : 'text-slate-700'}`}>
                  {player.wellness.menstruation === 'none' ? '-' : 
                   player.wellness.menstruation === 'pms' ? 'SPM' : 'Regla'}
                </span>
             </div>
           </div>
        </div>

        <Separator />

        {/* LEYENDA */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Referencia de Escala</h4>
          <div className="flex justify-between items-center text-xs font-medium text-slate-600">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>1-3 Óptimo</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <span>4-6 Regular</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>7-10 Malo</span>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}