import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, PaymentMethod } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Partial<Transaction>) => void;
  type: TransactionType;
  availableCategories: string[];
  initialData?: Transaction | null;
  onAddCategory?: (name: string) => void;
  onOpenCategoryManager?: () => void;
  closingDay?: number;
  defaultDate?: string;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, onClose, onSave, type, availableCategories = [], initialData, onAddCategory, onOpenCategoryManager, closingDay = 6, defaultDate 
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  
  const [cardType, setCardType] = useState<'Nubank' | 'Porto'>('Nubank');
  const [isRecurring, setIsRecurring] = useState(false);
  const [invoiceMonth, setInvoiceMonth] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Parcelas
  const [currentInstallment, setCurrentInstallment] = useState(1);
  const [totalInstallments, setTotalInstallments] = useState(1);

  const calculateInvoiceMonth = (purchaseDate: string) => {
    if (!purchaseDate) return new Date().toISOString().slice(0, 7);
    const pDate = new Date(purchaseDate + 'T12:00:00');
    const day = pDate.getDate();
    if (day > closingDay) { pDate.setMonth(pDate.getMonth() + 1); }
    return pDate.toISOString().slice(0, 7);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // MODO EDIÇÃO
        setDescription(initialData.description);
        setAmount(initialData.amount.toString());
        setCategory(initialData.category);
        setDate(initialData.date);
        setPaymentMethod(initialData.paymentMethod);
        setIsRecurring(initialData.isRecurring || false);
        setInvoiceMonth(initialData.invoiceMonth || calculateInvoiceMonth(initialData.date));
        if (initialData.cardType) setCardType(initialData.cardType);
        
        if (initialData.installment) {
            setCurrentInstallment(initialData.installment.current);
            setTotalInstallments(initialData.installment.total);
        } else {
            setCurrentInstallment(1);
            setTotalInstallments(1);
        }
      } else {
        // MODO NOVO
        setDescription('');
        setAmount('');
        setCategory('');
        
        // Usa a data sugerida (Extrato) ou Hoje (Dashboard)
        const baseDate = defaultDate || new Date().toISOString().split('T')[0];
        setDate(baseDate);
        
        setPaymentMethod(PaymentMethod.PIX);
        setIsRecurring(false);
        setInvoiceMonth(calculateInvoiceMonth(baseDate));
        setCardType('Nubank');
        setCurrentInstallment(1);
        setTotalInstallments(1);
      }
    }
  }, [isOpen, initialData, closingDay, defaultDate]);

  useEffect(() => {
    if (!initialData && date) { setInvoiceMonth(calculateInvoiceMonth(date)); }
  }, [date, closingDay]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Tratamento simples do valor
    const val = parseFloat(amount.toString().replace(',', '.'));

    onSave({
      description,
      amount: isNaN(val) ? 0 : val, // Se der erro, salva 0 em vez de travar
      category,
      type,
      paymentMethod,
      cardType: (type === TransactionType.EXPENSE && paymentMethod === PaymentMethod.CREDIT_CARD) ? cardType : undefined,
      date,
      isRecurring,
      invoiceMonth: (type === TransactionType.EXPENSE && paymentMethod === PaymentMethod.CREDIT_CARD) ? invoiceMonth : undefined,
      installment: totalInstallments > 1 ? { current: currentInstallment, total: totalInstallments } : undefined
    });
    onClose();
  };

  const handleAddCategory = () => { if (newCategory && onAddCategory) { onAddCategory(newCategory); setCategory(newCategory); setNewCategory(''); setIsAddingCategory(false); } };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-[#521256]">
            {initialData ? 'Editar ✏️' : (type === TransactionType.INCOME ? 'Nova Receita 🤑' : 'Nova Despesa 💸')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><svg className="w-6 h-6 text-[#521256]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Descrição</label>
            <input autoFocus={!initialData} type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Mercado, Uber..." className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] focus:outline-none focus:ring-2 focus:ring-[#f170c3]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Valor (R$)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] focus:outline-none focus:ring-2 focus:ring-[#f170c3]" />
            </div>
            <div>
              <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] focus:outline-none focus:ring-2 focus:ring-[#f170c3]" />
            </div>
          </div>

          {type === TransactionType.EXPENSE && (
            <div>
              <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Pagamento</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] text-sm focus:outline-none focus:ring-2 focus:ring-[#f170c3]">
                {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {type === TransactionType.EXPENSE && paymentMethod === PaymentMethod.CREDIT_CARD && (
             <div className="bg-[#efd2fe]/40 p-4 rounded-xl animate-in slide-in-from-top-2 border border-[#f170c3]/20">
                <label className="text-[10px] font-black text-[#521256]/60 uppercase tracking-widest mb-2 block">Qual Cartão?</label>
                <div className="flex gap-3 mb-4">
                    <button type="button" onClick={() => setCardType('Nubank')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${cardType === 'Nubank' ? 'bg-[#820ad1] text-white shadow-lg scale-105' : 'bg-white text-[#820ad1] border border-[#820ad1]/20'}`}>🟣 Nubank</button>
                    <button type="button" onClick={() => setCardType('Porto')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${cardType === 'Porto' ? 'bg-[#00a1fc] text-white shadow-lg scale-105' : 'bg-white text-[#00a1fc] border border-[#00a1fc]/20'}`}>🔵 Porto</button>
                </div>

                <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-[#521256]/60 uppercase tracking-widest mb-1 block">Parcela Atual</label>
                        <input type="number" min="1" value={currentInstallment} onChange={(e) => setCurrentInstallment(Number(e.target.value))} className="w-full px-4 py-2 bg-white rounded-lg font-bold text-[#521256] text-center focus:outline-none focus:ring-2 focus:ring-[#f170c3]" />
                    </div>
                    <div className="flex items-center pt-5 font-black text-[#521256]/40">DE</div>
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-[#521256]/60 uppercase tracking-widest mb-1 block">Total Parcelas</label>
                        <input type="number" min="1" value={totalInstallments} onChange={(e) => setTotalInstallments(Number(e.target.value))} className="w-full px-4 py-2 bg-white rounded-lg font-bold text-[#521256] text-center focus:outline-none focus:ring-2 focus:ring-[#f170c3]" />
                    </div>
                </div>

                <label className="text-[10px] font-black text-[#521256]/60 uppercase tracking-widest mb-1 block">Fatura de Referência</label>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-[#f170c3]/30">
                    <input type="month" value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value)} className="flex-1 bg-transparent font-bold text-[#521256] focus:outline-none text-sm" />
                    <span className="text-xs text-[#521256]/40 font-bold">📅</span>
                </div>
             </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Categoria</label>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setIsAddingCategory(!isAddingCategory)} className="text-[10px] font-bold text-[#f170c3] hover:underline">+ Criar</button>
                    {onOpenCategoryManager && <button type="button" onClick={onOpenCategoryManager} className="text-[10px] font-bold text-[#521256] hover:underline">Gerenciar</button>}
                </div>
            </div>
            {isAddingCategory ? (
                <div className="flex gap-2">
                    <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 px-4 py-3 bg-[#efd2fe]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold text-sm" placeholder="Nome..." autoFocus />
                    <button type="button" onClick={handleAddCategory} className="bg-[#f170c3] text-white px-4 rounded-xl font-bold text-sm shadow-md">OK</button>
                </div>
            ) : (
                <select required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold appearance-none">
                <option value="">Selecione...</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            )}
          </div>

          {!initialData && (
            <div className="flex items-center gap-3 bg-[#efd2fe]/20 p-3 rounded-xl border border-[#efd2fe] mt-2 cursor-pointer hover:bg-[#efd2fe]/40 transition-colors" onClick={() => setIsRecurring(!isRecurring)}>
              <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${isRecurring ? 'bg-[#f170c3]' : 'bg-gray-300'}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${isRecurring ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
              <div><p className="font-bold text-[#521256] text-xs">Fixar (12x Automático)</p><p className="text-[9px] opacity-60">Gera 12 lançamentos numerados (1/12, 2/12...)</p></div>
            </div>
          )}

          <button type="submit" className="w-full py-4 bg-[#521256] text-white font-black rounded-xl hover:scale-[1.01] active:scale-95 transition-all shadow-lg mt-4 text-sm uppercase tracking-widest">
            {initialData ? 'SALVAR ALTERAÇÕES' : 'ADICIONAR'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
