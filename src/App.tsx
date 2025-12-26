import { useState, useEffect } from 'react';
import { PlayerHome } from './components/PlayerHome';
import { DailyWellness, WellnessData } from './components/DailyWellness';
import { RPEForm } from './components/RPEForm';
import { StaffDashboard } from './components/StaffDashboard';
import { Login } from './components/Login'; // <--- IMPORTAMOS EL NUEVO LOGIN
import { Users, LogOut } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';

type Screen = 'player-home' | 'wellness' | 'rpe' | 'staff';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null); // Estado para el usuario
  const [currentScreen, setCurrentScreen] = useState<Screen>('player-home');
  const [wellnessCompleted, setWellnessCompleted] = useState(false);
  const [weeklyReadiness, setWeeklyReadiness] = useState(7.5);

  // EFECTO: Al arrancar, comprobamos si ya habías iniciado sesión antes
  useEffect(() => {
    const savedUser = localStorage.getItem('alaves_user');
    if (savedUser) {
      setCurrentUser(savedUser);
    }
  }, []);

  const handleLogin = (name: string) => {
    setCurrentUser(name);
    localStorage.setItem('alaves_user', name); // Guardamos en la memoria del teléfono
    toast.success(`Hola, ${name}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('alaves_user');
    setCurrentScreen('player-home');
  };

  const handleWellnessSubmit = async (data: WellnessData) => {
    if (!currentUser) return; // Seguridad extra

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
        playerName: currentUser, // <--- AQUI USAMOS EL NOMBRE REAL
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
        playerName: currentUser, // <--- AQUI USAMOS EL NOMBRE REAL
        date: new Date(),
        timestamp: Date.now()
      });
      toast.success("RPE registrado");
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar RPE");
    }
  };

  // SI NO HAY USUARIO, MOSTRAMOS LOGIN
  if (!currentUser) {
    return (
      <>
        <Toaster position="top-center" />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  // SI HAY USUARIO, MOSTRAMOS LA APP NORMAL
  return (
    <div className="max-w-md mx-auto relative min-h-screen bg-[#F8FAFC]">
      <Toaster position="top-center" />

      {/* Botón flotante para cambiar Rol o Salir */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2">
        <button
          onClick={() => setCurrentScreen(currentScreen === 'staff' ? 'player-home' : 'staff')}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 border-2 border-[#0B2149]"
          style={{ backgroundColor: currentScreen === 'staff' ? '#0B2149' : '#FFFFFF' }}
        >
          <Users className="w-5 h-5" style={{ color: currentScreen === 'staff' ? '#FFFFFF' : '#0B2149' }} />
        </button>
        
        {/* Pequeño botón de Logout (opcional, por si te equivocas de nombre) */}
        {currentScreen === 'player-home' && (
           <button
             onClick={handleLogout}
             className="w-12 h-12 bg-red-100 rounded-full shadow-lg flex items-center justify-center active:scale-95 border-2 border-red-200"
           >
             <LogOut className="w-5 h-5 text-red-500" />
           </button>
        )}
      </div>

      {currentScreen === 'player-home' && (
        <PlayerHome
          playerName={currentUser} // <--- Pasamos el nombre al saludo
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

      {currentScreen === 'staff' && (
        <StaffDashboard
          onBack={() => setCurrentScreen('player-home')}
        />
      )}
    </div>
  );
}