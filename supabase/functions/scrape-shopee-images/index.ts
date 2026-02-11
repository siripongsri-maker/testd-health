import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopeeProduct {
  id: string;
  link: string;
}

interface CacheEntry {
  product_id: string;
  image_url: string;
  expires_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate authorization
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let user = null;
    let isAdmin = false;
    
    if (authHeader && token) {
      const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user: authUser }, error: authError } = await userSupabase.auth.getUser(token);
      if (!authError && authUser) {
        user = authUser;
        const { data: adminCheck } = await userSupabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        isAdmin = !!adminCheck;
      }
    }

    // Note: admin check moved to scraping section below

    // Use service role for storage operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { products, forceRefresh = false } = await req.json() as { 
      products: ShopeeProduct[]; 
      forceRefresh?: boolean;
    };

    if (!products || !Array.isArray(products)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Products array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input limits
    if (products.length > 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum 10 products per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Shopee URLs
    for (const product of products) {
      if (!product.link.startsWith('https://shopee.co.th/')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid Shopee URL: ' + product.link }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const productIds = products.map(p => p.id);
    const results: Record<string, string> = {};
    const productsToScrape: ShopeeProduct[] = [];

    // Check cache first (unless forceRefresh)
    if (!forceRefresh) {
      const { data: cachedImages } = await supabase
        .from('product_image_cache')
        .select('product_id, image_url, expires_at')
        .in('product_id', productIds);

      if (cachedImages) {
        const now = new Date();
        for (const cached of cachedImages as CacheEntry[]) {
          const expiresAt = new Date(cached.expires_at);
          if (expiresAt > now) {
            // Cache is still valid
            results[cached.product_id] = cached.image_url;
          }
        }
      }
    }

    // Find products that need scraping
    for (const product of products) {
      if (!results[product.id]) {
        productsToScrape.push(product);
      }
    }

    console.log(`User ${user?.id || 'anon'} - Cache hits: ${Object.keys(results).length}, Need to scrape: ${productsToScrape.length}`);

    // If all products are cached, return early
    if (productsToScrape.length === 0) {
      return new Response(
        JSON.stringify({ success: true, images: results, fromCache: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only admins can trigger actual scraping
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: true, images: results, error: 'Cached images only for non-admin users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Scrape missing products
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: true, images: results, error: 'Firecrawl not configured for new images' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const product of productsToScrape) {
      try {
        console.log(`Scraping ${product.id}: ${product.link}`);
        
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: product.link,
            formats: ['screenshot'],
            waitFor: 3000,
          }),
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          const screenshot = data.data?.screenshot || data.screenshot;
          if (screenshot) {
            // Convert base64 to blob and upload to storage
            const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            
            const fileName = `${product.id}-${Date.now()}.png`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(fileName, imageBytes, {
                contentType: 'image/png',
                upsert: true,
              });

            if (uploadError) {
              console.error(`Failed to upload image for ${product.id}:`, uploadError);
              continue;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from('product-images')
              .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;
            results[product.id] = publicUrl;

            // Update cache (upsert)
            const { error: cacheError } = await supabase
              .from('product_image_cache')
              .upsert({
                product_id: product.id,
                image_url: publicUrl,
                shopee_link: product.link,
                cached_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
              }, { onConflict: 'product_id' });

            if (cacheError) {
              console.error(`Failed to cache image URL for ${product.id}:`, cacheError);
            }

            console.log(`Cached image for ${product.id}: ${publicUrl}`);
          }
        } else {
          console.error(`Failed to scrape ${product.id}:`, data.error);
        }
      } catch (error) {
        console.error(`Error scraping ${product.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, images: results, fromCache: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-shopee-images:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
