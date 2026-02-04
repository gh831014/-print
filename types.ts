
export interface PromptRecord {
    id?: number;
    title: string;
    summary: string;
    content: string;
    excontext?: string; // Stores the original/raw user text
    version: string; // e.g., "v1.0"
    created_at?: string;
}

export enum ViewMode {
    LIST = 'LIST',
    EDIT = 'EDIT',
    PREVIEW = 'PREVIEW'
}

export enum AIModel {
    GEMINI = 'GEMINI',
    QWEN = 'QWEN'
}

export interface AIAnalysisResult {
    optimizedPrompt: string;
    changeLog: string[];
}

export interface Template {
    id: string;
    name: string;
    content: string;
}

export const DB_CONFIG = {
    URL: 'https://lnwiqirwjeeeahsjgzwg.supabase.co',
    KEY: 'sb_publishable_qd1RTtdhHNEj1cQMDY2kTw_FjpDI7RT'
};

export const QWEN_CONFIG = {
    ENDPOINT: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    MODEL: 'qwen-plus',
    API_KEY: 'sk-04b4d0e1038c4fe2abb8dcbaefe2ac56'
};
