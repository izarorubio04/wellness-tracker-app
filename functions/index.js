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

// --------------------------------------------------------------------------------
// 1. RECORDATORIO A JUGADORAS (Cada hora según preferencias)
// --------------------------------------------------------------------------------
exports.hourlyNotificationDispatcher = functions.pubsub
  .schedule("0 * * * *")
  .timeZone("Europe/Madrid")
  .onRun(async (context) => {
    const db = admin.firestore();
    
    // Calcular hora actual en Madrid
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      hour12: false,
    });
    const hourPart = formatter.format(now); // "09", "14"...
    
    const madridDateStr = now.toLocaleString("en-US", {timeZone: "Europe/Madrid"});
    const madridDate = new Date(madridDateStr);
    const dayKey = DAY_MAP[madridDate.getDay()];
    const currentHourStr = `${hourPart}:00`;

    functions.logger.info(`⏰ Cron horario: ${dayKey}, ${currentHourStr}`);

    try {
      const usersSnapshot = await db.collection("users").where("role", "==", "player").get();
      
      const wellnessTokens = [];
      const rpeTokens = [];

      // Comprobar quién ha cumplido hoy
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

      // Filtrar usuarios
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        const prefs = data.preferences;
        
        if (!prefs || !data.fcmTokens || data.fcmTokens.length === 0) return;

        // Wellness
        if (prefs.wellness?.[dayKey] === currentHourStr && !completedWellness.has(data.name)) {
           wellnessTokens.push(...data.fcmTokens);
        }

        // RPE
        if (prefs.rpe?.[dayKey] === currentHourStr && !completedRPE.has(data.name)) {
           rpeTokens.push(...data.fcmTokens);
        }
      });

      // Envíos
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


// --------------------------------------------------------------------------------
// 2. AVISO AL STAFF: LISTA DE FALTAS (A las 12:00)
// --------------------------------------------------------------------------------
exports.missingReportsNotifier = functions.pubsub
  .schedule("0 12 * * *") // A las 12:00 PM todos los días
  .timeZone("Europe/Madrid")
  .onRun(async (context) => {
    const db = admin.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // 1. Obtener todas las jugadoras
      const playersSnap = await db.collection("users").where("role", "==", "player").get();
      const allPlayerNames = [];
      playersSnap.forEach(doc => allPlayerNames.push(doc.data().name));

      if (allPlayerNames.length === 0) return null;

      // 2. Obtener quién ha cumplido hoy
      const wellnessSnap = await db.collection("wellness_logs")
        .where("timestamp", ">=", today.getTime()).get();
      
      const submittedSet = new Set();
      wellnessSnap.forEach(doc => submittedSet.add(doc.data().playerName));

      // 3. Calcular quién falta
      const missingPlayers = allPlayerNames.filter(name => !submittedSet.has(name));

      if (missingPlayers.length === 0) {
        functions.logger.info("A las 12:00 todos han cumplido. No se molesta al staff.");
        return null;
      }

      // 4. Buscar Staff para avisar
      const staffSnap = await db.collection("users").where("role", "==", "staff").get();
      const staffTokens = [];
      staffSnap.forEach(doc => {
        const d = doc.data();
        if (d.fcmTokens && d.fcmTokens.length > 0) staffTokens.push(...d.fcmTokens);
      });

      if (staffTokens.length === 0) return null;

      // 5. Crear mensaje inteligente
      const count = missingPlayers.length;
      let bodyText = "";
      
      if (count <= 3) {
        // Si son pocas, decimos nombres: "Faltan: Ana, María, Lucía"
        bodyText = `Faltan: ${missingPlayers.join(", ")}`;
      } else {
        // Si son muchas, resumen: "Faltan 8 jugadoras (Ana, María...)"
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

      functions.logger.info(`Aviso de faltas enviado al staff. Faltan: ${count}`);

    } catch (error) {
      functions.logger.error("Error en aviso de faltas:", error);
    }
    return null;
  });


// --------------------------------------------------------------------------------
// 3. ALERTA INSTANTÁNEA AL STAFF (Riesgo O Notas)
// --------------------------------------------------------------------------------
exports.checkWellnessRisk = functions.firestore
  .document("wellness_logs/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    functions.logger.info("Analizando wellness de:", data.playerName);

    // A. Detectar Riesgo Numérico
    const isRisk = 
      Number(data.fatigueLevel) >= 8 || 
      Number(data.sleepQuality) >= 8 || 
      Number(data.muscleSoreness) >= 8 || 
      Number(data.stressLevel) >= 8 || 
      Number(data.mood) >= 8;

    // B. Detectar Nota Escrita (Si existe y no está vacía)
    const hasNote = data.notes && data.notes.trim().length > 0;

    // Si no hay nada raro, terminamos
    if (!isRisk && !hasNote) {
        return null;
    }

    // Buscar tokens del Staff
    const db = admin.firestore();
    const staffSnapshot = await db.collection("users").where("role", "==", "staff").get();
    const staffTokens = [];
    
    staffSnapshot.forEach(doc => {
      const d = doc.data();
      if (d.fcmTokens && d.fcmTokens.length > 0) staffTokens.push(...d.fcmTokens);
    });

    if (staffTokens.length === 0) return null;

    // Decidir el mensaje según lo que haya pasado
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

    functions.logger.info(`Enviando alerta a Staff. Motivo: ${title}`);

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