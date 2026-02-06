import { getMessaging, getToken, onMessage, MessagePayload } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, setDoc, getDoc } from "firebase/firestore";
import { app, db } from "./firebase"; 

// Inicializamos el servicio de mensajería
const messaging = getMessaging(app);

// ¡¡IMPORTANTE!!: Reemplaza esto con tu "Key pair" pública de la consola de Firebase
// Configuración -> Cloud Messaging -> Web configuration -> Web Push certificates
const VAPID_KEY = "BG9mCW-AQ1jaj1ab0tSQH5gT0_LLqI8wImNpXaylS6TsL43-N_VHLL2-Ek0iwR8EHYHfw_4z67gj4yWXAOtRFzo";

/**
 * Diagnóstico de Salud de Notificaciones
 * Comprueba si el Service Worker es accesible y si tenemos token.
 */
export const checkNotificationHealth = async () => {
  const status = {
    permission: Notification.permission,
    swStatus: "unknown",
    token: null as string | null,
    error: null as string | null
  };

  try {
    // 1. Comprobar si el archivo SW es accesible (No da 401/404)
    const swResponse = await fetch('/firebase-messaging-sw.js');
    status.swStatus = swResponse.status === 200 ? "OK" : `ERROR ${swResponse.status}`;
    
    if (swResponse.status !== 200) {
      status.error = "El archivo Service Worker está bloqueado o no existe.";
      return status;
    }

    // 2. Intentar obtener el token actual (sin pedir permiso de nuevo)
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
 * Solicita permiso al usuario y guarda el token en Firestore.
 * @param userId - El nombre o ID del usuario (ej: "Eider Egaña")
 */
export const requestNotificationPermission = async (userId: string) => {
  try {
    console.log("Solicitando permiso de notificaciones...");
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Permiso concedido.");
      
      // Obtenemos el token único de este dispositivo
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (token) {
        console.log("Token FCM obtenido:", token);
        await saveTokenToDatabase(userId, token);
      } else {
        console.log("No se pudo obtener el token de registro.");
      }
    } else {
      console.log("Permiso de notificaciones denegado.");
    }
  } catch (error) {
    console.error("Error al solicitar permiso de notificación:", error);
  }
};

/**
 * Guarda el token en la colección 'users' de Firestore.
 */
const saveTokenToDatabase = async (userId: string, token: string) => {
  const userRef = doc(db, "users", userId);
  
  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token)
      });
    } else {
      await setDoc(userRef, { 
        fcmTokens: [token],
        name: userId,
        role: "player" 
      }, { merge: true });
    }
    console.log("Token guardado en Firestore para:", userId);
  } catch (error) {
    console.error("Error guardando token en BD:", error);
  }
};

/**
 * Escucha mensajes cuando la app está abierta (Primer plano).
 */
export const onMessageListener = () =>
  new Promise<MessagePayload>((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });