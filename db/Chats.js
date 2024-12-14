import { supabaseClient } from "./params.js";

class Chats {
    constructor(user) {
        this.client = supabaseClient.from("chats");
        this.user = user;
    }

    async getChats() {
        const { data, error } = await this.client
        .select("*")
        .eq("user_id", this.user.id)
        .order("created_at", { ascending: false })
    
        if (error) {
            throw chatsError;
        }
    
        return data
    }
    
    async getChat(chatId) {
        const { data: chatResponse, chatError } = await this.client
        .select("*")
        .eq("user_id", this.user.id)
        .eq("chat_id", chatId)
        .single();
    
        if (chatError) {
            throw chatError;
        }
    
        return chatResponse
    }
    
    async newChat(title) {
        const { data: chatResponse, error: chatError } = await this.client
        .insert([{ title: title, user_id: this.user.id }])
        .select();
    
        if (chatError) {
            throw chatError;
        }
    
        return chatResponse[0]
    }
}

export { Chats };