
import { GoogleGenAI, Type } from "@google/genai";
import { ApiResponse } from "../types";

export const getGeminiResponse = async (input: string, base64Image?: string): Promise<ApiResponse> => {
  // Fix: Use process.env.API_KEY directly in the named parameter object as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `Você é a "Guia", uma assistente de finanças pessoais empática e amiga. 
  Sua missão é ajudar a usuária a organizar gastos e investimentos sem estresse.
  Você fala de igual para igual, é acolhedora, celebra economias e nunca julga.
  
  Sempre extraia informações de transações financeiras (compras, ganhos, investimentos) de textos ou imagens.
  O campo 'date' deve estar no formato ISO (YYYY-MM-DD). Use a data atual se não for especificado (Hoje é ${new Date().toISOString().split('T')[0]}).
  Determine a categoria baseada na descrição.
  O campo 'type' deve ser 'EXPENSE' para gastos ou 'INCOME' para ganhos.
  
  Sua resposta deve ser estritamente em JSON seguindo o esquema fornecido.`;

  const parts: any[] = [{ text: input }];
  if (base64Image) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image.split(',')[1]
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transaction: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                category: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['EXPENSE', 'INCOME'] },
                date: { type: Type.STRING }
              },
              required: ['description', 'amount', 'category', 'type', 'date']
            },
            message: { type: Type.STRING, description: "Uma mensagem amigável e empática da Guia para a usuária." }
          },
          required: ['message']
        }
      }
    });

    // Fix: text is a property, not a method.
    const jsonStr = response.text?.trim() || "{}";
    const data = JSON.parse(jsonStr);
    return {
      transaction: data.transaction || null,
      message: data.message || "Poxa, não consegui entender bem essa. Pode me dar mais detalhes?"
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      transaction: null,
      message: "Ops! Tive um probleminha técnico por aqui, mas já estou tentando resolver. Pode tentar de novo?"
    };
  }
};
