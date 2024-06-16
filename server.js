import express, { json, response } from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";

import { getAllChats, getChat, createChat } from './lib/Chat.js'
import { SenderType, getChatHistory, createMessage } from './lib/Message.js'
import { chainWithHistory } from "./lib/utils.js";
import { supabaseClient } from "./lib/supabase.js";
import { StripePlans } from "./lib/stripe.js";

dotenv.config();


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
    const { data: user, error } = await supabaseClient.auth.getUser(token);

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

// AUTH
app.post("/auth/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const { error } = await supabaseClient.auth.signUp({
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
      let { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: provider,
      });

      if (error) {
        throw error;
      }

      res.send({ accessToken: data.session.access_token });
      return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
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
    const { error } = await supabaseClient.auth.signOut(token);

    if (error) {
      throw error;
    }

    res.send("User logged out successfully!");
  } catch (error) {
    console.error("Error in logout:", error);
    res.status(500).json({ error: error });
  }
});

// STRIPE
app.post("/stripe", authenticateUser, async (req, res) => {
  const { plan } = req.body;
  const userId = req.user.id;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  let priceId;

  if (plan === StripePlans.BASIC.name) {
      priceId = StripePlans.BASIC.priceId;
  } else if (plan === StripePlans.PRO.name) {
      priceId = StripePlans.PRO.priceId;
  } else if (plan === StripePlans.ENTERPRISE.name) {
      priceId = StripePlans.ENTERPRISE.priceId;
  } else {
      return res.status(400).json({ error: "Invalid plan" });
  }

  try {
      const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
              {
                  price: priceId,
                  quantity: 1,
              },
          ],
          mode: 'subscription',
          client_reference_id: userId,
          success_url: "https://autolanding.ai/success?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: 'https://autolanding.ai/cancel',
      });

      res.status(200).json({ checkoutUrl: session.url });
  } catch (error) {
      console.error("Error creating Stripe checkout session:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});  

// CHAT
app.get("/chats", authenticateUser, async (req, res) => {
  try {
    const chats = await getAllChats();
    res.status(200).json(chats);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

app.get("/chats/:chatId", authenticateUser, async (req, res) => {
  const chatId = req.params.chatId;

  try {
    const chatHistory = await getChatHistory(chatId);
    res.status(200).json(chatHistory);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/chats/new", authenticateUser, async (req, res) => {
  const { content, sender } = req.body;

  if (!content || !sender) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    // Create a new chat
    // NOTE: Set 1st message as title
    const chat = await createChat(req.user, content);

    // Create message and reply
    const message = await createMessage(chat, content, sender);
    console.log("New chat and message created successfully!");
    res.status(201).json(message);
  } catch (error) {
    console.error("Error in creating new chat:", error);
    res.status(500).json({ error: "Failed to create new chat" });
  }
});

app.put("/chats/:chatId", authenticateUser, async (req, res) => {
  const chatId = req.params.chatId;
  const { content, sender } = req.body;

  try {
    // Get chat
    const chat = await getChat(chatId);
    if ( sender === SenderType.USER ) {
      // Human message
      const message = await createMessage(chat, content, sender);
      res.status(201).json(message);
    } else if ( sender === SenderType.ASSISTANT ) {
      // Assistant message
      const chatHistory = (await getChatHistory(chatId)).map((message) => message.content);
      const lastMessage = chatHistory.pop();

      const content = await chainWithHistory.invoke(
        { 
          input: lastMessage, 
          history: chatHistory
        },
        { configurable: { sessionId: chatId } }
      );
      
      const message = await createMessage(chat, content, sender);
      res.status(201).json(message);
    } else {
      throw new Error("Invalid sender type");
    }

    console.log("New message created successfully!");
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// PROJECTS
app.get("/projects", authenticateUser, async (req, res) => {
  try {
    const { data: projects, error } = await supabaseClient
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
    const { data: project, error } = await supabaseClient
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

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
