// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD76_M3_zwFL0YjElwgLOXu7eyGt7uhHdw",
  authDomain: "hackathon-5981c.firebaseapp.com",
  projectId: "hackathon-5981c",
  storageBucket: "hackathon-5981c.firebasestorage.app",
  messagingSenderId: "474275463259",
  appId: "1:474275463259:web:fa16300191a6d843e07f7e",
  measurementId: "G-Y5PD2EB67L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configure Google provider for better popup handling
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Add additional scopes if needed
googleProvider.addScope('profile');
googleProvider.addScope('email');

export { auth, googleProvider };
