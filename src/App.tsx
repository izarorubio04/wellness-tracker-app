import { useState, useEffect } from 'react';
import { PlayerHome } from './components/PlayerHome';
import { DailyWellness, WellnessData } from './components/DailyWellness';
import { RPEForm } from './components/RPEForm';
import { StaffDashboard } from './components/StaffDashboard';
import { Login } from './components/Login';
import { LogOut } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';

type Screen = 'player-home' | 'wellness' | 'rpe' | 'staff';
type Role = 'player' | 'staff';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  
  const [currentScreen, setCurrentScreen] = useState<Screen>('player-home');
  const [wellnessCompleted, setWellnessCompleted] = useState(false);
  const [weeklyReadiness, setWeeklyReadiness] = useState(7.5);

  useEffect(() => {
    const savedUser = localStorage.getItem('alaves_user');
    const savedRole = localStorage.getItem('alaves_role') as Role;
    
    if (savedUser && savedRole) {
      setCurrentUser(savedUser);
      setUserRole(savedRole);
      setCurrentScreen(savedRole === 'staff' ? 'staff' : 'player-home');
    }
  }, []);

  const handleLogin = (name: string, role: Role) => {
    setCurrentUser(name);
    setUserRole(role);
    localStorage.setItem('alaves_user', name);
    localStorage.setItem('alaves_role', role);
    
    setCurrentScreen(role === 'staff' ? 'staff' : 'player-home');
    toast.success(`Hola, ${name}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole(null);
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

      await addDoc(collection(db, "wellness_logs"), {
        ...data,
        readinessScore: readiness,
        playerName: currentUser,
        date: new Date(),
        timestamp: Date.now()
      });

      setWellnessCompleted(true);
      setWeeklyReadiness(readiness);
      toast.success("¡Wellness guardado!");
    } catch (error) {
      console.error("Error guardando:", error);
      toast.error("Error al guardar");
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
      toast.success("RPE registrado");
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
  // Ahora es mucho más limpio: Solo el Dashboard con la función de salir
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
          wellnessCompleted={wellnessCompleted}
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