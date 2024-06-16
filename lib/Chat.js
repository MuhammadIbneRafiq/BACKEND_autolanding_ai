import { supabaseClient } from "./supabase.js";
  

async function getAllChats() {
    const { data: chatsResponse, error: chatsError } = await supabaseClient
    .from("chats")
    .select("*");

    if (chatsError) {
        throw chatsError;
    }

    return chatsResponse
}

async function getChat(chatId) {
    const { data: chatResponse, chatError } = await supabaseClient
    .from("chats")
    .select("*")
    .eq("chat_id", chatId)
    .single();

    if (chatError) {
        throw chatError;
    }

    return chatResponse
}

async function createChat(user, title) {
    const { data: chatResponse, error: chatError } = await supabaseClient
    .from("chats")
    .insert([{ title: title, user_id: user.id }])
    .select();

    if (chatError) {
        throw chatError;
    }

    return chatResponse[0]
}

export { getAllChats, getChat, createChat };