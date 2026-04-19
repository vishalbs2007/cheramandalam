const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const isFirebaseAuthEnabled = () => {
  return String(process.env.AUTH_PROVIDER || 'jwt').toLowerCase() === 'firebase';
};

const parsePrivateKey = (value) => {
  if (!value) return '';
  return String(value).replace(/\\n/g, '\n');
};

const hasServiceAccountEnv = () => {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
};

const ensureFirebaseApp = () => {
  if (!isFirebaseAuthEnabled()) {
    return null;
  }

  if (getApps().length) {
    return getApps()[0];
  }

  if (hasServiceAccountEnv()) {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
      })
    });
  }

  return initializeApp({
    credential: applicationDefault()
  });
};

const getFirebaseAuth = () => {
  const app = ensureFirebaseApp();
  return app ? getAuth(app) : null;
};

module.exports = {
  getFirebaseAuth,
  isFirebaseAuthEnabled
};