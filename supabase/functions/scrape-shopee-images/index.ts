import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopeeProduct {
  id: string;
  link: string;
  imageUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { products } = await req.json() as { products: ShopeeProduct[] };

    if (!products || !Array.isArray(products)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Products array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping images for products:', products.map(p => p.id));

    const results: Record<string, string> = {};

    // Scrape each Shopee product page to get the main image
    for (const product of products) {
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
            waitFor: 3000, // Wait for dynamic content to load
          }),
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          // Get the screenshot as the product image
          const screenshot = data.data?.screenshot || data.screenshot;
          if (screenshot) {
            // The screenshot is base64 encoded
            results[product.id] = screenshot.startsWith('data:') 
              ? screenshot 
              : `data:image/png;base64,${screenshot}`;
            console.log(`Got screenshot for ${product.id}`);
          }
        } else {
          console.error(`Failed to scrape ${product.id}:`, data.error);
        }
      } catch (error) {
        console.error(`Error scraping ${product.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, images: results }),
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
