import { useState } from "react";
import { LogOut, Activity, Calendar as CalendarIcon, ChevronDown, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Save, Bell } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { toast } from "sonner";

// Importamos Firebase y Utils
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { useStaffData } from "./useStaffData";
import { WellnessTab } from "./WellnessTab";
import { RPETab } from "./RPETab";
import { ReportsSheet } from "./ReportsSheet";
import { PlayerDetailView } from "./PlayerDetailView";
import { Player } from "./types";
import { checkNotificationHealth } from "../../notifications"; // Importamos el doctor

interface StaffDashboardProps {
  onLogout: () => void;
}

export function StaffDashboard({ onLogout }: StaffDashboardProps) {
  const [activeTab, setActiveTab] = useState("morning");
  const { players, loading, plannedRpe, selectedDate, setSelectedDate, saveTarget } = useStaffData();
  
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showNotifHealth, setShowNotifHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // --- LÓGICA DE EXPORTACIÓN Y ACTUALIZACIÓN ---
  const fetchAllData = async () => {
    const wQuery = query(collection(db, "wellness_logs"), orderBy("timestamp", "desc"));
    const rQuery = query(collection(db, "rpe_logs"), orderBy("timestamp", "desc"));
    const [wSnap, rSnap] = await Promise.all([getDocs(wQuery), getDocs(rQuery)]);

    const unifiedData: Record<string, any> = {};
    const getKey = (date: Date, name: string) => {
      const d = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      return `${d}_${name}`; 
    };

    wSnap.forEach(doc => {
      const d = doc.data();
      const date = new Date(d.timestamp);
      const name = d.playerName;
      const key = getKey(date, name);
      if (!unifiedData[key]) unifiedData[key] = { ID_UNICO: key, Fecha: date.toLocaleDateString("es-ES"), Nombre: name, Posición: "JUG" };
      unifiedData[key].Sueño = d.sleepQuality;
      unifiedData[key].Fatiga = d.fatigueLevel;
      unifiedData[key].Dolor = d.muscleSoreness;
      unifiedData[key].Estrés = d.stressLevel;
      unifiedData[key].Ánimo = d.mood;
      unifiedData[key].Ciclo = d.menstruationStatus === 'none' ? "Ninguno" : d.menstruationStatus === 'pms' ? "SPM" : "Regla";
      unifiedData[key].NotaWellness = d.notes;
    });

    rSnap.forEach(doc => {
      const d = doc.data();
      const date = new Date(d.timestamp);
      const name = d.playerName;
      const key = getKey(date, name);
      if (!unifiedData[key]) unifiedData[key] = { ID_UNICO: key, Fecha: date.toLocaleDateString("es-ES"), Nombre: name, Posición: "JUG" };
      unifiedData[key].RPE = d.rpeValue;
      unifiedData[key].NotaRPE = d.notes;
    });

    return Object.values(unifiedData);
  };

  const handleUpdateMasterExcel = async () => {
    if (!('showOpenFilePicker' in window)) {
      toast.error("Tu navegador no soporta esta función. Usa Chrome o Edge en PC.");
      return;
    }
    setIsExporting(true);
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [{ description: 'Excel Files', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
        multiple: false
      });
      const file = await fileHandle.getFile();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const existingData: any[] = XLSX.utils.sheet_to_json(worksheet);
      const firebaseData = await fetchAllData();
      const existingKeys = new Set(existingData.map((row: any) => row.ID_UNICO));
      
      let addedCount = 0;
      firebaseData.forEach((newItem: any) => {
        if (!existingKeys.has(newItem.ID_UNICO)) {
          existingData.push(newItem);
          addedCount++;
        }
      });

      if (addedCount === 0) {
        toast.info("El Excel ya está actualizado.");
        setIsExporting(false);
        return;
      }

      const newWorksheet = XLSX.utils.json_to_sheet(existingData);
      workbook.Sheets[firstSheetName] = newWorksheet;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const writable = await fileHandle.createWritable();
      await writable.write(excelBuffer);
      await writable.close();
      toast.success(`¡Éxito! Se han añadido ${addedCount} filas.`);
    } catch (error) {
      console.error(error);
      if ((error as any).name !== 'AbortError') toast.error("Error al actualizar el Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportHistory = async () => {
    setIsExporting(true);
    try {
        const data = await fetchAllData();
        data.sort((a: any, b: any) => {
            const dateA = a.ID_UNICO.split('_')[0];
            const dateB = b.ID_UNICO.split('_')[0];
            return dateB.localeCompare(dateA);
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Datos Alaves");
        XLSX.writeFile(wb, "Alaves_MASTER_Historial.xlsx");
        toast.success("Historial creado correctamente.");
    } catch (e) {
        console.error(e);
        toast.error("Error al exportar.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportToday = () => {
    // Implementación simple para hoy
    toast.info("Usa el Histórico Completo para tener todos los datos.");
  };

  // --- DIAGNÓSTICO DE NOTIFICACIONES ---
  const runHealthCheck = async () => {
    setHealthStatus(null);
    setShowNotifHealth(true);
    const status = await checkNotificationHealth();
    setHealthStatus(status);
  };

  // --- RENDER ---
  if (selectedPlayer) {
    return <PlayerDetailView player={selectedPlayer} onBack={() => setSelectedPlayer(null)} />;
  }

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
  
  const previousDays = Array.from({ length: 5 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d; });

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
          
          <div className="flex items-center gap-2">
             {/* BOTÓN DIAGNÓSTICO NOTIFICACIONES */}
             <button 
               onClick={runHealthCheck}
               className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-blue-200"
               title="Diagnóstico de Notificaciones"
             >
                <Bell className="w-4 h-4" />
             </button>

             {/* MENU EXCEL */}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button 
                       className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border border-emerald-500/30 active:scale-95 outline-none"
                       disabled={isExporting}
                    >
                       {isExporting ? <Activity className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                       Excel
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-white border-slate-200 shadow-xl">
                    <DropdownMenuLabel>Gestión de Datos</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleUpdateMasterExcel} className="cursor-pointer gap-3 p-3 focus:bg-slate-50">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-700"><RefreshCw className="w-4 h-4" /></div>
                        <div><span className="block font-bold text-[#0B2149] text-xs">Actualizar Maestro</span><span className="block text-[10px] text-slate-500">Añadir datos a tu Excel</span></div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportHistory} className="cursor-pointer gap-3 p-3 focus:bg-slate-50">
                        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700"><Save className="w-4 h-4" /></div>
                        <div><span className="block font-bold text-[#0B2149] text-xs">Descargar Todo</span><span className="block text-[10px] text-slate-500">Generar archivo nuevo</span></div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
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
              onPlayerClick={setSelectedPlayer} 
            />
          ) : (
            <RPETab players={players} plannedRpe={plannedRpe} onSaveTarget={saveTarget} />
          )}
        </Tabs>
      </div>

      {/* MODAL DE DIAGNÓSTICO */}
      <Dialog open={showNotifHealth} onOpenChange={setShowNotifHealth}>
        <DialogContent className="bg-white text-slate-900">
            <DialogHeader>
                <DialogTitle>Diagnóstico de Notificaciones</DialogTitle>
                <DialogDescription>
                    Estado de la conexión push en este dispositivo.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                {!healthStatus ? (
                    <div className="text-center py-4">Comprobando...</div>
                ) : (
                    <>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-sm font-bold">Permiso Navegador:</span>
                            <span className={`text-xs px-2 py-1 rounded ${healthStatus.permission === 'granted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {healthStatus.permission}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-sm font-bold">Acceso a Service Worker:</span>
                            <span className={`text-xs px-2 py-1 rounded ${healthStatus.swStatus === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {healthStatus.swStatus}
                            </span>
                        </div>
                        <div className="border-b pb-2">
                            <span className="text-sm font-bold block mb-1">Token FCM:</span>
                            {healthStatus.token ? (
                                <p className="text-[10px] font-mono bg-slate-100 p-2 rounded break-all">{healthStatus.token.substring(0, 20)}...</p>
                            ) : (
                                <p className="text-xs text-red-500">No se pudo obtener token</p>
                            )}
                        </div>
                        {healthStatus.swStatus !== 'OK' && (
                            <div className="bg-red-50 border border-red-200 p-3 rounded text-xs text-red-700">
                                <strong>⚠️ Problema detectado:</strong><br/>
                                El archivo 'firebase-messaging-sw.js' está bloqueado (Error 401). 
                                <br/><br/>
                                <strong>Solución:</strong> Ve a Vercel {'>'} Settings {'>'} Deployment Protection y desactiva "Vercel Authentication".
                            </div>
                        )}
                    </>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}