
import React, { useState, useEffect, useRef } from 'react';
import { Transaction, TransactionType, PaymentMethod } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Partial<Transaction>) => void;
  type: TransactionType;
  initialData?: Transaction;
  availableCategories?: string[];
  onAddCategory?: (name: string) => void;
  onOpenCategoryManager?: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  type, 
  initialData,
  availableCategories = [],
  onAddCategory,
  onOpenCategoryManager
}) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    paymentMethod: PaymentMethod.DEBIT,
    isRecurring: false,
    date: new Date().toISOString().split('T')[0]
  });

  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        description: initialData.description,
        amount: initialData.amount.toString(),
        category: initialData.category,
        paymentMethod: initialData.paymentMethod,
        isRecurring: initialData.isRecurring,
        date: initialData.date
      });
    } else {
      setFormData({
        description: '',
        amount: '',
        category: '',
        paymentMethod: type === TransactionType.INCOME ? PaymentMethod.DEBIT : PaymentMethod.DEBIT,
        isRecurring: false,
        date: new Date().toISOString().split('T')[0]
      });
    }
  }, [initialData, isOpen, type]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowCategorySuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const filteredCategories = availableCategories.filter(cat => 
    cat.toLowerCase().includes(formData.category.toLowerCase())
  );

  const exactMatch = availableCategories.some(cat => 
    cat.toLowerCase() === formData.category.trim().toLowerCase()
  );

  const handleSave = () => {
    if (!formData.description || !formData.amount || !formData.category) return;
    onSave({
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
      paymentMethod: formData.paymentMethod,
      isRecurring: formData.isRecurring,
      type: initialData ? initialData.type : type,
      date: formData.date
    });
    onClose();
  };

  const handleCreateNewCategory = () => {
    const newName = formData.category.trim();
    if (!newName) return;
    if (onAddCategory) {
      onAddCategory(newName);
    }
    setFormData(prev => ({ ...prev, category: newName }));
    setShowCategorySuggestions(false);
  };

  return (
    <div className="fixed inset-0 bg-[#521256]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-[#521256]">
            {initialData ? 'Editar Lançamento ✏️' : (type === TransactionType.INCOME ? 'Nova Receita 💰' : 'Nova Despesa 💸')}
          </h3>
          <button onClick={onClose} className="text-[#521256]/40 hover:text-[#521256] transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-black text-[#521256]/50 uppercase tracking-widest block mb-1.5">Descrição</label>
            <input 
              type="text" 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Ex: Almoço, Salário..."
              className="w-full px-6 py-4 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-[#521256]/50 uppercase tracking-widest block mb-1.5">Valor (R$)</label>
              <input 
                type="number" 
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="0,00"
                className="w-full px-6 py-4 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-black text-xl"
              />
            </div>
            <div>
              <label className="text-xs font-black text-[#521256]/50 uppercase tracking-widest block mb-1.5">Data</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-4 py-4 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-[#521256]/50 uppercase tracking-widest block mb-1.5">Forma de Pagamento</label>
            <select 
              value={formData.paymentMethod}
              onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}
              className="w-full px-6 py-4 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold"
            >
              <option value={PaymentMethod.DEBIT}>{PaymentMethod.DEBIT}</option>
              <option value={PaymentMethod.CREDIT_CARD}>{PaymentMethod.CREDIT_CARD}</option>
              <option value={PaymentMethod.CASH}>{PaymentMethod.CASH}</option>
            </select>
          </div>

          <div className="relative" ref={suggestionRef}>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-black text-[#521256]/50 uppercase tracking-widest block">Categoria</label>
              <button 
                type="button"
                onClick={onOpenCategoryManager}
                className="flex items-center gap-1 text-[10px] font-black text-[#f170c3] hover:opacity-80 transition-opacity"
              >
                GERENCIAR ⚙️
              </button>
            </div>
            <input 
              type="text" 
              value={formData.category}
              onChange={(e) => {
                setFormData({...formData, category: e.target.value});
                setShowCategorySuggestions(true);
              }}
              onFocus={() => setShowCategorySuggestions(true)}
              placeholder="Digite para buscar ou criar..."
              className="w-full px-6 py-4 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold"
            />
            
            {showCategorySuggestions && (
              <div className="absolute z-[110] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-[#efd2fe] p-2 max-h-56 overflow-y-auto animate-in slide-in-from-top-2">
                {filteredCategories.length > 0 && filteredCategories.map(cat => (
                  <button 
                    key={cat}
                    type="button"
                    onClick={() => {
                      setFormData({...formData, category: cat});
                      setShowCategorySuggestions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-[#efd2fe]/50 rounded-xl text-[#521256] font-bold text-sm transition-colors"
                  >
                    {cat}
                  </button>
                ))}
                
                {formData.category.trim() !== '' && !exactMatch && (
                  <button 
                    type="button"
                    onClick={handleCreateNewCategory}
                    className="w-full text-left px-4 py-3 bg-[#e2e585]/20 hover:bg-[#e2e585]/40 rounded-xl transition-all border border-dashed border-[#e2e585]"
                  >
                    <p className="text-[10px] uppercase font-black text-[#521256]/60">Nova categoria?</p>
                    <p className="text-sm font-black text-[#521256]">➕ Criar "{formData.category}"</p>
                  </button>
                )}

                {formData.category === '' && filteredCategories.length === 0 && (
                  <p className="px-4 py-3 text-xs font-bold opacity-30 italic">Comece a digitar para ver opções...</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-[#efd2fe]/20 rounded-2xl border border-white">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">🔄</div>
               <div>
                  <p className="text-xs font-black text-[#521256]">Recorrência</p>
                  <p className="text-[10px] font-bold opacity-50">Gasto fixo mensal?</p>
               </div>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.isRecurring}
                onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f170c3]"></div>
            </label>
          </div>

          <button 
            onClick={handleSave}
            className="w-full py-5 bg-[#f170c3] text-white font-black rounded-2xl shadow-xl shadow-[#f170c3]/20 hover:scale-[1.02] active:scale-95 transition-all mt-2"
          >
            {initialData ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR LANÇAMENTO'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
