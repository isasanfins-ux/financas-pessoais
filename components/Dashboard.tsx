import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction, TransactionType, PaymentMethod } from '../types';
import { CHART_COLORS, COLORS } from '../constants';
import TransactionModal from './TransactionModal';
import Planning from './Planning';

interface DashboardProps {
  transactions: Transaction[]; 
  allTransactions: Transaction[]; 
  currentDate: Date; 
  onAddTransaction: (t: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  categories?: string[];
  onAddCategory?: (name: string) => void;
  onOpenCategoryManager?: () => void;
  initialBalance: number;
  
  initialNubankBill: number;
  initialPortoBill: number;
  
  totalCreditLimit: number;
  nextMonthInvoice: number;
  onUpdateInitialBalance: (val: number) => void;
  
  onUpdateNubankBill: (val: number) => void;
  onUpdatePortoBill: (val: number) => void;
  
  onUpdateInitialCreditBill?: (val: number) => void;
  onUpdateTotalCreditLimit: (val: number) => void;
  onUpdateNextMonthInvoice: (val: number) => void;
  closingDay?: number; 
  budgets?: import('../types').CategoryBudget[];
  onUpdateBudget?: (category: string, limit: number) => void;
  onDeleteBudget?: (category: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions = [], 
  allTransactions = [], 
  currentDate,
  onAddTransaction, 
  onDeleteTransaction,
  categories = [],
  onAddCategory,
  onOpenCategoryManager,
  initialBalance = 0,
  initialNubankBill = 0,
  initialPortoBill = 0,
  totalCreditLimit = 0,
  nextMonthInvoice = 0,
  onUpdateInitialBalance,
  onUpdateNubankBill,
  onUpdatePortoBill,
  onUpdateTotalCreditLimit,
  closingDay = 6,
  budgets = [],
  onUpdateBudget = () => {},
  onDeleteBudget = () => {}
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [isBalanceCalibrating, setIsBalanceCalibrating] = useState(false);
  const [isNubankCalibrating, setIsNubankCalibrating] = useState(false);
  const [isPortoCalibrating, setIsPortoCalibrating] = useState(false);
  const [isLimitCalibrating, setIsLimitCalibrating] = useState(false);
  const [calibrationValue, setCalibrationValue] = useState('');

  const [nubankView, setNubankView] = useState<'CURRENT' | 'NEXT'>('CURRENT');
  const [portoView, setPortoView] = useState<'CURRENT' | 'NEXT'>('CURRENT');

  const [activeDetailType, setActiveDetailType] = useState<'INCOME' | 'DEBIT' | 'CREDIT' | 'CREDIT_NUBANK' | 'CREDIT_PORTO' | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  useEffect(() => setIsReady(true), []);

  const PAYMENT_CATEGORY = "Pagamento de Fatura";
  
  const currentInvoiceMonth = (currentDate || new Date()).toISOString().slice(0, 7);
  
  const nextDate = new Date(currentDate);
  nextDate.setMonth(nextDate.getMonth() + 1);
  const nextInvoiceMonth = nextDate.toISOString().slice(0, 7);

  const categoryData = useMemo(() => {
    if(!transactions) return [];
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE && t.category !== PAYMENT_CATEGORY);
    const summary: Record<string, number> = {};
    expenses.forEach(t => { summary[t.category] = (summary[t.category] || 0) + t.amount; });
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    return Object.entries(summary).map(([name, value]) => ({ name, value, percent: total > 0 ? (value / total) * 100 : 0 })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const stats = useMemo(() => {
    const safeAll = allTransactions || [];
    const safeMonthly = transactions || [];

    const filterByMonth = (t: Transaction, targetMonth: string) => {
      if (t.invoiceMonth) return t.invoiceMonth === targetMonth;
      if (!t.date) return false;
      const [y, m, d] = t.date.split('-').map(Number);
      let tm = m, ty = y;
      if (d > closingDay) { tm++; if(tm>12){tm=1;ty++} }
      return `${ty}-${String(tm).padStart(2, '0')}` === targetMonth;
    };

    const gastosNubankAtual = safeAll
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD && filterByMonth(t, currentInvoiceMonth) && (t.cardType === 'Nubank' || !t.cardType))
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const gastosNubankProximo = safeAll
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD && filterByMonth(t, nextInvoiceMonth) && (t.cardType === 'Nubank' || !t.cardType))
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalFaturaNubankAtual = initialNubankBill + gastosNubankAtual;
    const totalFaturaNubankProxima = gastosNubankProximo;

    const gastosPortoAtual = safeAll
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD && filterByMonth(t, currentInvoiceMonth) && t.cardType === 'Porto')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const gastosPortoProximo = safeAll
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD && filterByMonth(t, nextInvoiceMonth) && t.cardType === 'Porto')
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const totalFaturaPortoAtual = initialPortoBill + gastosPortoAtual;
    const totalFaturaPortoProxima = gastosPortoProximo;

    const receitas = safeMonthly.filter(t => t.type === TransactionType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);

    const saidas = safeMonthly
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod !== PaymentMethod.CREDIT_CARD && t.category !== PAYMENT_CATEGORY)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const immediateExpenses = safeMonthly.filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod !== PaymentMethod.CREDIT_CARD).reduce((acc, curr) => acc + curr.amount, 0);
    const pagamentosFatura = safeMonthly.filter(t => t.category === PAYMENT_CATEGORY).reduce((acc, curr) => acc + curr.amount, 0);

