import { Kafka } from "kafkajs"
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//kafka
export const kafka = new Kafka({
    clientId: `api-server`,
    brokers: [process.env.KAFKA_URL],
    ssl: {
        rejectUnauthorized: true,
        ca: [fs.readFileSync(path.join(__dirname, 'ca.pem'), 'utf-8')],
        // Add these for better compatibility
        checkServerIdentity: () => undefined,
    },
    sasl: {
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
        mechanism: 'plain'
    },
    connectionTimeout: 30000,  // Increase timeout this was causing error again !********* 
    requestTimeout: 30000
})

// const admin = kafka.admin();
// await admin.connect();
// console.log("KAFKA CONNECTED SUCCESSFULLY");
// await admin.disconnect();    
// 