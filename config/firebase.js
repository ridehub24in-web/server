const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    
    // Check if it's a valid service account key (should have private_key)
    if (serviceAccount.private_key) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: serviceAccount.storage_bucket || "dating-dd033.firebasestorage.app"
      });
      console.log('Firebase Admin initialized successfully.');
    } else {
      console.warn('--- FIREBASE WARNING ---');
      console.warn('The file serviceAccountKey.json is a client-side config (google-services.json).');
      console.warn('Firebase Admin requires a Service Account Key from Firebase Console -> Settings -> Service Accounts.');
      console.warn('Push notifications and Admin features will not work until the correct file is provided.');
    }
  } else {
    console.error('Firebase serviceAccountKey.json not found in server/config/');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
}

module.exports = admin;
