// src/App.tsx
import { useState } from 'react';
import { PlayerHome } from './components/PlayerHome';
import { DailyWellness, WellnessData } from './components/DailyWellness';
import { RPEForm } from './components/RPEForm';
import { StaffDashboard } from './components/StaffDashboard';
import { Users } from 'lucide-react';
// Importamos la conexión a la base de datos y la función para añadir documentos
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
// Importamos el "toast" (notificación bonita) de la librería que ya tienes instalada
import { Toaster, toast } from 'sonner';

type Screen = 'player-home' | 'wellness' | 'rpe' | 'staff';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('player-home');
  const [wellnessCompleted, setWellnessCompleted] = useState(false);
  const [weeklyReadiness, setWeeklyReadiness] = useState(7.5);

  const handleWellnessSubmit = async (data: WellnessData) => {
    try {
      // 1. Calculamos el readiness (tu fórmula)
      const readiness = (
        data.sleepQuality * 0.25 +
        (10 - data.fatigueLevel) * 0.25 +
        (10 - data.muscleSoreness) * 0.15 +
        (10 - data.stressLevel) * 0.20 +
        data.mood * 0.15
      );

      // 2. GUARDAMOS EN FIREBASE (Aquí ocurre la magia)
      await addDoc(collection(db, "wellness_logs"), {
        ...data,
        readinessScore: readiness,
        playerName: "Jugadora Prueba", // Más adelante pondremos el nombre real del login
        date: new Date(),
        timestamp: Date.now()
      });

      // 3. Feedback visual
      setWellnessCompleted(true);
      setWeeklyReadiness(readiness);
      toast.success("¡Datos guardados correctamente!"); // Notificación verde
      
    } catch (error) {
      console.error("Error guardando:", error);
      toast.error("Error al guardar los datos");
    }
  };

  const handleRPESubmit = async (rpe: number, notes: string) => {
    try {
      await addDoc(collection(db, "rpe_logs"), {
        rpeValue: rpe,
        notes: notes,
        playerName: "Jugadora Prueba",
        date: new Date(),
        timestamp: Date.now()
      });
      toast.success("RPE registrado");
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar RPE");
    }
  };

  return (
    <div className="max-w-md mx-auto relative min-h-screen bg-[#F8FAFC]">
      {/* Componente para las notificaciones */}
      <Toaster position="top-center" />

      {/* Role Toggle Button */}
      <button
        onClick={() => setCurrentScreen(currentScreen === 'staff' ? 'player-home' : 'staff')}
        className="fixed top-6 right-6 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform border-2 border-[#0B2149]"
        style={{ 
          backgroundColor: currentScreen === 'staff' ? '#0B2149' : '#FFFFFF' 
        }}
      >
        <Users 
          className="w-6 h-6" 
          style={{ 
            color: currentScreen === 'staff' ? '#FFFFFF' : '#0B2149' 
          }} 
        />
      </button>

      {/* Screen Router */}
      {currentScreen === 'player-home' && (
        <PlayerHome
          playerName="Ana"
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