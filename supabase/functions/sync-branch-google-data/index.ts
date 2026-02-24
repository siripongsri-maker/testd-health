import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the user is admin
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get branch_id from body
    const { branch_id } = await req.json();
    if (!branch_id) {
      return new Response(
        JSON.stringify({ error: "branch_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch branch to get google_place_id
    const { data: branch, error: branchError } = await adminClient
      .from("booking_branches")
      .select("google_place_id")
      .eq("id", branch_id)
      .single();

    if (branchError || !branch) {
      return new Response(
        JSON.stringify({ error: "Branch not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!branch.google_place_id) {
      return new Response(
        JSON.stringify({ error: "No Google Place ID set for this branch" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call Google Places API (New)
    const placeId = branch.google_place_id;
    const fieldsUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=rating,userRatingCount,photos&key=${googleApiKey}`;

    const placeRes = await fetch(fieldsUrl, {
      headers: { "X-Goog-FieldMask": "rating,userRatingCount,photos" },
    });

    if (!placeRes.ok) {
      const errText = await placeRes.text();
      console.error("Google Places API error:", errText);
      return new Response(
        JSON.stringify({ error: "Google Places API error", details: errText }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const placeData = await placeRes.json();
    const rating = placeData.rating || null;
    const reviewCount = placeData.userRatingCount || null;

    // Get first photo URL if available
    let photoUrl: string | null = null;
    if (placeData.photos && placeData.photos.length > 0) {
      const photoName = placeData.photos[0].name;
      const photoMediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${googleApiKey}`;
      // The media endpoint redirects to the actual image URL
      const photoRes = await fetch(photoMediaUrl, { redirect: "follow" });
      if (photoRes.ok) {
        photoUrl = photoRes.url;
      }
    }

    // Update branch
    const { error: updateError } = await adminClient
      .from("booking_branches")
      .update({
        google_rating: rating,
        google_review_count: reviewCount,
        google_photo_url: photoUrl,
      })
      .eq("id", branch_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update branch", details: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        rating,
        review_count: reviewCount,
        photo_url: photoUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
