// Imports
import dotenv from "dotenv";
import readline from "readline";
import { ChatGroq } from "@langchain/groq";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { MessageGraph } from "@langchain/langgraph";
import { START, END } from "@langchain/langgraph";

// Initialize dotenv to load environment variables
dotenv.config();

// Initialize Groq LLM
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama3-70b-8192",
});

// Initialize Tavily for web search
const tavily = new TavilySearchResults({
  maxResults: 3,
});

// Define a class to handle different agent operations
class Agent {
  constructor() {
    this._model = llm;
    this.graph = new MessageGraph();

    // Initialize nodes
    this._initializeGraph();
  }

  // Method to initialize the nodes and edges in the graph
  _initializeGraph() {
    // Node for Initial Prompt/Case 1: Project Creation
    this.graph.addNode("project_creation", async (state) => {
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", this._getProjectCreationTemplate()],
        new MessagesPlaceholder("messages"),
      ]);
      return prompt.pipe(this._model).invoke({ messages: state });
    });

    // Node for Case 2: Freelancer Search
    this.graph.addNode("freelancer_search", async (state) => {
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", this._getFreelancerSearchTemplate()],
        new MessagesPlaceholder("messages"),
      ]);
      return prompt.pipe(this._model).invoke({ messages: state });
    });

    // Node for Case 3: AI Automations for Law Firms
    this.graph.addNode("law_firm_ai", async (state) => {
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", this._getLawFirmAITemplate()],
        new MessagesPlaceholder("messages"),
      ]);
      return prompt.pipe(this._model).invoke({ messages: state });
    });

    // Node for Web Search using Tavily
    this.graph.addNode("web_search", async (state) => {
      const userQuery = state[state.length - 1].content;
      const results = await tavily.call({ input: userQuery });
      return new AIMessage(results.results.join("\n"));
    });

    // Add conditional edges to route the conversation based on the user's input
    this.graph.addConditionalEdges("project_creation", async (state) => {
      const mostRecentMessage = state[state.length - 1].content.toLowerCase();
      if (mostRecentMessage.includes("freelancer") || mostRecentMessage.includes("portfolio")) {
        return "freelancer_search";
      } else if (mostRecentMessage.includes("law firm") || mostRecentMessage.includes("ai automation")) {
        return "law_firm_ai";
      } else if (mostRecentMessage.includes("search")) {
        return "web_search";
      } else {
        return END;
      }
    }, {
      freelancer_search: "freelancer_search",
      law_firm_ai: "law_firm_ai",
      web_search: "web_search",
      end: END,
    });

    // Add edge from freelancer search to the end
    this.graph.addEdge("freelancer_search", END);

    // Add edge from law firm AI to the end
    this.graph.addEdge("law_firm_ai", END);

    // Add edge from web search to the end
    this.graph.addEdge("web_search", END);

    // Add initial edge from START to the project creation node
    this.graph.addEdge(START, "project_creation");
  }

  // Template for Project Creation (Case 1)
  _getProjectCreationTemplate() {
    return `
    You are an expert agent with over a decade of experience for a freelancing platform helping a client find freelancers.

    Your task is to create a project for a client if they are placing an order. Be flexible in the conversation and listen to the client's requests.
    
    Guidelines:
    - An overview of the project.
    - A description of the tasks to be accomplished.
    - An overview of the skills required.
    - Deadlines and deliverables for each task.
    - The pay provided.
    - Any other useful information.

    Provide a summary once the client has provided all the information.
    `;
  }

  // Template for Freelancer Search (Case 2)
  _getFreelancerSearchTemplate() {
    return `
    You are an expert agent with over a decade of experience for a freelancing platform.

    Your task is to help a client find freelancers. Ask for their portfolio and create a project for them based on their UI/UX skills and experience.
    
    Keep the conversation natural and gather the following:
    - Overview of their skills.
    - Examples of previous work.
    - Any specific project details they have in mind.
    - Deadlines and deliverables.

    Once all information is gathered, provide a summary and ask for confirmation.
    `;
  }

  // Template for AI Automations for Law Firms (Case 3)
  _getLawFirmAITemplate() {
    return `
    You are an expert agent with over a decade of experience in helping clients find AI automation solutions for law firms.

    If a client is looking for AI automations for law firms, refer them to Francesco Zerbini from Konnecte.com.

    Details to provide:
    - Workflow automation optimizes and automates business processes.
    - Outreach automation streamlines engagement and follow-up.
    - Data entry automation enhances accuracy.
    - Data scraping automates extraction of information.
    - Content creation automates the process from ideation to production.

    Refer the client and provide the necessary contact details.
    `;
  }

  // Method to handle chat history and get the next response
  async replyToChat(chatHistory) {
    const formattedHistory = this._formatChatHistory(chatHistory);
    const runnable = this.graph.compile();
    const stream = await runnable.stream(new HumanMessage({ content: formattedHistory }));

    for await (const value of stream) {
      const [nodeName, output] = Object.entries(value)[0];
      if (nodeName !== END) {
        return output.content;
      }
    }
  }

  // Utility function to format chat history for LangGraph
  _formatChatHistory(chatHistory) {
    return chatHistory
      .map((message) => `${message.sender}: ${message.content}`)
      .join("\n");
  }
}

// Function to get the user input
function getUserQuestion(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (userQuestion) => {
      rl.close();
      resolve(userQuestion);
    });
  });
}

// Main function to drive the application
async function main() {
  const agent = new Agent();

  const chatHistory = [];
  while (true) {
    const userQuestion = await getUserQuestion("\nUser:\n");
    if (userQuestion.toLowerCase() === "quit") {
      console.log("\nAgent:\nHave a nice day!\n");
      break;
    }
    chatHistory.push({ sender: "user", content: userQuestion });
    const agentResponse = await agent.replyToChat(chatHistory);
    chatHistory.push({ sender: "agent", content: agentResponse });
    console.log("Agent response:", agentResponse);
    console.log('chathisotry::::', chatHistory)
  }
  
}

// add a categorizer, put out console logs, display the output of links and people as proper json formatting to be used in the TweetResultCard

// Start the application
main();
