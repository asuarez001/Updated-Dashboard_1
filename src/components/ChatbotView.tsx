import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, RefreshCw, Trash2, Copy, Check, Info, ShieldCheck, Zap, BookOpen, AlertCircle } from 'lucide-react';
import { UserProfile, ShotEntry, ChatMessage, GeminiModelId, ChatbotPersona } from '../types';
import { calculateEstimatedPlasmaLevel } from '../utils/calculations';

interface ChatbotViewProps {
  profile: UserProfile;
  latestShot: ShotEntry | undefined;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-msg',
    role: 'model',
    content: `Hello! I'm **Pulse AI**, your specialized GLP-1 Clinical Pharmacotherapy & Metabolic Companion.

I'm here to support your therapy with evidence-based guidance on:
- **Pharmacokinetics & Concentration**: Understanding your 30-day ebbs and flows, weekly peak satiety, and elimination troughs.
- **Symptom Mitigation**: Managing nausea, delayed gastric emptying, and hydration protocols.
- **Muscle Defense**: Hitting daily protein targets to preserve lean mass during calorie deficits.
- **Pure Fat Loss**: Mathematical energy balance (3,500 kcal = 1 lb pure fat) and deciphering scale fluctuations.

How can I help you with your protocol today?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    modelUsed: 'gemini-3.5-flash',
  },
];

const SUGGESTED_PROMPTS = [
  'Why do my hunger cues return on Day 6?',
  'How do I relieve nausea on my Day 2 peak?',
  'How much protein do I need to prevent muscle loss?',
  'Explain my 30-day steady state accumulation',
  'What is the best injection site rotation strategy?',
  'Why is the scale stalling when my calorie deficit is on point?',
];

export const ChatbotView: React.FC<ChatbotViewProps> = ({ profile, latestShot }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('glp1_chat_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return INITIAL_MESSAGES;
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>('gemini-3.5-flash');
  const [selectedPersona, setSelectedPersona] = useState<ChatbotPersona>('companion');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Persist messages to local storage
  useEffect(() => {
    try {
      localStorage.setItem('glp1_chat_history', JSON.stringify(messages));
    } catch (e) {
      // ignore
    }
  }, [messages]);

  const plasma = calculateEstimatedPlasmaLevel(latestShot);

  const userProfileContext = `
- Patient Name: ${profile.name}
- Medication: ${profile.medication} (${profile.brandName})
- Current Dose: ${profile.doseMg} mg
- Current Weight: ${profile.currentWeightLbs} lbs | Starting Weight: ${profile.startingWeightLbs} lbs | Goal: ${profile.goalWeightLbs} lbs
- Target Daily Calories: ${profile.targetDailyCalories} kcal
- Target Daily Protein: ${profile.targetDailyProteinGrams} g
- Days Since Last Injection: ${plasma.daysSinceShot} days
- Estimated Active Concentration: ${plasma.relativeLevelPct}%
- Last Injection Site: ${latestShot?.injectionSite || 'Not yet logged'}
- Observed Symptoms: ${latestShot?.sideEffects?.join(', ') || 'None reported'}
`.trim();

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      // Format messages for the multi-turn backend endpoint
      const payloadMessages = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: payloadMessages,
          model: selectedModel,
          persona: selectedPersona,
          userProfileContext,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        content: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || selectedModel,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `**Notice:** ${err.message || 'Unable to connect to the Gemini service. Please check your network or API key.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear your conversation history?')) {
      setMessages(INITIAL_MESSAGES);
      localStorage.removeItem('glp1_chat_history');
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Model & Role Selection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Bot className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pulse AI Clinical Companion</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Gemini Powered
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Specialized in {profile.medication} ({profile.brandName} {profile.doseMg}mg) pharmacokinetics, satiety curves, and pure fat loss
              </p>
            </div>
          </div>

          {/* Model & Role Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Model Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-500 font-medium">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as GeminiModelId)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (General / Recommended)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Clinical Reasoning)</option>
              </select>
            </div>

            {/* Persona Role Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">Role:</span>
              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value as ChatbotPersona)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="companion">General Companion (All-in-One)</option>
                <option value="pharmacotherapy">Pharmacotherapy & Half-Life</option>
                <option value="gi_symptoms">GI Comfort & Motility</option>
                <option value="nutrition_muscle">Protein & Muscle Defense</option>
              </select>
            </div>

            {/* Clear History */}
            <button
              onClick={handleClearHistory}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              title="Clear Conversation History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Thread Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[640px]">
        {/* Scrollable Messages Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === 'user';

            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-slate-900 text-white'
                      : 'bg-emerald-600 text-white shadow-xs'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed relative group ${
                    isUser
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {/* Metadata & Actions footer */}
                  <div
                    className={`mt-2 flex items-center justify-between gap-3 text-[10px] ${
                      isUser ? 'text-slate-400' : 'text-slate-400 border-t border-slate-200/60 pt-1.5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{m.timestamp}</span>
                      {m.modelUsed && !isUser && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-emerald-700">{m.modelUsed}</span>
                        </>
                      )}
                    </div>

                    {!isUser && (
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        className="opacity-0 group-hover:opacity-100 hover:text-slate-700 transition-opacity p-0.5"
                        title="Copy message"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-xl mr-auto">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Pulse AI is generating clinical response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Ask:</span>
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs whitespace-nowrap transition-colors shadow-2xs font-medium shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Pulse AI about your weekly shot, 30-day ebbs & flows, protein intake, or side effects... (Press Enter to send)"
                rows={1}
                disabled={isLoading}
                className="w-full resize-none px-4 py-3 pr-10 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent max-h-32 min-h-[46px]"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-semibold text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center gap-1.5 h-[46px]"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Grounded in GLP-1/GIP pharmacology and Wishnofsky thermodynamic fat loss physics.
            </span>
            <span>Always consult your healthcare provider for clinical medical advice.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
