import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser, StructuredOutputParser } from "@langchain/core/output_parsers";  
import { ChatGroq } from "@langchain/groq";
import { ChatCohere } from "@langchain/cohere";
import dotenv from "dotenv";


dotenv.config();


class Agent {
  constructor() {
    this._groqModel = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama3-70b-8192",
    });
    this._cohereModel = new ChatCohere({
      apiKey: process.env.COHERE_API_KEY,
      model: "command-r-plus",
    });
  }

  async _formatChatHistory(chatHistory) {
    return chatHistory.map((message) => `${message.sender}: ${message.content}`).join("\n");
  }

  async replyToChat(chatHistory) {
    const prompt = ChatPromptTemplate.fromTemplate(
        `You are an agent for a freelancing platform helping a client find freelancers.
  
        Your task is to create a project for the client by asking him questions about it to better understand what they are looking for. 
        Follow these steps to create the project:
        1. Ask for more information about the project **ONE QUESTION AT A TIME**. Remember: it should feel like a natural conversation between a client and a human agent. You should collect the following data:
          - An overview of the project.
          - A description of the tasks to be accomplished. The more detail the client provides, the better it will be to create a project. You may ask follow-ups if parts of the description are vague or incomplete.
          - An overview of the skills required for the project.
          - Deadlines and deliverables for each task.
          - The pay provided.
        2. Once you collected all the required information, ask the user if they have any additional detail useful to know.
        3. Give the user a short summary of the project (in plain text, with no markdown) and ask them for confirmation.
        4. Lastly, thank the user and tell them we will create a project page for them.
  
        NOTES:
        - Keep your responses concise. **Do not** start the response repeating what the user just said, like: "So you want the website to be written in React" or "So you're looking to create a personal blog website to showcase your history and projects".
        - Do not ask for the same information twice.
        - Do not make up information about the project. Only rely on the information provided by the client.
        - Keep a friendly tone. Greet the user in your first message and thank them in the last.
        - If the client asks for further communications, tell them to contact WhatsApp +31 6 45421019 for details, or LinkedIn: Muhammad Rafiq.
        
        ----------
        Here is the chat history up to now:

        {history}
        
        
        ----------
        {format_instructions}`
    );

    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      content: "Next message to the conversation", 
      is_final: `For a message to be final, two  conditions must be met: 
        1. The agent has all the information needed to create a project page. 
        2. The client confirmed the project summary is correct. 
        
        This field is a boolean. It can be 'true' or 'false'`,
    });

    const chain = prompt.pipe(this._groqModel).pipe(parser);

    return chain.invoke({
      history: await this._formatChatHistory(chatHistory),
      format_instructions: parser.getFormatInstructions(),
    });
  }

  async createProjectfromChat(chatHistory) {
    const prompt = ChatPromptTemplate.fromTemplate(
      `You are an agent for a freelancing platform helping a client find freelancers. The following messages represent a conversation between you and the client, where you asked for details about the project. 
    
      ----------
      Here is the conversation history:

      {history}
      ----------

      Your task is to create a detailed project page so that the freelancers on the platform can understand the requirements and apply for the project. Follow these steps to generate the project page:
      1. Create a first paragraph with a general overview of the project.
      2. Identify all the details provided by the client relevant to complete the project: tasks, skills required, deadlines, deliverables, and so on. Iterate over this point until you are sure you are not omitting any information.
      3. Using the information collected in the previous step, include additional paragraphs explaining the different tasks to be accomplished and the required skills.
      4. Include a section with the deadlines and deliverables for each task.
      5. Include the pay provided by the client.
      

      NOTES:
      - Only provide the project description in your response. Do not start with phrases like: "Here is the project page based on the conversation".
      - Only report information from the conversation history without including additional information.
      - Thhe description must be in plain text, without any markdown formatting or lists.
      
      {format_instructions}`
    );

    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      title: "Project title", 
      description: "A detailed project description based on the conversation history",
    });

    const chain = prompt.pipe(this._cohereModel).pipe(parser);

    return chain.invoke({
      history: await this._formatChatHistory(chatHistory),
      format_instructions: parser.getFormatInstructions(),
    });
  }
}

export { Agent };  