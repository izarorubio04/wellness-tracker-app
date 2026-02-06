const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

// 1. RECORDATORIO DIARIO (Cron Job)
// Se ejecuta todos los días a las 10:00 AM (hora peninsular)
exports.dailyWellnessReminder = functions.pubsub
  .schedule("35 23 * * *")
  .timeZone("Europe/Madrid")
  .onRun(async (context) => {
    const db = admin.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // a. Obtener quién ha rellenado hoy
    const logsSnapshot = await db
      .collection("wellness_logs")
      .where("timestamp", ">=", today.getTime())
      .get();
    
    const submittedPlayers = new Set();
    logsSnapshot.forEach(doc => submittedPlayers.add(doc.data().playerName));

    // b. Obtener todos los usuarios tipo 'player'
    const usersSnapshot = await db.collection("users").where("role", "==", "player").get();

    const tokensToSend = [];

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      // Si NO ha entregado y tiene tokens de notificación
      if (!submittedPlayers.has(userData.name) && userData.fcmTokens && userData.fcmTokens.length > 0) {
        tokensToSend.push(...userData.fcmTokens);
      }
    });

    if (tokensToSend.length === 0) return null;

    // c. Enviar mensaje masivo
    const message = {
      notification: {
        title: "¡Buenos días, Gloriosa!",
        body: "No olvides registrar tu Wellness antes del entrenamiento 📝",
      },
      tokens: tokensToSend,
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log("Recordatorios enviados:", response.successCount);
    } catch (error) {
      console.error("Error enviando recordatorios:", error);
    }
  });


// 2. ALERTA AL STAFF (Trigger Firestore)
// Se dispara cada vez que alguien crea un nuevo log de wellness
exports.checkWellnessRisk = functions.firestore
  .document("wellness_logs/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    // Lógica: 1=Mejor, 10=Peor. >=8 es Riesgo.
    const isRisk = 
      data.fatigueLevel >= 8 || 
      data.sleepQuality >= 8 || 
      data.muscleSoreness >= 8 || 
      data.stressLevel >= 8 || 
      data.mood >= 8;

    if (!isRisk) return null;

    // Si hay riesgo, buscamos a TODOS los del staff
    const db = admin.firestore();
    const staffSnapshot = await db.collection("users").where("role", "==", "staff").get();
    
    const staffTokens = [];
    staffSnapshot.forEach(doc => {
      const d = doc.data();
      if (d.fcmTokens && d.fcmTokens.length > 0) {
        staffTokens.push(...d.fcmTokens);
      }
    });

    if (staffTokens.length === 0) return null;

    const message = {
      notification: {
        title: "⚠️ Alerta de Wellness",
        body: `${data.playerName} ha reportado valores altos. Revisa el dashboard.`,
      },
      tokens: staffTokens,
    };

    try {
      await admin.messaging().sendMulticast(message);
      console.log("Alerta enviada al staff");
    } catch (error) {
      console.error("Error enviando alerta:", error);
    }
  });