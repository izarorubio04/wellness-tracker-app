import { AlertTriangle, Zap, Moon, Activity, MessageSquare, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Player } from "./types";

export function WellnessTab({ players, loading }: { players: Player[], loading: boolean }) {
  const riskPlayers = players.filter(p => p.wellness?.status === "risk" || p.wellness?.status === "warning");
  const readyPlayers = players.filter(p => p.wellness?.status === "ready");

  if (players.filter(p => p.wellness).length === 0 && !loading) {
    return <div className="text-center py-10 text-slate-400 text-sm">No hay registros completados hoy.</div>;
  }

  return (
    <div className="mt-2 space-y-4 animate-in slide-in-from-bottom-2 duration-500">
      {riskPlayers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[#0B2149] font-semibold flex items-center gap-2 px-2 text-sm uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Requieren Atención ({riskPlayers.length})
          </h3>
          {riskPlayers.map((player) => player.wellness && (
            <Card key={player.id} className="border-l-4 border-l-red-500 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-[#0B2149] text-lg">{player.name}</h4>
                    <span className="text-xs text-slate-500 font-medium">{player.position} • {player.wellness.submittedAt}</span>
                  </div>
                  <Badge variant="destructive" className="uppercase text-[10px] tracking-wider">Revisar</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {player.wellness.fatigue >= 6 && (
                    <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-2 rounded-md font-medium border border-red-100">
                      <Zap className="w-3 h-3" /> Fatiga Alta ({player.wellness.fatigue})
                    </div>
                  )}
                  {player.wellness.sleep <= 4 && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-md font-medium border border-amber-100">
                      <Moon className="w-3 h-3" /> Mal Sueño ({player.wellness.sleep})
                    </div>
                  )}
                  {player.wellness.menstruation !== "none" && (
                    <div className="flex items-center gap-2 text-xs text-pink-700 bg-pink-50 p-2 rounded-md font-medium border border-pink-100">
                      <Activity className="w-3 h-3" /> {player.wellness.menstruation === "pms" ? "SPM" : "Menstruación"}
                    </div>
                  )}
                </div>
                {player.wellness.notes && (
                  <div className="mt-3 flex items-start gap-2 bg-yellow-50/50 p-2.5 rounded-lg border border-yellow-100">
                      <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-yellow-600 flex-shrink-0" />
                      <span className="text-xs text-slate-700 italic">"{player.wellness.notes}"</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-2 pt-2">
        <h3 className="text-[#0B2149] font-semibold flex items-center gap-2 px-2 text-sm uppercase tracking-wide">
          <CheckCircle2 className="w-4 h-4 text-green-600" /> Disponibles ({readyPlayers.length})
        </h3>
        {readyPlayers.map((player) => (
          <div key={player.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2 group hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 bg-green-500 rounded-full group-hover:scale-y-110 transition-transform"></div>
                <div>
                  <div className="font-bold text-sm text-[#0B2149]">{player.name}</div>
                  <div className="text-xs text-slate-400">{player.position}</div>
                </div>
              </div>
              <div className="flex gap-1 pr-2">
                {[1, 2, 3].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-green-200" />)}
              </div>
            </div>
            {player.wellness?.notes && (
                <div className="ml-4 pl-2 border-l-2 border-slate-200 text-[11px] text-slate-500 italic">
                  "{player.wellness.notes}"
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}