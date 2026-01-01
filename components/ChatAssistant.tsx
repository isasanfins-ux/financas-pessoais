import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Transaction, MarketItem, CategoryBudget } from '../types';

interface ChatAssistantProps {
  transactions: Transaction[];
  marketItems: MarketItem[];
  budgets: CategoryBudget[];
  currentBalance: number;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ transactions, marketItems, budgets, currentBalance }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Oii! Sou sua Miga Financeira 💁‍♀️💸. Tô de olho em tudo aqui. Pode perguntar sobre seus gastos, o mercado ou pedir dicas!' }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Rola para baixo quando chega mensagem nova
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- CONFIGURAÇÃO DA IA ---
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // PREPARAÇÃO DOS DADOS (O CONTEXTO DA IA)
      // Aqui transformamos seus dados em texto para a IA ler
      const financialContext = JSON.stringify({
        saldo_atual: currentBalance,
        ultimas_transacoes: transactions.slice(0, 20), // Manda as 20 últimas para não ficar gigante
        gastos_mercado: marketItems,
        tetos_orcamento: budgets,
        data_hoje: new Date().toLocaleDateString('pt-BR')
      });

      const prompt = `
        Você é a "Miga Financeira", uma assistente pessoal de finanças divertida, direta e muito organizada.
        
        SEUS DADOS ATUAIS (Não invente dados, use estes):
        ${financialContext}

        SUAS REGRAS:
        1. Responda de forma curta e amigável, usando emojis.
        2. Se o saldo estiver baixo, dê um alerta carinhoso.
        3. Se perguntarem sobre gastos, some os valores baseados no JSON acima.
        4. Analise se a pessoa está gastando muito com "Mimos" (MarketItems type 'luxury').
        5. Fale em Português do Brasil.
        6. Se não souber a resposta (ex: dados muito antigos que não estão na lista), diga que só consegue ver os dados recentes.

        Pergunta do usuário: ${userMsg}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setMessages(prev => [...prev, { role: 'model', text: text }]);
    } catch (error) {
      console.error("Erro na IA:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Miga, dei uma tontura aqui... Tenta de novo? 😵‍💫' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* JANELA DO CHAT */}
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-[#efd2fe] overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300" style={{ height: '500px' }}>
          
          {/* Header */}
          <div className="bg-[#521256] p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-lg">🤖</div>
              <div>
                <h3 className="text-white font-bold text-sm">Miga Financeira</h3>
                <p className="text-white/60 text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Online
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fdf4ff]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] p-3 rounded-2xl text-sm font-medium
                  ${msg.role === 'user' 
                    ? 'bg-[#521256] text-white rounded-br-none' 
                    : 'bg-white text-[#521256] shadow-sm border border-[#efd2fe] rounded-bl-none'}`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-[#efd2fe]">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#f170c3] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#f170c3] rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-[#f170c3] rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-[#efd2fe]">
            <div className="flex items-center gap-2 bg-[#efd2fe]/30 rounded-full px-4 py-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Pergunte algo..."
                className="flex-1 bg-transparent text-sm text-[#521256] placeholder-[#521256]/40 focus:outline-none font-medium"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="text-[#f170c3] hover:text-[#521256] disabled:opacity-30 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÃO FLUTUANTE (FAB) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-14 h-14 bg-[#521256] text-white rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 border-4 border-[#efd2fe]"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
        ) : (
          <span className="text-2xl animate-pulse">✨</span>
        )}
        
        {/* Tooltipzinha */}
        {!isOpen && (
          <span className="absolute right-16 bg-white text-[#521256] text-xs font-bold px-3 py-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Miga Financeira
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatAssistant;
