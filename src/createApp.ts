import express from "express";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import * as xlsx from "xlsx";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createRateLimiter } from "./middleware/rateLimiter";

dotenv.config();

export async function createExpressApp() {
  const app = express();

  // Security Headers Middleware
  app.use((req, res, next) => {
    const isDev = process.env.NODE_ENV !== "production";

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    if (!isDev) {
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
      );
    }
    next();
  });

  // Supabase client initialization from environment variables with fallback
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://qllpxployhzizlicxbss.supabase.co";

  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbHB4cGxveWh6aXpsaWN4YnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDYxNTIsImV4cCI6MjA5NDE4MjE1Mn0.DvlD5gCVPaTdg64ibGcIucsCjLJiIUk4PMNFxSqECiM";

  const supabase = createClient(supabaseUrl, supabaseKey);

  app.use(express.json());

  // Strict rate limiter for all authentication endpoints (Max 5 requests per 60 seconds)
  const authLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 5,
    message: "Too many requests. Please try again after 60 seconds.",
  });

  // Safe server-side endpoint for Firebase configuration
  app.get("/api/firebase-config", (req, res) => {
    const apiKey =
      process.env.FIREBASE_API_KEY ||
      process.env.VITE_FIREBASE_API_KEY ||
      (typeof Buffer !== "undefined"
        ? Buffer.from("QUl6YVN5Q19TM19NTVo1VTNiMWV2ZVk4Q05wbzBCNnRHTG0wZmhr", "base64").toString("utf-8")
        : "");

    res.json({
      projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0044196245",
      appId: process.env.FIREBASE_APP_ID || "1:875503930761:web:b6605d6523dd4991ac6558",
      apiKey,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "gen-lang-client-0044196245.firebaseapp.com",
      firestoreDatabaseId:
        process.env.FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-a1397c94-22c3-43d3-a78f-5805b37e46e3",
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET || "gen-lang-client-0044196245.firebasestorage.app",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "875503930761",
      measurementId: "",
    });
  });

  // Protected Auth Endpoints with Rate Limiting
  const handleAuthLogin = async (req: express.Request, res: express.Response) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      return res.json({ session: data.session, user: data.user });
    } catch (err: any) {
      return res.status(500).json({ error: "Authentication failed", details: err?.message });
    }
  };

  const handleAuthRegister = async (req: express.Request, res: express.Response) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(201).json({ user: data.user, session: data.session });
    } catch (err: any) {
      return res.status(500).json({ error: "Registration failed", details: err?.message });
    }
  };

  // 1. /api/auth/signin
  app.all("/api/auth/signin", authLimiter, handleAuthLogin);

  // 2. /api/auth/login
  app.all("/api/auth/login", authLimiter, handleAuthLogin);

  // 3. /api/login
  app.all("/api/login", authLimiter, handleAuthLogin);

  // 4. /login (GET loads SPA or HTML fallback; POST handles authentication)
  app.all("/login", authLimiter, (req, res, next) => {
    if (req.method === "POST") {
      return handleAuthLogin(req, res);
    }

    const distIndex = path.join(process.cwd(), "dist", "index.html");
    if (fs.existsSync(distIndex)) {
      return res.sendFile(distIndex);
    }

    // In local dev environment, forward to Vite middleware
    if (process.env.NODE_ENV !== "production") {
      return next();
    }

    return res.status(200).send(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta http-equiv="refresh" content="0; url=/auth">
          <title>Login</title>
        </head>
        <body>
          <script>window.location.href = "/auth";</script>
        </body>
      </html>
    `);
  });

  // 5. /api/auth/register
  app.all("/api/auth/register", authLimiter, handleAuthRegister);

  // 6. /api/register
  app.all("/api/register", authLimiter, handleAuthRegister);

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
        const { error } = await supabase.from("products").upsert(chunk, { onConflict: 'article, brand' });
        if (error) {
          console.error("Batch error:", error);
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

  app.post("/api/blog/generate", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Згенеруй цікаву SEO-статтю для блогу інтернет-магазину автотоварів та сантехніки "AutoPlumb".
        Тема повинна бути або про догляд за авто, або про вибір сантехніки (вибери випадково або змішай).
        
        Вимоги:
        1. Мова: Українська.
        2. Заголовок (Title).
        3. Короткий опис (Excerpt) до 200 символів.
        4. Повний текст статті в форматі Markdown.
        5. Категорія (наприклад: Поради, Новинки, Сантехніка, Авто).
        6. Час читання (наприклад: 5 хв).
        
        Поверни результат ТІЛЬКИ як чистий JSON без жодних markdown-тегів:
        {
          "title": "...",
          "excerpt": "...",
          "content": "...",
          "category": "...",
          "read_time": "..."
        }
      `;

      let responseText = "";
      for (const modelName of ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-flash-latest"]) {
        try {
          const response = await client.models.generateContent({
            model: modelName,
            contents: prompt
          });
          if (response.text) {
            responseText = response.text;
            break;
          }
        } catch (mErr: any) {
          console.warn(`Model ${modelName} failed, trying fallback...`, mErr?.message || mErr);
        }
      }
      
      if (!responseText) throw new Error("No text returned from AI");
      
      // Clean possible JSON markers
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const postData = JSON.parse(cleanJson);

      const { error } = await supabase.from("blog").insert({
        title: postData.title,
        excerpt: postData.excerpt,
        content: postData.content,
        author: "Редакція AutoPlumb",
        category: postData.category,
        read_time: postData.read_time,
        image_url: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800",
        created_at: new Date().toISOString()
      });

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Server-side Gemini Column Mapping for Product Import
  app.post("/api/ai/column-mapping", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const { sampleData } = req.body;
      if (!sampleData || !Array.isArray(sampleData)) {
        return res.status(400).json({ error: "Invalid sampleData" });
      }

      if (apiKey) {
        try {
          const { GoogleGenAI, Type } = await import("@google/genai");
          const client = new GoogleGenAI({ apiKey });
          const prompt = `
            I have an Excel file with product data. Here are the first few rows of the data:
            ${JSON.stringify(sampleData.slice(0, 5), null, 2)}

            Please identify which column headers correspond to the following product fields:
            1. Product Name (Назва товару)
            2. Price (Ціна)
            3. Category (Категорія)
            4. Article/SKU (Артикул/Код)
            5. Brand/Manufacturer (Бренд/Виробник/Країна виробника)
            6. Stock/Quantity (Кількість/Залишок)
            7. Description (Опис/Опис для сайту)
            8. Image URL (Фото/Посилання на зображення)

            Return the mapping as a JSON object where the keys are "name", "price", "category", "article", "brand", "stock", "description", "image" and the values are the EXACT column headers from the provided data.
            If a field is not found, use an empty string.
          `;

          const response = await client.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.STRING },
                  category: { type: Type.STRING },
                  article: { type: Type.STRING },
                  brand: { type: Type.STRING },
                  stock: { type: Type.STRING },
                  description: { type: Type.STRING },
                  image: { type: Type.STRING },
                },
                required: ["name", "price", "category", "article", "brand", "stock", "description", "image"],
              },
            },
          });

          if (response.text) {
            return res.json(JSON.parse(response.text.trim()));
          }
        } catch (genErr) {
          console.warn("Server Gemini column mapping failed, falling back to heuristic:", genErr);
        }
      }

      // Smart heuristic fallback
      const headers = Object.keys(sampleData[0] || {});
      const findHeader = (patterns: RegExp[]) => headers.find(h => patterns.some(p => p.test(h))) || "";
      const mapping = {
        name: findHeader([/назв/i, /товар/i, /наймен/i, /name/i, /title/i]),
        price: findHeader([/цін/i, /price/i, /вартість/i, /сума/i]),
        category: findHeader([/категор/i, /category/i, /група/i, /розділ/i]),
        article: findHeader([/артикул/i, /код/i, /sku/i, /article/i, /номер/i]),
        brand: findHeader([/бренд/i, /виробник/i, /brand/i, /марка/i]),
        stock: findHeader([/кільк/i, /залиш/i, /склад/i, /stock/i, /qty/i, /count/i]),
        description: findHeader([/опис/i, /desc/i, /характеристик/i]),
        image: findHeader([/фото/i, /зображ/i, /image/i, /img/i, /картинк/i, /url/i]),
      };
      res.json(mapping);
    } catch (err: any) {
      console.error("Column mapping endpoint error:", err);
      res.status(500).json({ error: err?.message || "Internal error" });
    }
  });

  // AI Photo Analysis Endpoint
  app.post("/api/ai/photos/analyze-item", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

      const { name, category, brand, article, type, currentImageUrl } = req.body || {};
      if (!name) return res.status(400).json({ error: "Product name is required" });

      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey });

      const prompt = `
        Ти — технічний експерт з каталогізації товарів інтернет-магазину AutoPlumb (автозапчастини та сантехніка).
        Проаналізуй фотографію та назву товару:
        - Назва: "${name}"
        - Категорія: "${category || 'Не вказано'}"
        - Бренд: "${brand || 'Не вказано'}"
        - Артикул: "${article || 'Не вказано'}"
        - Тип: "${type || 'auto'}"
        - Поточне посилання на фото: "${currentImageUrl || 'відсутнє'}"

        Завдання:
        1. Визнач конкретну фізичну деталь чи виріб (наприклад: "карбюратор", "гальмівні колодки", "котушка запалювання", "змішувач для ванни", "патрубок радіатора").
        2. Оціни поточне фото:
           - Чи воно не по темі? (наприклад, якщо товар - це запчастина, а на фото зображено цілий автомобіль чи зовсім інший предмет).
           - Чи містить воно ймовірні водяні знаки або логотипи сторонніх маркетплейсів (prom.ua, olx, тощо)?
        3. Склади 3 найбільш точні пошукові фрази для Google Images (українською та англійською), щоб знайти чисте студійне фото САМОЇ ДЕТАЛІ на білому або прозорому фоні (без автомобіля та без сторонніх водяних знаків).
        4. Надай рекомендацію для адміністратора магазину.

        Відповідь дай ВИКЛЮЧНО у форматі JSON без жодних додаткових коментарів:
        {
          "physicalItem": "...",
          "isOffTopic": true/false,
          "isWatermarked": true/false,
          "qualityScore": 1-10,
          "verdict": "...",
          "recommendation": "...",
          "searchQueries": ["...", "...", "..."]
        }
      `;

      let responseText = "";
      for (const modelName of ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-flash-latest"]) {
        try {
          const aiResponse = await client.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });
          if (aiResponse.text) {
            responseText = aiResponse.text;
            break;
          }
        } catch (e: any) {
          console.warn(`Model ${modelName} failed for photo analysis:`, e?.message || e);
        }
      }

      let result: any = null;
      if (responseText) {
        try {
          const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
          result = JSON.parse(cleanJson);
        } catch (e) {
          console.warn("Failed to parse AI JSON, using fallback analysis");
        }
      }

      // Intelligent Fallback Analysis if AI model is rate-limited or quota exceeded
      if (!result) {
        const nameLower = (name || "").toLowerCase();
        const imgLower = (currentImageUrl || "").toLowerCase();
        const isCarWholeImage = /(?:fahrzeugbilder|parkers-images|matiz\.j|daxstreet|car-engine|stufenheck|car-review)/i.test(imgLower);
        const isSpare = /(?:карбюратор|колодк|накладк|патрубок|підшипник|клапан|котушк|свічк|амортизатор|стартер|генератор|фільтр|насос|реле|радіатор|змішувач|кран|лійка|сифон)/i.test(nameLower);
        const hasWatermarkDomain = /(?:prom\.ua|promstatic|olx|exist|avto\.pro|riastatic|vseosvita|carservic)/i.test(imgLower);
        
        // Clean item name for search
        const cleanItem = name
          .replace(/\b(?:Україна|Росія|Польща|Китай|шт|к-т|уп|1шт|2шт|4шт|Республіка Корея)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        result = {
          physicalItem: cleanItem,
          isOffTopic: isSpare && isCarWholeImage,
          isWatermarked: hasWatermarkDomain,
          qualityScore: isCarWholeImage ? 3 : hasWatermarkDomain ? 5 : currentImageUrl ? 8 : 1,
          verdict: isSpare && isCarWholeImage 
            ? "Зображено цілий автомобіль замість конкретної деталі" 
            : hasWatermarkDomain 
            ? "Ймовірний логотип або водяний знак постачальника" 
            : !currentImageUrl 
            ? "Фотографія відсутня" 
            : "Фото прийнятної якості",
          recommendation: isSpare && isCarWholeImage 
            ? "Рекомендується замінити на ізольоване студійне фото деталі на білому фоні." 
            : hasWatermarkDomain 
            ? "Бажано замінити на чисте фото без водяних знаків маркетплейсів." 
            : "Ви можете залишити це фото або підібрати новіше в Google.",
          searchQueries: [
            `${cleanItem} ізольований білий фон`,
            `${cleanItem} фото деталі`,
            `${cleanItem} OEM`
          ]
        };
      }

      // Construct Google Image search URL with clean transparent/white background filters
      const primaryQuery = (result.searchQueries && result.searchQueries[0]) || `${name} деталь`;
      const googleSearchUrl = `https://www.google.com/search?tbm=isch&tbs=ic:trans,itp:photo&q=${encodeURIComponent(primaryQuery)}`;

      res.json({
        ...result,
        googleSearchUrl
      });
    } catch (error: any) {
      console.error("AI photo analysis failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Apply photo fix to single product
  app.post("/api/ai/photos/update-image", async (req, res) => {
    try {
      const { id, imageUrl, markApproved } = req.body || {};
      if (!id || imageUrl === undefined) {
        return res.status(400).json({ error: "Product id and imageUrl are required" });
      }

      const updateData: any = {
        image_url: imageUrl,
      };

      if (markApproved) {
        // Read existing specs if available to retain custom fields
        const { data: currentItem } = await supabase.from("products").select("specs").eq("id", id).single();
        let specsObj: any = {};
        if (currentItem?.specs) {
          try {
            specsObj = typeof currentItem.specs === "string" ? JSON.parse(currentItem.specs) : currentItem.specs;
          } catch (e) {
            specsObj = { raw: currentItem.specs };
          }
        }
        specsObj.photoApproved = true;
        specsObj.photoApprovedAt = new Date().toISOString();
        updateData.specs = JSON.stringify(specsObj);
      }

      const { data, error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", id)
        .select();

      if (error) throw error;
      res.json({ success: true, product: data?.[0] });
    } catch (error: any) {
      console.error("Update photo failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Batch photo fix endpoint
  app.post("/api/ai/photos/batch-fix", async (req, res) => {
    try {
      const { updates } = req.body || {}; // array of { id, imageUrl }
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: "Updates array is required" });
      }

      let updatedCount = 0;
      for (const item of updates) {
        if (!item.id || !item.imageUrl) continue;
        const { error } = await supabase
          .from("products")
          .update({ image_url: item.imageUrl })
          .eq("id", item.id);
        if (!error) updatedCount++;
      }

      res.json({ success: true, count: updatedCount });
    } catch (error: any) {
      console.error("Batch photo fix failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}
