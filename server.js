import express, { json, response } from "express";
// import { chat_input_main } from './chat_input_main.js';
import { Groq } from "groq-sdk";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatGroq } from "@langchain/groq"; // Importing ChatGroq
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
      tableName: "Messages1",

      sessionId,
      pool,
    });
    return chatHistory;
  },
  storeMessage: async (message, sessionId) => {
    const chatHistory = new PostgresChatMessageHistory({
      tableName: "Messages1",
      sessionId,
      pool,
    });
    await chatHistory.addMessage(message);
  },
});

const app = express();
const port = process.env.PORT || 3000;
dotenv.config();

// Middleware
app.use(cors());
app.use(json()); // for parsing application/json
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1]; // Assuming "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "Authentication token is required" });
  }

  try {
    const { data: user, error } = await supabase.auth.getUser(token);

    if (error) {
      throw error;
    }

    req.user = user.user;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token or user not found" });
  }
};

app.get("/", (req, res) => {
  res.send("Autolance.ai is running successfully... 🚀");
});

// AUTH ROUTES
app.post("/auth/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      throw error.message;
    }

    res.send("User signed up successfully!");
  } catch (error) {
    console.error("Error in signup:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password, provider } = req.body;

  // check if email and password are provided unless provider is provided
  if ((!email || !password) && !provider) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    if (provider) {
      let { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
      });

      if (error) {
        throw error;
      }

      res.send({ accessToken: data.session.access_token });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      throw error;
    }

    res.json({ accessToken: data.session.access_token });
  } catch (error) {
    if (error.message) {
      return res.status(500).json({ error: error.message });
    }
  }
});

app.post("/auth/logout", authenticateUser, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1]; // Assuming "Bearer TOKEN"

  try {
    const { error } = await supabase.auth.signOut(token);

    if (error) {
      throw error;
    }

    res.send("User logged out successfully!");
  } catch (error) {
    console.error("Error in logout:", error);
    res.status(500).json({ error: error });
  }
});

// CHAT ROUTES
app.post("/new", authenticateUser, async (req, res) => {
  const { messageToSend, from } = req.body;

  if (!messageToSend || !from) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    // Create a new conversation
    const { data: conversation, error: conversationError } = await supabase
      .from("Conversations")
      .insert([{ user_id: req.user.id, summary: messageToSend }])
      .select();

    if (conversationError) {
      throw conversationError;
    }

    const conversationResponse = conversation;

    // Send the message
    const { data: message, error: messageError } = await supabase
      .from("Messages")
      .insert([
        {
          conversation_id: conversationResponse[0].conversation_id,
          from: from,
          message: messageToSend,
          user_id: conversationResponse[0].user_id,
        },
      ])
      .select();

    if (messageError) {
      throw messageError;
    }

    const messageResponse = message;
    res.json(messageResponse[0]);
  } catch (error) {
    console.error("Error in creating new chat:", error);
    res.status(500).json({ error: "Failed to create new chat" });
  }
});

app.post("/:conversationId", authenticateUser, async (req, res) => {
  const { messageToSend, conversationId, from, chatHistory } = req.body;
  // if (
  //     (!messageToSend && from === "user") ||
  //     !conversationId ||
  //     !from ||
  //     (!chatHistory && from === "assistant")
  // ) {
  //     return res.status(400).json({ error: "Invalid request" });
  // }

  try {
    if (from === "user") {
      const { data: message, error: messageError } = await supabase
        .from("Messages")
        .insert([
          {
            conversation_id: conversationId,
            from: from,
            message: messageToSend,
            // user_id:
          },
        ])
        .select();

      if (messageError) {
        throw messageError;
      }

      const messageResponse = message;
      res.status(200).json(messageResponse[0]);
    } else {
      // Assistant
      const input_from_user =
        "i need freelancer TO Sleek styled investor design";

      // console.log('message to send her', chatHistory)

      const res2 = await chainWithHistory.invoke(
        { input: chatHistory },
        { configurable: { sessionId: conversationId } }
      );

      const { data: message, error: messageError } = await supabase
        .from("Messages")
        .insert([
          {
            conversation_id: conversationId,
            from: from,
            message: res2,
          },
        ])
        .select();

      if (messageError) {
        throw messageError;
      }

      // console.log('this is message', message)
      const messageResponse = message;

      res.status(200).json(messageResponse);
    }
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// FETCH PROJECTS
app.get("/projects", authenticateUser, async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from("Projects")
      .select("*")
      .eq("user_id", req.user.id);

    if (error) {
      throw error;
    }

    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.get("/projects/:projectId", authenticateUser, async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const { data: project, error } = await supabase
      .from("Projects")
      .select("*")
      .eq("project_id", projectId);

    if (error) {
      throw error;
    }

    res.json(project[0]);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// FETCH CHATS
app.get("/conversations", authenticateUser, async (req, res) => {
  try {
    const { data: conversations, error } = await supabase
      .from("Conversations")
      .select("conversation_id, summary")
      .eq("user_id", req.user.id);

    if (error) {
      throw error;
    }

    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

app.get("/:conversationId", authenticateUser, async (req, res) => {
  const conversationId = req.params.conversationId;

  try {
    const { data: messages, error } = await supabase
      .from("Messages")
      .select("*")
      .eq("conversation_id", conversationId);

    if (error) {
      throw error;
    }

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
