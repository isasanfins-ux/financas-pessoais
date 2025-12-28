
import React, { useState, useMemo } from 'react';
import { InvestmentGoal } from '../types';
import { COLORS } from '../constants';

interface InvestmentsProps {
  goals: InvestmentGoal[];
  onAddGoal: (goal: Omit<InvestmentGoal, 'id'>) => void;
  onUpdateAmount: (goalId: string, additionalAmount: number) => void;
  onDeleteGoal: (goalId: string) => void;
}

const Investments: React.FC<InvestmentsProps> = ({ goals, onAddGoal, onUpdateAmount, onDeleteGoal }) => {
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [newGoalData, setNewGoalData] = useState({ name: '', target: '' });

  const totalPatrimony = useMemo(() => {
    return goals.reduce((acc, curr) => acc + curr.currentAmount, 0);
  }, [goals]);

  const handleOpenDeposit = (id: string) => {
    setSelectedGoalId(id);
    setInputValue('');
    setIsDepositModalOpen(true);
  };

  const handleSaveDeposit = () => {
    const amount = parseFloat(inputValue);
    if (selectedGoalId && !isNaN(amount)) {
      onUpdateAmount(selectedGoalId, amount);
      setIsDepositModalOpen(false);
    }
  };

  const handleSaveNewGoal = () => {
    const target = parseFloat(newGoalData.target);
    if (newGoalData.name && !isNaN(target)) {
      onAddGoal({
        name: newGoalData.name,
        targetAmount: target,
        currentAmount: 0
      });
      setIsNewGoalModalOpen(false);
      setNewGoalData({ name: '', target: '' });
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-10">
      {/* Top Card: Total Patrimony */}
      <div className="bg-[#e2e585] rounded-[3rem] p-10 lg:p-14 shadow-2xl shadow-[#e2e585]/20 border border-white/50 text-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -mr-20 -mt-20 blur-3xl transition-transform group-hover:scale-110"></div>
        <span className="text-xs font-black text-[#521256]/40 uppercase tracking-[0.3em] mb-4 block">Patrimônio Total Investido 📈</span>
        <h2 className="text-5xl lg:text-7xl font-black text-[#521256] tracking-tighter">
          R$ {totalPatrimony.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </h2>
        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => setIsNewGoalModalOpen(true)}
            className="px-8 py-4 bg-[#521256] text-white rounded-full font-black text-xs shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
          >
            + Nova Caixinha
          </button>
        </div>
      </div>

      {/* Grid: Minhas Caixinhas */}
      <div>
        <div className="flex items-center justify-between mb-8 px-4">
          <h3 className="text-xl font-black text-[#521256]">Minhas Caixinhas ✨</h3>
          <p className="text-xs font-bold opacity-40 uppercase tracking-widest">{goals.length} objetivos ativos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => {
            const progress = (goal.currentAmount / (goal.targetAmount || 1)) * 100;
            return (
              <div key={goal.id} className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-[#521256]/5 border border-white/40 flex flex-col justify-between group hover:shadow-2xl transition-all">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-12 h-12 bg-[#efd2fe]/40 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                    🎁
                  </div>
                  <button 
                    onClick={() => onDeleteGoal(goal.id)}
                    className="p-2 opacity-0 group-hover:opacity-30 hover:!opacity-100 transition-opacity text-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-black text-[#521256] mb-1">{goal.name}</h4>
                  <div className="flex justify-between items-end">
                    <p className="text-xs font-bold opacity-50">R$ {goal.currentAmount.toLocaleString('pt-BR')} guardados</p>
                    <span className="text-xs font-black text-[#f170c3] bg-[#efd2fe]/40 px-2 py-0.5 rounded-md">{progress.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="w-full h-3 bg-[#efd2fe]/30 rounded-full overflow-hidden mb-8 p-0.5 shadow-inner">
                  <div 
                    className="h-full bg-[#f170c3] rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_#f170c344]"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Meta: R$ {goal.targetAmount.toLocaleString('pt-BR')}</span>
                  <button 
                    onClick={() => handleOpenDeposit(goal.id)}
                    className="flex-1 py-3 bg-[#e2e585] text-[#521256] font-black rounded-2xl text-[10px] uppercase shadow-lg shadow-[#e2e585]/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {goals.length === 0 && (
          <div className="py-20 text-center bg-white/40 rounded-[3rem] border-2 border-dashed border-white">
            <p className="text-[#521256]/30 font-black">Nenhuma caixinha criada ainda. <br/> Que tal definir seu primeiro sonho hoje? 🚀</p>
          </div>
        )}
      </div>

      {/* Modal: Aplicar (Depósito) */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-[#521256] mb-2 text-center">Fazer Aporte ✨</h3>
            <p className="text-xs font-bold text-[#521256]/40 mb-8 text-center uppercase tracking-widest">Quanto vamos guardar hoje?</p>
            
            <div className="mb-8">
              <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-[0.2em] mb-2 block text-center">Valor em R$</label>
              <input 
                autoFocus
                type="number" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="0,00"
                className="w-full px-6 py-5 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-black text-3xl text-center"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSaveDeposit}
                className="w-full py-5 bg-[#521256] text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                APLICAR AGORA
              </button>
              <button 
                onClick={() => setIsDepositModalOpen(false)}
                className="w-full py-4 text-[#521256] font-black hover:bg-[#efd2fe]/50 rounded-2xl transition-colors text-sm"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Caixinha */}
      {isNewGoalModalOpen && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-[#521256] mb-8 text-center">Novo Objetivo ✨</h3>
            
            <div className="space-y-6 mb-8">
              <div>
                <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-2 block">Nome do Sonho</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newGoalData.name}
                  onChange={(e) => setNewGoalData({...newGoalData, name: e.target.value})}
                  placeholder="Ex: Viagem, Carro Novo..."
                  className="w-full px-6 py-4 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-2 block">Valor Alvo (R$)</label>
                <input 
                  type="number" 
                  value={newGoalData.target}
                  onChange={(e) => setNewGoalData({...newGoalData, target: e.target.value})}
                  placeholder="0,00"
                  className="w-full px-6 py-4 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-black text-xl"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSaveNewGoal}
                className="w-full py-5 bg-[#f170c3] text-white font-black rounded-2xl shadow-xl shadow-[#f170c3]/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                CRIAR CAIXINHA
              </button>
              <button 
                onClick={() => setIsNewGoalModalOpen(false)}
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

export default Investments;
