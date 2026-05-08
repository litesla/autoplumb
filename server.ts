import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";
import axios from "axios";
import * as xlsx from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin lazily
  let db: admin.firestore.Firestore | null = null;
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
      // Use the specific database ID if provided
      db = admin.firestore(firebaseConfig.firestoreDatabaseId);
    } else {
      console.warn("firebase-applet-config.json not found. Firestore features will be disabled.");
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }

  app.use(express.json());

  // External API for adding products
  app.post("/api/external/products", async (req, res) => {
    const apiKey = req.headers["x-api-key"];
    const masterKey = process.env.EXTERNAL_API_KEY;

    if (!masterKey) {
      return res.status(500).json({ error: "Server API key not configured" });
    }

    if (apiKey !== masterKey) {
      return res.status(401).json({ error: "Invalid API Key" });
    }

    try {
      if (!db) {
        return res.status(500).json({ error: "Database not initialized" });
      }
      const { name, price, category, description, image, stock, type, brand, specs } = req.body;

      if (!name || !price || !type) {
        return res.status(400).json({ error: "Missing required fields: name, price, type" });
      }

      const productData = {
        name,
        price: Number(price),
        category: category || "Загальне",
        description: description || "",
        image: image || "",
        stock: Number(stock || 0),
        type: type === "plumbing" ? "plumbing" : "auto",
        brand: brand || "",
        specs: specs || "{}",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("products").add(productData);
      res.status(201).json({ id: docRef.id, message: "Product added successfully" });
    } catch (error) {
      console.error("Error adding product via API:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // UTR API Sync Flow
  app.post("/api/sync/utr", async (req, res) => {
    const utrToken = process.env.UTR_API_KEY;

    if (!utrToken) {
      return res.status(500).json({ error: "UTR API Key not configured" });
    }

    const headers = {
      "Authorization": `Bearer ${utrToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    };

    try {
      console.log("Step 1: Requesting price list formation...");
      // 1. Request price list formation
      const exportReq = await axios.post("https://order24-api.utr.ua/pricelists/export-request", {
        categoriesId: [],
        format: "xlsx",
        inStock: true,
        modelsId: [],
        showScancode: false,
        utrArticle: true,
        visibleBrandsId: []
      }, { 
        headers,
        timeout: 30000 // 30s timeout for request
      });

      const priceListId = exportReq.data.id;
      console.log(`Price list requested. ID: ${priceListId}`);

      // 2. Poll for completion (max 120 seconds)
      let status = "in queue";
      let attempts = 0;
      const maxAttempts = 24; // 24 * 5s = 120s

      while (status !== "complete" && status !== "ready" && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
          const statusCheck = await axios.get(`https://order24-api.utr.ua/pricelists/${priceListId}`, { 
            headers,
            timeout: 10000 
          });
          
          // The API might return status in different fields depending on version
          status = (statusCheck.data.data || statusCheck.data.status || statusCheck.data.state || "").toString().toLowerCase();
          
          console.log(`Polling status for ${priceListId}: "${status}" (Attempt ${attempts + 1}/${maxAttempts})`);
          
          if (status === "complete" || status === "ready" || status === "finished" || status === "success") {
            status = "complete";
            break;
          }
          
          if (status === "error" || status === "failed") {
            throw new Error(`UTR API reported error status: ${status}`);
          }
        } catch (pollError: any) {
          console.warn(`Polling attempt ${attempts + 1} failed: ${pollError.message}`);
          // Continue polling unless it's a fatal error
        }
        attempts++;
      }

      if (status !== "complete") {
        console.log(`Sync timed out for ${priceListId}. Status is still: ${status}`);
        return res.status(202).json({ 
          message: "Прайс-лист формується занадто довго. Спробуйте натиснути 'Синхронізувати' ще раз через хвилину.", 
          id: priceListId,
          status: status
        });
      }

      // 3. Get the token for download
      console.log("Fetching price list list to find token...");
      const listResponse = await axios.get("https://order24-api.utr.ua/pricelists", { 
        headers,
        timeout: 20000
      });
      
      const myPriceList = listResponse.data.find((p: any) => p.id === priceListId);
      
      if (!myPriceList || !myPriceList.token) {
        console.error("Price list not found in list or token missing:", listResponse.data);
        throw new Error("Не вдалося знайти токен для завантаження сформованого прайсу.");
      }

      // 4. Download the file
      console.log(`Downloading price list with token: ${myPriceList.token}...`);
      const downloadResponse = await axios.get(`https://order24-api.utr.ua/pricelists/export/${myPriceList.token}`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 60000 // 60s for download
      });

      // 5. Parse XLSX
      console.log("Parsing XLSX data...");
      const workbook = xlsx.read(downloadResponse.data, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = xlsx.utils.sheet_to_json(worksheet);

      console.log(`Parsed ${data.length} products from UTR.`);
      if (data.length > 0) {
        console.log("Sample row from UTR:", JSON.stringify(data[0], null, 2));
      } else {
        return res.status(400).json({ error: "Отримано порожній файл від UTR." });
      }

      if (!db) {
        throw new Error("Database not initialized");
      }

      // 6. Update Firestore in batches
      console.log("Starting Firestore batch updates...");
      const batchSize = 400;
      let processedCount = 0;
      
      for (let i = 0; i < data.length; i += batchSize) {
        const chunk = data.slice(i, i + batchSize);
        const batch = db.batch();
        
        chunk.forEach((item: any) => {
          const getVal = (keys: string[]) => {
            const foundKey = Object.keys(item).find(k => 
              keys.some(target => k.toLowerCase().trim() === target.toLowerCase())
            );
            return foundKey ? item[foundKey] : undefined;
          };

          const name = getVal(["Name", "Назва", "Наименование", "Title", "Товар"]);
          const price = getVal(["Price", "Ціна", "Цена", "Cost"]);
          const brand = getVal(["Brand", "Бренд", "Производитель", "Виробник"]);
          const article = getVal(["Article", "Артикул", "Код", "Sku"]);
          const stock = getVal(["Quantity", "Кількість", "Кол-во", "Stock", "Залишок"]);
          const category = getVal(["Category", "Категорія", "Категория", "Group"]);

          const productData = {
            name: name || "Товар UTR",
            price: Number(price || 0),
            brand: brand || "",
            article: article || "",
            stock: Number(stock || 0),
            category: category || "Запчастини",
            type: "auto",
            image: "https://picsum.photos/seed/auto/800/600",
            description: `Артикул: ${article || "н/д"}. Виробник: ${brand || "н/д"}`,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          };

          const docId = article ? `utr_${article.toString().replace(/[^a-zA-Z0-9]/g, '_')}` : undefined;
          const docRef = docId ? db.collection("products").doc(docId) : db.collection("products").doc();
          batch.set(docRef, productData, { merge: true });
          processedCount++;
        });

        await batch.commit();
        console.log(`Committed batch ${Math.floor(i / batchSize) + 1} (${processedCount}/${data.length})`);
      }

      // 7. Cleanup
      try {
        await axios.delete(`https://order24-api.utr.ua/pricelists/delete/${priceListId}`, { headers, timeout: 10000 });
        console.log(`Cleaned up price list ${priceListId} from UTR.`);
      } catch (cleanupError) {
        console.warn("Failed to delete price list from UTR.");
      }

      res.json({ 
        message: "Синхронізація завершена успішно!", 
        count: processedCount 
      });

    } catch (error: any) {
      console.error("Error in UTR Sync Flow:", error.response?.data || error.message);
      res.status(500).json({ 
        error: "Помилка при синхронізації", 
        details: error.response?.data || error.message 
      });
    }
  });

  // API Routes (Legacy/Placeholder - now handled by Firestore on client)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running. Data is now managed via Firebase." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
