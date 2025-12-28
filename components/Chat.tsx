
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Transaction } from '../types';
import { getGeminiResponse } from '../services/geminiService';

interface ChatProps {
  onAddTransaction: (t: Transaction) => void;
}

const Chat: React.FC<ChatProps> = ({ onAddTransaction }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'welcome', 
      role: 'assistant', 
      content: 'Oi, amiga! Eu sou a Guia. Pode me contar seus gastos ou ganhos de hoje. Se preferir, pode até me mandar uma foto do comprovante! 🌸' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !previewImage) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: previewImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setPreviewImage(null);
    setIsLoading(true);

    const response = await getGeminiResponse(input, userMessage.image);

    if (response.transaction) {
      const newTransaction: Transaction = {
        ...response.transaction,
        id: Math.random().toString(36).substring(7),
      };
      onAddTransaction(newTransaction);
    }

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.message
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Message Area */}
      <div className="flex-1 space-y-4 p-4 lg:p-6 overflow-y-auto bg-transparent">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div 
              className={`max-w-[90%] rounded-2xl p-4 shadow-sm border border-black/5 ${
                m.role === 'user' 
                  ? 'bg-[#f170c3] text-white rounded-tr-none' 
                  : 'bg-white text-[#521256] rounded-tl-none border-l-4 border-l-[#e2e585]'
              }`}
            >
              {m.image && <img src={m.image} alt="Upload" className="rounded-xl mb-3 max-h-48 w-full object-cover" />}
              <p className="text-xs lg:text-sm leading-relaxed font-bold">{m.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/80 rounded-2xl px-4 py-2 animate-pulse text-[#521256] text-[10px] font-black border border-[#e2e585]">
              Guia está analisando... ✨
            </div>
          </div>
        )}
        <div ref={scrollRef} className="h-2" />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/40 border-t border-white/30">
        {previewImage && (
          <div className="relative mb-3 inline-block">
            <img src={previewImage} alt="Preview" className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-md" />
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px]"
            >✕</button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1 bg-white rounded-2xl flex items-center px-4 py-0.5 shadow-sm ring-1 ring-black/5">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite um gasto..."
              className="flex-1 py-3 text-xs lg:text-sm focus:outline-none bg-transparent text-[#521256]"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-[#f170c3] p-1.5 hover:bg-[#efd2fe] rounded-full transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </div>
          <button 
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !previewImage)}
            className="bg-[#f170c3] text-white p-3.5 rounded-2xl shadow-lg active:scale-95 disabled:opacity-40"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
