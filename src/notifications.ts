import { getMessaging, getToken, onMessage, MessagePayload } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, setDoc, getDoc } from "firebase/firestore";
import { app, db } from "./firebase"; 

const messaging = getMessaging(app);
const VAPID_KEY = "BG9mCW-AQ1jaj1ab0tSQH5gT0_LLqI8wImNpXaylS6TsL43-N_VHLL2-Ek0iwR8EHYHfw_4z67gj4yWXAOtRFzo";

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

const saveTokenToDatabase = async (userId: string, token: string, role: string) => {
  const userRef = doc(db, "users", userId);
  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      // Usamos arrayUnion para evitar duplicados EXACTOS en la BD
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
    console.error("Error guardando token:", error);
  }
};

// [CORREGIDO] Ahora acepta un callback y devuelve la función para desuscribirse
export const onMessageListener = (callback: (payload: MessagePayload) => void) => {
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};