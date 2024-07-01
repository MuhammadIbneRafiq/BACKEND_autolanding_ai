import { supabaseClient } from "../lib/params.js";
  
const SenderType = {
    USER: 'user',
    ASSISTANT: 'assistant'
};

class Messages {
    constructor(user, chatId) {
        this.client = supabaseClient.from("messages");
        this.user = user;
        this.chatId = chatId;
    }

    async getMessages() {
        const { data, error } = await this.client
        .select("*")
        .eq("user_id", this.user.id)
        .eq("chat_id", this.chatId)
        .order("created_at")
    
        if (error) {
            throw error;
        }
    
        return data
    }
    
    async newMessage(content, sender) {
        const { data, error } = await this.client
        .insert([{ content: content, sender: sender, chat_id: this.chatId, user_id: this.user.id}])
        .select();
    
        if (error) {
            throw error;
        }
    
        return data[0]
    }
}

export { SenderType, Messages };