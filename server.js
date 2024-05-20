import express, { json } from "express";
import { OpenAI } from "openai";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const app = express();
const port = process.env.PORT || 3000;
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const openai = new OpenAI({
    organization: process.env.OPENAI_ORG_ID,
    project: process.env.OPENAI_PROJECT_ID,
    apiKey: process.env.OPENAI_API_KEY,
});

async function createProject(userId, conversationId, title, description, url) {
    const { data, error } = await supabase
        .from("Projects")
        .insert([
            {
                user_id: userId,
                conversation_id: conversationId,
                title: title,
                description: description,
                attachments_link: url,
            },
        ])
        .select();

    if (error) {
        throw error;
    }

    return data;
}

// Middleware
app.use(cors());
app.use(json()); // for parsing application/json
const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.split(" ")[1]; // Assuming "Bearer TOKEN"

    if (!token) {
        return res
            .status(401)
            .json({ error: "Authentication token is required" });
    }

    try {
        const { data: user, error } = await supabase.auth.getUser(token);

        if (error) {
            throw error;
        }

        req.user = user.user;
        next();
    } catch (error) {
        return res
            .status(403)
            .json({ error: "Invalid token or user not found" });
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
app.post("/chat/new", authenticateUser, async (req, res) => {
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

app.post("/chat/:conversationId", authenticateUser, async (req, res) => {
    const { messageToSend, conversationId, from, chatHistory } = req.body;

    console.log("Received:", messageToSend, conversationId, from);

    if (
        (!messageToSend && from === "user") ||
        !conversationId ||
        !from ||
        (!chatHistory && from === "assistant")
    ) {
        return res.status(400).json({ error: "Invalid request" });
    }

    try {
        if (from === "user") {
            const { data: message, error: messageError } = await supabase
                .from("Messages")
                .insert([
                    {
                        conversation_id: conversationId,
                        from: from,
                        message: messageToSend,
                    },
                ])
                .select();

            if (messageError) {
                throw messageError;
            }

            const messageResponse = message;
            console.log("Message Response:", messageResponse[0]);
            res.status(200).json(messageResponse[0]);
        } else {
            // Assistant
            const response = await openai.chat.completions.create({
                model: "gpt-4-turbo-2024-04-09",
                messages: chatHistory,
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "createProject",
                            description:
                                "Creates a new freelancing project in the database.",
                            parameters: {
                                type: "object",
                                properties: {
                                    title: {
                                        type: "string",
                                        description:
                                            "A short and concise title for the freelancing project.",
                                    },
                                    description: {
                                        type: "string",
                                        description:
                                            "A clear and informative description of the freelancing project.",
                                    },
                                    url: {
                                        type: "string",
                                        description:
                                            "A url that points to the attachments for the project.",
                                    },
                                },
                                required: ["title", "description", "url"],
                            },
                        },
                    },
                ],
            });

            console.log("Response:", response);

            if (response.choices[0].finish_reason === "tool_calls") {
                console.log("Assistant is trying to create a project...");

                const parsedResponse = JSON.parse(
                    response.choices[0].message.tool_calls[0].function.arguments
                );

                console.log("Parsed Response:", parsedResponse);
                const title = parsedResponse.title;

                const description = parsedResponse.description;

                const url = parsedResponse.url;

                const project = await createProject(
                    req.user.id,
                    conversationId,
                    title,
                    description,
                    url
                );

                console.log("Project Created:", project);

                const { data: message, error: messageError } = await supabase
                    .from("Messages")
                    .insert([
                        {
                            conversation_id: conversationId,
                            from: from,
                            message:
                                "You're all set! I have created a new project for you. You can view it in the Projects section.",
                        },
                    ])
                    .select();

                if (messageError) {
                    throw messageError;
                }

                const messageResponse = message;

                console.log("Message Response:", messageResponse[0]);

                res.status(200).json(messageResponse[0]);

                return;
            }

            const { data: message, error: messageError } = await supabase
                .from("Messages")
                .insert([
                    {
                        conversation_id: conversationId,
                        from: from,
                        message: response.choices[0].message.content,
                    },
                ])
                .select();

            if (messageError) {
                throw messageError;
            }

            const messageResponse = message;

            console.log("Message Response:", messageResponse[0]);

            res.status(200).json(messageResponse[0]);
        }
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Failed to send message" });
    }
});

// FETCH PROJECTS
app.get("/projects", authenticateUser, async (req, res) => {
    try {
        console.log("User ID:", req.user.id);

        const { data: projects, error } = await supabase
            .from("Projects")
            .select("*")
            .eq("user_id", req.user.id);

        console.log("Projects:", projects);

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
app.get("/chat/conversations", authenticateUser, async (req, res) => {
    try {
        console.log("User ID:", req.user.id);

        const { data: conversations, error } = await supabase
            .from("Conversations")
            .select("conversation_id, summary")
            .eq("user_id", req.user.id);

        console.log("Conversations:", conversations);

        if (error) {
            throw error;
        }

        res.json(conversations);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ error: "Failed to fetch conversations" });
    }
});

app.get("/chat/:conversationId", authenticateUser, async (req, res) => {
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