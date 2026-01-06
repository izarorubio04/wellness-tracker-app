import { useState } from "react";
import { Edit2, Flame } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Player } from "./types";

interface RPETabProps {
  players: Player[];
  plannedRpe: number;
  onSaveTarget: (val: number) => void;
}

export function RPETab({ players, plannedRpe, onSaveTarget }: RPETabProps) {
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(plannedRpe.toString());

  const rpeResponses = players.filter((p) => p.rpe).length;
  const avgRpeSession = rpeResponses > 0
    ? (players.reduce((acc, p) => acc + (p.rpe?.todaySession || 0), 0) / rpeResponses).toFixed(1)
    : "0.0";

  const handleSave = () => {
    const val = parseFloat(tempTarget);
    if (!isNaN(val) && val >= 0 && val <= 10) {
      onSaveTarget(val);
      setIsEditingTarget(false);
    }
  };

  return (
    <div className="space-y-6 mt-4 animate-in slide-in-from-bottom-2 duration-500">
      <Card className="bg-white shadow-sm border-none overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
        <CardContent className="p-6 text-center">
          <h3 className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-4">Intensidad Media</h3>
          <div className="flex justify-center items-end gap-2 mb-4">
            <span className="text-6xl font-black text-[#0B2149] tracking-tighter">{avgRpeSession}</span>
            <span className="text-xl text-slate-400 mb-2 font-medium">/ 10</span>
          </div>
          <Progress value={Number(avgRpeSession) * 10} className="h-4 mb-2 rounded-full bg-slate-100" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-center relative">
          <Dialog open={isEditingTarget} onOpenChange={setIsEditingTarget}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-blue-400 hover:text-blue-600 hover:bg-blue-100" onClick={() => setTempTarget(plannedRpe.toString())}>
                <Edit2 className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white text-slate-900 border-slate-200">
              <DialogHeader><DialogTitle>Objetivo RPE</DialogTitle></DialogHeader>
              <div className="py-4 space-y-2">
                <Label htmlFor="target">RPE Esperado (0-10)</Label>
                <Input id="target" type="number" min="0" max="10" value={tempTarget} onChange={(e) => setTempTarget(e.target.value)} className="text-center text-lg font-bold" />
              </div>
              <DialogFooter><Button onClick={handleSave} className="bg-[#0B2149] text-white">Guardar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="text-xs text-blue-600 font-bold uppercase mb-1 tracking-wider">Objetivo</div>
          <div className="text-3xl font-bold text-[#0B2149]">{plannedRpe}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center relative overflow-hidden shadow-sm">
          {Number(avgRpeSession) > plannedRpe + 1 && (
            <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg shadow-sm">+ DURO</div>
          )}
          <div className="text-xs text-slate-500 font-bold uppercase mb-1 tracking-wider">Real</div>
          <div className={`text-3xl font-bold ${Number(avgRpeSession) > plannedRpe + 1 ? "text-red-500" : "text-[#0B2149]"}`}>{avgRpeSession}</div>
        </div>
      </div>

      <div>
        <h3 className="text-[#0B2149] font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
          <Flame className="w-4 h-4 text-orange-500" /> Top Esfuerzo
        </h3>
        <div className="space-y-2">
          {players.filter((p) => p.rpe).sort((a, b) => (b.rpe?.todaySession || 0) - (a.rpe?.todaySession || 0)).slice(0, 3).map((player, index) => (
            <div key={player.id} className="bg-white p-4 rounded-xl flex items-center justify-between border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-400 font-bold text-sm border border-slate-100">#{index + 1}</div>
                <div>
                  <div className="text-sm font-bold text-[#0B2149]">{player.name}</div>
                  {player.rpe?.notes && <div className="text-[11px] text-slate-500 italic mt-0.5 max-w-[150px] truncate">"{player.rpe.notes}"</div>}
                </div>
              </div>
              <div className={`text-xl font-black ${(player.rpe?.todaySession || 0) >= 8 ? "text-red-500" : "text-orange-500"}`}>{player.rpe?.todaySession}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}