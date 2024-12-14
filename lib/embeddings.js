import { Groq } from 'groq-sdk';
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const hf = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "sentence-transformers/all-MiniLM-L6-v2",
});

export async function generateEmbedding(text) {
  if (!text) {
    throw new Error("Text is required for generating embeddings");
  }
  
  console.log("Generating embedding for text:", text.substring(0, 100) + "...");
  try {
        const embedding = await hf.embedQuery(text);
        return embedding;
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
    }
}

export async function generateEmbedding1(text) {
    console.log('Generating embedding for text:', text);
    try {
      const response = await groq.embeddings.create({
        model: "text-embedding-ada-002",
        input: text
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }



