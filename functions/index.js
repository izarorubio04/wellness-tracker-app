const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

// 1. RECORDATORIO DIARIO
exports.dailyWellnessReminder = functions.pubsub
  .schedule("0 10 * * *")
  .timeZone("Europe/Madrid")
  .onRun(async (context) => {
    const db = admin.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const logsSnapshot = await db
        .collection("wellness_logs")
        .where("timestamp", ">=", today.getTime())
        .get();
      
      const submittedPlayers = new Set();
      logsSnapshot.forEach(doc => submittedPlayers.add(doc.data().playerName));

      const usersSnapshot = await db.collection("users").where("role", "==", "player").get();
      const tokensToSend = [];

      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (!submittedPlayers.has(userData.name) && userData.fcmTokens && userData.fcmTokens.length > 0) {
          tokensToSend.push(...userData.fcmTokens);
        }
      });

      if (tokensToSend.length === 0) {
        functions.logger.info("Recordatorio diario: Nada que enviar (todos cumplieron o sin tokens)");
        return null;
      }

      const message = {
        notification: {
          title: "¡Buenos días, Gloriosa!",
          body: "No olvides registrar tu Wellness antes del entrenamiento 📝",
        },
        tokens: tokensToSend,
      };

      const response = await admin.messaging().sendMulticast(message);
      functions.logger.info("Recordatorios enviados correctamente:", response.successCount);
      if (response.failureCount > 0) {
         functions.logger.warn("Fallaron algunos envíos:", response.failureCount);
      }
    } catch (error) {
      functions.logger.error("Error crítico enviando recordatorios:", error);
    }
    return null;
  });


// 2. ALERTA AL STAFF (Trigger Firestore)
exports.checkWellnessRisk = functions.firestore
  .document("wellness_logs/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    // --- DIAGNÓSTICO: Ver qué datos llegan ---
    functions.logger.info("Nuevo Wellness recibido de:", data.playerName);
    functions.logger.info("Valores:", {
        fatiga: data.fatigueLevel,
        sueño: data.sleepQuality,
        dolor: data.muscleSoreness,
        estrés: data.stressLevel,
        animo: data.mood
    });

    // Lógica: 1=Mejor, 10=Peor. >=8 es Riesgo.
    // Usamos Number() para asegurar que no sean textos
    const isRisk = 
      Number(data.fatigueLevel) >= 8 || 
      Number(data.sleepQuality) >= 8 || 
      Number(data.muscleSoreness) >= 8 || 
      Number(data.stressLevel) >= 8 || 
      Number(data.mood) >= 8;

    if (!isRisk) {
        functions.logger.info("✅ No se detectó riesgo (Valores < 8). Saliendo.");
        return null;
    }

    functions.logger.info("⚠️ ¡RIESGO DETECTADO! Buscando Staff...");

    // Si hay riesgo, buscamos a TODOS los del staff
    const db = admin.firestore();
    const staffSnapshot = await db.collection("users").where("role", "==", "staff").get();
    
    const staffTokens = [];
    staffSnapshot.forEach(doc => {
      const d = doc.data();
      if (d.fcmTokens && d.fcmTokens.length > 0) {
        staffTokens.push(...d.fcmTokens);
      } else {
        functions.logger.warn(`Staff encontrado (${doc.id}) pero SIN TOKENS.`);
      }
    });

    if (staffTokens.length === 0) {
        functions.logger.error("❌ ERROR: Hay riesgo pero no encontré ningún token de Staff válido.");
        return null;
    }

    functions.logger.info(`Enviando alerta a ${staffTokens.length} dispositivos de Staff...`);

    const message = {
      notification: {
        title: "⚠️ Alerta de Wellness",
        body: `${data.playerName} ha reportado valores altos. Revisa el dashboard.`,
      },
      tokens: staffTokens,
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      functions.logger.info("📨 Notificación enviada. Éxitos:", response.successCount);
      
      if (response.failureCount > 0) {
          functions.logger.error("Hubo fallos al enviar:", response.responses);
      }
    } catch (error) {
      functions.logger.error("Error fatal enviando la alerta:", error);
    }
  });