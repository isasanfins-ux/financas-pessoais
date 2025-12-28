
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Transaction, TransactionType, PaymentMethod } from '../types';
import { CHART_COLORS, COLORS } from '../constants';
import TransactionModal from './TransactionModal';

interface DashboardProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  categories?: string[];
  onAddCategory?: (name: string) => void;
  onOpenCategoryManager?: () => void;
  initialBalance: number;
  initialCreditBill: number;
  totalCreditLimit: number;
  onUpdateInitialBalance: (val: number) => void;
  onUpdateInitialCreditBill: (val: number) => void;
  onUpdateTotalCreditLimit: (val: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  onAddTransaction, 
  categories = [],
  onAddCategory,
  onOpenCategoryManager,
  initialBalance,
  initialCreditBill,
  totalCreditLimit,
  onUpdateInitialBalance,
  onUpdateInitialCreditBill,
  onUpdateTotalCreditLimit
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.EXPENSE);
  
  // Calibration Modals State
  const [isBalanceCalibrating, setIsBalanceCalibrating] = useState(false);
  const [isCreditCalibrating, setIsCreditCalibrating] = useState(false);
  const [isLimitCalibrating, setIsLimitCalibrating] = useState(false);
  const [calibrationValue, setCalibrationValue] = useState('');

  // Process data for the category pie chart
  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
    const summary: Record<string, number> = {};
    expenses.forEach(t => {
      summary[t.category] = (summary[t.category] || 0) + t.amount;
    });
    return Object.entries(summary)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // Process real data for the monthly income vs expenses bar chart
  const monthlyData = useMemo(() => {
    const summary: Record<string, { month: string, sortKey: string, receitas: number, despesas: number }> = {};
    
    transactions.forEach(t => {
      const date = new Date(t.date + 'T00:00:00');
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
      const year = date.toLocaleDateString('pt-BR', { year: '2-digit' });
      const label = `${monthName.replace('.', '')}/${year}`;
      const sortKey = t.date.substring(0, 7); // YYYY-MM

      if (!summary[sortKey]) {
        summary[sortKey] = {
          month: label.charAt(0).toUpperCase() + label.slice(1),
          sortKey,
          receitas: 0,
          despesas: 0
        };
      }

      if (t.type === TransactionType.INCOME) {
        summary[sortKey].receitas += t.amount;
      } else {
        summary[sortKey].despesas += t.amount;
      }
    });

    return Object.values(summary).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [transactions]);

  const stats = useMemo(() => {
    const receitas = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const immediateExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod !== PaymentMethod.CREDIT_CARD)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const faturaNovosGastos = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const faturaTotal = initialCreditBill + faturaNovosGastos;
    const totalExpenses = immediateExpenses + faturaNovosGastos;
    
    const cardExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    return {
      saldo: initialBalance + receitas - immediateExpenses,
      receitas,
      despesasTotais: totalExpenses,
      fatura: faturaTotal,
      limiteTotal: totalCreditLimit,
      cardExpenses
    };
  }, [transactions, initialBalance, initialCreditBill, totalCreditLimit]);

  const progressPercentage = (stats.fatura / stats.limiteTotal) * 100;

  const handleOpenModal = (type: TransactionType) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleSave = (t: Partial<Transaction>) => {
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substring(7),
      description: t.description!,
      amount: t.amount!,
      category: t.category!,
      type: t.type!,
      paymentMethod: t.paymentMethod || PaymentMethod.DEBIT,
      isRecurring: t.isRecurring || false,
      date: t.date!
    };
    onAddTransaction(newTransaction);
  };

  const openBalanceCalibration = () => {
    setCalibrationValue(initialBalance.toString());
    setIsBalanceCalibrating(true);
  };

  const openCreditCalibration = () => {
    setCalibrationValue(initialCreditBill.toString());
    setIsCreditCalibrating(true);
  };

  const openLimitCalibration = () => {
    setCalibrationValue(totalCreditLimit.toString());
    setIsLimitCalibrating(true);
  };

  const saveCalibration = () => {
    const val = parseFloat(calibrationValue) || 0;
    if (isBalanceCalibrating) onUpdateInitialBalance(val);
    if (isCreditCalibrating) onUpdateInitialCreditBill(val);
    if (isLimitCalibrating) onUpdateTotalCreditLimit(val);
    setIsBalanceCalibrating(false);
    setIsCreditCalibrating(false);
    setIsLimitCalibrating(false);
  };

  const StatCard = ({ title, value, color, bgColor = 'white', textColor = '#521256', onClick }: any) => (
    <div 
      onClick={onClick}
      className={`p-6 rounded-[2rem] shadow-xl shadow-[#521256]/5 border border-white/40 flex flex-col justify-between transition-all group ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''}`} 
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex justify-between items-start">
        <span className="text-[10px] uppercase tracking-widest font-black opacity-50" style={{ color: textColor }}>{title}</span>
        {onClick && (
          <span className="opacity-0 group-hover:opacity-40 transition-opacity">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
          </span>
        )}
      </div>
      <h3 className="text-2xl font-black mt-2 tracking-tight" style={{ color: color || textColor }}>
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </h3>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Saldo Disponível" value={stats.saldo} bgColor={COLORS.BASE} onClick={openBalanceCalibration} />
        <StatCard title="Receitas" value={stats.receitas} color={COLORS.POSITIVE} />
        <StatCard title="Despesas Totais" value={stats.despesasTotais} />
        <StatCard title="Fatura do Cartão" value={stats.fatura} onClick={openCreditCalibration} />
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <button 
          onClick={() => handleOpenModal(TransactionType.INCOME)}
          className="flex items-center gap-3 px-8 py-4 bg-[#e2e585] text-[#521256] rounded-full font-black text-sm shadow-lg shadow-[#e2e585]/20 hover:scale-105 active:scale-95 transition-all"
        >
          <span className="text-xl">+</span> Nova Receita
        </button>
        <button 
          onClick={() => handleOpenModal(TransactionType.EXPENSE)}
          className="flex items-center gap-3 px-8 py-4 bg-[#f170c3] text-white rounded-full font-black text-sm shadow-lg shadow-[#f170c3]/20 hover:scale-105 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          Nova Despesa
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 lg:p-12 shadow-2xl shadow-[#521256]/10 border border-white/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex-1">
            <h3 className="text-2xl font-black text-[#521256] mb-1">Gestão de Fatura ✨</h3>
            <p className="text-sm font-semibold opacity-60">Seu controle diário do cartão de crédito</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-black opacity-40 uppercase tracking-tighter">Limite Disponível</span>
            <p className="text-2xl font-black text-[#521256]">R$ {(stats.limiteTotal - stats.fatura).toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="mb-10">
          <div className="flex justify-between items-end mb-3">
            <span className="text-xs font-black text-[#f170c3] uppercase">Limite Utilizado ({progressPercentage.toFixed(0)}%)</span>
            <button 
              onClick={openLimitCalibration}
              className="flex items-center gap-1 text-xs font-bold text-[#521256]/40 hover:text-[#521256] transition-colors group"
            >
              R$ {stats.limiteTotal.toLocaleString('pt-BR')} total
              <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
            </button>
          </div>
          <div className="w-full h-6 bg-[#efd2fe]/40 rounded-full overflow-hidden p-1 shadow-inner border border-[#efd2fe]">
            <div 
              className="h-full bg-gradient-to-r from-[#f170c3] to-[#521256] rounded-full transition-all duration-1000 ease-out shadow-lg"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black text-[#521256] opacity-40 uppercase tracking-widest mb-4">Últimas do Cartão</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.cardExpenses.map((t) => (
              <div key={t.id} className="bg-[#efd2fe]/30 p-5 rounded-2xl border border-white/50 flex items-center justify-between hover:bg-white transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl shadow-sm">💳</div>
                   <div>
                     <p className="text-sm font-black text-[#521256] line-clamp-1">{t.description}</p>
                     <p className="text-xs font-bold opacity-50">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                   </div>
                </div>
                <span className="text-sm font-black text-[#521256] group-hover:text-[#f170c3]">R$ {t.amount.toLocaleString('pt-BR')}</span>
              </div>
            ))}
            {stats.cardExpenses.length === 0 && (
              <p className="col-span-3 text-center py-4 text-xs font-bold opacity-30 italic">Nenhum gasto recente no cartão de crédito.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white/70 rounded-[2.5rem] p-10 shadow-xl shadow-[#521256]/5 border border-white/40">
          <h3 className="text-xl font-black text-[#521256] mb-8 flex items-center justify-between">
            Análise por Categoria <span>🔎</span>
          </h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '0.8rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/70 rounded-[2.5rem] p-10 shadow-xl shadow-[#521256]/5 border border-white/40">
          <h3 className="text-xl font-black text-[#521256] mb-8 flex items-center justify-between">
            Receitas x Despesas <span>📈</span>
          </h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#efd2fe" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#521256', fontSize: 11, fontWeight: 'bold' }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#efd2fe', opacity: 0.3 }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} />
                <Bar name="Receitas" dataKey="receitas" fill={COLORS.POSITIVE} radius={[10, 10, 0, 0]} />
                <Bar name="Despesas" dataKey="despesas" fill={COLORS.ACCENT} radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {monthlyData.length === 0 && (
            <p className="text-center text-xs opacity-40 italic -mt-8">Lançamentos aparecerão aqui mês a mês.</p>
          )}
        </div>
      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        type={modalType} 
        availableCategories={categories}
        onAddCategory={onAddCategory}
        onOpenCategoryManager={onOpenCategoryManager}
      />

      {/* Calibration Modals */}
      {(isBalanceCalibrating || isCreditCalibrating || isLimitCalibrating) && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-[#521256] mb-2 text-center">
              {isLimitCalibrating ? 'Definir Limite' : 'Calibrar ' + (isBalanceCalibrating ? 'Saldo' : 'Fatura')} ✨
            </h3>
            <p className="text-xs font-bold text-[#521256]/40 mb-8 text-center uppercase tracking-widest">
              {isLimitCalibrating 
                ? 'Qual é o limite somado dos seus cartões?' 
                : (isBalanceCalibrating ? 'Qual o saldo real no seu banco hoje?' : 'Quanto você já gastou nesta fatura?')}
            </p>
            
            <div className="mb-8">
              <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-[0.2em] mb-2 block">Valor em R$</label>
              <input 
                autoFocus
                type="number" 
                value={calibrationValue}
                onChange={(e) => setCalibrationValue(e.target.value)}
                placeholder="0,00"
                className="w-full px-6 py-5 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-black text-3xl text-center"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={saveCalibration}
                className="w-full py-5 bg-[#521256] text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                SALVAR {isLimitCalibrating ? 'LIMITE' : 'AJUSTE'}
              </button>
              <button 
                onClick={() => { setIsBalanceCalibrating(false); setIsCreditCalibrating(false); setIsLimitCalibrating(false); }}
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

export default Dashboard;
