import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  // Check Roles
  const { count: roleCount, error: roleError } = await supabase
    .from("Role")
    .select("*", { count: "exact", head: true });

  if (roleError) console.error("Error checking roles:", roleError.message);
  else console.log(`Roles count: ${roleCount}`);

  // Check Users
  const { count: userCount, error: userError } = await supabase
    .from("Users")
    .select("*", { count: "exact", head: true });

  if (userError)
    console.error("Error checking public Users:", userError.message);
  else console.log(`Public Users count: ${userCount}`);

  // Check Auth Users
  const {
    data: { users },
    error: authError,
  } = await supabase.auth.admin.listUsers();
  if (authError) console.error("Error checking auth users:", authError.message);
  else console.log(`Auth Users count: ${users.length}`);
}

checkData();
