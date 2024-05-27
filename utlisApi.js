import express, { json } from "express";
import dotenv from "dotenv";
import pg from "pg";
import cors from "cors";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatGroq } from "@langchain/groq"; // Importing ChatGroq

dotenv.config();

const connectionString = process.env.POSTGRES_CONNECTION_STRING;

const pool = new pg.Pool({ connectionString });

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama3-8b-8192", // Using the 8-billion parameter model
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
      You are the Reply writer Agent for the freelancing platform which replies to clients looking for freelancers. Take the INITIAL_MESSAGE below 
      from a human that has come to the platform looking for freelancers. The summarizer 
      that the categorizer agent gave it and the research from the research agent and 
      Ask helpful questions to better understand the freelancing needs in a thoughtful and friendly way. Remember people may be asking 
      about a lot of things at once, make sure that by the end of the conversation you have these questions asked.
  
      If the customer message is 'off_topic' then ask them questions to get more information about freelancing orders.
      If the customer message is 'description of a certain task' then try to get some designs or descriptions in the form of docs, or URLs or any other links depending on the task.
      If the customer message is 'product_enquiry' then try to give them the info the researcher provided in a succinct and friendly way.
      If any part of the user’s description is vague or incomplete, request additional details.
      Facilitate a clear and precise exchange of information and confirm facts and summarize details to ensure accuracy.
      If the customer message is 'price_enquiry' then try to ask for their budget and tell them about what they can possibly get in this budget.
  
      You never make up information that hasn't been provided by the research_info or in the initial_message.
  
      Return the reply as either 1 question or one sentence no more than around 20ish words. Make sure to not ask everything mentioned in the prompt 
      at once, but check in memory if the above question is answered but don't ask questions back to back.
      Keep it naturally in a conversational tone as well as friendly.
  
      If they ask for further communications, ask them to contact WhatsApp +316 45421019 for details, or LinkedIn: Muhammad Rafiq.
    `,
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
]);

const chain = prompt.pipe(model).pipe(new StringOutputParser());

const chainWithHistory = new RunnableWithMessageHistory({
  runnable: chain,
  inputMessagesKey: "input",
  historyMessagesKey: "chat_history",
  getMessageHistory: async (sessionId) => {
    const chatHistory = new PostgresChatMessageHistory({
      tableName: 'messages1',
      sessionId,
      pool,
    });
    return chatHistory;
  },
  storeMessage: async (message, sessionId) => {
    const chatHistory = new PostgresChatMessageHistory({
      tableName: 'messages1',
      sessionId,
      pool,
    });
    await chatHistory.addMessage(message);
  },
});

const app = express();

app.use(express.json());
app.use(cors());
app.use(json()); // for parsing application/json

app.post("/chat/:conversationId", async (req, res) => {
  try {
    // const { message, from } = req.body;
    const { messageToSend, conversationId, from, chatHistory } = req.body;

    const message = 'yo wassum mate' // basically the last thing from chat history is the messagee

    console.log('message comming in', req.body)

    const sessionId = "session_id_123";
    const result = await chainWithHistory.invoke(
      { input: message },
      { configurable: { sessionId } }
    );

    
    console.log('respone from yk who', result)

    // so the response should be an entire message obj, get that and u have smth displayed
    // const response_sending_in_message= [
    //   conversation_id : "38687e83-2a48-4e80-a2c2-ab55b0841670",
    //   from : "assistant",
    //   message: result,
    //   message_id: "314e0819-c540-45ff-a564-928636470658",
    //   sent_at : "2024-05-27T13:36:55.149639+00:00",
    //   user_id : null
    // ]


    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  } 
});


// input taken: message to send: string, conv id: string, from: (user/assistant), chathistory: message[] (formatted message from utils)



// app.post("/chat/:conversationId", authenticateUser, async (req, res) => {
//   const { messageToSend, conversationId, from, chatHistory } = req.body;

//   console.log('1', messageToSend)
//   console.log('2', conversationId)
//   console.log('3', from)
//   console.log('4', chatHistory)


//   if (
//       (!messageToSend && from === "user") ||
//       !conversationId ||
//       !from ||
//       (!chatHistory && from === "assistant")
//   ) {
//       return res.status(400).json({ error: "Invalid request" });
//   }

//   try {
//       if (from === "user") {
//           const { data: message, error: messageError } = await supabase
//               .from("Messages")
//               .insert([
//                   {
//                       conversation_id: conversationId,
//                       from: from,
//                       message: messageToSend,
//                   },
//               ])
//               .select();

//           if (messageError) {
//               throw messageError;
//           }

//           const messageResponse = message;
//           res.status(200).json(messageResponse[0]);
//       } else {
//           // Assistant
//           const response = await openai.chat.completions.create({
//               model: "gpt-4-turbo-2024-04-09",
//               messages: chatHistory,
//               tools: [
//                   {
//                       type: "function",
//                       function: {
//                           name: "createProject",
//                           description:
//                               "Creates a new freelancing project in the database.",
//                           parameters: {
//                               type: "object",
//                               properties: {
//                                   title: {
//                                       type: "string",
//                                       description:
//                                           "A short and concise title for the freelancing project.",
//                                   },
//                                   description: {
//                                       type: "string",
//                                       description:
//                                           "A clear and informative description of the freelancing project.",
//                                   },
//                                   url: {
//                                       type: "string",
//                                       description:
//                                           "A url that points to the attachments for the project.",
//                                   },
//                               },
//                               required: ["title", "description", "url"],
//                           },
//                       },
//                   },
//               ],
//           });

//           console.log("Response:", response);

//           if (response.choices[0].finish_reason === "tool_calls") {
//               console.log("Assistant is trying to create a project...");

//               const parsedResponse = JSON.parse(
//                   response.choices[0].message.tool_calls[0].function.arguments
//               );

//               console.log("Parsed Response:", parsedResponse);
//               const title = parsedResponse.title;

//               const description = parsedResponse.description;

//               const url = parsedResponse.url;

//               const project = await createProject(
//                   req.user.id,
//                   conversationId,
//                   title,
//                   description,
//                   url
//               );

//               console.log("Project Created:", project);

//               const { data: message, error: messageError } = await supabase
//                   .from("Messages")
//                   .insert([
//                       {
//                           conversation_id: conversationId,
//                           from: from,
//                           message:
//                               "You're all set! I have created a new project for you. You can view it in the Projects section.",
//                       },
//                   ])
//                   .select();

//               if (messageError) {
//                   throw messageError;
//               }

//               const messageResponse = message;

//               console.log("Message Response:", messageResponse[0]);

//               res.status(200).json(messageResponse[0]);

//               return;
//           }

//           const { data: message, error: messageError } = await supabase
//               .from("Messages")
//               .insert([
//                   {
//                       conversation_id: conversationId,
//                       from: from,
//                       message: response.choices[0].message.content,
//                   },
//               ])
//               .select();

//           if (messageError) {
//               throw messageError;
//           }

//           const messageResponse = message;

//           console.log("Message Response:", messageResponse[0]);

//           res.status(200).json(messageResponse[0]);
//       }
//   } catch (error) {
//       console.error("Error sending message:", error);
//       res.status(500).json({ error: "Failed to send message" });
//   }
// });










app.listen(3001, () => {
  console.log("Server listening on port 3001");
});
