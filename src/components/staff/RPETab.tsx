import { useState, useEffect } from "react";
import { Edit2, Flame, AlertCircle } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox"; // Asegúrate de tener este componente ui
import { Player } from "./types";
import { cn } from "../ui/utils";

interface RPETabProps {
  players: Player[];
  plannedRpe: number;
  onSaveTarget: (val: number) => void;
}

export function RPETab({ players, plannedRpe, onSaveTarget }: RPETabProps) {
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(plannedRpe.toString());
  
  // Estado para las jugadoras seleccionadas para el cálculo
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Efecto: Cuando cambian los jugadores (o cargan datos), seleccionamos por defecto a TODAS las que tienen RPE
  useEffect(() => {
    const playersWithRpe = players
      .filter(p => p.rpe !== undefined)
      .map(p => p.id);
    setSelectedPlayerIds(playersWithRpe);
  }, [players]);

  const handleSave = () => {
    const val = parseFloat(tempTarget);
    if (!isNaN(val) && val >= 0 && val <= 10) {
      onSaveTarget(val);
      setIsEditingTarget(false);
    }
  };

  // 1. FILTRADO: Solo jugadoras que tienen RPE
  const playersWithRpe = players.filter(p => p.rpe);

  // 2. CÁLCULO: Usamos solo las IDs que están en 'selectedPlayerIds'
  const playersForCalculation = playersWithRpe.filter(p => selectedPlayerIds.includes(p.id));

  const avgRpeSession = playersForCalculation.length > 0
      ? (playersForCalculation.reduce((acc, p) => acc + (p.rpe?.todaySession || 0), 0) / playersForCalculation.length).toFixed(1)
      : "0.0";

  // Manejador de checkbox individual
  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  // Manejador de "Seleccionar todos/ninguno"
  const toggleSelectAll = () => {
    if (selectedPlayerIds.length === playersWithRpe.length) {
      setSelectedPlayerIds([]); // Desmarcar todos
    } else {
      setSelectedPlayerIds(playersWithRpe.map(p => p.id)); // Marcar todos
    }
  };

  return (
    <div className="mt-2 space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      
      {/* --- TARJETA PRINCIPAL (MEDIA) --- */}
      <Card className="bg-white shadow-sm border-none overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
        <CardContent className="p-6 text-center">
          <h3 className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-4">
            Intensidad Media (Selección)
          </h3>
          <div className="flex justify-center items-end gap-2 mb-4">
            <span className="text-6xl font-black text-[#0B2149] tracking-tighter">
              {avgRpeSession}
            </span>
            <span className="text-xl text-slate-400 mb-2 font-medium">/ 10</span>
          </div>
          <Progress value={Number(avgRpeSession) * 10} className="h-4 mb-2 rounded-full bg-slate-100" />
          <p className="text-[10px] text-slate-400 mt-2">
            Calculado en base a {playersForCalculation.length} jugadoras seleccionadas
          </p>
        </CardContent>
      </Card>

      {/* --- TARJETAS COMPARATIVAS (OBJETIVO vs REAL) --- */}
      <div className="grid grid-cols-2 gap-4">
        {/* OBJETIVO */}
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-center relative">
          <Dialog open={isEditingTarget} onOpenChange={setIsEditingTarget}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-6 w-6 text-blue-400 hover:text-blue-600 hover:bg-blue-100"
                onClick={() => setTempTarget(plannedRpe.toString())}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white text-slate-900 border-slate-200">
              <DialogHeader>
                <DialogTitle>Objetivo RPE</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="target">RPE Esperado (0-10)</Label>
                  <Input
                    id="target"
                    type="number"
                    min="0"
                    max="10"
                    value={tempTarget}
                    onChange={(e) => setTempTarget(e.target.value)}
                    className="text-center text-lg font-bold"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Esto ajustará la alerta de "Más duro de lo previsto" para todas las jugadoras.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleSave} className="bg-[#0B2149] text-white">Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="text-xs text-blue-600 font-bold uppercase mb-1 tracking-wider">Objetivo</div>
          <div className="text-3xl font-bold text-[#0B2149]">{plannedRpe}</div>
        </div>

        {/* REAL (Calculado) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center relative overflow-hidden shadow-sm">
          {Number(avgRpeSession) > plannedRpe + 1 && (
            <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg shadow-sm">+ DURO</div>
          )}
          <div className="text-xs text-slate-500 font-bold uppercase mb-1 tracking-wider">Real</div>
          <div className={cn(
            "text-3xl font-bold",
            Number(avgRpeSession) > plannedRpe + 1 ? "text-red-500" : "text-[#0B2149]"
          )}>
            {avgRpeSession}
          </div>
        </div>
      </div>

      {/* --- LISTA DE JUGADORAS (TOP ESFUERZO + SELECCIÓN) --- */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-[#0B2149] font-bold flex items-center gap-2 text-sm uppercase tracking-wide">
            <Flame className="w-4 h-4 text-orange-500" /> Lista de Esfuerzo
          </h3>
          <div className="flex items-center gap-2">
             <span className="text-[10px] text-slate-400 font-medium uppercase">Incluir en Media</span>
             <Checkbox 
                checked={playersWithRpe.length > 0 && selectedPlayerIds.length === playersWithRpe.length}
                onCheckedChange={toggleSelectAll}
                className="w-4 h-4"
             />
          </div>
        </div>

        <div className="space-y-2">
          {playersWithRpe
            .sort((a, b) => (b.rpe?.todaySession || 0) - (a.rpe?.todaySession || 0)) // Ordenar por RPE descendente
            .map((player, index) => {
              const rpe = player.rpe?.todaySession || 0;
              const isSelected = selectedPlayerIds.includes(player.id);

              return (
                <div 
                  key={player.id} 
                  className={cn(
                    "p-3 rounded-xl flex items-center justify-between border shadow-sm transition-all",
                    isSelected ? "bg-white border-slate-100 opacity-100" : "bg-slate-50 border-slate-100 opacity-60 grayscale-[0.5]"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank Number */}
                    <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-400 font-bold text-sm border border-slate-100">
                      #{index + 1}
                    </div>
                    
                    {/* Info */}
                    <div>
                      <div className="text-sm font-bold text-[#0B2149]">{player.name}</div>
                      {player.rpe?.notes && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5 max-w-[150px] truncate">
                          "{player.rpe.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* RPE Value */}
                    <div className={cn(
                      "text-xl font-black",
                      rpe >= 8 ? "text-red-500" : "text-orange-500"
                    )}>
                      {rpe}
                    </div>

                    {/* Checkbox Individual */}
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => togglePlayerSelection(player.id)}
                      className="w-5 h-5 border-slate-300 data-[state=checked]:bg-[#67b476] data-[state=checked]:border-[#67b476]"
                    />
                  </div>
                </div>
              );
            })}
            
            {playersWithRpe.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm italic">
                    Nadie ha registrado RPE todavía.
                </div>
            )}
        </div>
      </div>
    </div>
  );
}