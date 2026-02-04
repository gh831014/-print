import { GoogleGenAI } from "@google/genai";
import { AIModel, AIAnalysisResult, QWEN_CONFIG } from '../types';

export const AiService = {
    async checkConnection(model: AIModel): Promise<boolean> {
        try {
            if (model === AIModel.GEMINI) {
                // We assume Gemini is available if API KEY is present, a real ping would cost tokens
                return !!process.env.API_KEY; 
            } else {
                // Simple ping to Qwen (listing models or dummy completion)
                const res = await fetch(`${QWEN_CONFIG.ENDPOINT}/models`, {
                    headers: { 'Authorization': `Bearer ${QWEN_CONFIG.API_KEY}` }
                });
                return res.ok;
            }
        } catch (e) {
            return false;
        }
    },

    async analyzePrompt(model: AIModel, promptContent: string, title: string): Promise<AIAnalysisResult> {
        const systemPrompt = `
        You are an expert AI Architect (AI 架构师). Your task is to optimize the prompt provided by the user.
        
        Rules:
        1. **Language:** The output MUST be in **Simplified Chinese (简体中文)**. The 'optimizedPrompt' and 'changeLog' must be written in Chinese.
        2. **Optimization:** Add technical constraints, robust error handling, and performance optimizations.
        3. **Formatting:** Use professional Markdown formatting.
        4. **Strict Integrity:** You MUST PRESERVE ALL business logic, specific requirements, and functional details from the original text. **DO NOT** remove, summarize, or simplify any user-defined business rules. The goal is to structure and enhance, not to abridge.
        5. **Specifics:** If the prompt mentions "Upload", "Export", etc., ensure specific technical details are added (e.g., file limits, formats).
        
        Return ONLY a JSON object with this structure:
        {
            "optimizedPrompt": "string (the full rewritten prompt in Chinese)",
            "changeLog": ["string", "string"] (list of specific improvements made in Chinese)
        }
        `;

        const userMessage = `Title: ${title}\nContent:\n${promptContent}`;

        if (model === AIModel.GEMINI) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt + "\n\n" + userMessage }] }
                ],
                config: {
                    responseMimeType: "application/json"
                }
            });
            const text = response.text || "{}";
            return JSON.parse(text) as AIAnalysisResult;

        } else {
            // Qwen (OpenAI Compatible)
            const res = await fetch(`${QWEN_CONFIG.ENDPOINT}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${QWEN_CONFIG.API_KEY}`
                },
                body: JSON.stringify({
                    model: QWEN_CONFIG.MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                    ],
                    response_format: { type: "json_object" } 
                })
            });
            
            if (!res.ok) throw new Error("Qwen API failed");
            const data = await res.json();
            const content = data.choices[0].message.content;
            return JSON.parse(content) as AIAnalysisResult;
        }
    }
};