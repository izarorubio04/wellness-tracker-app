const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

// MAPA DE DÍAS (Para el recordatorio horario)
const DAY_MAP = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

// TRADUCCIÓN DE TIPOS (Para que el mensaje quede bonito)
const TYPE_LABELS = {
  citation: "Citación",
  gym: "Gimnasio",
  session: "Sesión",
  video: "Vídeo",
  match: "Partido",
  other: "Actividad"
};

// ============================================================================
// 1. NOTIFICADOR DE CAMBIOS EN CALENDARIO (Tiempo Real)
// ============================================================================
exports.notifyCalendarChanges = functions.firestore
  .document('calendar_events/{eventId}')
  .onWrite(async (change, context) => {
    // 1. Obtener datos antes y después
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    let title = "";
    let body = "";

    // 2. Determinar qué ha pasado (Crear, Editar, Borrar)
    if (!before && after) {
        // CREACIÓN
        const typeName = TYPE_LABELS[after.type] || "Actividad";
        title = `📅 Nueva Agenda: ${typeName}`;
        body = `${after.title} el ${after.date} a las ${after.startTime}.`;
    } 
    else if (before && after) {
        // EDICIÓN (Evitamos notificar si no cambiaron datos clave)
        if (
            before.title === after.title && 
            before.date === after.date && 
            before.startTime === after.startTime &&
            before.location === after.location
        ) {
            return null; // Cambios menores (ej: notas) no notifican para no spamear
        }
        title = `🔄 Cambio en Agenda: ${after.title}`;
        body = `Se han actualizado los detalles de la actividad del ${after.date}.`;
    } 
    else if (before && !after) {
        // BORRADO
        title = `🗑️ Actividad Cancelada`;
        body = `Se ha eliminado: ${before.title} (${before.date}).`;
    } else {
        return null;
    }

    // 3. Buscar destinatarios (Jugadoras con calendarEnabled = true)
    const db = admin.firestore();
    const usersSnapshot = await db.collection("users").where("role", "==", "player").get();
    
    const tokensToSend = [];
    usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const prefs = userData.preferences;
        
        // Verificamos si tiene la opción activada
        if (prefs && prefs.calendarEnabled === true && userData.fcmTokens && userData.fcmTokens.length > 0) {
            tokensToSend.push(...userData.fcmTokens);
        }
    });

    if (tokensToSend.length === 0) {
        functions.logger.info("Cambio en calendario detectado, pero nadie tiene activadas las notificaciones.");
        return null;
    }

    // 4. Enviar notificación
    try {
        const response = await admin.messaging().sendEachForMulticast({
            notification: {
                title: title,
                body: body,
            },
            tokens: tokensToSend
        });
        functions.logger.info(`Notificación de calendario enviada a ${response.successCount} dispositivos.`);
    } catch (error) {
        functions.logger.error("Error enviando alerta de calendario:", error);
    }
  });


