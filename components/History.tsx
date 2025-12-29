import React, { useState } from 'react';
import { Transaction, TransactionType, PaymentMethod } from '../types';
import TransactionModal from './TransactionModal';

interface HistoryProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  categories?: string[];
  onAddCategory?: (name: string) => void;
  onOpenCategoryManager?: () => void;
}

const History: React.FC<HistoryProps> = ({ 
  transactions, 
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction,
  categories = [],
  onAddCategory,
  onOpenCategoryManager
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // 1. ORDENAÇÃO INTELIGENTE 🧠
  // Primeiro organiza por DATA. Se empatar, organiza por QUEM FOI CRIADO POR ÚLTIMO.
  const sorted = [...transactions].sort((a, b) => {
    // Compara as datas (Texto YYYY-MM-DD)
    const dateCompare = b.date.localeCompare(a.date);
    
    // Se as datas forem diferentes, retorna a ordem de data
    if (dateCompare !== 0) {
      return dateCompare;
    }

    // Se as datas forem iguais, desempatamos pelo 'createdAt' (quem tem maior timestamp é mais novo)
    // Usamos 'as any' para não travar caso suas transações antigas não tenham esse campo ainda
    const createdA = (a as any).createdAt || 0;
    const createdB = (b as any).createdAt || 0;
    
    return createdB - createdA;
  });

  const handleOpenModal = (type: TransactionType, transaction?: Transaction) => {
    setModalType(type);
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleSave = (t: Partial<Transaction>) => {
    if (editingTransaction) {
      onUpdateTransaction({ ...editingTransaction, ...t } as Transaction);
    } else {
      // 2. CRIAÇÃO COM CARIMBO DE TEMPO ⏰
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substring(7),
        description: t.description!,
        amount: t.amount!,
        category: t.category!,
        type: t.type!,
        paymentMethod: t.paymentMethod || PaymentMethod.DEBIT,
        isRecurring: t.isRecurring || false,
        date: t.date!,
        // Adicionamos isso aqui para saber a ordem exata de criação:
        createdAt: Date.now() 
      } as Transaction; // Forçamos o tipo para aceitar o campo novo
      
      onAddTransaction(newTransaction);
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CREDIT_CARD: return '💳';
      case PaymentMethod.CASH: return '💵';
      default: return '🏦';
    }
  };

  return (
    <div className="space-y-8 py-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h2 className="text-2xl font-black text-[#521256]">Seu Extrato ✨</h2>
        
        <div className="flex gap-3">
          <button 
            onClick={() => handleOpenModal(TransactionType.INCOME)}
            className="flex items-center gap-2 px-6 py-3 bg-[#e2e585] text-[#521256] rounded-full font-black text-xs shadow-md hover:scale-105 transition-all"
          >
            <span>+</span> NOVA RECEITA
          </button>
          <button 
            onClick={() => handleOpenModal(TransactionType.EXPENSE)}
            className="flex items-center gap-2 px-6 py-3 bg-[#f170c3] text-white rounded-full font-black text-xs shadow-md hover:scale-105 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            NOVA DESPESA
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {sorted.map(t => (
          <div key={t.id} className="bg-white rounded-[2rem] p-5 flex items-center gap-4 shadow-sm group hover:shadow-xl transition-all border border-transparent hover:border-[#f170c3]/20">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${t.type === TransactionType.INCOME ? 'bg-[#e2e585]/30' : 'bg-[#efd2fe]/50'}`}>
              <span className="text-2xl">
                {t.type === TransactionType.INCOME ? '💰' : '🛍️'}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="font-black text-[#521256] text-sm lg:text-base truncate">{t.description}</h4>
                {t.isRecurring && <span className="text-[10px] bg-[#efd2fe] px-2 py-0.5 rounded-full font-black text-[#521256]/60">FIXO</span>}
              </div>
              <div className="flex items-center gap-2">
                {/* 3. DATA CORRIGIDA VISUALMENTE (Com T12:00:00) */}
                <p className="text-[10px] opacity-50 uppercase font-black text-[#521256] tracking-widest">
                  {t.category} • {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
                <span className="text-[10px] opacity-40 font-bold" title={t.paymentMethod}>
                  {getMethodIcon(t.paymentMethod)} {t.paymentMethod}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className={`text-sm lg:text-base font-black ${t.type === TransactionType.INCOME ? 'text-lime-600' : 'text-red-500'}`}>
                {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleOpenModal(t.type, t)}
                  className="p-2 text-[#521256]/40 hover:text-[#521256] hover:bg-[#efd2fe]/50 rounded-full transition-all"
                  title="Editar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button 
                  onClick={() => setItemToDelete(t.id)}
                  className="p-2 text-[#521256]/40 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  title="Excluir"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <div className="py-20 text-center bg-white/40 rounded-[2.5rem] border-2 border-dashed border-white">
            <p className="text-[#521256]/40 font-black">Nenhum lançamento encontrado. <br/> Comece agora adicionando suas receitas e despesas! ✨</p>
          </div>
        )}
      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(undefined);
        }} 
        onSave={handleSave} 
        type={modalType}
        initialData={editingTransaction}
        availableCategories={categories}
        onAddCategory={onAddCategory}
        onOpenCategoryManager={onOpenCategoryManager}
      />

      {itemToDelete && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-black text-[#521256] mb-2">Excluir Lançamento?</h3>
            <p className="text-sm font-semibold text-[#521256]/60 mb-8">Essa ação não pode ser desfeita, amiga. Tem certeza?</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  onDeleteTransaction(itemToDelete);
                  setItemToDelete(null);
                }}
                className="w-full py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                SIM, EXCLUIR
              </button>
              <button 
                onClick={() => setItemToDelete(null)}
                className="w-full py-4 text-[#521256] font-black hover:bg-[#efd2fe]/50 rounded-2xl transition-colors"
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

export default History;
