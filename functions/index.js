const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

// MAPA DE DÍAS (Javascript -> Configuración)
const DAY_MAP = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

// 1. DESPACHADOR DE NOTIFICACIONES (Se ejecuta cada hora)
// Cron: "0 * * * *" significa "En el minuto 0 de cada hora"
exports.hourlyNotificationDispatcher = functions.pubsub
  .schedule("0 * * * *")
  .timeZone("Europe/Madrid")
  .onRun(async (context) => {
    const db = admin.firestore();
    
    // Calcular qué hora es AHORA en Madrid
    // Usamos 'en-US' con timeZone para obtener formato HH:00 fiable
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      hour12: false, // Formato 24h (09, 14, 23)
      weekday: 'long' // Para saber el día
    });
    
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find(p => p.type === 'hour').value; 
    
    // IMPORTANTE: JS devuelve weekday en inglés, hay que mapearlo manualmente o usar getDay()
    // Usaremos getDay() ajustado a la zona horaria es más seguro.
    // Hack: Creamos fecha ajustada
    const madridDateStr = now.toLocaleString("en-US", {timeZone: "Europe/Madrid"});
    const madridDate = new Date(madridDateStr);
    const dayKey = DAY_MAP[madridDate.getDay()]; // 'monday', 'tuesday'...
    const currentHourStr = `${hourPart}:00`; // "09:00", "10:00"

    functions.logger.info(`⏰ Ejecutando cron horario. Día: ${dayKey}, Hora: ${currentHourStr}`);

    try {
      // Obtenemos TODAS las jugadoras
      // (Para 30-50 usuarias es mejor leer todas y filtrar en memoria que hacer índices complejos)
      const usersSnapshot = await db.collection("users").where("role", "==", "player").get();
      
      const wellnessTokens = [];
      const rpeTokens = [];

      // Chequeamos si ya rellenaron hoy para no molestar
      // Nota: Esto requeriría leer wellness_logs. Para simplificar y ahorrar lecturas en plan hourly,
      // enviaremos el recordatorio SIEMPRE que esté programado, o asumimos el riesgo.
      // Opción PRO: Leer logs del día.
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      
      const logsTodaySnap = await db.collection("wellness_logs")
        .where("timestamp", ">=", todayStart.getTime()).get();
      const completedWellness = new Set();
      logsTodaySnap.forEach(doc => completedWellness.add(doc.data().playerName));

      const rpeTodaySnap = await db.collection("rpe_logs")
        .where("timestamp", ">=", todayStart.getTime()).get();
      const completedRPE = new Set();
      rpeTodaySnap.forEach(doc => completedRPE.add(doc.data().playerName));


      // FILTRADO DE USUARIOS
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        const prefs = data.preferences;
        
        if (!prefs || !data.fcmTokens || data.fcmTokens.length === 0) return;

        // 1. Check Wellness
        const wellnessTime = prefs.wellness?.[dayKey];
        if (wellnessTime === currentHourStr && !completedWellness.has(data.name)) {
           wellnessTokens.push(...data.fcmTokens);
        }

        // 2. Check RPE
        const rpeTime = prefs.rpe?.[dayKey];
        if (rpeTime === currentHourStr && !completedRPE.has(data.name)) {
           rpeTokens.push(...data.fcmTokens);
        }
      });

      // ENVIAR WELLNESS
      if (wellnessTokens.length > 0) {
        await admin.messaging().sendEachForMulticast({
          notification: {
            title: "¡Buenos días!",
            body: "Es hora de tu Wellness diario ☀️",
          },
          tokens: wellnessTokens
        });
        functions.logger.info(`Enviados ${wellnessTokens.length} recordatorios de Wellness.`);
      }

      // ENVIAR RPE
      if (rpeTokens.length > 0) {
        await admin.messaging().sendEachForMulticast({
          notification: {
            title: "Entrenamiento finalizado",
            body: "¿Qué tal ha ido? Registra tu RPE ⚽️",
          },
          tokens: rpeTokens
        });
        functions.logger.info(`Enviados ${rpeTokens.length} recordatorios de RPE.`);
      }

    } catch (error) {
      functions.logger.error("Error en cron horario:", error);
    }
    return null;
  });


// 2. ALERTA AL STAFF (Se mantiene igual, funciona bien)
exports.checkWellnessRisk = functions.firestore
  .document("wellness_logs/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    functions.logger.info("Nuevo Wellness recibido de:", data.playerName);

    const isRisk = 
      Number(data.fatigueLevel) >= 8 || 
      Number(data.sleepQuality) >= 8 || 
      Number(data.muscleSoreness) >= 8 || 
      Number(data.stressLevel) >= 8 || 
      Number(data.mood) >= 8;

    if (!isRisk) return null;

    const db = admin.firestore();
    const staffSnapshot = await db.collection("users").where("role", "==", "staff").get();
    const staffTokens = [];
    
    staffSnapshot.forEach(doc => {
      const d = doc.data();
      if (d.fcmTokens && d.fcmTokens.length > 0) staffTokens.push(...d.fcmTokens);
    });

    if (staffTokens.length === 0) return null;

    await admin.messaging().sendEachForMulticast({
      notification: {
        title: "⚠️ Alerta de Wellness",
        body: `${data.playerName} reporta valores altos.`,
      },
      tokens: staffTokens,
    });
  });