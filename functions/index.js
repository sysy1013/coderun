const admin = require('firebase-admin');
const serviceAccount = require('./coderun-d4255-firebase-adminsdk-mc5oo-3014bef3fa');
const dotenv = require('dotenv');

dotenv.config();

let firebase;
if (admin.apps.length === 0) {
  firebase = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  firebase = admin.app();
}

module.exports = {
  api: require('./api'),
};