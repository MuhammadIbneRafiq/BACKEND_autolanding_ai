import { supabaseClient } from "./params.js";
  
async function getUserProjects(user) {
    const { data: projectsResponse, error: projectsError } = await supabaseClient
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

    if (projectsError) {
        throw projectsError;
    }

    return projectsResponse
}

async function getProject(projectId) {
    const { data: projectResponse, projectError } = await supabaseClient
    .from("projects")
    .select("*")
    .eq("project_id", projectId)
    .single();

    if (projectError) {
        throw projectError;
    }

    return projectResponse
}

async function createProject(user, chatId, title, description) {
    const { data: projectResponse, error: projectError } = await supabaseClient
    .from("projects")
    .insert([{ user_id: user.id, chat_id: chatId, title: title, description: description }])
    .select();

    if (projectError) {
        throw projectError;
    }

    return projectResponse[0]
}

export { getUserProjects, getProject, createProject };