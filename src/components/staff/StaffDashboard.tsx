import { useState } from "react";
import { LogOut, Activity, Calendar as CalendarIcon, ChevronDown, CheckCircle2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

// Importamos nuestros Módulos
import { useStaffData } from "./useStaffData";
import { WellnessTab } from "./WellnessTab";
import { RPETab } from "./RPETab";
import { ReportsSheet } from "./ReportsSheet";
import { PlayerDetailView } from "./PlayerDetailView"; // Importamos el nuevo componente
import { Player } from "./types";

interface StaffDashboardProps {
  onLogout: () => void;
}

export function StaffDashboard({ onLogout }: StaffDashboardProps) {
  const [activeTab, setActiveTab] = useState("morning");
  const { players, loading, plannedRpe, selectedDate, setSelectedDate, saveTarget } = useStaffData();
  
  // ESTADO PARA LA NAVEGACIÓN INTERNA
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // SI HAY JUGADORA SELECCIONADA, MOSTRAMOS SU PÁGINA DE DETALLE
  if (selectedPlayer) {
    return (
      <PlayerDetailView 
        player={selectedPlayer} 
        onBack={() => setSelectedPlayer(null)} 
      />
    );
  }

  // --- CÓDIGO DEL DASHBOARD NORMAL (Si no hay jugadora seleccionada) ---

  const totalPlayers = players.length;
  const completedCount = activeTab === "morning"
    ? players.filter((p) => p.wellness).length
    : players.filter((p) => p.rpe).length;

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return isToday ? `Hoy, ${date.toLocaleDateString("es-ES", options)}` : date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  };

  const previousDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-8">
      {/* --- HEADER --- */}
      <div className="bg-gradient-to-b from-[#0B2149] to-[#1a3a6b] px-6 pt-12 pb-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onLogout} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500 transition-colors active:scale-95">
              <LogOut className="w-5 h-5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full cursor-pointer border border-white/10">
                  <CalendarIcon className="w-4 h-4 text-blue-200" />
                  <span className="font-medium text-sm">{formatDateLabel(selectedDate)}</span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-white text-slate-900 border border-slate-200 shadow-lg z-50 p-1">
                {previousDays.map((date, idx) => (
                  <DropdownMenuItem key={idx} onClick={() => setSelectedDate(date)} className="cursor-pointer gap-2 hover:bg-slate-100 text-slate-700">
                    {date.getDate() === selectedDate.getDate() && <CheckCircle2 className="w-4 h-4 text-[#0B2149]" />}
                    <span className={date.getDate() === selectedDate.getDate() ? "font-bold text-[#0B2149]" : ""}>{formatDateLabel(date)}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-blue-200 font-semibold">Staff View</div>
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
                <div className="text-2xl font-mono font-bold text-white group-hover:text-blue-100 leading-none mb-1">
                  {completedCount}<span className="text-sm text-blue-300 font-normal">/{totalPlayers}</span>
                </div>
                <div className="text-[10px] text-blue-200 uppercase tracking-widest flex items-center justify-end gap-1">
                  Reportes <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                </div>
              </button>
            </SheetTrigger>
            <SheetContent className="w-[90%] sm:w-[400px] bg-white text-slate-900 border-l border-slate-200 z-50">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-[#0B2149] text-xl">Reportes: {activeTab === "morning" ? "Wellness" : "RPE"}</SheetTitle>
                <div className="text-sm text-slate-500">Detalle de entregas del {formatDateLabel(selectedDate)}</div>
              </SheetHeader>
              <ReportsSheet players={players} activeTab={activeTab} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* --- CONTENIDO --- */}
      <div className="px-4 -mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-white p-1 rounded-xl shadow-lg border border-slate-100 h-14 grid grid-cols-2">
            <TabsTrigger value="morning" className="rounded-lg h-full data-[state=active]:bg-[#0B2149] data-[state=active]:text-white transition-all text-slate-600">Wellness</TabsTrigger>
            <TabsTrigger value="session" className="rounded-lg h-full data-[state=active]:bg-[#0B2149] data-[state=active]:text-white transition-all text-slate-600">RPE</TabsTrigger>
          </TabsList>

          {activeTab === "morning" ? (
            <WellnessTab 
              players={players} 
              loading={loading} 
              onPlayerClick={setSelectedPlayer} // Pasamos la función de selección
            />
          ) : (
            <RPETab players={players} plannedRpe={plannedRpe} onSaveTarget={saveTarget} />
          )}
        </Tabs>
      </div>
    </div>
  );
}