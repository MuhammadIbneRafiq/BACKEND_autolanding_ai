import express, { json } from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
// import pdfParse from 'pdf-parse';
import { generateEmbedding } from './lib/embeddings.js';
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

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const uploadsDir = path.join(__dirname, 'uploads');

// // Create uploads directory if it doesn't exist
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir);
// }

// // Configure multer to store files in uploads directory
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadsDir);
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });

// const upload = multer({ storage: storage });

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

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

// User Role
app.post("/user/role", authenticateUser, async (req, res) => {
  const roles = new Role();
  const response = await roles.getRole(req.user.email);
  res.send(response?.role);
});

app.post("/user/setrole/:role", authenticateUser, async (req, res) => {
  const role = req.params.role;
  const roles = new Role();
  await roles.newRole(req.user.email, role);
  res.send("User Role successfully!");
});

// Auth
app.post("/auth/signup", async (req, res) => {
  const { email, password, role } = req.body;

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
    console.log('this is new msg', message)
    console.log("New chat and message created successfully!");
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: "Failed to create new chat" });
  }
});

// Search
app.post("/search", authenticateUser, async (req, res) => {
  const user = req.user;

  try {
    const results = await SearchTwitter(user.email);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error in searching projects:", error);
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

app.get("/projects/:projectId", async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const { data, error } = await supabaseClient.from("projects")
      .select("*")
      .eq("project_id", projectId)
      .single();

    res.json(data);
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

    res.status(201).json(project);
  } catch (error) {
    console.error("Error in creating new project or maybe its the EMAIL API", error);
    res.status(500).json({ error: "Failed to create new project" });
  }
});

app.put("/chats/:chatId", authenticateUser, async (req, res) => {
  const chatId = req.params.chatId;
  const { content, sender } = req.body;

  try {
    // Validate sender type
    if (sender !== SenderType.USER && sender !== SenderType.ASSISTANT) {
      return res.status(400).json({ 
        error: "Invalid sender type", 
        received: sender,
        allowedTypes: [SenderType.USER, SenderType.ASSISTANT]
      });
    }

    const messages = new Messages(req.user, chatId);

    if (sender === SenderType.USER) {
      // Human message - same for both types
      const message = await messages.newMessage(content, sender);
      return res.status(201).json(message);
    } 
    
    // Check if this chat has associated PDF documents
    const { data: documents, error: docsError } = await supabaseClient
      .from('documents')
      .select('content, embedding')
      .eq('chat_id', chatId);

    if (docsError) throw docsError;

    if (documents && documents.length > 0) {
      // PDF-context chat - perform semantic search using existing embeddings
      const { data: relevantDocs, error } = await supabaseClient.rpc(
        'match_documents',
        {
          chat_id: chatId,
          match_threshold: 0.7,
          match_count: 3
        }
      );

      if (error) throw error;

      // Combine chat history with relevant resume context
      const chatHistory = await messages.getMessages();
      const resumeContext = relevantDocs.map(doc => doc.content).join('\n');

      const agent = new Agent();
      const output = await agent.replyToChat(chatHistory, resumeContext);
      
      const message = await messages.newMessage(
        output.content,
        sender,
        output.is_final || false,
        output.search_needed || false
      );

      return res.status(201).json(message);
    } else {
      // Regular chat without PDF context
      const chatHistory = await messages.getMessages();
      const agent = new Agent();
      const output = await agent.replyToChat(chatHistory);
      
      const message = await messages.newMessage(
        output.content,
        sender,
        output.is_final || false,
        output.search_needed || false
      );

      return res.status(201).json(message);
    }

  } catch (error) {
    console.error('Error in chat message:', error);
    res.status(500).json({ error: "Failed to send message", details: error.message });
  }
});

// app.post('/api/upload-pdf', authenticateUser, upload.single('pdf'), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded.' });
//     }

//     const chatId = req.body.chatId; // Add this to receive chatId from frontend
//     const filePath = req.file.path;
    
//     try {
//       const dataBuffer = fs.readFileSync(filePath);
//       const data = await pdfParse(dataBuffer);
//       fs.unlinkSync(filePath);

//       const chunks = data.text.split('\n\n').filter(chunk => chunk.trim().length > 0);
      
//       // Store chunks with chat_id reference
//       for (const chunk of chunks) {
//         const embedding = await generateEmbedding(chunk);
//         const { data: vectorData, error } = await supabaseClient
//           .from('documents')
//           .insert([{
//             content: chunk,
//             chat_id: chatId,
//             metadata: {
//               source: req.file.originalname,
//               type: 'pdf'
//             },
//             embedding: embedding
//           }]);

//         if (error) throw error;
//       }

//       res.json({ 
//         message: 'Resume processed and stored successfully',
//         chunks: chunks.length
//       });
//     } catch (error) {
//       if (fs.existsSync(filePath)) {
//         fs.unlinkSync(filePath);
//       }
//       throw error;
//     }
//   } catch (error) {
//     console.error('Error processing PDF:', error);
//     res.status(500).json({ 
//       error: 'Error processing PDF',
//       details: error.message 
//     });
//   }
// });

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