// ============================================================================
// 2. RECORDATORIO A JUGADORAS (Cada hora según preferencias)
// ============================================================================
exports.hourlyNotificationDispatcher = functions.pubsub
  .schedule("0 * * * *")
  .timeZone("Europe/Madrid")
  .onRun(async (context) => {
    const db = admin.firestore();
    
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      hour12: false,
    });
    const hourPart = formatter.format(now); 
    
    const madridDateStr = now.toLocaleString("en-US", {timeZone: "Europe/Madrid"});
    const madridDate = new Date(madridDateStr);
    const dayKey = DAY_MAP[madridDate.getDay()];
    const currentHourStr = `${hourPart}:00`;

    functions.logger.info(`⏰ Cron horario: ${dayKey}, ${currentHourStr}`);

    try {
      const usersSnapshot = await db.collection("users").where("role", "==", "player").get();
      
      const wellnessTokens = [];
      const rpeTokens = [];

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

      usersSnapshot.forEach(doc => {
        const data = doc.data();
        const prefs = data.preferences;
        
        if (!prefs || !data.fcmTokens || data.fcmTokens.length === 0) return;

        if (prefs.wellness?.[dayKey] === currentHourStr && !completedWellness.has(data.name)) {
           wellnessTokens.push(...data.fcmTokens);
        }

        if (prefs.rpe?.[dayKey] === currentHourStr && !completedRPE.has(data.name)) {
           rpeTokens.push(...data.fcmTokens);
        }
      });

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


// ============================================================================
// 3. AVISO AL STAFF: LISTA DE FALTAS (A las 12:00)
// ============================================================================
exports.missingReportsNotifier = functions.pubsub
  .schedule("0 12 * * *") 
  .timeZone("Europe/Madrid")
  .onRun(async (context) => {
    const db = admin.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const playersSnap = await db.collection("users").where("role", "==", "player").get();
      const allPlayerNames = [];
      playersSnap.forEach(doc => allPlayerNames.push(doc.data().name));

      if (allPlayerNames.length === 0) return null;

      const wellnessSnap = await db.collection("wellness_logs")
        .where("timestamp", ">=", today.getTime()).get();
      
      const submittedSet = new Set();
      wellnessSnap.forEach(doc => submittedSet.add(doc.data().playerName));

      const missingPlayers = allPlayerNames.filter(name => !submittedSet.has(name));

      if (missingPlayers.length === 0) return null;

      const staffSnap = await db.collection("users").where("role", "==", "staff").get();
      const staffTokens = [];
      staffSnap.forEach(doc => {
        const d = doc.data();
        if (d.fcmTokens && d.fcmTokens.length > 0) staffTokens.push(...d.fcmTokens);
      });

      if (staffTokens.length === 0) return null;

      const count = missingPlayers.length;
      let bodyText = "";
      
      if (count <= 3) {
        bodyText = `Faltan: ${missingPlayers.join(", ")}`;
      } else {
        const firstNames = missingPlayers.slice(0, 2).join(", ");
        bodyText = `Faltan ${count} jugadoras por rellenar (${firstNames}...).`;
      }

      await admin.messaging().sendEachForMulticast({
        notification: {
          title: "⚠️ Reporte de las 12:00",
          body: bodyText,
        },
        tokens: staffTokens
      });

    } catch (error) {
      functions.logger.error("Error en aviso de faltas:", error);
    }
    return null;
  });


// ============================================================================
// 4. ALERTA INSTANTÁNEA AL STAFF (Riesgo O Notas)
// ============================================================================
exports.checkWellnessRisk = functions.firestore
  .document("wellness_logs/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    const isRisk = 
      Number(data.fatigueLevel) >= 8 || 
      Number(data.sleepQuality) >= 8 || 
      Number(data.muscleSoreness) >= 8 || 
      Number(data.stressLevel) >= 8 || 
      Number(data.mood) >= 8;

    const hasNote = data.notes && data.notes.trim().length > 0;

    if (!isRisk && !hasNote) return null;

    const db = admin.firestore();
    const staffSnapshot = await db.collection("users").where("role", "==", "staff").get();
    const staffTokens = [];
    
    staffSnapshot.forEach(doc => {
      const d = doc.data();
      if (d.fcmTokens && d.fcmTokens.length > 0) staffTokens.push(...d.fcmTokens);
    });

    if (staffTokens.length === 0) return null;

    let title = "";
    let body = "";

    if (isRisk && hasNote) {
      title = "⚠️ Riesgo + Nota";
      body = `${data.playerName} tiene valores altos y ha dejado un comentario: "${data.notes}"`;
    } else if (isRisk) {
      title = "⚠️ Alerta de Wellness";
      body = `${data.playerName} reporta valores altos. Revisa el dashboard.`;
    } else if (hasNote) {
      title = "📝 Nueva Nota de Jugadora";
      body = `${data.playerName} ha escrito: "${data.notes}"`;
    }

    try {
      await admin.messaging().sendEachForMulticast({
        notification: {
          title: title,
          body: body,
        },
        tokens: staffTokens,
      });
    } catch (error) {
      functions.logger.error("Error enviando alerta staff:", error);
    }
  });