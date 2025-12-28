
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, CategoryBudget } from '../types';
import { COLORS } from '../constants';

interface PlanningProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  onUpdateBudget: (category: string, newLimit: number) => void;
}

const Planning: React.FC<PlanningProps> = ({ transactions, budgets, onUpdateBudget }) => {
  const [editingBudget, setEditingBudget] = useState<{ category: string, limit: number } | null>(null);
  const [newLimitValue, setNewLimitValue] = useState('');

  const spendingByCategory = useMemo(() => {
    const summary: Record<string, number> = {};
    transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .forEach(t => {
        summary[t.category] = (summary[t.category] || 0) + t.amount;
      });
    return summary;
  }, [transactions]);

  const financialHealth = useMemo(() => {
    // Fix: Explicitly cast operands to number to resolve arithmetic operation type errors on line 30.
    const totalSpent = Object.values(spendingByCategory).reduce((acc: number, curr: number) => (acc as number) + (curr as number), 0);
    const totalLimit = budgets.reduce((acc: number, curr: CategoryBudget) => (acc as number) + (Number(curr.limit) || 0), 0);
    const ratio = (totalSpent as number) / ((totalLimit as number) || 1);

    if (ratio < 0.7) return { label: 'Excelente ✨', color: COLORS.POSITIVE, description: 'Você está brilhando na economia!' };
    if (ratio <= 1.0) return { label: 'Estável 🌤️', color: COLORS.ACCENT, description: 'Tudo sob controle, mas continue atenta.' };
    return { label: 'Crítica 🌧️', color: COLORS.TEXT, description: 'Opa! Passamos um pouco do plano. Vamos reajustar?' };
  }, [spendingByCategory, budgets]);

  const getBarColor = (spent: number, limit: number) => {
    const ratio = spent / (limit || 1);
    if (ratio <= 0.7) return COLORS.POSITIVE; // Citrus Lime
    if (ratio <= 1.0) return COLORS.ACCENT;   // Pink Sherbet
    return COLORS.TEXT;                       // Deep Plum (Burst!)
  };

  const handleOpenEdit = (category: string, currentLimit: number) => {
    setEditingBudget({ category, limit: currentLimit });
    setNewLimitValue(currentLimit.toString());
  };

  const handleSaveBudget = () => {
    if (!editingBudget || !newLimitValue) return;
    onUpdateBudget(editingBudget.category, parseFloat(newLimitValue));
    setEditingBudget(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Financial Health Card */}
      <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-[#521256]/10 border border-white/20 text-center">
        <span className="text-xs font-black opacity-40 uppercase tracking-[0.2em] mb-4 block">Saúde Financeira Geral</span>
        <h2 className="text-4xl lg:text-5xl font-black mb-4" style={{ color: financialHealth.color }}>
          {financialHealth.label}
        </h2>
        <p className="text-base font-semibold text-[#521256] opacity-70">
          {financialHealth.description}
        </p>
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
                  Editar Teto
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
      </div>

      {/* Edit Budget Modal */}
      {editingBudget && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-[#521256] mb-2 text-center">Definir Teto ✨</h3>
            <p className="text-sm font-bold text-[#521256]/40 mb-8 text-center uppercase tracking-widest">{editingBudget.category}</p>
            
            <div className="mb-8">
              <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-[0.2em] mb-2 block">Novo Limite Mensal (R$)</label>
              <input 
                autoFocus
                type="number" 
                value={newLimitValue}
                onChange={(e) => setNewLimitValue(e.target.value)}
                placeholder="0,00"
                className="w-full px-6 py-5 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-black text-2xl text-center"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSaveBudget}
                className="w-full py-5 bg-[#f170c3] text-white font-black rounded-2xl shadow-xl shadow-[#f170c3]/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                SALVAR NOVO TETO
              </button>
              <button 
                onClick={() => setEditingBudget(null)}
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
