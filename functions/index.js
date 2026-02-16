const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

const DAY_MAP = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

const TYPE_LABELS = {
  citation: "Citación",
  gym: "Gimnasio",
  session: "Sesión",
  video: "Vídeo",
  match: "Partido",
  other: "Actividad"
};

// ============================================================================
// 1. NOTIFICADOR DE CAMBIOS EN CALENDARIO (Con Deduplicación)
// ============================================================================
exports.notifyCalendarChanges = functions.firestore
  .document('calendar_events/{eventId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    let title = "";
    let body = "";

    // Lógica para detectar el tipo de cambio
    if (!before && after) {
        const typeName = TYPE_LABELS[after.type] || "Actividad";
        title = `📅 Nueva Agenda: ${typeName}`;
        body = `${after.title} el ${after.date} a las ${after.startTime}.`;
    } 
    else if (before && after) {
        if (
            before.title === after.title && 
            before.date === after.date && 
            before.startTime === after.startTime &&
            before.location === after.location
        ) return null;
        
        title = `🔄 Cambio en Agenda: ${after.title}`;
        body = `Se han actualizado los detalles de la actividad del ${after.date}.`;
    } 
    else if (before && !after) {
        title = `🗑️ Actividad Cancelada`;
        body = `Se ha eliminado: ${before.title} (${before.date}).`;
    } else {
        return null;
    }

    const db = admin.firestore();
    const usersSnapshot = await db.collection("users").where("role", "==", "player").get();
    
    let tokensToSend = [];
    usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const prefs = userData.preferences;
        
        // Filtramos solo usuarios que tengan la opción activada y tokens válidos
        if (prefs && prefs.calendarEnabled === true && userData.fcmTokens && userData.fcmTokens.length > 0) {
            tokensToSend.push(...userData.fcmTokens);
        }
    });

    if (tokensToSend.length === 0) return null;

    // [DEDUPLICACIÓN]: Esto borra tokens idénticos antes de enviar
    const uniqueTokens = [...new Set(tokensToSend)];

    try {
        const response = await admin.messaging().sendEachForMulticast({
            notification: { title, body },
            tokens: uniqueTokens
        });
        functions.logger.info(`Notificación calendario enviada. Intentos: ${uniqueTokens.length}, Éxitos: ${response.successCount}`);
    } catch (error) {
        functions.logger.error("Error calendario:", error);
    }
  });


// ============================================================================
// 2. RECORDATORIO HORARIO (Con Deduplicación)
// ============================================================================
exports.hourlyNotificationDispatcher = functions.pubsub
  .schedule("0 * * * *")
  .timeZone("Europe/Madrid")
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false });
    const hourPart = formatter.format(now); 
    const madridDateStr = now.toLocaleString("en-US", {timeZone: "Europe/Madrid"});
    const dayKey = DAY_MAP[new Date(madridDateStr).getDay()];
    const currentHourStr = `${hourPart}:00`;

    functions.logger.info(`⏰ Cron horario: ${dayKey}, ${currentHourStr}`);

    try {
      const usersSnapshot = await db.collection("users").where("role", "==", "player").get();
      let wellnessTokens = [];
      let rpeTokens = [];

      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const logsTodaySnap = await db.collection("wellness_logs").where("timestamp", ">=", todayStart.getTime()).get();
      const completedWellness = new Set(); logsTodaySnap.forEach(doc => completedWellness.add(doc.data().playerName));
      const rpeTodaySnap = await db.collection("rpe_logs").where("timestamp", ">=", todayStart.getTime()).get();
      const completedRPE = new Set(); rpeTodaySnap.forEach(doc => completedRPE.add(doc.data().playerName));

      usersSnapshot.forEach(doc => {
        const data = doc.data();
        const prefs = data.preferences;
        if (!prefs || !data.fcmTokens) return;

        if (prefs.wellness?.[dayKey] === currentHourStr && !completedWellness.has(data.name)) {
           wellnessTokens.push(...data.fcmTokens);
        }
        if (prefs.rpe?.[dayKey] === currentHourStr && !completedRPE.has(data.name)) {
           rpeTokens.push(...data.fcmTokens);
        }
      });

      // [DEDUPLICACIÓN]
      const uniqueWellness = [...new Set(wellnessTokens)];
      const uniqueRPE = [...new Set(rpeTokens)];

      if (uniqueWellness.length > 0) {
        await admin.messaging().sendEachForMulticast({
          notification: { title: "¡Buenos días!", body: "Es hora de tu Wellness diario ☀️" },
          tokens: uniqueWellness
        });
      }
      if (uniqueRPE.length > 0) {
        await admin.messaging().sendEachForMulticast({
          notification: { title: "Entrenamiento finalizado", body: "¿Qué tal ha ido? Registra tu RPE ⚽️" },
          tokens: uniqueRPE
        });
      }
    } catch (error) { functions.logger.error(error); }
    return null;
  });


