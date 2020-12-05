// Initialize Cloud Firestore through Firebase
const config = {
    apiKey: '### FIREBASE API KEY ###',
    authDomain: '### FIREBASE AUTH DOMAIN ###',
    projectId: '### CLOUD FIRESTORE PROJECT ID ###'
};
  
export const app = !firebase.apps.length ? firebase.initializeApp(config) : firebase.app()
export const db = firebase.firestore();
window.DB = db;
console.log(db.collection('users'))
