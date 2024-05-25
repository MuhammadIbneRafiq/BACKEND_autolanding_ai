import dotenv from 'dotenv';
import pg from 'pg';
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
      sessionId,
      pool,
    });
    return chatHistory;
  },
  storeMessage: async (message, sessionId) => {
    const chatHistory = new PostgresChatMessageHistory({
      sessionId,
      pool,
    });
    await chatHistory.addMessage(message);
  },
});

const chat_input_main = async () => {
  try {
    const sessionId = "langchain-test-session"; // add the conversation_id from supabase instead of langchain-test-session

        const res2 = await chainWithHistory.invoke(
        { input: "i need video editors" },
        { configurable: { sessionId } }
        );
        console.log(res2);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Close the pool when done
    await pool.end();
  }
};
chat_input_main()
