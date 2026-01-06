import { CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Player } from "./types";

interface ReportsSheetProps {
  players: Player[];
  activeTab: string;
}

export function ReportsSheet({ players, activeTab }: ReportsSheetProps) {
  const isWellness = activeTab === "morning";
  
  const pending = players.filter((p) => isWellness ? !p.wellness : !p.rpe);
  const completed = players.filter((p) => isWellness ? p.wellness : p.rpe);

  const getStatus = (player: Player) => {
    if (isWellness) {
      if (!player.wellness) return { label: "No completado", variant: "destructive" as const };
      const hour = parseInt(player.wellness.submittedAt.split(":")[0]);
      return hour >= 12 ? { label: "Tarde", variant: "warning" as const } : { label: "A tiempo", variant: "success" as const };
    } else {
      if (!player.rpe) return { label: "No completado", variant: "destructive" as const };
      return player.rpe.isLate ? { label: "Tarde", variant: "warning" as const } : { label: "A tiempo", variant: "success" as const };
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
      <div className="space-y-6">
        {pending.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" /> Pendientes ({pending.length})
            </h4>
            <div className="space-y-2">
              {pending.map((player) => (
                <div key={player.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100 opacity-70">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">{player.name.charAt(0)}</div>
                    <span className="text-sm font-medium text-slate-600">{player.name}</span>
                  </div>
                  <Badge variant="outline" className="text-slate-400 border-slate-200 bg-white hover:bg-white">Sin datos</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2 mt-4">
            <CheckCircle2 className="w-4 h-4 text-green-600" /> Entregados ({completed.length})
          </h4>
          {completed.length === 0 && <p className="text-xs text-slate-400">Nadie ha entregado todavía.</p>}
          
          <div className="space-y-2">
            {completed.map((player) => {
              const status = getStatus(player);
              const time = isWellness ? player.wellness?.submittedAt : player.rpe?.submittedAt;
              const note = isWellness ? player.wellness?.notes : player.rpe?.notes;

              return (
                <div key={player.id} className="flex flex-col bg-white p-3 rounded-lg border border-slate-100 shadow-sm gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#0B2149] text-white flex items-center justify-center text-xs font-bold">{player.name.charAt(0)}</div>
                      <span className="text-sm font-medium text-[#0B2149]">{player.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-slate-400"><Clock className="w-3 h-3" /> {time}</div>
                      {status.variant !== "success" && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">{status.label}</Badge>
                      )}
                    </div>
                  </div>
                  {note && (
                    <div className="flex items-start gap-2 bg-slate-50 p-2 rounded text-xs text-slate-600 italic">
                      <MessageSquare className="w-3 h-3 mt-0.5 text-slate-400 flex-shrink-0" />
                      <span>"{note}"</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}