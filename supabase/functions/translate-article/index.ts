import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Escape special characters to prevent prompt injection
const escapePrompt = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is authenticated and is an admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title_th, excerpt_th, content_th } = await req.json();

    if (!title_th && !content_th) {
      return new Response(
        JSON.stringify({ error: 'No Thai content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input lengths to prevent abuse
    if (title_th && title_th.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Title too long (max 500 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (excerpt_th && excerpt_th.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Excerpt too long (max 2000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (content_th && content_th.length > 100000) {
      return new Response(
        JSON.stringify({ error: 'Content too long (max 100000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Escape user input to prevent prompt injection
    const safeTitle = escapePrompt(title_th || '');
    const safeExcerpt = escapePrompt(excerpt_th || '');
    const safeContent = escapePrompt(content_th || '');

    const prompt = `You are a professional translator. Translate the following Thai text to English accurately and naturally. Maintain the original meaning and tone. Return ONLY a JSON object with the translated fields, no markdown or code blocks.

Input:
- title_th: "${safeTitle}"
- excerpt_th: "${safeExcerpt}"  
- content_th: "${safeContent}"

Return format (JSON only):
{"title_en": "translated title", "excerpt_en": "translated excerpt", "content_en": "translated content"}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get('SITE_URL') || 'https://lovable.dev',
        "X-Title": "Swing Article Translation"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', errorText);
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    // Parse the JSON response - handle potential markdown wrapping
    let translatedContent;
    try {
      // Remove markdown code blocks if present
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      translatedContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Parse error:', parseError, 'Content:', content);
      throw new Error('Failed to parse translation response');
    }

    console.log(`Translation completed for user ${user.id}`);

    return new Response(
      JSON.stringify(translatedContent),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Translation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
