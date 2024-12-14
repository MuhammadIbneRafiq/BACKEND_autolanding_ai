const { createClient } = require("@supabase/supabase-js");
const pg = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const connectionString = process.env.POSTGRES_CONNECTION_STRING;
const pool = new pg.Pool({ connectionString });

module.exports = { supabaseClient, pool };