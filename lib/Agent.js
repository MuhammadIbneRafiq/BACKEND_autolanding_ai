import { chatAgentPrompt, projectCreationPrompt } from "./prompts.js";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
// import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import dotenv from "dotenv";
// import { Pinecone } from '@pinecone-database/pinecone';
// import { PineconeClient } from '@pinecone-database/pinecone';
// import { HuggingFaceEmbeddings } from '@huggingface/inference';
// import { HfInference } from "@huggingface/inference";
// import pkg from '@pinecone-database/pinecone';
// const { PineconeClient } = pkg;

dotenv.config();

// Initialize Groq LLM
const groqClient = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama3-70b-8192",
});

// // Initialize Pinecone client
// const pinecone = await PineconeClient({
//   apiKey: process.env.PINECONE_API_KEY,
//   environment: process.env.PINECONE_ENVIRONMENT,
// });

// // Initialize HuggingFace Embeddings
// const hf = new HfInference({ model: 'sentence-transformers/all-MiniLM-L6-v2' });

// // Function to load HTML file into Pinecone
// async function loadHTMLIntoPinecone(filePath) {
//   const htmlContent = await fs.promises.readFile(filePath, 'utf-8');
//   const documents = textSplitter.splitText(htmlContent);

//   const vectors = await Promise.all(documents.map(async (doc) => {
//     const embedding = await hf.embedText(doc);
//     return { id: doc.id, values: embedding, metadata: { text: doc } };
//   }));

//   await pinecone.indexes(process.env.PINECONE_INDEX_NAME).upsert(vectors);
//   console.log('HTML content loaded into Pinecone.');
// }

// // Function to retrieve information from Pinecone
// async function retrieveFromPinecone(query) {
//   const queryEmbedding = await embeddings.embedText(query);
//   const results = await pinecone.indexes(process.env.PINECONE_INDEX_NAME).query({
//     vector: queryEmbedding,
//     topK: 5,
//   });

//   const relevantDocs = results.matches.map((match) => match.metadata.text);
//   return relevantDocs;
// }

// // Function to fetch URL contents
// async function fetchUrlContent(context) {
//   const urls = context.map((doc) => doc.metadata.url);
//   const ids = urls.map((url) => url.split('=').pop());
//   const contents = await Promise.all(ids.map(async (id) => {
//     const content = await fetchWikipediaPage(id);
//     return content.slice(0, 32000);
//   }));
//   return contents;
// }

// // RAG prompt template
// const systemPrompt = `
// You are an AI assistant specializing in freelance recruitment and job posting analysis. Your task is to help users find relevant job postings, particularly for UI/UX designers, freelance projects, and opportunities with agencies or small companies. When providing information about job postings, focus on the following details:

// 1. Profile link of the person or company posting (if available)
// 2. Brief description of the job post
// 3. Link to the full job post
// 4. Name of the person or company posting (if available)
// 5. Payment amount or rate (if specified)

// Always prioritize active hiring posts and avoid confusing them with general hiring-related discussions. Provide concise, accurate information and be ready to answer follow-up questions about the job market, freelancing trends, and specific job opportunities.

// When asked to find job postings, aim to provide at least 3 relevant results at a time, formatted in a clear and easy-to-read manner. If the user asks for more results, provide the next set of 3 job postings that haven't been mentioned before.

// Remember to maintain context throughout the conversation and refer back to previously discussed information when relevant.
// `;

// async function generateResponse(query, docs, chatHistory) {
//   const messages = [
//     { role: 'system', content: systemPrompt },
//     { role: 'user', content: query },
//     ...chatHistory.map((message) => ({ role: message.role, content: message.content })),
//     { role: 'system', content: `Context:\n${docs.join('\n---\n')}` },
//   ];

//   const response = await groqClient.completions.create({
//     messages,
//   });

//   return response.choices[0].message.content;
// }

// // Function to handle user query
// async function handleQuery(query) {
//   const relevantDocs = await retrieveFromPinecone(query);
//   const result = await generateResponse(query, relevantDocs, []);
//   console.log('AI:', result);
// }

// export {
//   loadHTMLIntoPinecone,
//   handleQuery,
// };

// const filePath = './ui_ux_designer_expanded.html';
// await loadHTMLIntoPinecone(filePath);

// // Handle a user query
// const userQuery = 'Find UI/UX design freelance jobs';
// const res = await handleQuery(userQuery);
// console.log('this is res', res)

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

  async replyToChat(chatHistory) {
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      content: "Next message to the conversation",
      is_final: `For a message to be final, the client confirmed that the project summary is correct. In case your current message is the project summary, set this field to 'false'. 
        
        This field is a boolean. It can be 'true' or 'false'`,
      search_needed:
        "If there is a need to search for a project set this field to 'true', this field must be boolean only . else if it is not needed set this field to 'false'",
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
