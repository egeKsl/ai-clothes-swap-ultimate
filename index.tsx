import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
//import './index.css';

// 1. Firebase SDK'larını import edin
import { initializeApp } from "firebase/app";
import { getFunctions } from "firebase/functions";

// 2. Firebase Yapılandırmasını Tanımlayın
// Not: Bu yapılandırmayı Firebase Console'dan almalısınız.
// API key, React projesi için gizli değildir, sadece backend key'i gizliyoruz.
const firebaseConfig = {
  apiKey: "YOUR_REACT_APP_API_KEY", // <-- Kendi anahtarınızı buraya yazın
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "...",
  appId: "...",
};

// 3. Firebase Uygulamasını Başlatın
const app = initializeApp(firebaseConfig);

// 4. Functions Servisini Başlatın ve Dışa Aktarın
// 'us-central1' yerine, Firebase Functions'ı dağıttığınız bölgeyi (region) yazın.
export const functions = getFunctions(app, 'us-central1'); 


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);