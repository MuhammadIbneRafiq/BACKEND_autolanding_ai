import { chatAgentPrompt, projectCreationPrompt } from "./prompts.js";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
// import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import dotenv from "dotenv";

dotenv.config();

class Agent {
  constructor() {
    this._model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama3-70b-8192",
    });
  }

  async _formatChatHistory(chatHistory) {
    return chatHistory
      .map((message) => `${message.sender}: ${message.content}`)
      .join("\n");
  }

  async replyToChat(chatHistory, resumeContext = '') {
    const prompt = `
      You are an AI assistant helping employers interact with job candidates.
      
      Relevant information from the candidate's resume:
      ${resumeContext}

      Chat history:
      ${chatHistory.map(msg => `${msg.sender}: ${msg.content}`).join('\n')}

      Please provide a helpful response based on the chat history and resume information.
    `;

    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      content: "Next message to the conversation",
      is_final: `For a message to be final, the client confirmed that the project summary is correct. In case your current message is the project summary, set this field to 'True'. 
        
        However if the user is sending another message after the project summary, set this to 'false'
        
        This field is a boolean. It can be 'true' or 'false'`,
      search_needed:
        "If there is a need to search for a project set this field to 'true', this field must be boolean only. If it is not needed, set this field to 'false'.",
    });

    const chain = chatAgentPrompt.pipe(this._model).pipe(parser);

    // Invoke the chain and ensure we return all expected properties
    const output = await chain.invoke({
      history: prompt,
      format_instructions: parser.getFormatInstructions(),
    });

    // Return the response with all necessary fields explicitly set
    return {
      content: output.content || "",
      is_final: output.is_final !== undefined ? output.is_final : false,
      search_needed: output.search_needed !== undefined ? output.search_needed : false,
    };
  }

  async createProjectfromChat(chatHistory) {
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      title: "Project title",
      description:
        "A detailed project description based on the conversation history",
    });

    const chain = projectCreationPrompt.pipe(this._model).pipe(parser);

    return chain.invoke({
      history: await this._formatChatHistory(chatHistory),
      format_instructions: parser.getFormatInstructions(),
    });
  }
}

export { Agent };

// const chatHistory = [
//   {
//     message_id: 'ca510d48-ecc3-4e47-ae08-172d2b96c207',
//     created_at: '2024-07-25T14:54:49.300181+00:00',
//     chat_id: '0f40ea5a-19e2-48c5-a74a-3682d06cf988',
//     sender: 'user',
//     user_id: 'f0076c2b-128e-4650-a829-89938572715a',
//     content: 'hey i am looking for ui/ux work from a client',
//     is_final: false
//   },
//   {
//     message_id: 'd3239588-45c7-4ebc-969a-7bdf48141bb1',
//     created_at: '2024-07-25T14:54:51.486356+00:00',
//     chat_id: '0f40ea5a-19e2-48c5-a74a-3682d06cf988',
//     sender: 'assistant',
//     user_id: 'f0076c2b-128e-4650-a829-89938572715a',
//     content: 'Could you please provide me with your portfolio? This will help me create a project tailored to your UI/UX skills and experience.',
//     is_final: false
//   },
//   {
//     message_id: '0baca23b-f8a6-4761-9eec-41892812ee50',
//     created_at: '2024-07-28T14:25:14.261806+00:00',
//     chat_id: '0f40ea5a-19e2-48c5-a74a-3682d06cf988',
//     sender: 'user',
//     user_id: 'f0076c2b-128e-4650-a829-89938572715a',
//     content: 'yeah sure',
//     is_final: false
//   },
//   {
//     message_id: '3c2a0176-6779-40eb-87ee-92f9adcf4a7e',
//     created_at: '2024-07-28T14:25:17.468944+00:00',
//     chat_id: '0f40ea5a-19e2-48c5-a74a-3682d06cf988',
//     sender: 'assistant',
//     user_id: 'f0076c2b-128e-4650-a829-89938572715a',
//     content: "Please go ahead and share your portfolio when you are ready, and I'll use it to create a project tailored to your UI/UX work.",
//     is_final: false
//   },
//   {
//     message_id: '1e402769-5fd7-4569-8588-5e3612623a38',
//     created_at: '2024-07-28T15:21:05.552352+00:00',
//     chat_id: '0f40ea5a-19e2-48c5-a74a-3682d06cf988',
//     sender: 'user',
//     user_id: 'f0076c2b-128e-4650-a829-89938572715a',
//     content: 'https://www.linkedin.com/in/muhammad-ibne-rafiq/',
//     is_final: false
//   },
//   {
//     message_id: '7c54d0f7-62df-464b-80ec-ad929052f013',
//     created_at: '2024-07-28T15:21:08.695685+00:00',
//     chat_id: '0f40ea5a-19e2-48c5-a74a-3682d06cf988',
//     sender: 'assistant',
//     user_id: 'f0076c2b-128e-4650-a829-89938572715a',
//     content: "I've reviewed your portfolio at the provided link. Let's create a project for your UI/UX work. Please share an overview of the project you'd like to work on, including the tasks, skills required, deadlines, and payment details if you have them.",
//     is_final: false
//   },
//   {
//     message_id: 'b62b749b-d9e8-4982-8e71-e84058873e42',
//     created_at: '2024-07-29T11:50:47.875834+00:00',
//     chat_id: '0f40ea5a-19e2-48c5-a74a-3682d06cf988',
//     sender: 'user',
//     user_id: 'f0076c2b-128e-4650-a829-89938572715a',
//     content: "i want some electrical engineers",
//     is_final: false
//   },
// ]
// // const agent = new Agent();
// // const output = await agent.replyToChat(chatHistory);

// // console.log('this is output', output)
