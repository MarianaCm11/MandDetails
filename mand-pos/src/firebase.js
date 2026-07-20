import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyByAkercorkTrAbRxzPBscCkSBfLbRqs7w",
  authDomain: "manddetails.firebaseapp.com",
  projectId: "manddetails",
  storageBucket: "manddetails.firebasestorage.app",
  messagingSenderId: "471714388667",
  appId: "1:471714388667:web:25782d29893d90ecfae79e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
  } else if (err.code === 'unimplemented') {
    console.warn("The current browser does not support all of the features required to enable persistence");
  }
});

export { db, auth };
