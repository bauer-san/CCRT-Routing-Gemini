import { GoogleGenAI, Type } from "@google/genai";
import { ClientInfo } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function extractClientData(text: string): Promise<ClientInfo[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `Extract client information from the following text. 
    For each client, provide: 
    - name
    - address
    - phone (if available)
    - deliveryType (e.g., food, clothing, hygiene, etc.)
    - status (e.g., confirmed, left message, no respone, etc.)
    - any other relevant notes
    Also, provide approximate latitude and longitude for each address for routing purposes.
    Return the data as a JSON array of objects.
    
    Text:
    ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            address: { type: Type.STRING },
            phone: { type: Type.STRING },
            deliveryType: { type: Type.STRING },
            status: { type: Type.STRING },
            notes: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
          },
          required: ["name", "address", "lat", "lng"],
        },
      },
    },
  });

  try {
    const data = JSON.parse(response.text || "[]");
    return data.map((client: any, index: number) => ({
      ...client,
      id: client.id || `client-${index}`,
    }));
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    return [];
  }
}
