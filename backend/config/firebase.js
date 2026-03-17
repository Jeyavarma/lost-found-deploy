/**
 * config/firebase.js
 *
 * Firebase Admin SDK initialization for Storage.
 * Uses environment variables instead of committing service account JSON.
 *
 * Required ENV variables:
 * FIREBASE_PROJECT_ID
 * FIREBASE_CLIENT_EMAIL
 * FIREBASE_PRIVATE_KEY
 * FIREBASE_STORAGE_BUCKET
 */

const admin = require("firebase-admin");

let firebaseApp = null;
let storageBucket = null;

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_STORAGE_BUCKET
} = process.env;

if (
  FIREBASE_PROJECT_ID &&
  FIREBASE_CLIENT_EMAIL &&
  FIREBASE_PRIVATE_KEY &&
  FIREBASE_STORAGE_BUCKET
) {
  try {

    // Prevent double initialization (important for dev reloads)
    if (!admin.apps.length) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        }),
        storageBucket: FIREBASE_STORAGE_BUCKET
      });
    } else {
      firebaseApp = admin.apps[0];
    }

    storageBucket = admin.storage().bucket();

    console.log(
      "✅ Firebase initialized. Storage bucket:",
      FIREBASE_STORAGE_BUCKET
    );

  } catch (error) {

    console.error("⚠️ Firebase initialization failed:", error.message);

    firebaseApp = null;
    storageBucket = null;
  }

} else {

  console.warn(
    "⚠️ Firebase credentials not found. Firebase upload fallback disabled."
  );

}

module.exports = {
  admin,
  firebaseApp,
  storageBucket
};