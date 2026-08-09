import React, { useState } from 'react';
import { Transaction, CategoryBudget } from '../types';

interface PlanningProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  categories: string[];
  onUpdateBudget: (category: string, limit: number) => void;
  onDeleteBudget: (category: string) => void;
  embedded?: boolean;
}

const Planning: React.FC<PlanningProps> = ({ 
  transactions, budgets, categories, onUpdateBudget, onDeleteBudget, embedded = false 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');

  // Calcula quanto já gastou em cada categoria neste mês
  const spendingByCategory = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const handleSave = () => {
    if (selectedCategory && amount) {
      onUpdateBudget(selectedCategory, parseFloat(amount.replace(',', '.')));
      setIsModalOpen(false);
      setSelectedCategory('');
      setAmount('');
    }
  };

  // --- GRID DE TETOS (compartilhado entre a home e a versão antiga) ---
  const budgetsGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {budgets.map(budget => {
        const spent = spendingByCategory[budget.category] || 0;
        const percentage = Math.min((spent / budget.limit) * 100, 100);
        const isOver = spent > budget.limit;

        return (
          <div key={budget.category} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-[#efd2fe] transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-[#521256] text-lg">{budget.category}</h3>
              <button 
                onClick={() => onDeleteBudget(budget.category)}
                className="text-red-300 hover:text-red-500 transition-colors p-2"
                title="Remover Teto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>

            <div className="mb-2 flex justify-between text-xs font-bold text-[#521256]/60">
              <span>Gasto: R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span>Limite: R$ {budget.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="h-3 bg-[#efd2fe]/30 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${isOver ? 'bg-red-500' : 'bg-[#f170c3]'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            {isOver ? (
                <p className="text-[10px] text-red-500 font-bold mt-2 text-center animate-pulse">⚠️ Limite excedido!</p>
            ) : (
                <p className="text-[10px] text-[#f170c3] font-bold mt-2 text-center">
                    {(100 - percentage).toFixed(0)}% disponível
                </p>
            )}
          </div>
        );
      })}
    </div>
  );

  // --- MODAL PARA ADICIONAR (compartilhado) ---
  const modal = isModalOpen && (
    <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in duration-300">
        <h3 className="text-xl font-black text-[#521256] mb-6 text-center">Definir Limite 🎯</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest ml-1">Categoria</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] outline-none focus:ring-2 focus:ring-[#f170c3]"
            >
              <option value="">Selecione...</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest ml-1">Valor Limite (R$)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="0,00"
              className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] outline-none focus:ring-2 focus:ring-[#f170c3]" 
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="flex-1 bg-[#521256] text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-all">SALVAR</button>
            <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">CANCELAR</button>
          </div>
        </div>
      </div>
    </div>
  );

  // --- VERSÃO ENXUTA (dentro da home, embaixo dos cartões) ---
  if (embedded) {
    return (
      <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-xl shadow-[#521256]/5 border border-white/40">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h3 className="text-2xl font-black text-[#521256]">Tetos de Gastos 🎯</h3>
            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Seu planejamento do mês</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#521256] text-white px-6 py-3 rounded-full font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg whitespace-nowrap"
          >
            + Novo teto
          </button>
        </div>

        {budgets.length === 0 ? (
          <p className="text-center py-8 text-sm font-bold opacity-30 italic">Nenhum teto definido ainda. Que tal começar por uma categoria que costuma escapar? 🎯</p>
        ) : budgetsGrid}

        {modal}
      </div>
    );
  }

  // --- VERSÃO ANTIGA (tela cheia — mantida por segurança) ---
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl text-center border border-[#efd2fe]">
        <p className="text-xs font-black text-[#521256]/40 uppercase tracking-widest mb-2">
          Planejamento Mensal
        </p>
        <h2 className="text-3xl font-black text-[#521256] mb-2 flex items-center justify-center gap-2">
          Organize seus Limites ✨
        </h2>
        <p className="text-sm font-medium text-[#521256]/60 mb-6 max-w-md mx-auto">
          Defina tetos de gastos para suas categorias e acompanhe sua evolução para não ter surpresas!
        </p>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#521256] text-white px-8 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg"
        >
          + NOVO TETO
        </button>
      </div>

      {budgetsGrid}

      {budgets.length === 0 && (
        <div className="text-center py-10 opacity-40">
          <p className="font-bold text-[#521256]">Nenhum teto de gastos definido ainda.</p>
        </div>
      )}

      {modal}
    </div>
  );
};

export default Planning;
