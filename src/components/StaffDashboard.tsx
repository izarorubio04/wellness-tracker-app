import { useState, useEffect } from "react";
import {
  AlertTriangle,
  LogOut,
  Moon,
  Zap,
  Activity,
  Flame,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar as CalendarIcon,
  ChevronDown,
  MessageSquare,
  Edit2,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

// --- LISTA MAESTRA DE LA PLANTILLA ---
// Importante: Estos nombres deben coincidir con los de Login.tsx
const SQUAD_NAMES = [
  "Eider Egaña",
  "Helene Altuna",
  "Paula Rubio",
  "Ainhize Antolín",
  "Aintzane Fernándes",
  "Maialen Gómez",
  "Estrella Lorente",
  "Carla Cerain",
  "Iraide Revuelta",
  "Aiala Mugueta",
  "Maialen Garlito",
  "Izaro Rubio",
  "Naroa García",
  "Irati Collantes",
  "Irati Martínez",
  "Ariadna Nayaded",
  "Izaro Tores",
  "Iratxe Balanzategui",
  "Naiara Óliver",
  "Lucía Daisa",
  "Jennifer Ngo",
  "Sofía Martínez",
  "Rania Zaaboul",
  "Erika Nicole",
];

interface Player {
  id: string;
  name: string;
  position: string;
  wellness?: {
    sleep: number;
    fatigue: number;
    soreness: number;
    stress: number;
    mood: number;
    menstruation: "none" | "active" | "pms";
    status: "ready" | "warning" | "risk";
    submittedAt: string;
    notes?: string;
  };
  rpe?: {
    yesterday: number;
    todaySession: number;
    notes?: string;
    submittedAt: string;
    isLate?: boolean;
  };
}

interface StaffDashboardProps {
  onLogout: () => void;
}

export function StaffDashboard({ onLogout }: StaffDashboardProps) {
  const [activeTab, setActiveTab] = useState("morning");
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [currentPlayers, setCurrentPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  const [plannedRpe, setPlannedRpe] = useState(5.0);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState("5");

  const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateKey = getDateKey(selectedDate);
      
      const targetDocRef = doc(db, "rpe_targets", dateKey);
      const targetSnap = await getDoc(targetDocRef);
      if (targetSnap.exists()) {
        setPlannedRpe(targetSnap.data().target);
      } else {
        setPlannedRpe(5.0);
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const wellnessQuery = query(
        collection(db, "wellness_logs"),
        where("timestamp", ">=", startOfDay.getTime()),
        where("timestamp", "<=", endOfDay.getTime())
      );
      const rpeQuery = query(
        collection(db, "rpe_logs"),
        where("timestamp", ">=", startOfDay.getTime()),
        where("timestamp", "<=", endOfDay.getTime())
      );

      const [wellnessSnapshot, rpeSnapshot] = await Promise.all([
        getDocs(wellnessQuery),
        getDocs(rpeQuery)
      ]);

      const playersMap = new Map<string, Player>();

      // 1. INICIALIZAR TODA LA PLANTILLA COMO "VACÍA"
      // Así garantizamos que salgan en la lista aunque no hayan hecho nada
      SQUAD_NAMES.forEach(name => {
        playersMap.set(name, {
          id: name, // Usamos el nombre como ID temporal
          name: name,
          position: "JUG",
          // Wellness y RPE empiezan undefined (pendientes)
        });
      });

      // 2. RELLENAR CON DATOS DE WELLNESS (Si existen)
      wellnessSnapshot.forEach((doc) => {
        const data = doc.data();
        const name = data.playerName || "Desconocida";
        
        let status: 'ready' | 'warning' | 'risk' = 'ready';
        if (data.fatigueLevel >= 8 || data.stressLevel >= 8 || data.muscleSoreness >= 8) status = 'risk';
        else if (data.fatigueLevel >= 6 || data.readinessScore < 5) status = 'warning';

        // Recuperamos la jugadora del mapa (o creamos una nueva si no estaba en la lista oficial)
        const existingPlayer = playersMap.get(name) || {
            id: doc.id,
            name: name,
            position: "JUG",
        };

        // Actualizamos sus datos
        playersMap.set(name, {
          ...existingPlayer,
          wellness: {
            sleep: data.sleepQuality,
            fatigue: data.fatigueLevel,
            soreness: data.muscleSoreness,
            stress: data.stressLevel,
            mood: data.mood,
            menstruation: data.menstruationStatus || 'none',
            status: status,
            submittedAt: new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            notes: data.notes
          }
        });
      });

      // 3. RELLENAR CON DATOS DE RPE (Si existen)
      rpeSnapshot.forEach((doc) => {
        const data = doc.data();
        const name = data.playerName || "Desconocida";
        const dateObj = new Date(data.timestamp);

        const existingPlayer = playersMap.get(name) || {
            id: doc.id,
            name: name,
            position: "JUG",
        };

        playersMap.set(name, {
          ...existingPlayer,
          rpe: {
            yesterday: 0,
            todaySession: data.rpeValue,
            notes: data.notes,
            submittedAt: dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            isLate: dateObj.getHours() >= 22
          }
        });
      });

      setCurrentPlayers(Array.from(playersMap.values()));

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleSaveTarget = async () => {
    const val = parseFloat(tempTarget);
    if (isNaN(val) || val < 0 || val > 10) return;

    try {
      const dateKey = getDateKey(selectedDate);
      await setDoc(doc(db, "rpe_targets", dateKey), { target: val });
      setPlannedRpe(val);
      setIsEditingTarget(false);
    } catch (e) {
      console.error("Error guardando objetivo:", e);
    }
  };

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth();

    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
    };
    const dateStr = date.toLocaleDateString("es-ES", options);

    if (isToday) return `Hoy, ${dateStr}`;
    if (isYesterday) return `Ayer, ${dateStr}`;

    const weekday = date.toLocaleDateString("es-ES", {
      weekday: "short",
    });
    return `${weekday}, ${dateStr}`;
  };

  const previousDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  });

  const riskPlayers = currentPlayers.filter(
    (p) =>
      p.wellness?.status === "risk" ||
      p.wellness?.status === "warning",
  );
  const readyPlayers = currentPlayers.filter(
    (p) => p.wellness?.status === "ready",
  );

  const rpeResponses = currentPlayers.filter((p) => p.rpe).length;
  const avgRpeSession =
    rpeResponses > 0
      ? (
          currentPlayers.reduce(
            (acc, p) => acc + (p.rpe?.todaySession || 0),
            0,
          ) / rpeResponses
        ).toFixed(1)
      : "0.0";
  
  // Ahora totalPlayers es la longitud real de la plantilla
  const totalPlayers = currentPlayers.length;
  
  const completedCount =
    activeTab === "morning"
      ? currentPlayers.filter((p) => p.wellness).length
      : currentPlayers.filter((p) => p.rpe).length;

  const PlayersList = ({
    type,
  }: {
    type: "morning" | "session";
  }) => {
    const isWellness = type === "morning";
    
    // FILTROS:
    // Pendientes: Aquellas que NO tienen el dato
    const pending = currentPlayers.filter((p) =>
      isWellness ? !p.wellness : !p.rpe
    );
    // Completadas: Aquellas que SÍ tienen el dato
    const completed = currentPlayers.filter((p) =>
      isWellness ? p.wellness : p.rpe
    );

    const getStatus = (player: Player) => {
      if (isWellness) {
        if (!player.wellness) return { label: "No completado", variant: "destructive" as const };
        const hour = parseInt(player.wellness.submittedAt.split(":")[0]);
        return hour >= 12
          ? { label: "Tarde", variant: "warning" as const }
          : { label: "A tiempo", variant: "success" as const };
      } else {
        if (!player.rpe) return { label: "No completado", variant: "destructive" as const };
        return player.rpe.isLate
          ? { label: "Tarde", variant: "warning" as const }
          : { label: "A tiempo", variant: "success" as const };
      }
    };

    return (
      <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
        <div className="space-y-6">
          
          {/* SECCIÓN PENDIENTES (AHORA VISIBLE) */}
          {pending.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" /> Pendientes ({pending.length})
              </h4>
              <div className="space-y-2">
                {pending.map((player) => (
                  <div key={player.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100 opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                        {player.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-600">{player.name}</span>
                    </div>
                    <Badge variant="outline" className="text-slate-400 border-slate-200 bg-white hover:bg-white">
                      Sin datos
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN COMPLETADOS */}
          <div>
            <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2 mt-4">
              <CheckCircle2 className="w-4 h-4 text-green-600" /> Entregados (
              {completed.length})
            </h4>
            {completed.length === 0 && <p className="text-xs text-slate-400">Nadie ha entregado todavía.</p>}
            
            <div className="space-y-2">
              {completed.map((player) => {
                const status = getStatus(player);
                const time = isWellness
                  ? player.wellness?.submittedAt
                  : player.rpe?.submittedAt;
                const note = isWellness
                  ? player.wellness?.notes
                  : player.rpe?.notes;

                return (
                  <div
                    key={player.id}
                    className="flex flex-col bg-white p-3 rounded-lg border border-slate-100 shadow-sm gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0B2149] text-white flex items-center justify-center text-xs font-bold">
                          {player.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-[#0B2149]">
                          {player.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" /> {time}
                        </div>
                        {status.variant !== "success" && (
                          <Badge
                            variant="secondary"
                            className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none"
                          >
                            {status.label}
                          </Badge>
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
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-8">
      {/* Header Fijo */}
      <div className="bg-gradient-to-b from-[#0B2149] to-[#1a3a6b] px-6 pt-12 pb-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onLogout}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500 hover:text-white transition-colors active:scale-95"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors cursor-pointer border border-white/10">
                  <CalendarIcon className="w-4 h-4 text-blue-200" />
                  <span className="font-medium text-sm">
                    {formatDateLabel(selectedDate)}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 bg-white text-slate-900 border border-slate-200 shadow-lg z-50 p-1"
              >
                {previousDays.map((date, idx) => (
                  <DropdownMenuItem
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    className="cursor-pointer gap-2 hover:bg-slate-100 focus:bg-slate-100 text-slate-700"
                  >
                    {date.getDate() ===
                      selectedDate.getDate() && (
                      <CheckCircle2 className="w-4 h-4 text-[#0B2149]" />
                    )}
                    <span
                      className={
                        date.getDate() ===
                        selectedDate.getDate()
                          ? "font-bold text-[#0B2149]"
                          : ""
                      }
                    >
                      {formatDateLabel(date)}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-blue-200 font-semibold">
            Staff View
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-1">Panel Técnico</h1>
            <p className="text-blue-200 text-sm flex items-center gap-1">
              <Activity className="w-3 h-3" /> {loading ? "Cargando..." : `Resumen del ${formatDateLabel(selectedDate)}`}
            </p>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <button className="text-right group active:scale-95 transition-transform bg-white/5 p-2 pr-3 rounded-lg border border-white/10 hover:bg-white/10">
                <div className="text-2xl font-mono font-bold text-white group-hover:text-blue-100 transition-colors leading-none mb-1">
                  {completedCount}
                  <span className="text-sm text-blue-300 font-normal">
                    /{totalPlayers}
                  </span>
                </div>
                <div className="text-[10px] text-blue-200 uppercase tracking-widest flex items-center justify-end gap-1">
                  Reportes
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                </div>
              </button>
            </SheetTrigger>
            <SheetContent className="w-[90%] sm:w-[400px] bg-white text-slate-900 border-l border-slate-200 z-50">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-[#0B2149] text-xl">
                  Reportes: {activeTab === "morning" ? "Wellness" : "RPE"}
                </SheetTitle>
                <div className="text-sm text-slate-500">
                  Detalle de entregas del {formatDateLabel(selectedDate)}
                </div>
              </SheetHeader>
              <PlayersList type={activeTab as "morning" | "session"} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="px-4 -mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-white p-1 rounded-xl shadow-lg border border-slate-100 h-14 grid grid-cols-2">
            <TabsTrigger
              value="morning"
              className="rounded-lg h-full data-[state=active]:bg-[#0B2149] data-[state=active]:text-white data-[state=active]:shadow-md transition-all text-slate-600"
            >
              Wellness
            </TabsTrigger>
            <TabsTrigger
              value="session"
              className="rounded-lg h-full data-[state=active]:bg-[#0B2149] data-[state=active]:text-white data-[state=active]:shadow-md transition-all text-slate-600"
            >
              RPE
            </TabsTrigger>
          </TabsList>

          <TabsContent value="morning" className="space-y-4 mt-4 animate-in slide-in-from-bottom-2 duration-500">
            {currentPlayers.filter(p => p.wellness).length === 0 && !loading && (
                <div className="text-center py-10 text-slate-400 text-sm">
                    No hay registros completados hoy.
                </div>
            )}

            {riskPlayers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[#0B2149] font-semibold flex items-center gap-2 px-2 text-sm uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Requieren Atención ({riskPlayers.length})
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
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Disponibles ({readyPlayers.length})
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
          </TabsContent>

          <TabsContent value="session" className="space-y-6 mt-4 animate-in slide-in-from-bottom-2 duration-500">
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
                        Esto ajustará la alerta de "Más duro de lo previsto" para todas las jugadoras en este día.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSaveTarget} className="bg-[#0B2149] text-white">Guardar</Button>
                    </DialogFooter>
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
                <div className={`text-3xl font-bold ${Number(avgRpeSession) > plannedRpe + 1 ? "text-red-500" : "text-[#0B2149]"}`}>
                  {avgRpeSession}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[#0B2149] font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Flame className="w-4 h-4 text-orange-500" /> Top Esfuerzo
              </h3>
              <div className="space-y-2">
                {currentPlayers
                  .filter((p) => p.rpe)
                  .sort((a, b) => (b.rpe?.todaySession || 0) - (a.rpe?.todaySession || 0))
                  .slice(0, 3)
                  .map((player, index) => (
                    <div key={player.id} className="bg-white p-4 rounded-xl flex items-center justify-between border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-400 font-bold text-sm border border-slate-100">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#0B2149]">{player.name}</div>
                          {player.rpe?.notes && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5 max-w-[150px] truncate">"{player.rpe.notes}"</div>
                          )}
                        </div>
                      </div>
                      <div className={`text-xl font-black ${(player.rpe?.todaySession || 0) >= 8 ? "text-red-500" : "text-orange-500"}`}>
                        {player.rpe?.todaySession}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}