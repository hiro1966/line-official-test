const admin = require('firebase-admin');
require('dotenv').config();

// Firebase Admin SDKの初期化
const initFirebase = () => {
  try {
    // 環境変数から認証情報を取得
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });

    console.log('✅ Firebase initialized successfully');
    return admin.database();
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
};

module.exports = { initFirebase, admin };
