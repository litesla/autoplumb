import express from "express";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import axios from "axios";
import * as xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createExpressApp() {
  const app = express();

  // Initialize Firebase Admin lazily
  let db: admin.firestore.Firestore | null = null;
  try {
    let firebaseConfig = null;
    const pathsToTry = [
      path.join(process.cwd(), "firebase-applet-config.json"),
      path.join(__dirname, "..", "firebase-applet-config.json"),
      path.join(__dirname, "..", "..", "firebase-applet-config.json")
    ];

    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        firebaseConfig = JSON.parse(fs.readFileSync(p, "utf-8"));
        break;
      }
    }

    if (firebaseConfig) {
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
      db = getFirestore(admin.apps[0], firebaseConfig.firestoreDatabaseId || "(default)");
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }

  app.use(express.json());

  // API Routes
  app.post("/api/external/products", async (req, res) => {
    const apiKey = req.headers["x-api-key"];
    const masterKey = process.env.EXTERNAL_API_KEY;

    if (!masterKey || apiKey !== masterKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      if (!db) return res.status(500).json({ error: "Database not initialized" });
      const { name, price, category, description, image, stock, type, brand, specs } = req.body;

      if (!name || !price || !type) {
        return res.status(400).json({ error: "Missing required fields" });
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
      res.status(201).json({ id: docRef.id });
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
      const data: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

      if (!db) throw new Error("DB not init");
      const batchSize = 400;
      for (let i = 0; i < data.length; i += batchSize) {
        const chunk = data.slice(i, i + batchSize);
        const batch = db.batch();
        chunk.forEach((item: any) => {
          const getVal = (keys: string[]) => {
            const k = Object.keys(item).find(key => keys.some(t => key.toLowerCase().trim() === t.toLowerCase()));
            return k ? item[k] : undefined;
          };
          const article = getVal(["Article", "Артикул", "Код"]);
          const productData = {
            name: getVal(["Name", "Назва"]) || "Товар UTR",
            price: Number(getVal(["Price", "Ціна"]) || 0),
            article: article || "",
            type: "auto",
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          };
          const docRef = article ? db!.collection("products").doc(`utr_${article}`) : db!.collection("products").doc();
          batch.set(docRef, productData, { merge: true });
        });
        await batch.commit();
      }

      res.json({ message: "Sync successful" });
    } catch (error: any) {
      res.status(500).json({ error: "Sync failed", details: error.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
