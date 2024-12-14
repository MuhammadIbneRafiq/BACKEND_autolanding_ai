import { supabaseClient } from "../db/params.js";

class Projects {
    constructor(user) {
        this.client = supabaseClient.from("projects");
        this.user = user;
    }

    async getProjects() {
        const { data, error } = await this.client
        .select("*")
        .eq("user_id", this.user.id)
        .order("created_at", { ascending: false })
    
        if (error) {
            throw error;
        }
    
        return data
    }

    async getProject(projectId) {
        const { data, error } = await this.client
        .select("*")
        .eq("user_id", this.user.id)
        .eq("project_id", projectId)
        .single();
        
        if (error) {
            throw error;
        }
        
        return data
    }

    async newProject(chatId, title, description) {
        const { data, error } = await this.client
        .insert([{ user_id: this.user.id, chat_id: chatId, title: title, description: description }])
        .select();
        
        if (error) {
            throw error;
        }
        
        return data[0]
    }
}

export { Projects };