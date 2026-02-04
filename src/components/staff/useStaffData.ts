import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { Player, SQUAD_NAMES } from './types';

export function useStaffData() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [plannedRpe, setPlannedRpe] = useState(5.0);

  const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateKey = getDateKey(selectedDate);
      
      // 1. Cargar Objetivo RPE
      const targetDocRef = doc(db, "rpe_targets", dateKey);
      const targetSnap = await getDoc(targetDocRef);
      setPlannedRpe(targetSnap.exists() ? targetSnap.data().target : 5.0);

      // 2. Fechas para consulta
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // 3. Consultas Firebase
      const wellnessQuery = query(collection(db, "wellness_logs"), where("timestamp", ">=", startOfDay.getTime()), where("timestamp", "<=", endOfDay.getTime()));
      const rpeQuery = query(collection(db, "rpe_logs"), where("timestamp", ">=", startOfDay.getTime()), where("timestamp", "<=", endOfDay.getTime()));

      const [wellnessSnapshot, rpeSnapshot] = await Promise.all([getDocs(wellnessQuery), getDocs(rpeQuery)]);

      const playersMap = new Map<string, Player>();

      // Inicializar vacíos
      SQUAD_NAMES.forEach(name => {
        playersMap.set(name, { id: name, name: name, position: "JUG" });
      });

      // Rellenar Wellness
      wellnessSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const name = data.playerName || "Desconocida";
        
        // LOGICA DE RIESGO ACTUALIZADA (1 = MEJOR, 10 = PEOR)
        // Ahora valores altos en CUALQUIER métrica son malos.
        let status: 'ready' | 'warning' | 'risk' = 'ready';
        
        // Si cualquiera supera el 8 -> Riesgo
        if (data.fatigueLevel >= 8 || data.stressLevel >= 8 || data.muscleSoreness >= 8 || data.sleepQuality >= 8 || data.mood >= 8) {
            status = 'risk';
        }
        // Si cualquiera supera el 6 o el readiness calculado es muy bajo -> Warning
        else if (data.fatigueLevel >= 6 || data.sleepQuality >= 6 || data.readinessScore < 5) {
            status = 'warning';
        }

        const existing = playersMap.get(name) || { id: docSnap.id, name, position: "JUG" };
        playersMap.set(name, {
          ...existing,
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

      // Rellenar RPE
      rpeSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const name = data.playerName || "Desconocida";
        const dateObj = new Date(data.timestamp);
        const existing = playersMap.get(name) || { id: docSnap.id, name, position: "JUG" };

        playersMap.set(name, {
          ...existing,
          rpe: {
            yesterday: 0,
            todaySession: data.rpeValue,
            notes: data.notes,
            submittedAt: dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            isLate: dateObj.getHours() >= 22
          }
        });
      });

      setPlayers(Array.from(playersMap.values()));

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveTarget = async (val: number) => {
    try {
      const dateKey = getDateKey(selectedDate);
      await setDoc(doc(db, "rpe_targets", dateKey), { target: val });
      setPlannedRpe(val);
    } catch (e) {
      console.error("Error saving target:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  return {
    players,
    loading,
    plannedRpe,
    selectedDate,
    setSelectedDate,
    saveTarget,
    refreshData: fetchData
  };
}