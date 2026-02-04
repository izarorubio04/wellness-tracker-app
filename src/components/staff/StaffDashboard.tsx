import { useState } from "react";
import { LogOut, Activity, Calendar as CalendarIcon, ChevronDown, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Save } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { toast } from "sonner";

// Importamos Firebase
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

// IMPORTANTE: Importamos XLSX para leer/escribir Excel real
import * as XLSX from 'xlsx';

// Importamos nuestros Módulos
import { useStaffData } from "./useStaffData";
import { WellnessTab } from "./WellnessTab";
import { RPETab } from "./RPETab";
import { ReportsSheet } from "./ReportsSheet";
import { PlayerDetailView } from "./PlayerDetailView";
import { Player } from "./types";

interface StaffDashboardProps {
  onLogout: () => void;
}

export function StaffDashboard({ onLogout }: StaffDashboardProps) {
  const [activeTab, setActiveTab] = useState("morning");
  const { players, loading, plannedRpe, selectedDate, setSelectedDate, saveTarget } = useStaffData();
  
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // --- LÓGICA DE EXPORTACIÓN Y ACTUALIZACIÓN ---

  // 1. OBTENER DATOS DE FIREBASE (Lógica compartida)
  const fetchAllData = async () => {
    const wQuery = query(collection(db, "wellness_logs"), orderBy("timestamp", "desc"));
    const rQuery = query(collection(db, "rpe_logs"), orderBy("timestamp", "desc"));
    const [wSnap, rSnap] = await Promise.all([getDocs(wQuery), getDocs(rQuery)]);

    const unifiedData: Record<string, any> = {};
    const getKey = (date: Date, name: string) => {
      // Normalizamos fecha a YYYY-MM-DD
      const d = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      return `${d}_${name}`; 
    };

    wSnap.forEach(doc => {
      const d = doc.data();
      const date = new Date(d.timestamp);
      const name = d.playerName;
      const key = getKey(date, name);
      if (!unifiedData[key]) unifiedData[key] = { 
          ID_UNICO: key, // Usamos esto para evitar duplicados
          Fecha: date.toLocaleDateString("es-ES"), 
          Nombre: name, 
          Posición: "JUG" 
      };
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
      if (!unifiedData[key]) unifiedData[key] = { 
          ID_UNICO: key,
          Fecha: date.toLocaleDateString("es-ES"), 
          Nombre: name, 
          Posición: "JUG" 
      };
      unifiedData[key].RPE = d.rpeValue;
      unifiedData[key].NotaRPE = d.notes;
    });

    return Object.values(unifiedData);
  };

  // 2. ACTUALIZAR EXCEL MAESTRO (La Magia)
  const handleUpdateMasterExcel = async () => {
    // Verificamos soporte del navegador
    if (!('showOpenFilePicker' in window)) {
      toast.error("Tu navegador no soporta esta función. Usa Chrome o Edge.");
      return;
    }

    setIsExporting(true);
    try {
      // A. Pedir al usuario que seleccione el archivo MAESTRO
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [{ description: 'Excel Files', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
        multiple: false
      });

      // B. Leer el archivo existente
      const file = await fileHandle.getFile();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      // Asumimos que los datos están en la primera hoja
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convertir Excel existente a JSON
      const existingData: any[] = XLSX.utils.sheet_to_json(worksheet);
      
      // C. Obtener datos frescos de Firebase
      const firebaseData = await fetchAllData();

      // D. FUSIONAR INTELIGENTE (Merge)
      // Creamos un Set con los ID_UNICO que ya existen en el Excel para no duplicar
      const existingKeys = new Set(existingData.map((row: any) => row.ID_UNICO));
      
      let addedCount = 0;
      firebaseData.forEach((newItem: any) => {
        if (!existingKeys.has(newItem.ID_UNICO)) {
          existingData.push(newItem); // Añadimos solo si es nuevo
          addedCount++;
        }
      });

      if (addedCount === 0) {
        toast.info("El Excel ya está actualizado. No hay datos nuevos.");
        setIsExporting(false);
        return;
      }

      // E. Escribir de nuevo al Excel (Convirtiendo JSON -> Hoja)
      const newWorksheet = XLSX.utils.json_to_sheet(existingData);
      workbook.Sheets[firstSheetName] = newWorksheet;
      
      // Generar el blob binario
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      // F. Guardar sobre el mismo archivo
      const writable = await fileHandle.createWritable();
      await writable.write(excelBuffer);
      await writable.close();

      toast.success(`¡Éxito! Se han añadido ${addedCount} filas nuevas a tu Excel.`);

    } catch (error) {
      console.error(error);
      // Si el usuario cancela la selección, no es un error grave
      if ((error as any).name !== 'AbortError') {
        toast.error("Error al actualizar el Excel. Asegúrate de que no esté abierto.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  // 3. EXPORTAR HISTÓRICO (Opción backup si no tienen Excel creado)
  const handleExportHistory = async () => {
    setIsExporting(true);
    try {
        const data = await fetchAllData();
        // Ordenar por fecha desc
        data.sort((a: any, b: any) => {
            const dateA = a.ID_UNICO.split('_')[0];
            const dateB = b.ID_UNICO.split('_')[0];
            return dateB.localeCompare(dateA);
        });

        // Generar Excel nuevo
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
          
          {/* MENU DE EXPORTACIÓN INTELIGENTE */}
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
                
                {/* OPCIÓN 1: ACTUALIZAR EL MAESTRO */}
                <DropdownMenuItem onClick={handleUpdateMasterExcel} className="cursor-pointer gap-3 p-3 focus:bg-slate-50">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                        <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="block font-bold text-[#0B2149] text-xs">Actualizar Maestro</span>
                        <span className="block text-[10px] text-slate-500">Selecciona tu archivo y añade datos</span>
                    </div>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />

                {/* OPCIÓN 2: CREAR NUEVO (BACKUP) */}
                <DropdownMenuItem onClick={handleExportHistory} className="cursor-pointer gap-3 p-3 focus:bg-slate-50">
                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                        <Save className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="block font-bold text-[#0B2149] text-xs">Descargar Todo</span>
                        <span className="block text-[10px] text-slate-500">Generar archivo nuevo con todo</span>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
    </div>
  );
}