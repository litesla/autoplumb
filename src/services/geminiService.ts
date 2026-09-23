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
    const res = await fetch("/api/ai/column-mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sampleData }),
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.warn("Client column mapping fetch failed, using local heuristics:", error);
    const headers = Object.keys((sampleData && sampleData[0]) || {});
    const findHeader = (patterns: RegExp[]) => headers.find(h => patterns.some(p => p.test(h))) || "";
    return {
      name: findHeader([/назв/i, /товар/i, /наймен/i, /name/i, /title/i]),
      price: findHeader([/цін/i, /price/i, /вартість/i, /сума/i]),
      category: findHeader([/категор/i, /category/i, /група/i, /розділ/i]),
      article: findHeader([/артикул/i, /код/i, /sku/i, /article/i, /номер/i]),
      brand: findHeader([/бренд/i, /виробник/i, /brand/i, /марка/i]),
      stock: findHeader([/кільк/i, /залиш/i, /склад/i, /stock/i, /qty/i, /count/i]),
      description: findHeader([/опис/i, /desc/i, /характеристик/i]),
      image: findHeader([/фото/i, /зображ/i, /image/i, /img/i, /картинк/i, /url/i]),
    };
  }
}

export async function getGeminiResponse(prompt: string, _products?: any[]) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response || null;
  } catch (error) {
    console.error("Error calling server chat:", error);
    return null;
  }
}
