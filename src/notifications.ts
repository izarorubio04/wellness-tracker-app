import { getMessaging, getToken, onMessage, MessagePayload } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, setDoc, getDoc } from "firebase/firestore";
import { app, db } from "./firebase"; 

// Inicializamos el servicio de mensajería
const messaging = getMessaging(app);

// Tu VAPID KEY (La mantengo igual)
const VAPID_KEY = "BG9mCW-AQ1jaj1ab0tSQH5gT0_LLqI8wImNpXaylS6TsL43-N_VHLL2-Ek0iwR8EHYHfw_4z67gj4yWXAOtRFzo";

/**
 * Diagnóstico de Salud de Notificaciones
 */
export const checkNotificationHealth = async () => {
  const status = {
    permission: Notification.permission,
    swStatus: "unknown",
    token: null as string | null,
    error: null as string | null
  };

  try {
    const swResponse = await fetch('/firebase-messaging-sw.js');
    status.swStatus = swResponse.status === 200 ? "OK" : `ERROR ${swResponse.status}`;
    
    if (swResponse.status !== 200) {
      status.error = "El archivo Service Worker está bloqueado o no existe.";
      return status;
    }

    if (status.permission === "granted") {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      status.token = token;
    }

  } catch (e: any) {
    status.error = e.message;
  }

  return status;
};

/**
 * [CORREGIDO] Ahora acepta el ROL como segundo parámetro
 */
export const requestNotificationPermission = async (userId: string, role: string) => {
  try {
    console.log(`Solicitando permiso para ${userId} (${role})...`);
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (token) {
        console.log("Token FCM obtenido");
        // Pasamos el rol a la función de guardado
        await saveTokenToDatabase(userId, token, role);
      }
    }
  } catch (error) {
    console.error("Error al solicitar permiso:", error);
  }
};

/**
 * [CORREGIDO] Guarda el token y el ROL correcto en Firestore
 */
const saveTokenToDatabase = async (userId: string, token: string, role: string) => {
  const userRef = doc(db, "users", userId);
  
  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Si existe, actualizamos token y nos aseguramos que el rol sea el correcto
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        role: role // Actualizamos el rol por si acaso estaba mal
      });
    } else {
      // Si es nuevo, lo creamos con el rol correcto
      await setDoc(userRef, { 
        fcmTokens: [token],
        name: userId,
        role: role // Usamos el rol que nos pasan, no "player" fijo
      }, { merge: true });
    }
    console.log(`Token guardado para ${userId} con rol ${role}`);
  } catch (error) {
    console.error("Error guardando token en BD:", error);
  }
};

export const onMessageListener = () =>
  new Promise<MessagePayload>((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });