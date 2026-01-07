import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, PaymentMethod } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Partial<Transaction>) => void;
  type: TransactionType;
  availableCategories: string[];
  onAddCategory?: (name: string) => void;
  onOpenCategoryManager?: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  type,
  availableCategories,
  onOpenCategoryManager
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.DEBIT);
  
  // AQUI ESTÁ A CHAVINHA NOVA! ✨
  const [isRecurring, setIsRecurring] = useState(false);

  // Reseta o formulário quando abre
  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setAmount('');
      setCategory('');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod(PaymentMethod.DEBIT);
      setIsRecurring(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category) return;

    onSave({
      description,
      amount: parseFloat(amount.replace(',', '.')),
      category,
      type,
      paymentMethod: type === TransactionType.EXPENSE ? paymentMethod : undefined,
      date,
      isRecurring // Enviando o comando para o App
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-[#521256]">
            {type === TransactionType.INCOME ? 'Nova Receita 🤑' : 'Nova Despesa 💸'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-[#521256]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Descrição</label>
            <input 
              autoFocus
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder={type === TransactionType.INCOME ? "Ex: Salário, Freela..." : "Ex: Mercado, Uber..."}
              className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] focus:outline-none focus:ring-2 focus:ring-[#f170c3]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Valor (R$)</label>
              <input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                placeholder="0,00" 
                className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] focus:outline-none focus:ring-2 focus:ring-[#f170c3]"
              />
            </div>
            <div>
              <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Data</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] focus:outline-none focus:ring-2 focus:ring-[#f170c3]"
              />
            </div>
          </div>

          {type === TransactionType.EXPENSE && (
            <div>
              <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Forma de Pagamento</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] text-sm focus:outline-none focus:ring-2 focus:ring-[#f170c3]"
              >
                <option value={PaymentMethod.DEBIT}>Débito / PIX</option>
                <option value={PaymentMethod.CREDIT_CARD}>Cartão de Crédito</option>
                <option value={PaymentMethod.CASH}>Dinheiro</option>
              </select>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Categoria</label>
              <button type="button" onClick={onOpenCategoryManager} className="text-[9px] font-bold text-[#f170c3] hover:underline">Gerenciar</button>
            </div>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] text-sm focus:outline-none focus:ring-2 focus:ring-[#f170c3]"
            >
              <option value="">Selecione...</option>
              {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* TOGGLE DE RECORRÊNCIA */}
          <div className="flex items-center gap-3 bg-[#efd2fe]/20 p-3 rounded-xl border border-[#efd2fe] mt-2">
            <div 
              onClick={() => setIsRecurring(!isRecurring)}
              className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${isRecurring ? 'bg-[#f170c3]' : 'bg-gray-300'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${isRecurring ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
            <div>
              <p className="font-bold text-[#521256] text-xs">Recorrente (12x)</p>
              <p className="text-[9px] opacity-60">Repetir esse valor pelos próximos meses</p>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-[#521256] text-white font-black rounded-xl hover:scale-[1.01] active:scale-95 transition-all shadow-lg mt-4">
            SALVAR
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
