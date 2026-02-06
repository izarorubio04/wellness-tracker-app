import { getMessaging, getToken, onMessage, MessagePayload } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, setDoc, getDoc } from "firebase/firestore";
import { app, db } from "./firebase"; 

// Inicializamos el servicio de mensajería
const messaging = getMessaging(app);

// ¡¡IMPORTANTE!!: Reemplaza esto con tu "Key pair" pública de la consola de Firebase
// Configuración -> Cloud Messaging -> Web configuration -> Web Push certificates
const VAPID_KEY = "BG9mCW-AQ1jaj1ab0tSQH5gT0_LLqI8wImNpXaylS6TsL43-N_VHLL2-Ek0iwR8EHYHfw_4z67gj4yWXAOtRFzo";

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
 * Usa arrayUnion para no borrar tokens de otros dispositivos (ej: si usa iPad y Móvil).
 */
const saveTokenToDatabase = async (userId: string, token: string) => {
  const userRef = doc(db, "users", userId);
  
  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Si el usuario existe, añadimos el token al array
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token)
      });
    } else {
      // Si el usuario no existe (primera vez), creamos el documento
      // Nota: Asumimos rol 'player' por defecto si no existe, o mantenemos solo los tokens
      await setDoc(userRef, { 
        fcmTokens: [token],
        name: userId,
        role: "player" // Valor por defecto seguro, luego se puede cambiar a staff manualmente
      }, { merge: true });
    }
    console.log("Token guardado en Firestore para:", userId);
  } catch (error) {
    console.error("Error guardando token en BD:", error);
  }
};

/**
 * Escucha mensajes cuando la app está abierta (Primer plano).
 * Retorna una promesa que se resuelve cuando llega un mensaje.
 */
export const onMessageListener = () =>
  new Promise<MessagePayload>((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });