import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Bot, 
  RefreshCcw, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  Zap, 
  LayoutTemplate, 
  CheckCircle2, 
  Search,
  ArrowLeft,
  Copy,
  Terminal,
  Activity
} from 'lucide-react';
import { PromptRecord, ViewMode, AIModel, AIAnalysisResult, DB_CONFIG } from './types';
import { DbService } from './services/db';
import { AiService } from './services/ai';
import { FUNCTIONAL_TEMPLATES } from './components/TemplateList';

const App: React.FC = () => {
  // Global State
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LIST);
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<PromptRecord>({
    title: '',
    summary: '',
    content: '',
    excontext: '',
    version: 'v1.0'
  });
  
  // AI State
  const [aiModel, setAiModel] = useState<AIModel>(AIModel.GEMINI);
  const [aiConnected, setAiConnected] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

  // DB State
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // UI State
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // --- Effects ---

  useEffect(() => {
    checkConnections();
    fetchPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- Handlers ---

  const checkConnections = async () => {
    const dbOk = await DbService.testConnection();
    setDbConnected(dbOk);
    
    const aiOk = await AiService.checkConnection(aiModel);
    setAiConnected(aiOk);
  };

  const fetchPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const data = await DbService.getAllPrompts();
      setPrompts(data || []);
    } catch (error) {
      console.error(error);
      showToast('无法读取数据库，请检查连接', 'error');
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  const handleCreateNew = () => {
    setCurrentPrompt({
      title: '',
      summary: '',
      content: '',
      excontext: '',
      version: 'v1.0'
    });
    setSelectedPromptId(null);
    setAiResult(null);
    setViewMode(ViewMode.EDIT);
  };

  const handleEdit = (prompt: PromptRecord) => {
    setCurrentPrompt({ ...prompt });
    setSelectedPromptId(prompt.id!);
    setAiResult(null);
    setViewMode(ViewMode.EDIT);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该提示词吗？')) return;
    try {
      await DbService.deletePrompt(id);
      showToast('删除成功', 'success');
      fetchPrompts();
    } catch (e) {
      showToast('删除失败', 'error');
    }
  };

  const insertTemplate = (content: string) => {
    setCurrentPrompt(prev => ({
      ...prev,
      content: prev.content + (prev.content ? '\n' : '') + content
    }));
  };

  const handleAiAnalyze = async () => {
    if (!currentPrompt.title || !currentPrompt.content) {
      showToast('请填写完整名称和内容', 'error');
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await AiService.analyzePrompt(aiModel, currentPrompt.content, currentPrompt.title);
      setAiResult(result);
      setViewMode(ViewMode.PREVIEW);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'AI 分析失败，请检查配置', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    try {
      let savedRecord: PromptRecord;
      
      // Version Increment Logic
      const nextVersion = (ver: string) => {
        const num = parseInt(ver.replace('v', '').split('.')[0]);
        return `v${(isNaN(num) ? 0 : num) + 1}.0`;
      };

      // Prepare payload: 
      // content = Optimized version (if AI result exists) or current draft
      // excontext = Original draft (currentPrompt.content holds the draft before save if coming from AI workflow)
      const payloadBase = {
        ...currentPrompt,
        excontext: currentPrompt.content, // Save the raw draft as excontext
        content: aiResult ? aiResult.optimizedPrompt : currentPrompt.content
      };

      if (selectedPromptId) {
        // Update
        const newVersion = nextVersion(currentPrompt.version);
        savedRecord = await DbService.updatePrompt(selectedPromptId, {
          ...payloadBase,
          version: newVersion
        });
      } else {
        // Create
        savedRecord = await DbService.createPrompt({
          ...payloadBase,
          version: 'v1.0'
        });
      }

      showToast(`保存成功 ${savedRecord.version}`, 'success');
      setViewMode(ViewMode.LIST);
      fetchPrompts();
    } catch (e) {
      console.error(e);
      showToast('保存失败', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板', 'success');
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
  };

  // --- Render Helpers ---

  const filteredPrompts = Array.isArray(prompts) ? prompts.filter(p => {
    if (!p) return false;
    const title = (p.title || '').toString();
    const term = (searchTerm || '').toString();
    return title.toLowerCase().includes(term.toLowerCase());
  }) : [];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* --- Left Sidebar --- */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-indigo-400 tracking-tight flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              提示词打印机 <span className="text-xs text-slate-500">V1.0</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">by 产品老高</p>
          </div>

          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setViewMode(ViewMode.LIST)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all ${viewMode === ViewMode.LIST ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <Database className="w-4 h-4" />
              <span>提示词版本管理</span>
            </button>
            <button 
               onClick={() => {
                   if (viewMode !== ViewMode.EDIT && !selectedPromptId) handleCreateNew();
                   else setViewMode(ViewMode.EDIT);
               }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all ${viewMode === ViewMode.EDIT ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <Edit3 className="w-4 h-4" />
              <span>提示词架构设置</span>
            </button>
            <button 
              onClick={() => setViewMode(ViewMode.PREVIEW)}
              disabled={!currentPrompt.content}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all ${viewMode === ViewMode.PREVIEW ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 text-slate-400 disabled:opacity-50'}`}
            >
              <Zap className="w-4 h-4" />
              <span>预览及 AI 优化</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <label className="text-xs font-medium text-slate-500 uppercase mb-2 block">大模型配置</label>
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-md">
              <select 
                value={aiModel} 
                onChange={(e) => setAiModel(e.target.value as AIModel)}
                className="bg-transparent text-sm w-full outline-none text-slate-200"
              >
                <option value={AIModel.GEMINI}>Google Gemini (Default)</option>
                <option value={AIModel.QWEN}>通义千问 (Qwen)</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${aiConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                <span className={aiConnected ? 'text-emerald-500' : 'text-rose-500'}>{aiConnected ? '已连接' : '未连接'}</span>
              </div>
              <button onClick={() => checkConnections()} className="p-1 hover:bg-slate-800 rounded text-slate-400">
                <RefreshCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* --- Center Panel --- */}
      <main className="flex-1 flex flex-col border-r border-slate-800 bg-slate-950 relative">
        
        {/* View: Prompt Version Management */}
        {viewMode === ViewMode.LIST && (
          <div className="flex flex-col h-full">
            <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
              <h2 className="text-lg font-semibold text-slate-100">提示词数据库</h2>
              <button onClick={handleCreateNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm transition-colors shadow-lg shadow-indigo-500/20">
                <Plus className="w-4 h-4" />
                新增提示词
              </button>
            </header>
            
            <div className="p-4 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="搜索提示词名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md py-2 pl-9 pr-4 text-sm focus:border-indigo-500 outline-none" 
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingPrompts ? (
                <div className="text-center py-10 text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCcw className="w-4 h-4 animate-spin" /> 读取数据中...
                </div>
              ) : filteredPrompts.length === 0 ? (
                 <div className="text-center py-10 text-slate-500">
                   暂无数据，请新增提示词
                 </div>
              ) : (
                filteredPrompts.map(prompt => (
                  <div key={prompt.id} className="group bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-lg p-4 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-slate-200 text-base">{prompt.title}</h3>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                          {prompt.version}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(prompt)} className="p-2 hover:bg-slate-800 rounded text-blue-400 hover:text-blue-300">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(prompt.id!)} className="p-2 hover:bg-slate-800 rounded text-rose-400 hover:text-rose-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{prompt.summary || "暂无描述"}</p>
                    <div className="mt-3 text-xs text-slate-600 font-mono">
                       ID: {prompt.id} • Updated: {new Date(prompt.created_at || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <footer className="p-4 border-t border-slate-800 bg-slate-900 text-xs text-slate-500 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => setShowSqlModal(true)}>
               <div className="flex items-center gap-2">
                 <Database className={`w-3 h-3 ${dbConnected ? 'text-emerald-500' : 'text-rose-500'}`} />
                 Supabase Connection: {dbConnected ? 'Online' : 'Offline'}
               </div>
               <span className="text-indigo-400 underline">配置数据库</span>
            </footer>
          </div>
        )}

        {/* View: Architecture Setup (Edit) */}
        {viewMode === ViewMode.EDIT && (
          <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
            <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
              <div className="flex items-center gap-3">
                <button onClick={() => setViewMode(ViewMode.LIST)} className="hover:bg-slate-800 p-1 rounded">
                  <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <h2 className="text-lg font-semibold text-slate-100">提示词架构设置</h2>
              </div>
              <div className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded">
                Current: {currentPrompt.version}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">系统名称</label>
                    <input 
                      className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                      value={currentPrompt.title}
                      onChange={(e) => setCurrentPrompt({...currentPrompt, title: e.target.value})}
                      placeholder="e.g. 智能客服助手"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">系统概要</label>
                    <input 
                      className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                      value={currentPrompt.summary}
                      onChange={(e) => setCurrentPrompt({...currentPrompt, summary: e.target.value})}
                      placeholder="简短描述该系统的核心目标"
                    />
                 </div>
              </div>

              <div className="space-y-2 flex-1 flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center">
                   <label className="text-sm font-medium text-slate-400">提示词编排</label>
                   <span className="text-xs text-slate-500">支持 Markdown 语法</span>
                </div>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {FUNCTIONAL_TEMPLATES.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => insertTemplate(t.content)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-xs text-indigo-300 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      {t.name}
                    </button>
                  ))}
                </div>
                <textarea 
                  ref={editorRef}
                  className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-md p-4 text-sm font-mono leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                  value={currentPrompt.content}
                  onChange={(e) => setCurrentPrompt({...currentPrompt, content: e.target.value})}
                  placeholder="// 在此输入提示词逻辑，或点击上方模板快速插入..."
                />
              </div>

              <div className="flex justify-end pt-4">
                 <button 
                    onClick={handleAiAnalyze}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-md shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                 >
                    {isAnalyzing ? (
                      <>
                        <RefreshCcw className="w-4 h-4 animate-spin" />
                        AI 深度分析中...
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4" />
                        提交预览及 AI 优化
                      </>
                    )}
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* View: Preview & AI Optimize */}
        {viewMode === ViewMode.PREVIEW && (
          <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
            <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
               <div className="flex items-center gap-3">
                <button onClick={() => setViewMode(ViewMode.EDIT)} className="hover:bg-slate-800 p-1 rounded">
                  <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <h2 className="text-lg font-semibold text-slate-100">预览及 AI 优化</h2>
              </div>
              <div className="flex items-center gap-3">
                {aiResult && (
                   <button 
                     onClick={() => setAiResult(null)} // Revert logic by clearing AI result state
                     className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                   >
                     还原原文
                   </button>
                )}
                <button 
                  onClick={handleAiAnalyze}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-md text-sm border border-slate-700 transition-all"
                >
                  <Bot className="w-4 h-4" />
                  再次优化
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col p-6">
              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-6 relative">
                {aiResult ? (
                   <div className="absolute top-4 right-8 z-10 flex gap-2">
                      <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded border border-purple-500/30 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> AI Optimized
                      </span>
                   </div>
                ) : (
                    <div className="absolute top-4 right-8 z-10">
                      <span className="bg-slate-700/50 text-slate-400 text-xs px-2 py-1 rounded border border-slate-600">
                        原始草稿
                      </span>
                    </div>
                )}
                <textarea
                  className="w-full h-full bg-transparent border-none focus:ring-0 resize-none font-mono text-sm leading-relaxed text-slate-300 outline-none custom-scrollbar p-0"
                  value={aiResult ? aiResult.optimizedPrompt : currentPrompt.content}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    if (aiResult) {
                      setAiResult({ ...aiResult, optimizedPrompt: newVal });
                    } else {
                      setCurrentPrompt({ ...currentPrompt, content: newVal });
                    }
                  }}
                  spellCheck={false}
                />
              </div>

              <div className="mt-6 flex justify-center">
                 <button 
                   onClick={handleSave}
                   className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-md shadow-lg shadow-emerald-500/20 transition-all text-base font-medium"
                 >
                   <Save className="w-5 h-5" />
                   保存并更新版本 ({currentPrompt.version} → vNext)
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: SQL Copy */}
        {showSqlModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-lg shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-semibold text-white">数据库配置 (Supabase)</h3>
                <button onClick={() => setShowSqlModal(false)} className="text-slate-500 hover:text-white">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400">
                  首次使用请在 Supabase SQL Editor 中运行以下代码以创建数据表。
                </p>
                <div className="bg-slate-950 p-4 rounded-md border border-slate-800 relative group">
                  <pre className="text-xs font-mono text-green-400 overflow-x-auto">
                    {DbService.getSQLSchema()}
                  </pre>
                  <button 
                    onClick={() => copyToClipboard(DbService.getSQLSchema())}
                    className="absolute top-2 right-2 p-2 bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700"
                  >
                    <Copy className="w-3 h-3 text-white" />
                  </button>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>URL: <span className="text-slate-400 select-all">{DB_CONFIG.URL}</span></p>
                  <p>Key: <span className="text-slate-400 select-all">{DB_CONFIG.KEY.substring(0, 20)}...</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
           <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
             {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
             <span className="text-sm font-medium">{toast.msg}</span>
           </div>
        )}

      </main>

      {/* --- Right Sidebar (Tools & Preview Details) --- */}
      <aside className="w-72 bg-slate-900 border-l border-slate-800 flex-shrink-0 flex flex-col">
        <div className="p-5 border-b border-slate-800">
           <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
             <LayoutTemplate className="w-4 h-4 text-indigo-400" />
             通用功能模板
           </h3>
           <p className="text-xs text-slate-500 mt-1">拖拽或点击添加至编辑器</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {FUNCTIONAL_TEMPLATES.map(item => (
            <div 
              key={item.id} 
              onClick={() => viewMode === ViewMode.EDIT && insertTemplate(item.content)}
              className={`p-3 bg-slate-800/50 border border-slate-700 rounded-md hover:border-indigo-500 transition-colors group ${viewMode === ViewMode.EDIT ? 'cursor-pointer hover:bg-slate-800' : 'cursor-default opacity-60'}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-slate-300 group-hover:text-indigo-300">{item.name}</span>
                {viewMode === ViewMode.EDIT && <Plus className="w-3 h-3 text-indigo-500 opacity-0 group-hover:opacity-100" />}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight line-clamp-2">
                {item.content.replace(/###/g, '').slice(0, 50)}...
              </div>
            </div>
          ))}
        </div>

        {viewMode === ViewMode.PREVIEW && aiResult && aiResult.changeLog.length > 0 && (
           <div className="border-t border-slate-800 flex-1 bg-slate-900/80 p-4 overflow-y-auto min-h-[300px]">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Bot className="w-3 h-3" />
                AI 优化日志
              </h4>
              <ul className="space-y-3">
                {aiResult.changeLog.map((log, idx) => (
                  <li key={idx} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                    <span className="text-indigo-500 mt-0.5">•</span>
                    {log}
                  </li>
                ))}
              </ul>
           </div>
        )}
      </aside>

    </div>
  );
};

export default App;