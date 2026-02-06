import { useState, useEffect } from 'react';
import { PlayerHome } from './components/PlayerHome';
import { DailyWellness, WellnessData } from './components/DailyWellness';
import { RPEForm } from './components/RPEForm';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { Login } from './components/Login';
import { LogOut } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';

// Importamos la lógica de notificaciones
import { requestNotificationPermission, onMessageListener } from './notifications';

type Screen = 'player-home' | 'wellness' | 'rpe' | 'staff';
type Role = 'player' | 'staff';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('player-home');
  
  // ESTADOS DE COMPLETADO
  const [wellnessCompleted, setWellnessCompleted] = useState(false);
  const [rpeCompleted, setRpeCompleted] = useState(false);
  const [weeklyReadiness, setWeeklyReadiness] = useState(7.5);

  useEffect(() => {
    const savedUser = localStorage.getItem('alaves_user');
    const savedRole = localStorage.getItem('alaves_role') as Role;
    
    if (savedUser && savedRole) {
      setCurrentUser(savedUser);
      setUserRole(savedRole);
      
      // Si ya estaba logueado, pedimos permiso de notificaciones de nuevo (por si cambió el token o es nuevo dispositivo)
      requestNotificationPermission(savedUser);

      if (savedRole === 'staff') {
        setCurrentScreen('staff');
      } else {
        setCurrentScreen('player-home');
        checkDailyStatus(savedUser); 
      }
    }
  }, []);

  // ESCUCHAR NOTIFICACIONES EN PRIMER PLANO (FOREGROUND)
  // Esto sirve para que si estás con la app abierta, te salga el aviso igual.
  useEffect(() => {
    const listenToNotifications = async () => {
        try {
            const payload = await onMessageListener();
            console.log("Notificación recibida en foreground:", payload);
            if (payload.notification) {
                toast(payload.notification.title, {
                    description: payload.notification.body,
                    action: {
                        label: "Ver",
                        onClick: () => console.log("Click en notificación")
                    }
                });
            }
        } catch (err) {
            console.log("Esperando notificaciones...", err);
        }
    };
    listenToNotifications();
  }, []);

  const checkDailyStatus = async (playerName: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const qWellness = query(
        collection(db, "wellness_logs"),
        where("timestamp", ">=", today.getTime())
      );

      const qRpe = query(
        collection(db, "rpe_logs"),
        where("timestamp", ">=", today.getTime())
      );

      const [snapWellness, snapRpe] = await Promise.all([
        getDocs(qWellness), 
        getDocs(qRpe)
      ]);

      const myWellness = snapWellness.docs.find(doc => doc.data().playerName === playerName);
      if (myWellness) {
        setWellnessCompleted(true);
        setWeeklyReadiness(myWellness.data().readinessScore || 7.5);
      } else {
        setWellnessCompleted(false);
      }

      const myRpe = snapRpe.docs.find(doc => doc.data().playerName === playerName);
      if (myRpe) {
        setRpeCompleted(true);
      } else {
        setRpeCompleted(false);
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
    
    // SOLICITAMOS PERMISO AL LOGUEARSE
    requestNotificationPermission(name);
    
    if (role === 'staff') {
      setCurrentScreen('staff');
    } else {
      setCurrentScreen('player-home');
      checkDailyStatus(name);
    }
    toast.success(`Hola, ${name}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole(null);
    setWellnessCompleted(false);
    setRpeCompleted(false);
    localStorage.removeItem('alaves_user');
    localStorage.removeItem('alaves_role');
    setCurrentScreen('player-home');
  };

  const handleWellnessSubmit = async (data: WellnessData) => {
    if (!currentUser) return;
    try {
      // FÓRMULA READINESS INVERTIDA (1=Bueno, 10=Malo -> Score alto es mejor)
      const readiness = (
        (11 - data.sleepQuality) * 0.25 +    
        (11 - data.fatigueLevel) * 0.25 +    
        (11 - data.muscleSoreness) * 0.15 +  
        (11 - data.stressLevel) * 0.20 +     
        (11 - data.mood) * 0.15              
      );

      const finalReadiness = Math.round(readiness * 10) / 10;

      await addDoc(collection(db, "wellness_logs"), {
        ...data,
        readinessScore: finalReadiness,
        playerName: currentUser,
        date: new Date(),
        timestamp: Date.now()
      });

      setWellnessCompleted(true);
      setWeeklyReadiness(finalReadiness);
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
      
      setRpeCompleted(true);
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

  if (userRole === 'staff') {
    return (
      <div className="max-w-md mx-auto relative min-h-screen bg-[#F8FAFC]">
        <Toaster position="top-center" />
        <StaffDashboard onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto relative min-h-screen bg-[#F8FAFC]">
      <Toaster position="top-center" />

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
          rpeCompleted={rpeCompleted}
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