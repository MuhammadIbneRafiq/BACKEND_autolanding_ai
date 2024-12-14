import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const connectionString = process.env.POSTGRES_CONNECTION_STRING;
const pool = new pg.Pool({ connectionString });

export { supabaseClient, pool };