    const cartoesFaturaAtual = totalFaturaNubankAtual + totalFaturaPortoAtual;

    const sobra = receitas - saidas - cartoesFaturaAtual;

    const valorExibidoNubank = nubankView === 'CURRENT' ? totalFaturaNubankAtual : totalFaturaNubankProxima;
    const valorExibidoPorto = portoView === 'CURRENT' ? totalFaturaPortoAtual : totalFaturaPortoProxima;
    const totalCreditUsed = valorExibidoNubank + valorExibidoPorto;

    const cardExpenses = safeAll
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD && filterByMonth(t, currentInvoiceMonth))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    return {
      saldo: initialBalance + receitas - immediateExpenses - pagamentosFatura,
      receitas,
      saidas,
      cartoesFaturaAtual,
      sobra,
      despesasConta: immediateExpenses,
      nubank: { atual: totalFaturaNubankAtual, proxima: totalFaturaNubankProxima, gastosMes: gastosNubankAtual },
      porto: { atual: totalFaturaPortoAtual, proxima: totalFaturaPortoProxima, gastosMes: gastosPortoAtual },
      limiteTotal: totalCreditLimit,
      totalCreditUsed,
      cardExpenses
    };
  }, [transactions, allTransactions, initialBalance, initialNubankBill, initialPortoBill, totalCreditLimit, currentInvoiceMonth, nextInvoiceMonth, closingDay, nubankView, portoView]);

  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions.filter(t => t.category === selectedCategory && t.type === TransactionType.EXPENSE).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCategory, transactions]);

  const detailTransactions = useMemo(() => {
    if (!activeDetailType) return [];

    const filterByMonthHelper = (t: Transaction, targetMonth: string) => {
      if (t.invoiceMonth) return t.invoiceMonth === targetMonth;
      if (!t.date) return false;
      const [y, m, d] = t.date.split('-').map(Number);
      let tm = m, ty = y;
      if (d > closingDay) { tm++; if(tm>12){tm=1;ty++} }
      return `${ty}-${String(tm).padStart(2, '0')}` === targetMonth;
    };

    if (activeDetailType === 'INCOME') return transactions.filter(t => t.type === TransactionType.INCOME).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (activeDetailType === 'DEBIT') return transactions.filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod !== PaymentMethod.CREDIT_CARD && t.category !== PAYMENT_CATEGORY).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (activeDetailType === 'CREDIT') {
      return allTransactions.filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD && filterByMonthHelper(t, currentInvoiceMonth)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    if (activeDetailType === 'CREDIT_NUBANK') {
      const targetMonth = nubankView === 'CURRENT' ? currentInvoiceMonth : nextInvoiceMonth;
      return allTransactions.filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD && (t.cardType === 'Nubank' || !t.cardType) && filterByMonthHelper(t, targetMonth)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    if (activeDetailType === 'CREDIT_PORTO') {
      const targetMonth = portoView === 'CURRENT' ? currentInvoiceMonth : nextInvoiceMonth;
      return allTransactions.filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD && t.cardType === 'Porto' && filterByMonthHelper(t, targetMonth)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return [];
  }, [activeDetailType, transactions, allTransactions, currentInvoiceMonth, nextInvoiceMonth, closingDay, nubankView, portoView]);

  const handleOpenModal = (type: TransactionType) => { setModalType(type); setIsModalOpen(true); };
  const handleSave = (t: Partial<Transaction>) => { onAddTransaction({ ...t, id: Math.random().toString(), createdAt: Date.now() } as any); };
  const handleDelete = (id: string) => {
    if (!onDeleteTransaction) return;
    if (confirm('Excluir este lançamento? Essa ação não pode ser desfeita. 🗑️')) {
      onDeleteTransaction(id);
    }
  };
  
  const openBalanceCalibration = () => { setCalibrationValue(stats.saldo.toFixed(2)); setIsBalanceCalibrating(true); };
  const openNubankCalibration = () => { setCalibrationValue(stats.nubank.atual.toFixed(2)); setIsNubankCalibrating(true); };
  const openPortoCalibration = () => { setCalibrationValue(stats.porto.atual.toFixed(2)); setIsPortoCalibrating(true); };
  const openLimitCalibration = () => { setCalibrationValue(totalCreditLimit.toString()); setIsLimitCalibrating(true); };

  const saveCalibration = () => {
    const val = parseFloat(calibrationValue.replace(',', '.')) || 0;
    if (isBalanceCalibrating) { const currentNetMovement = stats.saldo - initialBalance; onUpdateInitialBalance(val - currentNetMovement); }
    if (isNubankCalibrating) { const novoInicial = val - stats.nubank.gastosMes; onUpdateNubankBill(novoInicial); }
    if (isPortoCalibrating) { const novoInicial = val - stats.porto.gastosMes; onUpdatePortoBill(novoInicial); }
    if (isLimitCalibrating) onUpdateTotalCreditLimit(val);
    
    setCalibrationValue('');
    setIsBalanceCalibrating(false); setIsNubankCalibrating(false); setIsPortoCalibrating(false); setIsLimitCalibrating(false);
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const FlowItem = ({ label, value, valueColor = '#521256', onClick }: any) => (
    <div
      onClick={onClick}
      className={`flex-1 min-w-[130px] bg-white rounded-[1.5rem] px-5 py-4 shadow-lg shadow-[#521256]/5 border border-white/40 flex flex-col justify-center transition-all group ${onClick ? 'cursor-pointer hover:scale-[1.03] active:scale-95 hover:border-[#f170c3]/30' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-black opacity-50 text-[#521256]">{label}</span>
        {onClick && (
          <span className="opacity-0 group-hover:opacity-40 transition-opacity text-[#521256]">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
          </span>
        )}
      </div>
      <h3 className="text-xl lg:text-2xl font-black mt-1 tracking-tight" style={{ color: valueColor }}>R$ {fmt(value)}</h3>
    </div>
  );

  const Operator = ({ symbol }: { symbol: string }) => (
    <span className="text-2xl font-black text-[#521256]/30 px-1 select-none hidden sm:block">{symbol}</span>
  );

  const getDetailTitle = () => {
    switch(activeDetailType) {
        case 'INCOME': return 'Entradas 🤑';
        case 'DEBIT': return 'Saídas (Débito/Pix) 🔻';
        case 'CREDIT': return 'Cartões — Fatura Atual 💳';
        case 'CREDIT_NUBANK': return `Fatura Nubank (${nubankView === 'CURRENT' ? 'Atual' : 'Próxima'}) 🟣`;
        case 'CREDIT_PORTO': return `Fatura Porto (${portoView === 'CURRENT' ? 'Atual' : 'Próxima'}) 🔵`;
        default: return 'Detalhes';
    }
  };

  if (!isReady) return <div className="p-10 text-center opacity-50">Carregando...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">

      <div>
        <div className="flex flex-wrap items-stretch gap-3 lg:gap-2">
          <FlowItem label="Entradas 🤩" value={stats.receitas} valueColor="#1f9c5b" onClick={() => setActiveDetailType('INCOME')} />
          <Operator symbol="−" />
          <FlowItem label="Saídas 🔻" value={stats.saidas} valueColor="#ef4444" onClick={() => setActiveDetailType('DEBIT')} />
          <Operator symbol="−" />
          <FlowItem label="Cartões 💳" value={stats.cartoesFaturaAtual} valueColor="#521256" onClick={() => setActiveDetailType('CREDIT')} />
          <Operator symbol="=" />

          <div className={`flex-[1.4] min-w-[180px] rounded-[1.5rem] px-6 py-4 shadow-xl flex flex-col justify-center relative overflow-hidden ${stats.sobra >= 0 ? 'shadow-[#f170c3]/30' : 'shadow-[#521256]/10 border border-[#521256]/5'}`} style={{ backgroundColor: stats.sobra >= 0 ? '#f170c3' : '#efd2fe' }}>
            <span className={`text-[10px] uppercase tracking-widest font-black ${stats.sobra >= 0 ? 'text-white/70' : 'text-[#521256]/50'}`}>
              {stats.sobra >= 0 ? '✨ Sobra pra investir ou aproveitar' : '💜 Resultado do mês'}
            </span>
            <h3 className={`text-2xl lg:text-3xl font-black mt-1 tracking-tight ${stats.sobra >= 0 ? 'text-white' : 'text-[#521256]'}`}>R$ {fmt(stats.sobra)}</h3>
          </div>
        </div>
        <p className="text-[10px] font-bold text-[#521256]/40 mt-3 ml-2 uppercase tracking-widest">
          Clique em qualquer valor pra ver os detalhes 👆
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <button onClick={() => handleOpenModal(TransactionType.INCOME)} className="flex items-center gap-3 px-8 py-4 bg-[#e2e585] text-[#521256] rounded-full font-black text-sm shadow-lg shadow-[#e2e585]/20 hover:scale-105 active:scale-95 transition-all"><span className="text-xl">+</span> Nova Receita</button>
        <button onClick={() => handleOpenModal(TransactionType.EXPENSE)} className="flex items-center gap-3 px-8 py-4 bg-[#f170c3] text-white rounded-full font-black text-sm shadow-lg shadow-[#f170c3]/20 hover:scale-105 active:scale-95 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> Nova Despesa</button>
      </div>

      <div className="bg-white/70 rounded-[2.5rem] p-8 lg:p-10 shadow-xl shadow-[#521256]/5 border border-white/40">
        <h3 className="text-xl font-black text-[#521256] mb-8 flex items-center justify-between">Pra onde foi? — Análise por Categoria <span>🔎</span></h3>
        {categoryData.length === 0 ? (
          <p className="text-center py-10 text-sm font-bold opacity-30 italic">Nenhum gasto lançado neste mês ainda. 🌱</p>
        ) : (
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <div className="h-[300px] w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none">
                    {categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '0.8rem' }} formatter={(value: number, name: string) => [`R$ ${fmt(value)}`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full lg:w-1/2 space-y-3 lg:max-h-[300px] lg:overflow-y-auto pr-2 custom-scrollbar">
              {categoryData.map((entry, index) => (
                <div key={index} onClick={() => setSelectedCategory(entry.name)} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white transition-colors cursor-pointer group border border-transparent hover:border-[#f170c3]/20 hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                    <div><p className="text-xs font-black text-[#521256] group-hover:text-[#f170c3] transition-colors">{entry.name}</p><p className="text-[10px] font-bold opacity-40">{entry.percent.toFixed(1)}%</p></div>
                  </div>
                  <div className="text-right"><span className="text-sm font-black text-[#521256]">R$ {fmt(entry.value)}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-2xl shadow-[#521256]/10 border border-white/20">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
           <h3 className="text-2xl font-black text-[#521256]">Meus Cartões 💳</h3>
           <div className="flex items-center gap-5">
             <div className="text-right">
               <span className="text-[10px] font-black opacity-40 uppercase tracking-widest block">Saldo em Conta</span>
               <button onClick={openBalanceCalibration} className="text-sm font-black text-[#521256]/70 hover:text-[#f170c3] transition-colors" title="Ajustar saldo real da conta">R$ {fmt(stats.saldo)} ⚙️</button>
             </div>
             <div className="text-right">
               <span className="text-[10px] font-black opacity-40 uppercase tracking-widest block">Limite Global</span>
               <button onClick={openLimitCalibration} className="text-xl font-black text-[#521256] hover:text-[#f170c3] transition-colors">R$ {(stats.limiteTotal - stats.totalCreditUsed).toLocaleString('pt-BR')}</button>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div 
                onClick={() => setActiveDetailType('CREDIT_NUBANK')} 
                className={`p-6 rounded-[2rem] relative overflow-hidden shadow-lg transition-all cursor-pointer ${nubankView === 'CURRENT' ? 'bg-[#820ad1] text-white group hover:scale-[1.01]' : 'bg-white border-2 border-[#820ad1] text-[#820ad1]'}`}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${nubankView === 'CURRENT' ? 'bg-white/20' : 'bg-[#820ad1]/10'}`}>🟣</div>
                        <div><h3 className="text-lg font-black leading-none">Nubank</h3><p className="text-[10px] font-bold opacity-60 uppercase">Principal</p></div>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-black/20 p-1 rounded-lg flex text-[10px] font-bold">
                            <button onClick={() => setNubankView('CURRENT')} className={`px-2 py-1 rounded ${nubankView === 'CURRENT' ? 'bg-white text-[#820ad1]' : 'text-white/50 hover:text-white'}`}>Atual</button>
                            <button onClick={() => setNubankView('NEXT')} className={`px-2 py-1 rounded ${nubankView === 'NEXT' ? 'bg-[#820ad1] text-white' : (nubankView === 'CURRENT' ? 'text-white/50 hover:text-white' : 'text-[#820ad1]/50')}`}>Próx</button>
                        </div>
                        {nubankView === 'CURRENT' && (
                            <button onClick={openNubankCalibration} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors" title="Ajustar Valor">⚙️</button>
                        )}
                    </div>
                </div>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">{nubankView === 'CURRENT' ? 'Fatura Atual (Aberta)' : 'Fatura Seguinte (Previsão)'}</p>
                <h2 className="text-4xl font-black mb-2">R$ {nubankView === 'CURRENT' ? stats.nubank.atual.toLocaleString('pt-BR') : stats.nubank.proxima.toLocaleString('pt-BR')}</h2>
                <p className="text-[10px] opacity-50">Vencimento dia 13</p>
            </div>

            <div 
                onClick={() => setActiveDetailType('CREDIT_PORTO')}
                className={`p-6 rounded-[2rem] relative overflow-hidden shadow-lg transition-all cursor-pointer ${portoView === 'CURRENT' ? 'bg-[#00a1fc] text-white group hover:scale-[1.01]' : 'bg-white border-2 border-[#00a1fc] text-[#00a1fc]'}`}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${portoView === 'CURRENT' ? 'bg-white/20' : 'bg-[#00a1fc]/10'}`}>🔵</div>
                        <div><h3 className="text-lg font-black leading-none">Porto Seguro</h3><p className="text-[10px] font-bold opacity-60 uppercase">Secundário</p></div>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-black/20 p-1 rounded-lg flex text-[10px] font-bold">
                            <button onClick={() => setPortoView('CURRENT')} className={`px-2 py-1 rounded ${portoView === 'CURRENT' ? 'bg-white text-[#00a1fc]' : 'text-white/50 hover:text-white'}`}>Atual</button>
                            <button onClick={() => setPortoView('NEXT')} className={`px-2 py-1 rounded ${portoView === 'NEXT' ? 'bg-[#00a1fc] text-white' : (portoView === 'CURRENT' ? 'text-white/50 hover:text-white' : 'text-[#00a1fc]/50')}`}>Próx</button>
                        </div>
                        {portoView === 'CURRENT' && (
                            <button onClick={openPortoCalibration} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors" title="Ajustar Valor">⚙️</button>
                        )}
                    </div>
                </div>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">{portoView === 'CURRENT' ? 'Fatura Atual (Aberta)' : 'Fatura Seguinte (Previsão)'}</p>
                <h2 className="text-4xl font-black mb-2">R$ {portoView === 'CURRENT' ? stats.porto.atual.toLocaleString('pt-BR') : stats.porto.proxima.toLocaleString('pt-BR')}</h2>
                <p className="text-[10px] opacity-50">Vencimento dia 05</p>
            </div>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-[#521256] opacity-40 uppercase tracking-widest mb-4">Últimas Compras no Crédito (Mês Atual)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.cardExpenses.map((t) => (
              <div key={t.id} className="bg-[#efd2fe]/30 p-4 rounded-2xl border border-white/50 flex items-center justify-between hover:bg-white transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">{t.cardType === 'Porto' ? '🔵' : '🟣'}</div>
                   <div className="overflow-hidden"><p className="text-xs font-black text-[#521256] truncate">{t.description}</p><p className="text-[9px] font-bold opacity-50">{new Date(t.date).toLocaleDateString('pt-BR')}</p></div>
                </div>
                <span className="text-xs font-black text-[#521256] group-hover:text-[#f170c3]">R$ {t.amount.toLocaleString('pt-BR')}</span>
              </div>
            ))}
            {stats.cardExpenses.length === 0 && (<p className="col-span-3 text-center py-2 text-xs font-bold opacity-30 italic">Nenhum gasto nesta fatura.</p>)}
          </div>
        </div>
      </div>

      {/* ====================================================== */}
      {/* DOBRA 4 — TETOS DE GASTOS (Planejamento na home) */}
      {/* ====================================================== */}
      <Planning
        embedded
        transactions={transactions}
        budgets={budgets}
        categories={categories}
        onUpdateBudget={onUpdateBudget}
        onDeleteBudget={onDeleteBudget}
      />

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} type={modalType} availableCategories={categories} onAddCategory={onAddCategory} onOpenCategoryManager={onOpenCategoryManager} closingDay={closingDay} />
      {selectedCategory && ( <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[150] flex items-center justify-center p-4"><div className="bg-white p-8 rounded-2xl w-full max-w-md"><div className="flex justify-between mb-4"><h3 className="font-bold text-[#521256]">{selectedCategory}</h3><button onClick={() => setSelectedCategory(null)}>Fechar</button></div><div className="max-h-[60vh] overflow-y-auto">{categoryTransactions.map(t => (<div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-100 gap-2"><span className="text-sm flex-1 truncate">{t.description}</span><span className="font-bold text-red-500 whitespace-nowrap">- R$ {t.amount.toLocaleString('pt-BR')}</span>{onDeleteTransaction && (<button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-full text-[#521256]/30 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0" title="Excluir lançamento"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>)}</div>))}</div></div></div> )}

      {activeDetailType && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Detalhamento</p>
                        <h3 className="text-2xl font-black text-[#521256]">
                            {getDetailTitle()}
                        </h3>
                    </div>
                    <button onClick={() => setActiveDetailType(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><svg className="w-6 h-6 text-[#521256]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {detailTransactions.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-4 bg-[#efd2fe]/20 rounded-2xl border border-transparent hover:border-[#f170c3]/30 transition-colors">
                            <div className="flex items-center gap-3">
                                {activeDetailType.startsWith('CREDIT') && (
                                    <span className="text-lg" title={t.cardType === 'Porto' ? 'Porto' : 'Nubank'}>{t.cardType === 'Porto' ? '🔵' : '🟣'}</span>
                                )}
                                <div>
                                    <p className="font-bold text-[#521256] text-sm">{t.description}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] opacity-50 font-bold uppercase">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                                        {t.installment && t.installment.total > 1 && (
                                            <span className="text-[9px] bg-[#f170c3] text-white px-1.5 py-0.5 rounded font-black">{t.installment.current}/{t.installment.total}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`font-black text-sm ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-500'}`}>{t.type === TransactionType.INCOME ? '+ ' : '- '} R$ {fmt(t.amount)}</span>
                                {onDeleteTransaction && (
                                    <button onClick={() => handleDelete(t.id)} className="p-2 rounded-full text-[#521256]/30 hover:text-red-500 hover:bg-red-50 transition-colors" title="Excluir lançamento">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {detailTransactions.length === 0 && (<p className="text-center text-gray-400 font-bold text-xs py-8">Nenhum lançamento encontrado.</p>)}
                </div>
            </div>
        </div>
      )}

      {(isBalanceCalibrating || isNubankCalibrating || isPortoCalibrating || isLimitCalibrating) && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-[#521256] mb-2 text-center">
              {isLimitCalibrating ? 'Definir Limite Global' : 'Calibrar ' + (isBalanceCalibrating ? 'Saldo' : (isNubankCalibrating ? 'Nubank' : 'Porto'))} ✨
            </h3>
             <p className="text-xs font-bold text-[#521256]/40 mb-8 text-center uppercase tracking-widest">
              {isNubankCalibrating || isPortoCalibrating ? 'Qual o valor REAL da fatura agora?' : 'Digite o valor correto:'}
            </p>
            <div className="mb-8">
              <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-[0.2em] mb-2 block">Valor em R$</label>
              <input autoFocus type="number" value={calibrationValue} onChange={(e) => setCalibrationValue(e.target.value)} placeholder="0,00" className="w-full px-6 py-5 bg-[#efd2fe]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-black text-3xl text-center" />
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={saveCalibration} className="w-full py-5 bg-[#521256] text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all">SALVAR</button>
              <button onClick={() => { setIsBalanceCalibrating(false); setIsNubankCalibrating(false); setIsPortoCalibrating(false); setIsLimitCalibrating(false); }} className="w-full py-4 text-[#521256] font-black hover:bg-[#efd2fe]/50 rounded-2xl transition-colors text-sm">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
