import express from "express";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import * as xlsx from "xlsx";

export async function createExpressApp() {
  const app = express();

  // Supabase client initialization
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  
  // Safe URL to prevent crash
  const safeUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co';
  const supabase = createClient(safeUrl, supabaseKey || "placeholder");

  app.use(express.json());

  // API Routes
  app.post("/api/external/products", async (req, res) => {
    const apiKey = req.headers["x-api-key"];
    const masterKey = process.env.EXTERNAL_API_KEY;

    if (!masterKey || apiKey !== masterKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { name, price, category, description, image, stock, type, brand, specs, article } = req.body;

      if (!name || !price || !type) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { data, error } = await supabase.from("products").insert({
        name,
        price: Number(price),
        category: category || "Загальне",
        description: description || "",
        image_url: image || "",
        stock: Number(stock || 0),
        type: type === "plumbing" ? "plumbing" : "auto",
        brand: brand || "",
        article: article || ""
      }).select();

      if (error) throw error;
      res.status(201).json({ id: data[0].id });
    } catch (error) {
      res.status(500).json({ error: "Internal Error" });
    }
  });

  app.post("/api/sync/utr", async (req, res) => {
    const utrToken = process.env.UTR_API_KEY;
    if (!utrToken) return res.status(500).json({ error: "UTR API Key not configured" });

    const headers = {
      "Authorization": `Bearer ${utrToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    };

    try {
      const exportReq = await axios.post("https://order24-api.utr.ua/pricelists/export-request", {
        categoriesId: [], format: "xlsx", inStock: true, modelsId: [], showScancode: false, utrArticle: true, visibleBrandsId: []
      }, { headers, timeout: 30000 });

      const priceListId = exportReq.data.id;
      let status = "in queue";
      let attempts = 0;
      while (status !== "complete" && attempts < 24) {
        await new Promise(r => setTimeout(r, 5000));
        const statusCheck = await axios.get(`https://order24-api.utr.ua/pricelists/${priceListId}`, { headers, timeout: 10000 });
        status = (statusCheck.data.data || statusCheck.data.status || statusCheck.data.state || "").toString().toLowerCase();
        if (["complete", "ready", "finished", "success"].includes(status)) { status = "complete"; break; }
        attempts++;
      }

      if (status !== "complete") return res.status(202).json({ message: "Timed out", id: priceListId });

      const listResponse = await axios.get("https://order24-api.utr.ua/pricelists", { headers, timeout: 20000 });
      const myPriceList = listResponse.data.find((p: any) => p.id === priceListId);
      if (!myPriceList?.token) throw new Error("No token");

      const downloadResponse = await axios.get(`https://order24-api.utr.ua/pricelists/export/${myPriceList.token}`, {
        headers, responseType: 'arraybuffer', timeout: 60000
      });

      const workbook = xlsx.read(downloadResponse.data, { type: 'buffer' });
      const ws = workbook.Sheets[workbook.SheetNames[0]];
      
      const rawData = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
      let headerRowIndex = 0;
      let maxColumnsWithText = 0;
      for (let i = 0; i < Math.min(rawData.length, 30); i++) {
        const row = rawData[i];
        const textColumnCount = row.filter(cell => cell && cell.toString().trim().length > 1).length;
        const rowText = row.join(' ').toLowerCase();
        const hasNameHint = rowText.includes('назва') || rowText.includes('товар') || rowText.includes('наименование') || rowText.includes('name');
        
        if (textColumnCount >= 3 && (textColumnCount > maxColumnsWithText || hasNameHint)) {
          maxColumnsWithText = textColumnCount;
          headerRowIndex = i;
          if (hasNameHint) break;
        }
      }

      const excelData = xlsx.utils.sheet_to_json(ws, { range: headerRowIndex, defval: "" }) as any[];
      
      const productsToUpsert: any[] = [];

      excelData.forEach((item: any) => {
        const getVal = (keys: string[]) => {
          const k = Object.keys(item).find(key => keys.some(t => {
            const normalizedK = key.toString().toLowerCase().trim();
            const normalizedT = t.toLowerCase().trim();
            return normalizedK === normalizedT || normalizedK.includes(normalizedT);
          }));
          return k ? item[k] : undefined;
        };

        const nameRaw = getVal(["Name", "Назва", "Наименование", "Title", "Товар"]);
        const name = nameRaw ? nameRaw.toString().trim() : "";
        
        const priceRaw = getVal(["Price", "Ціна", "Цена", "Cost", "Price (UAH)"]);
        let price = 0;
        if (typeof priceRaw === 'number') price = priceRaw;
        else if (typeof priceRaw === 'string') {
          const sanitized = priceRaw.replace(/[₴$€\s]/g, '').replace(',', '.');
          price = parseFloat(sanitized.replace(/[^0-9.]/g, ''));
        }

        if (!name || isNaN(price) || price <= 0) return;

        const articleRaw = getVal(["Article", "Артикул", "Код", "Sku", "Part Number"]);
        const article = articleRaw ? articleRaw.toString().trim() : "";
        const brand = getVal(["Brand", "Бренд", "Виробник", "Производитель"]) || "";
        const category = getVal(["Category", "Категорія", "Група", "Group"]) || "Запчастини";
        const stock = Number(getVal(["Quantity", "Кількість", "Залишок", "Stock"]) || 0);

        const isPlumbing = category.toLowerCase().includes('сантех') || 
                          category.toLowerCase().includes('plumb') ||
                          name.toLowerCase().includes('труба') || 
                          name.toLowerCase().includes('кран') ||
                          name.toLowerCase().includes('змішувач');

        productsToUpsert.push({
          name,
          price,
          brand,
          article,
          stock,
          category,
          type: isPlumbing ? "plumbing" : "auto",
          image_url: isPlumbing 
            ? "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800"
            : "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800",
          description: `Артикул: ${article}. Виробник: ${brand}`,
          updated_at: new Date().toISOString()
        });
      });

      // Upsert in batches to Supabase
      let totalProcessed = 0;
      const batchSize = 100;
      for (let i = 0; i < productsToUpsert.length; i += batchSize) {
        const chunk = productsToUpsert.slice(i, i + batchSize);
        // Using upsert with onConflict if we had a unique identifier (like utr_id or article)
        // For now, let's assume article is unique per brand or just insert
        const { error } = await supabase.from("products").upsert(chunk, { onConflict: 'article, brand' });
        if (error) {
          console.error("Batch error:", error);
          // If upsert fails due to missing constraint, fallback to insert
          await supabase.from("products").insert(chunk);
        }
        totalProcessed += chunk.length;
      }

      console.log(`Sync completed. Processed ${totalProcessed} products.`);
      res.json({ 
        message: `Синхронізація завершена успішно! Оброблено ${totalProcessed} товарів.`, 
        count: totalProcessed 
      });
    } catch (error: any) {
      console.error("Sync failed:", error);
      res.status(500).json({ error: "Sync failed", details: error.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
