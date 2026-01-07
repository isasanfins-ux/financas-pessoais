import React, { useState } from 'react';
import { Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  categories: string[];
  onOpenCategoryManager: () => void;
  initialBalance: number;
  initialCreditBill: number;
  totalCreditLimit: number;
  onUpdateInitialBalance: (value: number) => void;
  onUpdateInitialCreditBill: (value: number) => void;
  onUpdateTotalCreditLimit: (value: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  onAddTransaction, 
  categories, 
  onOpenCategoryManager,
  initialBalance,
  initialCreditBill,
  totalCreditLimit,
  onUpdateInitialBalance,
  onUpdateInitialCreditBill,
  onUpdateTotalCreditLimit
}) => {
  // ESTADOS DO FORMULÁRIO
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'pix' | 'cash'>('debit');
  const [isRecurring, setIsRecurring] = useState(false); // <--- O ESTADO DA RECORRÊNCIA

  // CÁLCULOS DO DASHBOARD
  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense' && t.paymentMethod !== 'credit').reduce((acc, t) => acc + t.amount, 0);
  
  const creditCardExpenses = transactions
    .filter(t => t.type === 'expense' && t.paymentMethod === 'credit')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalCreditUsed = initialCreditBill + creditCardExpenses;
  const availableLimit = totalCreditLimit - totalCreditUsed;
  const currentBalance = initialBalance + income - expense;

  const pieData = [
    { name: 'Saldo', value: currentBalance > 0 ? currentBalance : 0, color: '#a3e635' },
    { name: 'Gastos', value: expense, color: '#f472b6' },
    { name: 'Cartão', value: totalCreditUsed, color: '#fbbf24' },
  ].filter(d => d.value > 0);

  // FUNÇÃO DE SALVAR
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category) return;

    // AQUI ESTAVA O PROBLEMA: AGORA ELE MANDA O 'isRecurring' CORRETAMENTE
    onAddTransaction({
      description,
      amount: parseFloat(amount.replace(',', '.')),
      type,
      category,
      date,
      paymentMethod,
      isRecurring // <--- AGORA VAI!
    });

    // LIMPA O FORMULÁRIO
    setDescription('');
    setAmount('');
    setIsRecurring(false);
    alert('Lançamento adicionado com sucesso! ✨');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* CABEÇALHO COM SALDOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Saldo */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#efd2fe]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Saldo Atual</p>
              <h3 className="text-3xl font-black text-[#521256] mt-1">
                R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="bg-[#a3e635]/20 p-2 rounded-full text-xl">💰</div>
          </div>
          <div className="mt-4 pt-4 border-t border-dashed border-[#efd2fe]">
            <label className="text-[9px] font-bold text-[#521256]/50 uppercase">Saldo Inicial (Mês)</label>
            <input 
              type="number" 
              value={initialBalance}
              onChange={(e) => onUpdateInitialBalance(Number(e.target.value))}
              className="w-full mt-1 bg-[#efd2fe]/30 px-2 py-1 rounded text-xs font-bold text-[#521256]" 
            />
          </div>
        </div>

        {/* Card Cartão */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#efd2fe]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Fatura Cartão</p>
              <h3 className="text-3xl font-black text-[#fbbf24] mt-1">
                R$ {totalCreditUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="bg-[#fbbf24]/20 p-2 rounded-full text-xl">💳</div>
          </div>
          <div className="mt-2">
             <p className="text-xs font-bold text-[#521256]/60">Limite Disp: R$ {availableLimit.toLocaleString('pt-BR')}</p>
             <div className="w-full h-1.5 bg-[#efd2fe] rounded-full mt-2 overflow-hidden">
               <div 
                 className="h-full bg-[#fbbf24]" 
                 style={{ width: `${Math.min((totalCreditUsed / totalCreditLimit) * 100, 100)}%` }}
               ></div>
             </div>
          </div>
          <div className="mt-4 pt-4 border-t border-dashed border-[#efd2fe] flex gap-2">
            <div className="flex-1">
               <label className="text-[9px] font-bold text-[#521256]/50 uppercase">Fatura Inicial</label>
               <input type="number" value={initialCreditBill} onChange={(e) => onUpdateInitialCreditBill(Number(e.target.value))} className="w-full mt-1 bg-[#efd2fe]/30 px-2 py-1 rounded text-xs font-bold text-[#521256]" />
            </div>
            <div className="flex-1">
               <label className="text-[9px] font-bold text-[#521256]/50 uppercase">Limite Total</label>
               <input type="number" value={totalCreditLimit} onChange={(e) => onUpdateTotalCreditLimit(Number(e.target.value))} className="w-full mt-1 bg-[#efd2fe]/30 px-2 py-1 rounded text-xs font-bold text-[#521256]" />
            </div>
          </div>
        </div>

        {/* Card Gráfico */}
        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-[#efd2fe] flex flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <p className="text-[10px] font-black opacity-40 uppercase tracking-widest z-10 mb-2">Visão Geral</p>
          <div className="w-full h-32 z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ÁREA DE NOVO LANÇAMENTO */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-[#521256]/5 border border-[#efd2fe]">
        <h2 className="text-xl font-black text-[#521256] mb-6 flex items-center gap-2">
          Novo Lançamento <span className="text-[#f170c3]">✨</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Descrição</label>
              <input 
                type="text" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Ex: Salário, Aluguel, Coxinha..." 
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div>
                <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Tipo</label>
                <div className="flex bg-[#efd2fe]/30 p-1 rounded-xl">
                  <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${type === 'income' ? 'bg-[#a3e635] text-[#1a2e05] shadow-sm' : 'text-[#521256]/40'}`}>ENTRADA</button>
                  <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${type === 'expense' ? 'bg-[#f472b6] text-[#500c25] shadow-sm' : 'text-[#521256]/40'}`}>SAÍDA</button>
                </div>
             </div>

             <div>
                <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Forma de Pagamento</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] text-sm focus:outline-none focus:ring-2 focus:ring-[#f170c3]">
                  <option value="debit">Débito / PIX</option>
                  <option value="credit">Cartão de Crédito</option>
                  <option value="cash">Dinheiro</option>
                </select>
             </div>

             <div>
                <div className="flex justify-between items-center mb-1">
                   <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Categoria</label>
                   <button type="button" onClick={onOpenCategoryManager} className="text-[9px] font-bold text-[#f170c3] hover:underline">Gerenciar</button>
                </div>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] text-sm focus:outline-none focus:ring-2 focus:ring-[#f170c3]">
                  <option value="">Selecione...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
          </div>

          {/* TOGGLE DE RECORRÊNCIA CORRIGIDO */}
          <div className="flex items-center gap-3 bg-[#efd2fe]/20 p-4 rounded-xl border border-[#efd2fe]">
            <div 
              onClick={() => setIsRecurring(!isRecurring)}
              className={`w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${isRecurring ? 'bg-[#f170c3]' : 'bg-gray-300'}`}
            >
              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ${isRecurring ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
            <div>
              <p className="font-bold text-[#521256] text-sm">Gasto Fixo Mensal (Recorrente)</p>
              <p className="text-[10px] opacity-60">Se ativar, vou repetir esse lançamento nos próximos 12 meses.</p>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-[#521256] text-white font-black rounded-xl hover:scale-[1.01] active:scale-95 transition-all shadow-lg text-lg">
            ADICIONAR LANÇAMENTO
          </button>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
