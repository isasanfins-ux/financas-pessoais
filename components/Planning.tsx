import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, CategoryBudget } from '../types';
import { COLORS } from '../constants';

interface PlanningProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  categories: string[]; // <--- Adicionei isso aqui!
  onUpdateBudget: (category: string, newLimit: number) => void;
}

const Planning: React.FC<PlanningProps> = ({ transactions, budgets, categories, onUpdateBudget }) => {
  // Estado para EDIÇÃO
  const [editingBudget, setEditingBudget] = useState<{ category: string, limit: number } | null>(null);
  
  // Estados para CRIAÇÃO (Novo Teto)
  const [isNewBudgetOpen, setIsNewBudgetOpen] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  
  // Valor do input (compartilhado)
  const [limitValue, setLimitValue] = useState('');

  // Lógica de Gastos
  const spendingByCategory = useMemo(() => {
    const summary: Record<string, number> = {};
    transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .forEach(t => {
        summary[t.category] = (summary[t.category] || 0) + t.amount;
      });
    return summary;
  }, [transactions]);

  // Lógica de Saúde Financeira
  const financialHealth = useMemo(() => {
    const totalSpent = Object.values(spendingByCategory).reduce((acc: number, curr: number) => acc + curr, 0);
    const totalLimit = budgets.reduce((acc: number, curr: CategoryBudget) => acc + (Number(curr.limit) || 0), 0);
    const ratio = totalSpent / (totalLimit || 1);

    if (ratio < 0.7) return { label: 'Excelente ✨', color: COLORS.POSITIVE, description: 'Você está brilhando na economia!' };
    if (ratio <= 1.0) return { label: 'Estável 🌤️', color: COLORS.ACCENT, description: 'Tudo sob controle, mas continue atenta.' };
    return { label: 'Crítica 🌧️', color: COLORS.TEXT, description: 'Opa! Passamos um pouco do plano. Vamos reajustar?' };
  }, [spendingByCategory, budgets]);

  // Cores da Barra de Progresso
  const getBarColor = (spent: number, limit: number) => {
    const ratio = spent / (limit || 1);
    if (ratio <= 0.7) return COLORS.POSITIVE;
    if (ratio <= 1.0) return COLORS.ACCENT;
    return COLORS.TEXT;
  };

  // --- Handlers ---

  // Abrir modal de EDIÇÃO
  const handleOpenEdit = (category: string, currentLimit: number) => {
    setEditingBudget({ category, limit: currentLimit });
    setLimitValue(currentLimit.toString());
  };

  // Abrir modal de CRIAÇÃO
  const handleOpenNew = () => {
    setNewBudgetCategory('');
    setLimitValue('');
    setIsNewBudgetOpen(true);
  };

  // Salvar (serve tanto para novo quanto para editado)
  const handleSave = () => {
    const val = parseFloat(limitValue);
    if (!val) return;

    if (editingBudget) {
      onUpdateBudget(editingBudget.category, val);
      setEditingBudget(null);
    } else if (newBudgetCategory) {
      onUpdateBudget(newBudgetCategory, val);
      setIsNewBudgetOpen(false);
    }
  };

  // Filtra categorias que AINDA NÃO têm orçamento definido
  const availableCategoriesForBudget = useMemo(() => {
    const existingCategories = budgets.map(b => b.category);
    return categories.filter(c => !existingCategories.includes(c)).sort();
  }, [categories, budgets]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Financial Health Card */}
      <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-[#521256]/10 border border-white/20 text-center relative overflow-hidden">
        <span className="text-xs font-black opacity-40 uppercase tracking-[0.2em] mb-4 block">Saúde Financeira Geral</span>
        <h2 className="text-4xl lg:text-5xl font-black mb-4" style={{ color: financialHealth.color }}>
          {financialHealth.label}
        </h2>
        <p className="text-base font-semibold text-[#521256] opacity-70 mb-8">
          {financialHealth.description}
        </p>

        {/* Botão Novo Planejamento */}
        <button 
          onClick={handleOpenNew}
          className="px-6 py-3 bg-[#521256] text-white font-black rounded-full text-xs uppercase shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          + Novo Teto
        </button>
      </div>

      {/* Category Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets.map(budget => {
          const spent = spendingByCategory[budget.category] || 0;
          const ratio = (spent / (budget.limit || 1)) * 100;
          const barColor = getBarColor(spent, budget.limit);

          return (
            <div key={budget.category} className="bg-white rounded-[2rem] p-8 shadow-xl shadow-[#521256]/5 border border-white/40 group hover:shadow-2xl transition-all">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-[#521256]">{budget.category}</h3>
                  <p className="text-xs font-bold opacity-40 uppercase">Teto Mensal</p>
                </div>
                <button 
                  onClick={() => handleOpenEdit(budget.category, budget.limit)}
                  className="text-[10px] font-black text-[#f170c3] bg-[#efd2fe]/40 px-3 py-1.5 rounded-full hover:bg-[#f170c3] hover:text-white transition-colors uppercase"
                >
                  Editar
                </button>
              </div>

              <div className="mb-4 flex justify-between items-end">
                <span className="text-sm font-black text-[#521256]">
                  R$ {spent.toLocaleString('pt-BR')} <span className="opacity-40 font-bold">/ R$ {budget.limit.toLocaleString('pt-BR')}</span>
                </span>
                <span className="text-xs font-black" style={{ color: barColor }}>
                  {ratio.toFixed(0)}%
                </span>
              </div>

              <div className="w-full h-4 bg-[#efd2fe]/30 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${Math.min(ratio, 100)}%`, 
                    backgroundColor: barColor,
                  }}
                ></div>
              </div>
              
              {ratio > 100 && (
                <div className="mt-3 flex items-center gap-2">
                   <span className="text-sm">⚠️</span>
                   <p className="text-[10px] font-black text-[#521256] uppercase">
                    Estourado em R$ {(spent - budget.limit).toLocaleString('pt-BR')}
                   </p>
                </div>
              )}
            </div>
          );
        })}
        
        {budgets.length === 0 && (
           <div className="col-span-full py-12 text-center text-[#521256]/30 font-bold bg-[#efd2fe]/10 rounded-2xl border border-dashed border-[#efd2fe]">
             Nenhum teto de gastos definido ainda.
           </div>
        )}
      </div>

      {/* Modal: Novo Teto ou Editar Teto */}
      {(editingBudget || isNewBudgetOpen) && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-[#521256] mb-2 text-center">
              {editingBudget ? 'Editar Teto ✨' : 'Novo Planejamento 🎯'}
            </h3>
            <p className="text-sm font-bold text-[#521256]/40 mb-8 text-center uppercase tracking-widest">
              {editingBudget ? editingBudget.category : 'Defina seus limites'}
            </p>
            
            <div className="space-y-6 mb-8">
              {/* Seletor de Categoria (Aparece só se for Novo) */}
              {isNewBudgetOpen && (
                <div>
                  <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-2 block">Categoria</label>
                  <select
                    value={newBudgetCategory}
                    onChange={(e) => setNewBudgetCategory(e.target.value)}
                    className="w-full px-6 py-4 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {availableCategoriesForBudget.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-2 block">
                  {editingBudget ? 'Novo Limite (R$)' : 'Valor do Teto (R$)'}
                </label>
                <input 
                  autoFocus
                  type="number" 
                  value={limitValue}
                  onChange={(e) => setLimitValue(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-6 py-4 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-black text-2xl text-center"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSave}
                className="w-full py-5 bg-[#f170c3] text-white font-black rounded-2xl shadow-xl shadow-[#f170c3]/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                SALVAR
              </button>
              <button 
                onClick={() => { setEditingBudget(null); setIsNewBudgetOpen(false); }}
                className="w-full py-4 text-[#521256] font-black hover:bg-[#efd2fe]/50 rounded-2xl transition-colors text-sm"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Planning;
