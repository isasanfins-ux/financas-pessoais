import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, PaymentMethod } from '../types';
import TransactionModal from './TransactionModal';

interface HistoryProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  categories: string[];
  onOpenCategoryManager: () => void;
}

const History: React.FC<HistoryProps> = ({ 
  transactions, onAddTransaction, onUpdateTransaction, onDeleteTransaction, categories, onOpenCategoryManager
}) => {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Agrupar por data (mais recente primeiro)
  const groupedTransactions = useMemo(() => {
    const groups: { [date: string]: Transaction[] } = {};
    transactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    // Ordenar datas (decrescente)
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [transactions]);

  const handleEdit = (updated: Partial<Transaction>) => {
    if (editingTransaction) {
      onUpdateTransaction({ ...editingTransaction, ...updated } as Transaction);
      setEditingTransaction(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      onDeleteTransaction(id);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
        <div className="text-6xl mb-4">📭</div>
        <p className="font-bold text-[#521256]">Nenhum lançamento neste mês.</p>
        <p className="text-sm">Que tal adicionar o primeiro?</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end px-4">
        <h2 className="text-2xl font-black text-[#521256]">Extrato 📜</h2>
        <p className="text-xs font-bold text-[#f170c3]">{transactions.length} lançamentos</p>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-[#521256]/5 border border-white/40">
        {groupedTransactions.map(([date, items]) => (
          <div key={date} className="mb-8 last:mb-0">
            <h3 className="text-xs font-black text-[#521256]/40 uppercase tracking-widest mb-4 ml-2 border-b border-gray-100 pb-2">
              {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <div className="space-y-3">
              {items.map((t) => (
                <div key={t.id} onClick={() => setEditingTransaction(t)} className="group flex items-center justify-between p-4 rounded-2xl hover:bg-[#efd2fe]/20 cursor-pointer transition-all border border-transparent hover:border-[#efd2fe]">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ${t.type === TransactionType.INCOME ? 'bg-[#e2e585] text-[#521256]' : 'bg-gray-100 text-gray-500 group-hover:bg-white'}`}>
                      {t.paymentMethod === PaymentMethod.PIX && '💠'}
                      {t.paymentMethod === PaymentMethod.CREDIT_CARD && (t.cardType === 'Porto' ? '🔵' : '🟣')}
                      {t.paymentMethod === PaymentMethod.DEBIT && '💳'}
                      {t.paymentMethod === PaymentMethod.CASH && '💵'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                          <p className="font-black text-[#521256] text-sm">{t.description}</p>
                          
                          {/* --- AQUI ESTÁ O BADGE DA PARCELA! [1/12] --- */}
                          {t.installment && t.installment.total > 1 && (
                              <span className="text-[9px] bg-[#f170c3] text-white px-1.5 py-0.5 rounded font-black shadow-sm">
                                  {t.installment.current}/{t.installment.total}
                              </span>
                          )}
                      </div>
                      <p className="text-[10px] font-bold opacity-40 uppercase">{t.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-sm ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-[#521256]'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                        className="text-[10px] text-red-400 font-bold hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                    >
                        EXCLUIR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editingTransaction && (
        <TransactionModal
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleEdit}
          type={editingTransaction.type}
          availableCategories={categories}
          initialData={editingTransaction}
          onOpenCategoryManager={onOpenCategoryManager}
        />
      )}
    </div>
  );
};

export default History;
