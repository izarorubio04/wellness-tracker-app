// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  // ... (TUS CREDENCIALES, NO LAS BORRES) ...
  apiKey: "AIzaSy...",
  authDomain: "wellness-tracker-1.firebaseapp.com",
  projectId: "wellness-tracker-1",
  storageBucket: "wellness-tracker-1.firebasestorage.app",
  messagingSenderId: "565369677271",
  appId: "1:565369677271:web:..."
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ESTO ES IMPORTANTE: Solo maneja mensajes en segundo plano (app cerrada)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png' // Asegúrate de que este icono existe
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});