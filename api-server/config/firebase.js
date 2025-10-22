import admin from "firebase-admin";
import serviceAccount from "./nextdeploy-489e6-firebase-adminsdk-fbsvc-c97f7f565d.json" assert { type: "json" };

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