// ============================================================================
// 3. AVISO FALTAS (Con Deduplicación)
// ============================================================================
exports.missingReportsNotifier = functions.pubsub
  .schedule("0 12 * * *") 
  .timeZone("Europe/Madrid")
  .onRun(async (context) => {
    const db = admin.firestore();
    const today = new Date(); today.setHours(0,0,0,0);
    const playersSnap = await db.collection("users").where("role", "==", "player").get();
    const wellnessSnap = await db.collection("wellness_logs").where("timestamp", ">=", today.getTime()).get();
    
    const submittedSet = new Set(); wellnessSnap.forEach(doc => submittedSet.add(doc.data().playerName));
    const allPlayerNames = []; playersSnap.forEach(doc => allPlayerNames.push(doc.data().name));
    const missingPlayers = allPlayerNames.filter(name => !submittedSet.has(name));

    if (missingPlayers.length === 0) return null;

    const staffSnap = await db.collection("users").where("role", "==", "staff").get();
    let staffTokens = [];
    staffSnap.forEach(doc => {
        const d = doc.data();
        if (d.fcmTokens) staffTokens.push(...d.fcmTokens);
    });

    if (staffTokens.length === 0) return null;

    // [DEDUPLICACIÓN]
    const uniqueStaff = [...new Set(staffTokens)];
    const count = missingPlayers.length;
    const bodyText = count <= 3 ? `Faltan: ${missingPlayers.join(", ")}` : `Faltan ${count} jugadoras.`;

    await admin.messaging().sendEachForMulticast({
        notification: { title: "⚠️ Reporte de las 12:00", body: bodyText },
        tokens: uniqueStaff
    });
    return null;
  });


// ============================================================================
// 4. ALERTA RIESGO (Con Deduplicación)
// ============================================================================
exports.checkWellnessRisk = functions.firestore
  .document("wellness_logs/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const isRisk = Number(data.fatigueLevel) >= 8 || Number(data.sleepQuality) >= 8 || Number(data.muscleSoreness) >= 8 || Number(data.stressLevel) >= 8 || Number(data.mood) >= 8;
    const hasNote = data.notes && data.notes.trim().length > 0;

    if (!isRisk && !hasNote) return null;

    const db = admin.firestore();
    const staffSnapshot = await db.collection("users").where("role", "==", "staff").get();
    let staffTokens = [];
    staffSnapshot.forEach(doc => {
        const d = doc.data();
        if (d.fcmTokens) staffTokens.push(...d.fcmTokens);
    });

    if (staffTokens.length === 0) return null;

    // [DEDUPLICACIÓN]
    const uniqueStaff = [...new Set(staffTokens)];
    
    let title = isRisk ? "⚠️ Alerta de Wellness" : "📝 Nueva Nota";
    let body = `${data.playerName} ha enviado un reporte importante.`;

    await admin.messaging().sendEachForMulticast({
        notification: { title, body },
        tokens: uniqueStaff,
    });
  });