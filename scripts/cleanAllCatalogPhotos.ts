import { createClient } from '@supabase/supabase-js';
import {
  isWatermarkedOrBadPhoto,
  getCuratedFallback,
} from '../src/services/productImageService';

const supabaseUrl = process.env.SUPABASE_URL || 'https://qllpxployhzizlicxbss.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbHB4cGxveWh6aXpsaWN4YnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDYxNTIsImV4cCI6MjA5NDE4MjE1Mn0.DvlD5gCVPaTdg64ibGcIucsCjLJiIUk4PMNFxSqECiM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('--- Starting Catalog Photo Sanitization ---');
  
  const { count, error: countErr } = await supabase.from('products').select('*', { count: 'exact', head: true });
  if (countErr) {
    console.error('Count error:', countErr);
    return;
  }
  console.log(`Total products in catalog: ${count}`);

  const PAGE_SIZE = 500;
  let offset = 0;
  let totalFixed = 0;
  let totalChecked = 0;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, brand, type, image_url, specs')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Fetch error at offset', offset, error);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    const updates: Array<{ id: string; name: string; oldUrl: string; newUrl: string }> = [];

    for (const p of data) {
      totalChecked++;
      const currentUrl = (p.image_url || '').trim();
      const specsStr = typeof p.specs === 'string' ? p.specs : JSON.stringify(p.specs || {});
      const isApproved = specsStr.includes('"photoApproved":true');

      if (!isApproved && isWatermarkedOrBadPhoto(currentUrl, p.name)) {
        const cleanUrl = getCuratedFallback(p.name, p.type || 'auto', p.category || '', p.id);
        updates.push({
          id: p.id,
          name: p.name,
          oldUrl: currentUrl,
          newUrl: cleanUrl,
        });
      }
    }

    // Apply updates in parallel chunks of 25
    if (updates.length > 0) {
      console.log(`Found ${updates.length} bad/watermarked photos in batch [${offset} - ${offset + data.length}]. Updating...`);
      const CHUNK_SIZE = 25;
      for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const chunk = updates.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async (item) => {
            const { error: upErr } = await supabase
              .from('products')
              .update({ image_url: item.newUrl })
              .eq('id', item.id);

            if (upErr) {
              console.error(`Failed to update ${item.id}:`, upErr.message);
            } else {
              totalFixed++;
            }
          })
        );
      }
    }

    offset += data.length;
    if (data.length < PAGE_SIZE) {
      break;
    }
  }

  console.log('--- Sanitization Completed ---');
  console.log(`Total products checked: ${totalChecked}`);
  console.log(`Total products cleaned & updated: ${totalFixed}`);
}

main().catch(console.error);
