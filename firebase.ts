import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDfwKzI3teM3KKx2hGKb5TYY5y4feloLA8",
  authDomain: "ielts-reading-f7c3c.firebaseapp.com",
  projectId: "ielts-reading-f7c3c",
  storageBucket: "ielts-reading-f7c3c.firebasestorage.app",
  messagingSenderId: "499991135177",
  appId: "1:499991135177:web:70c9699bb59953a1079e18",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;