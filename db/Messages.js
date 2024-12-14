import { supabaseClient } from "../db/params.js";

const SenderType = {
  USER: "user",
  ASSISTANT: "assistant",
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
      .order("created_at");

    if (error) {
      throw error;
    }

    return data;
  }

  async newMessage(content, sender, isFinal = false, search_needed = false) {
    const { data, error } = await this.client
      .insert([
        {
          content: content,
          sender: sender,
          chat_id: this.chatId,
          user_id: this.user.id,
          is_final: isFinal,
          search_needed: search_needed,
        },
      ])
      .select();

    if (error) {
      throw error;
    }

    return data[0];
  }
}

export { SenderType, Messages };
