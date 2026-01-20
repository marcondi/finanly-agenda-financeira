
import { GoogleGenAI } from "@google/genai";
import { Transaction, Category, ChatMessage } from "../types";

// FIX: Per @google/genai guidelines, the API key must be sourced directly from `process.env.API_KEY`.
// This change also resolves the TypeScript error "Property 'env' does not exist on type 'ImportMeta'".
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAgentResponse = async (
  userMessage: string,
  history: ChatMessage[],
  context: {
    transactions: Transaction[];
    categories: Category[];
    userName: string;
    stats: { income: number; expense: number; balance: number };
  }
): Promise<string> => {
  // FIX: Removed the nullable `ai` check. The code now assumes `process.env.API_KEY` is set,
  // and any initialization or auth errors will be caught by the try-catch block below.
  // The original error message about VITE_API_KEY has been removed.

  try {
    const systemInstruction = `
      Você é o "Finanly AI", assistente do ${context.userName}.
      Dados atuais: Saldo R$ ${context.stats.balance.toFixed(2)}, Ganhos R$ ${context.stats.income.toFixed(2)}, Gastos R$ ${context.stats.expense.toFixed(2)}.
      Responda em PT-BR de forma curta, direta e amigável. Use emojis.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Sem resposta.";
  } catch (error) {
    console.error("Erro IA:", error);
    // Fornece feedback mais útil em caso de erro de autenticação
    if (error instanceof Error && error.message.includes('API key not valid')) {
       // FIX: Updated error message to be more generic and not mention specific file names, per guidelines.
       return "Sua API Key do Gemini é inválida. Verifique a configuração da chave de API. 🔑";
    }
    return "Erro ao conectar com a IA.";
  }
};
