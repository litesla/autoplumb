import { createClient } from '@supabase/supabase-js';
import {
  getCuratedFallback,
  isWatermarkedOrBadPhoto,
} from '../src/services/productImageService';

const supabaseUrl = process.env.SUPABASE_URL || 'https://qllpxployhzizlicxbss.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbHB4cGxveWh6aXpsaWN4YnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDYxNTIsImV4cCI6MjA5NDE4MjE1Mn0.DvlD5gCVPaTdg64ibGcIucsCjLJiIUk4PMNFxSqECiM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('=== Starting Complete Auto-Fix Script across all 8120 products ===');

  const { count, error: countErr } = await supabase.from('products').select('*', { count: 'exact', head: true });
  if (countErr) {
    console.error('Count error:', countErr);
    return;
  }
  console.log(`Total products in catalog: ${count}`);

  const PAGE_SIZE = 500;
  let offset = 0;
  let totalFixed = 0;
  let totalApproved = 0;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, brand, type, image_url, specs')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error || !data || data.length === 0) {
      break;
    }

    const updates: Array<{ id: string; newUrl: string }> = [];
    const approveOnly: Array<string> = [];

    for (const p of data) {
      const currentUrl = (p.image_url || '').trim();
      const isBad = isWatermarkedOrBadPhoto(currentUrl, p.name);
      const isYellowCap = currentUrl.includes('57_09dc810d-483d-4807-91ca-8cd66024c0f4');
      const isCarPicture = currentUrl.includes('sn-gazeta.ru') || currentUrl.includes('repairsadvisor.com') || currentUrl.includes('sn-gazeta');

      if (isBad || isYellowCap || isCarPicture || !currentUrl) {
        const cleanUrl = getCuratedFallback(p.name, p.type || 'auto', p.category || '', p.id);
        updates.push({ id: p.id, newUrl: cleanUrl });
      } else {
        const specsStr = typeof p.specs === 'string' ? p.specs : JSON.stringify(p.specs || {});
        if (!specsStr.includes('"photoApproved":true')) {
          approveOnly.push(p.id);
        }
      }
    }

    // Apply photo replacements + approve
    if (updates.length > 0) {
      const CHUNK = 25;
      for (let i = 0; i < updates.length; i += CHUNK) {
        const chunk = updates.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map(async (item) => {
            const { error: upErr } = await supabase
              .from('products')
              .update({
                image_url: item.newUrl,
                specs: JSON.stringify({
                  photoApproved: true,
                  photoApprovedAt: new Date().toISOString(),
                }),
              })
              .eq('id', item.id);
            if (!upErr) totalFixed++;
          })
        );
      }
    }

    // Apply approveOnly
    if (approveOnly.length > 0) {
      const CHUNK = 50;
      for (let i = 0; i < approveOnly.length; i += CHUNK) {
        const chunk = approveOnly.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map(async (id) => {
            const { error: upErr } = await supabase
              .from('products')
              .update({
                specs: JSON.stringify({
                  photoApproved: true,
                  photoApprovedAt: new Date().toISOString(),
                }),
              })
              .eq('id', id);
            if (!upErr) totalApproved++;
          })
        );
      }
    }

    console.log(`Processed batch [${offset} - ${offset + data.length}]. Fixed: ${totalFixed}, Approved: ${totalApproved}`);
    offset += data.length;
    if (data.length < PAGE_SIZE) {
      break;
    }
  }

  console.log(`=== Done! Total Fixed: ${totalFixed}, Total Approved: ${totalApproved} ===`);
}

main().catch(console.error);
