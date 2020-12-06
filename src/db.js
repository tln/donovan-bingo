// Initialize Cloud Firestore through Firebase
const config = {
    apiKey: '### FIREBASE API KEY ###',
    authDomain: '### FIREBASE AUTH DOMAIN ###',
    projectId: '### CLOUD FIRESTORE PROJECT ID ###',
    storage: 'gs://donovan-bingo.appspot.com',
};
  
export const app = !firebase.apps.length ? firebase.initializeApp(config) : firebase.app()
export const db = firebase.firestore();
