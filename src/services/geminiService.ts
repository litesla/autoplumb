import { GoogleGenAI, Type } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined") {
      throw new Error("GEMINI_API_KEY is not configured. Please set it in Netlify environment variables.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export interface ColumnMapping {
  name: string;
  price: string;
  category: string;
  article: string;
  brand: string;
  stock: string;
  description: string;
  image: string;
}

export async function getColumnMapping(sampleData: any[]): Promise<ColumnMapping | null> {
  try {
    const prompt = `
      I have an Excel file with product data. Here are the first few rows of the data (represented as JSON objects where keys are column headers):
      ${JSON.stringify(sampleData.slice(0, 5), null, 2)}

      Please identify which column headers correspond to the following product fields:
      1. Product Name (Назва товару)
      2. Price (Ціна)
      3. Category (Категорія) - Note: If the file uses "group headers" (rows that define category for following items), specify the column that contains these category names.
      4. Article/SKU (Артикул/Код)
      5. Brand/Manufacturer (Бренд/Виробник/Країна виробника)
      6. Stock/Quantity (Кількість/Залишок)
      7. Description (Опис/Опис для сайту)
      8. Image URL (Фото/Посилання на зображення)

      Return the mapping as a JSON object where the keys are "name", "price", "category", "article", "brand", "stock", "description", "image" and the values are the EXACT column headers from the provided data.
      If a field is not found, use an empty string.
    `;

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
      return JSON.parse(response.text.trim()) as ColumnMapping;
    }
    return null;
  } catch (error) {
    console.error("Error getting column mapping from Gemini:", error);
    return null;
  }
}

export async function getGeminiResponse(prompt: string, products: any[]) {
  try {
    const systemInstruction = `
      Ви — експерт-консультант магазину AutoPlumb (автотовари та сантехніка).
      Ваша мета — допомагати клієнтам підбирати товари.
      
      Ось список доступних товарів:
      ${JSON.stringify(products.map(p => ({ name: p.name, price: p.price, category: p.category, type: p.type })), null, 2)}
      
      Правила:
      1. Відповідайте українською мовою.
      2. Будьте ввічливими та професійними.
      3. Якщо клієнт шукає щось конкретне, пропонуйте товари зі списку.
      4. Якщо товару немає, запропонуйте альтернативу або скажіть, що ми можемо привезти під замовлення.
      5. Використовуйте Markdown для форматування (жирний текст, списки).
    `;

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return null;
  }
}
