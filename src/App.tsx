import { useState, useEffect } from 'react';
import { PlayerHome } from './components/PlayerHome';
import { DailyWellness, WellnessData } from './components/DailyWellness';
import { RPEForm } from './components/RPEForm';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { Login } from './components/Login';
import { NotificationSettings } from './components/NotificationSettings';
import { WeeklyCalendar } from './components/calendar/WeeklyCalendar';
import { ChevronLeft } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';

import { requestNotificationPermission, onMessageListener } from './notifications';

type Screen = 'player-home' | 'wellness' | 'rpe' | 'staff' | 'settings' | 'calendar';
type Role = 'player' | 'staff';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('player-home');
  
  const [wellnessCompleted, setWellnessCompleted] = useState(false);
  const [rpeCompleted, setRpeCompleted] = useState(false);
  const [weeklyReadiness, setWeeklyReadiness] = useState(7.5);

  useEffect(() => {
    const savedUser = localStorage.getItem('alaves_user');
    const savedRole = localStorage.getItem('alaves_role') as Role;
    
    if (savedUser && savedRole) {
      setCurrentUser(savedUser);
      setUserRole(savedRole);
      
      requestNotificationPermission(savedUser, savedRole);

      if (savedRole === 'staff') {
        setCurrentScreen('staff');
      } else {
        setCurrentScreen('player-home');
        checkDailyStatus(savedUser); 
      }
    }
  }, []);

  // [CORREGIDO] Sistema anti-duplicados para notificaciones en primer plano
  useEffect(() => {
    // Activamos la escucha y guardamos el "botón de apagado" (unsubscribe)
    const unsubscribe = onMessageListener((payload) => {
        if (payload.notification) {
            toast(payload.notification.title, {
                description: payload.notification.body,
                duration: 5000,
            });
        }
    });

    // React ejecutará esto automáticamente al desmontar o actualizar el componente
    return () => {
        if (unsubscribe) unsubscribe();
    };
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
    
    requestNotificationPermission(name, role);
    
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

  // --- LOGICA RESPONSIVA ---
  const layoutClass = userRole === 'staff' 
    ? "min-h-screen bg-[#F8FAFC]" 
    : "max-w-md mx-auto relative min-h-screen bg-[#F8FAFC]";

  if (userRole === 'staff') {
    return (
      <div className={layoutClass}>
        <Toaster position="top-center" />
        <StaffDashboard onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div className={layoutClass}>
      <Toaster position="top-center" />

      {currentScreen === 'player-home' && (
        <PlayerHome
          playerName={currentUser}
          onNavigate={setCurrentScreen}
          onLogout={handleLogout} 
          wellnessCompleted={wellnessCompleted}
          rpeCompleted={rpeCompleted}
          weeklyReadiness={weeklyReadiness}
        />
      )}

      {currentScreen === 'settings' && (
        <NotificationSettings 
          playerName={currentUser}
          onBack={() => setCurrentScreen('player-home')}
        />
      )}

      {currentScreen === 'calendar' && (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
            <div className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-10">
                <button 
                    onClick={() => setCurrentScreen('player-home')}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200"
                >
                    <ChevronLeft className="w-5 h-5 text-[#0B2149]" />
                </button>
                <h1 className="text-xl font-bold text-[#0B2149]">Agenda Semanal</h1>
            </div>
            
            <div className="flex-1">
                <WeeklyCalendar isStaff={false} />
            </div>
        </div>
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