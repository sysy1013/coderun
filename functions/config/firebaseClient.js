// Import the functions you need from the SDKs you need
const { initializeApp } = require("firebase/app");
const { getAuth } =require("firebase/auth") ;
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBvJOpJgV1WHYWHQEkG2RHtlcuC2EWlHyc",
    authDomain: "coderun-d4255.firebaseapp.com",
    projectId: "coderun-d4255",
    storageBucket: "coderun-d4255.appspot.com",
    messagingSenderId: "942269126382",
    appId: "1:942269126382:web:799b36b2694fd7538645ff",
    measurementId: "G-K5507LMWYF"
  };
// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);

module.exports = {firebaseApp, firebaseAuth, firebaseConfig};