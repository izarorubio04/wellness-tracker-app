import { useState, useEffect } from 'react';
import { db } from '../../firebase';
// IMPORTANTE: Añadimos onSnapshot para escuchar en tiempo real
import { collection, query, where, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Player, SQUAD_NAMES } from './types';

export function useStaffData() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true); 
  const [plannedRpe, setPlannedRpe] = useState(5.0);

  // Estados intermedios para guardar los datos "crudos" en tiempo real
  const [wellnessLogs, setWellnessLogs] = useState<any[]>([]);
  const [rpeLogs, setRpeLogs] = useState<any[]>([]);

  const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // 1. ESCUCHAR OBJETIVO RPE (Tiempo real)
  useEffect(() => {
    const dateKey = getDateKey(selectedDate);
    const targetDocRef = doc(db, "rpe_targets", dateKey);

    // onSnapshot se dispara cada vez que alguien cambia el objetivo
    const unsubscribe = onSnapshot(targetDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setPlannedRpe(docSnap.data().target);
      } else {
        setPlannedRpe(5.0);
      }
    });

    return () => unsubscribe(); // Limpieza al desmontar
  }, [selectedDate]);

  // 2. ESCUCHAR REGISTROS DE JUGADORAS (Tiempo real)
  useEffect(() => {
    setLoading(true);
    
    // Configurar fechas (inicio y fin del día seleccionado)
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Consultas
    const qWellness = query(
      collection(db, "wellness_logs"),
      where("timestamp", ">=", startOfDay.getTime()),
      where("timestamp", "<=", endOfDay.getTime())
    );

    const qRpe = query(
      collection(db, "rpe_logs"),
      where("timestamp", ">=", startOfDay.getTime()),
      where("timestamp", "<=", endOfDay.getTime())
    );

    // Listener Wellness: Se ejecuta solo cuando hay cambios
    const unsubWellness = onSnapshot(qWellness, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWellnessLogs(logs);
    }, (error) => console.error("Error wellness listener:", error));

    // Listener RPE: Se ejecuta solo cuando hay cambios
    const unsubRpe = onSnapshot(qRpe, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRpeLogs(logs);
    }, (error) => console.error("Error RPE listener:", error));

    // Limpiar escuchadores cuando cambie la fecha
    return () => {
      unsubWellness();
      unsubRpe();
    };
  }, [selectedDate]);

  // 3. PROCESAR Y COMBINAR DATOS (Se ejecuta cuando wellnessLogs o rpeLogs cambian)
  useEffect(() => {
    const playersMap = new Map<string, Player>();

    // Inicializar plantilla vacía
    SQUAD_NAMES.forEach(name => {
      playersMap.set(name, { id: name, name: name, position: "JUG" });
    });

    // Procesar Wellness
    wellnessLogs.forEach((data) => {
      const name = data.playerName || "Desconocida";
      
      // Lógica de Riesgo (1=Mejor, 10=Peor)
      let status: 'ready' | 'warning' | 'risk' = 'ready';
      
      // Si cualquiera supera el 8 -> Riesgo
      if (data.fatigueLevel >= 8 || data.stressLevel >= 8 || data.muscleSoreness >= 8 || data.sleepQuality >= 8 || data.mood >= 8) {
          status = 'risk';
      }
      // Si cualquiera supera el 6 o el readiness es muy bajo -> Warning
      else if (data.fatigueLevel >= 6 || data.sleepQuality >= 6 || (data.readinessScore !== undefined && data.readinessScore < 5)) {
          status = 'warning';
      }

      const existing = playersMap.get(name) || { id: data.id, name, position: "JUG" };
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

    // Procesar RPE
    rpeLogs.forEach((data) => {
      const name = data.playerName || "Desconocida";
      const dateObj = new Date(data.timestamp);
      const existing = playersMap.get(name) || { id: data.id, name, position: "JUG" };

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

    // Actualizar estado final
    setPlayers(Array.from(playersMap.values()));
    setLoading(false);

  }, [wellnessLogs, rpeLogs]); // Dependencias: se recalcula si llegan datos nuevos

  const saveTarget = async (val: number) => {
    try {
      const dateKey = getDateKey(selectedDate);
      await setDoc(doc(db, "rpe_targets", dateKey), { target: val });
      // No hace falta actualizar el estado manual, el onSnapshot lo hará solo
    } catch (e) {
      console.error("Error saving target:", e);
    }
  };

  return {
    players,
    loading,
    plannedRpe,
    selectedDate,
    setSelectedDate,
    saveTarget,
    refreshData: () => {} // Ya no es necesario, pero lo dejamos por compatibilidad
  };
}