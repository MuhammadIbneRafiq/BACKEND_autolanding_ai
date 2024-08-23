// const sdk = require('node-appwrite');
import dotenv from "dotenv";
dotenv.config();
import { Client, Messaging, ID } from "node-appwrite"
let clnt = new Client();

clnt
    .setEndpoint('https://cloud.appwrite.io/v1') // Your API Endpoint
    .setProject(process.env.PROJECT_ID_NOTIF) // Your project ID
    .setKey(process.env.API_KEY_APPWRITE) // Your secret API key
    // .setSelfSigned() // Use only/ on dev mode with a self-signed SSL cert
;

const messaging = new Messaging(clnt)

export const sendEmail = async () => {
    const message = await messaging.createEmail(
        ID.unique(), // Message ID, just a random UUID
        '(URGENT) PROJECT CREATED @ AUTOLANDING AI', // subject
        'Yo vinny, check out supabase and reach out to whoever the fuck just created the project. project id: ' + ID.unique(), //MESSg content
        [], // topics (optional but keep it blank or else we gonna get error like that stripe api endpoint setup thingy)
        ['66ba6e0a0027bc14d367', '66ba6ccf000431b2aa31'], //user of email receiver from appwrite, both of us.

    )
    // console.log('mesg', message)
}
