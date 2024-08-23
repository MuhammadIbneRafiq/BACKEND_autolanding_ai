import express, { json } from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";

import { Chats } from "./db/Chats.js";
import { SenderType, Messages } from "./db/Messages.js";
import { Projects } from "./db/Projects.js";
import { Agent } from "./lib/Agent.js";
import { supabaseClient } from "./db/params.js";
import { StripePlans } from "./lib/stripe.js";
import { sendEmail } from "./notif.js";
import { Role } from "./db/Role.js";
import { ConsoleMessage } from "puppeteer-core";
import { SearchTwitter } from "./lib/search.js";

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
  res.send("Autolanding AI is running successfully... 🚀");
});
//User Role
app.post("/user/role", authenticateUser, async (req, res) => {
  const roles = new Role();
  // console.log(req.user.email);
  const response = await roles.getRole(req.user.email);
  // console.log(response);
  res.send(response?.role);
});

app.post("/user/setrole/:role", authenticateUser, async (req, res) => {
  const role = req.params.role;
  // console.log(role);
  const roles = new Role();
  await roles.newRole(req.user.email, role);
  res.send("User Role successfully!");
});

// Auth
app.post("/auth/signup", async (req, res) => {
  const { email, password, role } = req.body;

  // console.log(email, password, role)

  if (!email || !password) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      throw error;
    }

    const roles = new Role();
    await roles.newRole(email, role);

    if (data.session) {
      res.status(200).json({
        message: "User signed up successfully!",
        accessToken: data.session.access_token, // User will automatically logged in
      });
    }
  } catch (error) {
    console.error("Error in signup:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  // check if email and password are provided unless provider is provided
  if (!email || !password) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
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

// Stripe
app.post("/stripe", authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const priceId = process.env.STRIPE_PRICE_ID;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      client_reference_id: userId,
      success_url: process.env.APP_URL,
      cancel_url: process.env.APP_URL,
    });

    res.status(200).json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Chats
app.get("/chats", authenticateUser, async (req, res) => {
  try {
    const chats = new Chats(req.user);
    const userChats = await chats.getChats();

    res.status(200).json(userChats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

app.get("/chats/:chatId", authenticateUser, async (req, res) => {
  const chatId = req.params.chatId;

  try {
    const messages = new Messages(req.user, chatId);
    const chatHistory = await messages.getMessages();
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
    const chats = new Chats(req.user);
    const chat = await chats.newChat(content);

    // Create message
    const messages = new Messages(req.user, chat.chat_id);
    const message = await messages.newMessage(content, sender);
    // console.log("New chat and message created successfully!");
    res.status(201).json(message);
  } catch (error) {
    // console.error("Error in creating new chat:", error);
    res.status(500).json({ error: "Failed to create new chat" });
  }
});

app.put("/chats/:chatId", authenticateUser, async (req, res) => {
  const chatId = req.params.chatId;
  const { content, sender } = req.body;

  try {
    if (sender === SenderType.USER) {
      // Human message
      const messages = new Messages(req.user, chatId);
      const message = await messages.newMessage(content, sender);

      res.status(201).json(message);
    } else if (sender === SenderType.ASSISTANT) {
      // Assistant message
      const messages = new Messages(req.user, chatId);
      const chatHistory = await messages.getMessages();

      const agent = new Agent();
      const output = await agent.replyToChat(chatHistory);
      const message = await messages.newMessage(
        output.content,

        sender,

        output.is_final
      );

      res.status(201).json(message);
    } else {
      throw new Error("Invalid sender type");
    }

    // console.log("New message created successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

//Search
app.post("/search", async (req, res) => {
  const { query } = req.body;

  try {
    const results = await SearchTwitter(query);

    // Send the search results back to the client
    res.status(200).json(results);
  } catch (error) {
    console.error("Error in searching projects:", error);

    // Send an error response to the client
    res.status(500).json({ error: "Failed to search projects" });
  }
});

// Projects
app.get("/projects", authenticateUser, async (req, res) => {
  try {
    const projects = new Projects(req.user);
    const userProjects = await projects.getProjects();

    res.json(userProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.get("/projects/:projectId", authenticateUser, async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const projects = new Projects(req.user);
    const project = await projects.getProject(projectId);

    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

app.post("/projects/new", authenticateUser, async (req, res) => {
  const chatId = req.body.chatId;

  try {
    const messages = new Messages(req.user, chatId);
    const chatHistory = await messages.getMessages();

    const agent = new Agent();
    const output = await agent.createProjectfromChat(chatHistory);

    const projects = new Projects(req.user);
    const project = await projects.newProject(
      chatId,
      output.title,
      output.description
    );

    await sendEmail();

    res.status(201).json(project);
  } catch (error) {
    console.error(
      "Error in creating new project or maybe its the EMAIL API",

      error
    );
    res.status(500).json({ error: "Failed to create new project" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
