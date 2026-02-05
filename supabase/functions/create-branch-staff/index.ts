 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 Deno.serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const supabaseAdmin = createClient(
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
       { auth: { autoRefreshToken: false, persistSession: false } }
     );
 
     // Verify the caller is an admin
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       return new Response(JSON.stringify({ error: "Missing authorization" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const token = authHeader.replace("Bearer ", "");
     const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
     
     if (authError || !caller) {
       return new Response(JSON.stringify({ error: "Invalid token" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Check if caller is admin
     const { data: callerRole } = await supabaseAdmin
       .from("user_roles")
       .select("role")
       .eq("user_id", caller.id)
       .eq("role", "admin")
       .single();
 
     if (!callerRole) {
       return new Response(JSON.stringify({ error: "Admin access required" }), {
         status: 403,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const { username, password, branch, displayName } = await req.json();
 
     if (!username || !password || !branch) {
       return new Response(
         JSON.stringify({ error: "Missing required fields: username, password, branch" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     if (!["silom", "pattaya"].includes(branch)) {
       return new Response(
         JSON.stringify({ error: "Invalid branch. Must be 'silom' or 'pattaya'" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Create the user with username@swingth.local pattern
     const email = `${username}@swingth.local`;
     
     const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
       email,
       password,
       email_confirm: true,
       user_metadata: { display_name: displayName || username },
     });
 
     if (createError) {
       console.error("Error creating user:", createError);
       return new Response(
         JSON.stringify({ error: createError.message }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const userId = newUser.user.id;
 
     // Add moderator role (branch staff role)
     const { error: roleError } = await supabaseAdmin
       .from("user_roles")
       .insert({ user_id: userId, role: "moderator" });
 
     if (roleError) {
       console.error("Error assigning role:", roleError);
     }
 
     // Assign to branch
     const { error: branchError } = await supabaseAdmin
       .from("staff_branch_assignments")
       .insert({ user_id: userId, branch });
 
     if (branchError) {
       console.error("Error assigning branch:", branchError);
     }
 
     // Update profile display name
     await supabaseAdmin
       .from("profiles")
       .update({ display_name: displayName || `${branch.charAt(0).toUpperCase() + branch.slice(1)} Staff` })
       .eq("id", userId);
 
     return new Response(
       JSON.stringify({
         success: true,
         user: {
           id: userId,
           username,
           email,
           branch,
           displayName: displayName || username,
         },
       }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error) {
     console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
     return new Response(
      JSON.stringify({ error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });