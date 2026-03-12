/**
 * config/firebase.js
 *
 * Firebase Admin SDK initialization.
 * Credentials are loaded from environment variables so no service account JSON
 * needs to be committed to the repo. Set the following in .env (or Render env):
 *
 *   FIREBASE_PROJECT_ID      — your Firebase project ID
 *   FIREBASE_CLIENT_EMAIL    — service account client_email
 *   FIREBASE_PRIVATE_KEY     — service account private_key (with \n literal)
 *   FIREBASE_STORAGE_BUCKET  — e.g. your-project.appspot.com
 *
 * If Firebase credentials are not set we export `null` so the app still starts
 * and simply skips the fallback path (upload will still use Cloudinary).
 */

const admin = require('firebase-admin');

let firebaseApp = null; // will remain null if env vars are missing
let storageBucket = null;

const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_STORAGE_BUCKET
} = process.env;

if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY && FIREBASE_STORAGE_BUCKET) {
    try {
        // Avoid initialising twice when the module is hot-reloaded in development
        if (!admin.apps.length) {
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: FIREBASE_PROJECT_ID,
                    clientEmail: FIREBASE_CLIENT_EMAIL,
                    // Render (and most CI) stores multiline values where \n is a literal
                    // backslash-n rather than a newline — the replace handles both.
                    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                }),
                storageBucket: FIREBASE_STORAGE_BUCKET
            });
        } else {
            firebaseApp = admin.apps[0];
        }

        storageBucket = admin.storage().bucket();
        console.log('✅ Firebase Admin SDK initialized — Storage bucket:', FIREBASE_STORAGE_BUCKET);
    } catch (err) {
        console.error('⚠️  Firebase Admin SDK failed to initialize:', err.message);
        // Not fatal — Cloudinary remains the primary provider
        firebaseApp = null;
        storageBucket = null;
    }
} else {
    console.warn(
        '⚠️  Firebase env vars not set. Firebase Storage fallback is DISABLED. ' +
        'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, ' +
        'FIREBASE_STORAGE_BUCKET to enable it.'
    );
}

module.exports = { firebaseApp, storageBucket };
