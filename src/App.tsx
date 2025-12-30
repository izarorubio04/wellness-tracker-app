import { useState, useEffect } from 'react';
import { PlayerHome } from './components/PlayerHome';
import { DailyWellness, WellnessData } from './components/DailyWellness';
import { RPEForm } from './components/RPEForm';
import { StaffDashboard } from './components/StaffDashboard';
import { Login } from './components/Login';
import { LogOut } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';

type Screen = 'player-home' | 'wellness' | 'rpe' | 'staff';
type Role = 'player' | 'staff';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  
  const [currentScreen, setCurrentScreen] = useState<Screen>('player-home');
  
  const [wellnessCompleted, setWellnessCompleted] = useState(false);
  const [weeklyReadiness, setWeeklyReadiness] = useState(7.5);

  // 1. AL ARRANCAR LA APP
  useEffect(() => {
    const savedUser = localStorage.getItem('alaves_user');
    const savedRole = localStorage.getItem('alaves_role') as Role;
    
    if (savedUser && savedRole) {
      setCurrentUser(savedUser);
      setUserRole(savedRole);
      
      // Si es Staff, al dashboard
      if (savedRole === 'staff') {
        setCurrentScreen('staff');
      } else {
        // Si es Jugadora, a casa y COMPROBAR ESTADO
        setCurrentScreen('player-home');
        checkDailyStatus(savedUser); 
      }
    }
  }, []);

  // 2. FUNCIÓN DE COMPROBACIÓN (ESTRATEGIA "SIN ERRORES DE ÍNDICE")
  const checkDailyStatus = async (playerName: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Inicio del día de hoy

      // CONSULTA SIMPLIFICADA: Traemos todo lo de hoy. 
      // Al no filtrar por nombre AQUÍ, evitamos el error de "Falta Índice" de Firebase.
      const q = query(
        collection(db, "wellness_logs"),
        where("timestamp", ">=", today.getTime())
      );

      const querySnapshot = await getDocs(q);

      // FILTRAMOS EN EL CLIENTE (Tu móvil hace el trabajo final)
      // Buscamos si en los registros de hoy, hay alguno con MI nombre
      const myLog = querySnapshot.docs.find(doc => doc.data().playerName === playerName);

      if (myLog) {
        console.log("✅ Wellness encontrado para hoy:", playerName);
        setWellnessCompleted(true);
        // Recuperamos el score que se guardó para mostrarlo
        setWeeklyReadiness(myLog.data().readinessScore || 7.5);
      } else {
        console.log("❌ No se ha encontrado wellness hoy para:", playerName);
        setWellnessCompleted(false);
      }

    } catch (error) {
      console.error("Error comprobando estado diario:", error);
    }
  };

  const handleLogin = (name: string, role: Role) => {
    setCurrentUser(name);
    setUserRole(role);
    localStorage.setItem('alaves_user', name);
    localStorage.setItem('alaves_role', role);
    
    if (role === 'staff') {
      setCurrentScreen('staff');
    } else {
      setCurrentScreen('player-home');
      checkDailyStatus(name); // Comprobar al entrar
    }
    
    toast.success(`Hola, ${name}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole(null);
    setWellnessCompleted(false); // Limpiamos estado
    localStorage.removeItem('alaves_user');
    localStorage.removeItem('alaves_role');
    setCurrentScreen('player-home');
  };

  const handleWellnessSubmit = async (data: WellnessData) => {
    if (!currentUser) return;
    try {
      const readiness = (
        data.sleepQuality * 0.25 +
        (10 - data.fatigueLevel) * 0.25 +
        (10 - data.muscleSoreness) * 0.15 +
        (10 - data.stressLevel) * 0.20 +
        data.mood * 0.15
      );

      // Guardamos en Firebase
      await addDoc(collection(db, "wellness_logs"), {
        ...data,
        readinessScore: readiness,
        playerName: currentUser,
        date: new Date(),
        timestamp: Date.now()
      });

      // Actualizamos estado visual inmediatamente
      setWellnessCompleted(true);
      setWeeklyReadiness(readiness);
      toast.success("¡Wellness guardado correctamente!");
      
    } catch (error) {
      console.error("Error guardando:", error);
      toast.error("Error al guardar los datos");
    }
  };

  const handleRPESubmit = async (rpe: number, notes: string) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "rpe_logs"), {
        rpeValue: rpe,
        notes: notes,
        playerName: currentUser,
        date: new Date(),
        timestamp: Date.now()
      });
      toast.success("RPE registrado correctamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar RPE");
    }
  };

  if (!currentUser) {
    return (
      <>
        <Toaster position="top-center" />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  // --- RENDERIZADO PARA STAFF ---
  if (userRole === 'staff') {
    return (
      <div className="max-w-md mx-auto relative min-h-screen bg-[#F8FAFC]">
        <Toaster position="top-center" />
        <StaffDashboard onLogout={handleLogout} />
      </div>
    );
  }

  // --- RENDERIZADO PARA JUGADORA ---
  return (
    <div className="max-w-md mx-auto relative min-h-screen bg-[#F8FAFC]">
      <Toaster position="top-center" />

      {/* Botón Salir (Solo en la Home) */}
      {currentScreen === 'player-home' && (
        <div className="fixed top-6 right-6 z-50">
          <button
              onClick={handleLogout}
              className="w-10 h-10 bg-white/80 backdrop-blur rounded-full shadow-sm flex items-center justify-center active:scale-95 text-red-400 border border-red-50"
          >
              <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {currentScreen === 'player-home' && (
        <PlayerHome
          playerName={currentUser}
          onNavigate={setCurrentScreen}
          wellnessCompleted={wellnessCompleted} // Pasamos el estado recuperado
          weeklyReadiness={weeklyReadiness}
        />
      )}

      {currentScreen === 'wellness' && (
        <DailyWellness
          onBack={() => setCurrentScreen('player-home')}
          onSubmit={handleWellnessSubmit}
        />
      )}

      {currentScreen === 'rpe' && (
        <RPEForm
          onBack={() => setCurrentScreen('player-home')}
          onSubmit={handleRPESubmit}
        />
      )}
    </div>
  );
}