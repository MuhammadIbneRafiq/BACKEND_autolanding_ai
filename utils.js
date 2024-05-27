import dotenv from 'dotenv';
import pg from 'pg';
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import { ChatOpenAI } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";

import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatGroq } from "@langchain/groq"; // Importing ChatGroq

dotenv.config();

const connectionString = 'postgres://postgres.okkdlbdnfaylakfbycta:NGJqfNgaBxlTwOVC@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
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

// console.log('this is chain', chain)

// const chainWithHistory = new RunnableWithMessageHistory({
//   runnable: chain,
//   inputMessagesKey: "input",
//   historyMessagesKey: "chat_history",
//   getMessageHistory: async (sessionId) => {
//     const chatHistory = new PostgresChatMessageHistory({
//       sessionId,
//       pool,
//     });
//     return chatHistory;
//   },
//   storeMessage: async (message, sessionId) => {
//     const chatHistory = new PostgresChatMessageHistory({
//       sessionId,
//       pool,
//     });
//     await chatHistory.addMessage(message);
//   },
// });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

//THESE 4 ARE THE INPUTS OF THIS FUNCTION CHAT_INPUT_MAIN
// 1. messageToSend is the user_id
// 2. convo_id and put it in storage.(but maybe in the long term memory)
// 3. from is just 'Assistant'
/* 4. chat history is taken in this Message object format: [
  {
    role: 'system',
    content: 'prompt'
  },
  {
    role: 'user',
    content: 'HELLO I NEED FREELANCER THIS IS MY MESSAGETOSEND'
  }
]
*/
   

const sessionId = 'session_id_123'; // add the conversation_id from supabase instead of langchain-test-session
console.log('Starting chat_input_main function');
// console.log('conversation_id:', sessionId);
// console.log('messageToSend:', messageToSend);
// console.log('from:', from);
// console.log('chat_history:', chat_history);


// here get the chat_history from conversation_id in supabase table instead using the PostgresChatMessageHisttory
const chainWithHistory = new RunnableWithMessageHistory({
  runnable: chain,
  inputMessagesKey: "hi i need freelancers",
  historyMessagesKey: "chat_history",
  getMessageHistory: async (sessionId) => {
    const chatHistory = new PostgresChatMessageHistory({
      tableName: 'Messages1',
      sessionId,
      pool,
    });
    return chatHistory;
  },
  storeMessage: async (message, sessionId) => {
    const chatHistory = new PostgresChatMessageHistory({
      tableName: 'Messages1',
      sessionId,
      pool,
    });
    await chatHistory.addMessage(message);
    console.log("Message stored successfully:", message);

  },
});

console.log('chainwithhsutshs', chainWithHistory)


const res2 = await chainWithHistory.invoke(
  { input: "my names Muhammad" },
  { configurable: { sessionId } }
);

// store the session_id in supabase according to the conversation id, maybe the code underneath is wrong

console.log(res2);  // this will be the message and put up into the Message[]


// the output looks like this:
/* 






// call supabase and get all convo from a conv_id



/*

1.  console.log('1', messageToSend) 1 user_id but its undefined so ig its fine??


2

    console.log('2', conversationId)
    2 207e9ec6-4212-40a4-915a-998aea8be8a0

3    console.log('3', from) 3 assistant


4 [
  {
    role: 'system',
    content: 'prompt'
  },
  {
    role: 'user',
    content: 'HELLO I NEED FREELANCER THIS IS MY MESSAGETOSEND'
  }
]

            const messageResponse = message;
console.log('5, final message?????', messageResponse[0])

*/


// Example call to the function (replace with actual values)
// chat_input_main('ce0429d9-210f-48e6-aa43-81b221fef544', 'fa9cb184-d522-41ce-98f0-b8d701f7d4f8', 'Assistant', [
//   {
//     role: 'system',
//     content: 'you are afriendly freelancing job taker assistant, be nice',
//   },
//   {
//     role: 'user',
//     content: 'HELLO I NEED FREELANCER THIS IS MY MESSAGETOSEND',
//   }
// ]);