// Usamos la versión 10.14.1 (o una reciente estable) en lugar de "9.x.x"
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// TUS CREDENCIALES REALES (Copiadas de tu firebase.ts)
firebase.initializeApp({
  apiKey: "AIzaSyBjeWVBJid4FSQ_eJ_-siFS6qW2TQDF-_0",
  authDomain: "wellness-tracker-1.firebaseapp.com",
  projectId: "wellness-tracker-1",
  storageBucket: "wellness-tracker-1.firebasestorage.app",
  messagingSenderId: "106975287564",
  appId: "1:106975287564:web:56b1acae00bec0ae169129"
});

const messaging = firebase.messaging();

// Manejador de mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('Mensaje recibido en background:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png', // Asegúrate de que este icono exista en public
    badge: '/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});