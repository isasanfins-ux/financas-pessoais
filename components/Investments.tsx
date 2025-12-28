import React, { useState, useMemo } from 'react';
import { InvestmentTransaction } from '../types';

interface InvestmentsProps {
  history: InvestmentTransaction[]; // Agora recebe dados reais!
  onAddTransaction: (t: Omit<InvestmentTransaction, 'id'>) => void;
  onUpdateTransaction: (t: InvestmentTransaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const Investments: React.FC<InvestmentsProps> = ({ 
  history, 
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction 
}) => {
  // Estados dos Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvestmentTransaction | null>(null);
  
  // Estado do Formulário
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'deposit' as 'deposit' | 'withdrawal'
  });

  // Navegação de Data
  const [currentDate, setCurrentDate] = useState(new Date());

  // Cálculo do Patrimônio Total baseado no Histórico REAL
  const totalPatrimony = useMemo(() => {
    return history.reduce((acc, curr) => {
      return curr.type === 'deposit' 
        ? acc + curr.amount 
        : acc - curr.amount;
    }, 0);
  }, [history]);

  // Filtro por Mês
  const filteredHistory = useMemo(() => {
    const targetMonth = currentDate.getMonth();
    const targetYear = currentDate.getFullYear();
    
    return history.filter(item => {
      // Ajuste de fuso horário simples para garantir que a data bata
      const itemDate = new Date(item.date + 'T12:00:00'); 
      return itemDate.getMonth() === targetMonth && itemDate.getFullYear() === targetYear;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [history, currentDate]);

  // Handlers Conectados ao Firebase
  const handleOpenModal = (item?: InvestmentTransaction) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        description: item.description,
        amount: item.amount.toString(),
        date: item.date,
        type: item.type
      });
    } else {
      setEditingItem(null);
      setFormData({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'deposit'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const amountVal = parseFloat(formData.amount);
    if (!formData.description || isNaN(amountVal)) return;

    if (editingItem) {
      // Editar no Firebase
      onUpdateTransaction({
        ...editingItem,
        description: formData.description,
        amount: amountVal,
        date: formData.date,
        type: formData.type
      });
    } else {
      // Criar no Firebase
      onAddTransaction({
        description: formData.description,
        amount: amountVal,
        date: formData.date,
        type: formData.type
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      onDeleteTransaction(id);
    }
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  const monthLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-10">
      
      {/* Top Card: Total Patrimony */}
      <div className="bg-[#e2e585] rounded-[3rem] p-10 lg:p-14 shadow-2xl shadow-[#e2e585]/20 border border-white/50 text-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -mr-20 -mt-20 blur-3xl transition-transform group-hover:scale-110"></div>
        <div className="relative z-10">
          <span className="text-xs font-black text-[#521256]/40 uppercase tracking-[0.3em] mb-4 block">Patrimônio Total Investido 📈</span>
          <h2 className="text-5xl lg:text-7xl font-black text-[#521256] tracking-tighter">
            R$ {totalPatrimony.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
        </div>
      </div>

      {/* Extrato de Investimentos */}
      <div className="bg-white/80 rounded-[2.5rem] p-8 lg:p-10 shadow-xl shadow-[#521256]/5 border border-white/40">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-xl font-black text-[#521256] mb-1">Extrato de Movimentações 📝</h3>
            <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Controle seus aportes e retiradas</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            {/* Navegação de Data */}
            <div className="flex items-center gap-4 bg-[#efd2fe]/30 p-2 rounded-2xl justify-between md:justify-start">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white text-[#521256] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-sm font-black text-[#521256] min-w-[140px] text-center capitalize">{monthLabel}</span>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white text-[#521256] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* Botão Novo Lançamento */}
            <button 
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-[#521256] text-white font-black rounded-2xl text-xs uppercase shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>+</span> Novo Lançamento
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-12 px-6 pb-2 text-[10px] font-black uppercase tracking-widest text-[#521256]/30 hidden md:grid">
            <div className="col-span-2">Data</div>
            <div className="col-span-5">Descrição</div>
            <div className="col-span-3 text-right">Valor</div>
            <div className="col-span-2 text-right">Ações</div>
          </div>

          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 items-center px-6 py-4 bg-white rounded-2xl border border-[#efd2fe]/50 hover:border-[#f170c3] transition-colors group gap-4 md:gap-0">
                <div className="flex justify-between md:hidden w-full mb-2">
                   <span className="text-xs font-bold text-[#521256]/60">{new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                   <span className={`text-sm font-black ${item.type === 'deposit' ? 'text-[#521256]' : 'text-red-500'}`}>
                    {item.type === 'deposit' ? '+' : '-'} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </span>
                </div>

                <div className="col-span-2 text-xs font-bold text-[#521256]/60 hidden md:block">
                  {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                </div>
                <div className="col-span-5">
                  <p className="text-sm font-black text-[#521256]">{item.description}</p>
                </div>
                <div className="col-span-3 text-right hidden md:block">
                  <span className={`text-sm font-black ${item.type === 'deposit' ? 'text-[#521256]' : 'text-red-500'}`}>
                    {item.type === 'deposit' ? '+' : '-'} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="col-span-2 flex justify-end gap-2">
                  <button onClick={() => handleOpenModal(item)} className="p-2 text-[#521256]/40 hover:text-[#521256] hover:bg-[#efd2fe]/30 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))
          ) : (
             <div className="py-12 text-center text-[#521256]/30 font-bold bg-[#efd2fe]/10 rounded-2xl border border-dashed border-[#efd2fe]">
               Nenhuma movimentação neste mês.
             </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-[#521256] mb-8 text-center">{editingItem ? 'Editar Lançamento ✏️' : 'Novo Lançamento ✨'}</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex bg-[#efd2fe]/30 p-1 rounded-xl">
                <button onClick={() => setFormData({...formData, type: 'deposit'})} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase transition-all ${formData.type === 'deposit' ? 'bg-[#521256] text-white shadow-md' : 'text-[#521256]/50 hover:bg-white/50'}`}>Entrada 💰</button>
                <button onClick={() => setFormData({...formData, type: 'withdrawal'})} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase transition-all ${formData.type === 'withdrawal' ? 'bg-red-500 text-white shadow-md' : 'text-[#521256]/50 hover:bg-white/50'}`}>Saída 💸</button>
              </div>
              <div>
                <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-2 block">Descrição</label>
                <input autoFocus type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Ex: Aporte Mensal..." className="w-full px-5 py-4 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-2 block">Valor (R$)</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0,00" className="w-full px-5 py-4 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-black" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-2 block">Data</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-4 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold text-sm" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={handleSave} className="w-full py-5 bg-[#f170c3] text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase text-xs tracking-widest">{editingItem ? 'Salvar' : 'Confirmar'}</button>
              <button onClick={() => setIsModalOpen(false)} className="w-full py-4 text-[#521256] font-black hover:bg-[#efd2fe]/50 rounded-2xl transition-colors text-xs uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;
