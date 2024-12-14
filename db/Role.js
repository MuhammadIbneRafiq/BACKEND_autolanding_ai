import { supabaseClient } from "./params.js";

class Role {
    constructor() {
        this.client = supabaseClient.from("buyer_seller_table");
    }

    async newRole(email, role) {
        const { error: roleError } = await this.client
        .insert([{ role: role, email: email }])
        .select();
    
        if (roleError) {
            throw chatError;
        }
    }
    async getRole(email){
        const { data: roleResponse, roleError } = await this.client
        .select("role")
        .eq("email", email)
        .single()
    
        if (roleError) {
            throw roleError;
        }
        return roleResponse
    }
}

export { Role };