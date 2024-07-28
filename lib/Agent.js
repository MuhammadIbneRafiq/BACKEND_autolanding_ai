import { chatAgentPrompt, projectCreationPrompt } from "./prompts.js";
import { StructuredOutputParser } from "@langchain/core/output_parsers";  
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";


dotenv.config();


class Agent {
  constructor() {
    this._model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
    })
  }

  async _formatChatHistory(chatHistory) {
    return chatHistory.map((message) => `${message.sender}: ${message.content}`).join("\n");
  }

  async replyToChat(chatHistory) {
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      content: "Next message to the conversation", 
      is_final: `For a message to be final, the client confirmed that the project summary is correct. In case your current message is the project summary, set this field to 'false'. 
        
        This field is a boolean. It can be 'true' or 'false'`,
    });

    const chain = chatAgentPrompt.pipe(this._model).pipe(parser);

    return chain.invoke({
      history: await this._formatChatHistory(chatHistory),
      format_instructions: parser.getFormatInstructions(),
    });
  }

  async createProjectfromChat(chatHistory) {
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      title: "Project title", 
      description: "A detailed project description based on the conversation history",
    });

    const chain = projectCreationPrompt.pipe(this._model).pipe(parser);

    return chain.invoke({
      history: await this._formatChatHistory(chatHistory),
      format_instructions: parser.getFormatInstructions(),
    });
  }
}

export { Agent };  