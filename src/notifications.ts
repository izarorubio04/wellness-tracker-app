import { getMessaging, getToken, onMessage, MessagePayload, Unsubscribe } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, setDoc, getDoc } from "firebase/firestore";
import { app, db } from "./firebase"; 

// Inicializamos el servicio de mensajería
const messaging = getMessaging(app);

// Tu VAPID KEY
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
 * Solicita permiso y guarda el token con el rol
 */
export const requestNotificationPermission = async (userId: string, role: string) => {
  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (token) {
        await saveTokenToDatabase(userId, token, role);
      }
    }
  } catch (error) {
    console.error("Error al solicitar permiso:", error);
  }
};

/**
 * Guarda el token en Firestore sin machacar los existentes
 */
const saveTokenToDatabase = async (userId: string, token: string, role: string) => {
  const userRef = doc(db, "users", userId);
  
  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        role: role 
      });
    } else {
      await setDoc(userRef, { 
        fcmTokens: [token],
        name: userId,
        role: role 
      }, { merge: true });
    }
  } catch (error) {
    console.error("Error guardando token en BD:", error);
  }
};

/**
 * [CORREGIDO] Escucha mensajes en primer plano.
 * Devuelve una función 'Unsubscribe' para detener la escucha y evitar duplicados.
 */
export const onMessageListener = (callback: (payload: MessagePayload) => void): Unsubscribe => {
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};