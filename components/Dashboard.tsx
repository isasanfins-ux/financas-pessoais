import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction, TransactionType, PaymentMethod } from '../types';
import { CHART_COLORS, COLORS } from '../constants';
import TransactionModal from './TransactionModal';

interface DashboardProps {
  transactions: Transaction[]; 
  allTransactions: Transaction[]; 
  currentDate: Date; 
  onAddTransaction: (t: Transaction) => void;
  categories?: string[];
  onAddCategory?: (name: string) => void;
  onOpenCategoryManager?: () => void;
  initialBalance: number;
  
  // NOVAS PROPS INDEPENDENTES
  initialNubankBill: number;
  initialPortoBill: number;
  
  totalCreditLimit: number;
  nextMonthInvoice: number;
  onUpdateInitialBalance: (val: number) => void;
  
  // FUNÇÕES DE ATUALIZAÇÃO INDEPENDENTES
  onUpdateNubankBill: (val: number) => void;
  onUpdatePortoBill: (val: number) => void;
  
  onUpdateInitialCreditBill?: (val: number) => void; // Mantido por compatibilidade
  onUpdateTotalCreditLimit: (val: number) => void;
  onUpdateNextMonthInvoice: (val: number) => void;
  closingDay?: number; 
}

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions = [], 
  allTransactions = [], 
  currentDate,
  onAddTransaction, 
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
  closingDay = 6 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Estados de Calibração
  const [isBalanceCalibrating, setIsBalanceCalibrating] = useState(false);
  const [isNubankCalibrating, setIsNubankCalibrating] = useState(false); // Calibra SÓ Nubank
  const [isPortoCalibrating, setIsPortoCalibrating] = useState(false);   // Calibra SÓ Porto
  const [isLimitCalibrating, setIsLimitCalibrating] = useState(false);
  const [calibrationValue, setCalibrationValue] = useState('');

  const [activeDetailType, setActiveDetailType] = useState<'INCOME' | 'DEBIT' | 'CREDIT' | null>(null);
  const [isReady, setIsReady] = useState(false);
  useEffect(() => setIsReady(true), []);

  const PAYMENT_CATEGORY = "Pagamento de Fatura";
  const currentInvoiceMonth = (currentDate || new Date()).toISOString().slice(0, 7);

  // --- DADOS DO GRÁFICO ---
  const categoryData = useMemo(() => {
    if(!transactions) return [];
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE && t.category !== PAYMENT_CATEGORY);
    const summary: Record<string, number> = {};
    expenses.forEach(t => { summary[t.category] = (summary[t.category] || 0) + t.amount; });
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    return Object.entries(summary).map(([name, value]) => ({ name, value, percent: total > 0 ? (value / total) * 100 : 0 })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  // --- ESTATÍSTICAS ---
  const stats = useMemo(() => {
    const safeAll = allTransactions || [];
    const safeMonthly = transactions || [];

    const belongsToCurrentInvoice = (t: Transaction) => {
      if (t.invoiceMonth) return t.invoiceMonth === currentInvoiceMonth;
      if (!t.date) return false;
      const [y, m, d] = t.date.split('-').map(Number);
      let tm = m, ty = y;
      if (d > closingDay) { tm++; if(tm>12){tm=1;ty++} }
      return `${ty}-${String(tm).padStart(2, '0')}` === currentInvoiceMonth;
    };

    // 1. NUBANK
    const gastosNubankNoMes = safeAll
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD && belongsToCurrentInvoice(t) && (t.cardType === 'Nubank' || !t.cardType))
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    // Total Nubank = Valor Inicial Manual + Gastos Automáticos
    const totalFaturaNubank = initialNubankBill + gastosNubankNoMes;

    // 2. PORTO SEGURO
    const gastosPortoNoMes = safeAll
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD && belongsToCurrentInvoice(t) && t.cardType === 'Porto')
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    // Total Porto = Valor Inicial Manual + Gastos Automáticos
    const totalFaturaPorto = initialPortoBill + gastosPortoNoMes;

    const receitas = safeMonthly.filter(t => t.type === TransactionType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);
    const immediateExpenses = safeMonthly.filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod !== PaymentMethod.CREDIT_CARD).reduce((acc, curr) => acc + curr.amount, 0);
    const pagamentosFatura = safeMonthly.filter(t => t.category === PAYMENT_CATEGORY).reduce((acc, curr) => acc + curr.amount, 0);

    const totalCreditUsed = totalFaturaNubank + totalFaturaPorto;

    const cardExpenses = safeAll
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD && belongsToCurrentInvoice(t))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    return {
      saldo: initialBalance + receitas - immediateExpenses - pagamentosFatura,
      receitas,
      despesasConta: immediateExpenses,
      totalFaturaNubank,
      gastosNubankNoMes,
      totalFaturaPorto,
      gastosPortoNoMes,
      limiteTotal: totalCreditLimit,
      totalCreditUsed,
      cardExpenses
    };
  }, [transactions, allTransactions, initialBalance, initialNubankBill, initialPortoBill, totalCreditLimit, currentInvoiceMonth, closingDay]);

  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions.filter(t => t.category === selectedCategory && t.type === TransactionType.EXPENSE).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCategory, transactions]);

  const detailTransactions = useMemo(() => {
    if (!activeDetailType) return [];
    if (activeDetailType === 'INCOME') return transactions.filter(t => t.type === TransactionType.INCOME).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (activeDetailType === 'DEBIT') return transactions.filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod !== PaymentMethod.CREDIT_CARD).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (activeDetailType === 'CREDIT') {
      const belongsToCurrentInvoice = (t: Transaction) => {
        if (t.invoiceMonth) return t.invoiceMonth === currentInvoiceMonth;
        if (!t.date) return false;
        const [y, m, d] = t.date.split('-').map(Number);
        let tm = m, ty = y;
        if (d > closingDay) { tm++; if(tm>12){tm=1;ty++} }
        return `${ty}-${String(tm).padStart(2, '0')}` === currentInvoiceMonth;
      };
      return allTransactions.filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD && belongsToCurrentInvoice(t)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return [];
  }, [activeDetailType, transactions, allTransactions, currentInvoiceMonth, closingDay]);

  const handleOpenModal = (type: TransactionType) => { setModalType(type); setIsModalOpen(true); };
  const handleSave = (t: Partial<Transaction>) => { onAddTransaction({ ...t, id: Math.random().toString(), createdAt: Date.now() } as any); };
  
  const openBalanceCalibration = () => { setCalibrationValue(stats.saldo.toFixed(2)); setIsBalanceCalibrating(true); };
  
  // ABRE CALIBRAÇÃO ESPECÍFICA
  const openNubankCalibration = () => { setCalibrationValue(stats.totalFaturaNubank.toFixed(2)); setIsNubankCalibrating(true); };
  const openPortoCalibration = () => { setCalibrationValue(stats.totalFaturaPorto.toFixed(2)); setIsPortoCalibrating(true); };
  
  const openLimitCalibration = () => { setCalibrationValue(totalCreditLimit.toString()); setIsLimitCalibrating(true); };

  const saveCalibration = () => {
    const val = parseFloat(calibrationValue.replace(',', '.')) || 0;
    
    if (isBalanceCalibrating) { 
        const currentNetMovement = stats.saldo - initialBalance; 
        onUpdateInitialBalance(val - currentNetMovement); 
    }
    
    // LÓGICA DE CALIBRAÇÃO NUBANK (Engenharia Reversa)
    if (isNubankCalibrating) {
        // NovoInicial = TotalDesejado - GastosDoMês
        const novoInicial = val - stats.gastosNubankNoMes;
        onUpdateNubankBill(novoInicial);
    }

    // LÓGICA DE CALIBRAÇÃO PORTO (Engenharia Reversa)
    if (isPortoCalibrating) {
        const novoInicial = val - stats.gastosPortoNoMes;
        onUpdatePortoBill(novoInicial);
    }

    if (isLimitCalibrating) onUpdateTotalCreditLimit(val);
    
    setCalibrationValue('');
    setIsBalanceCalibrating(false); setIsNubankCalibrating(false); setIsPortoCalibrating(false); setIsLimitCalibrating(false);
  };

  const StatCard = ({ title, value, color, bgColor = 'white', textColor = '#521256', onClick }: any) => (
    <div onClick={onClick} className={`p-6 rounded-[2rem] shadow-xl shadow-[#521256]/5 border border-white/40 flex flex-col justify-between transition-all group ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''}`} style={{ backgroundColor: bgColor }}>
      <div className="flex justify-between items-start"><span className="text-[10px] uppercase tracking-widest font-black opacity-50" style={{ color: textColor }}>{title}</span>{onClick && <span className="opacity-0 group-hover:opacity-40 transition-opacity"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></span>}</div>
      <h3 className="text-2xl font-black mt-2 tracking-tight" style={{ color: color || textColor }}>R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
    </div>
  );

  if (!isReady) return <div className="p-10 text-center opacity-50">Carregando...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard title="Saldo Disponível" value={stats.saldo} bgColor={COLORS.BASE} onClick={openBalanceCalibration} />
        <StatCard title="Receitas do Mês 🤩" value={stats.receitas} bgColor="#e2e585" textColor="#521256" onClick={() => setActiveDetailType('INCOME')} />
        <StatCard title="Saídas (Débito) 🔻" value={stats.despesasConta} color="#ef4444" onClick={() => setActiveDetailType('DEBIT')} />
        <StatCard title="Total em Cartões 💳" value={stats.totalCreditUsed} onClick={() => setActiveDetailType('CREDIT')} />
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <button onClick={() => handleOpenModal(TransactionType.INCOME)} className="flex items-center gap-3 px-8 py-4 bg-[#e2e585] text-[#521256] rounded-full font-black text-sm shadow-lg shadow-[#e2e585]/20 hover:scale-105 active:scale-95 transition-all"><span className="text-xl">+</span> Nova Receita</button>
        <button onClick={() => handleOpenModal(TransactionType.EXPENSE)} className="flex items-center gap-3 px-8 py-4 bg-[#f170c3] text-white rounded-full font-black text-sm shadow-lg shadow-[#f170c3]/20 hover:scale-105 active:scale-95 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> Nova Despesa</button>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-2xl shadow-[#521256]/10 border border-white/20">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-2xl font-black text-[#521256]">Meus Cartões 💳</h3>
           <div className="text-right">
             <span className="text-[10px] font-black opacity-40 uppercase tracking-widest block">Limite Global</span>
             <button onClick={openLimitCalibration} className="text-xl font-black text-[#521256] hover:text-[#f170c3] transition-colors">R$ {(stats.limiteTotal - stats.totalCreditUsed).toLocaleString('pt-BR')}</button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* --- CARD NUBANK --- */}
            <div className="bg-[#820ad1] p-6 rounded-[2rem] text-white relative overflow-hidden shadow-lg group hover:scale-[1.01] transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🟣</div>
                        <div><h3 className="text-lg font-black leading-none">Nubank</h3><p className="text-[10px] font-bold opacity-60 uppercase">Principal</p></div>
                    </div>
                    {/* BOTÃO NUBANK (ENGRENAGEM INDEPENDENTE) */}
                    <button onClick={openNubankCalibration} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors" title="Ajustar Valor">⚙️</button>
                </div>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Fatura Atual (Aberta)</p>
                <h2 className="text-4xl font-black mb-2">R$ {stats.totalFaturaNubank.toLocaleString('pt-BR')}</h2>
                <p className="text-[10px] opacity-50">Vencimento dia 13</p>
            </div>

            {/* --- CARD PORTO SEGURO --- */}
            <div className="bg-[#00a1fc] p-6 rounded-[2rem] text-white relative overflow-hidden shadow-lg group hover:scale-[1.01] transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🔵</div>
                        <div><h3 className="text-lg font-black leading-none">Porto Seguro</h3><p className="text-[10px] font-bold opacity-60 uppercase">Secundário</p></div>
                    </div>
                    {/* BOTÃO PORTO (ENGRENAGEM INDEPENDENTE) */}
                    <button onClick={openPortoCalibration} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors" title="Ajustar Valor">⚙️</button>
                </div>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Fatura Atual (Aberta)</p>
                <h2 className="text-4xl font-black mb-2">R$ {stats.totalFaturaPorto.toLocaleString('pt-BR')}</h2>
                <p className="text-[10px] opacity-50">Vencimento dia 05</p> {/* DATA ATUALIZADA AQUI ✅ */}
            </div>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-[#521256] opacity-40 uppercase tracking-widest mb-4">Últimas Compras no Crédito</h4>
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

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white/70 rounded-[2.5rem] p-10 shadow-xl shadow-[#521256]/5 border border-white/40">
          <h3 className="text-xl font-black text-[#521256] mb-8 flex items-center justify-between">Análise por Categoria <span>🔎</span></h3>
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <div className="h-[300px] w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none">
                    {categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '0.8rem' }} formatter={(value: number, name: string) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, name]} />
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
                  <div className="text-right"><span className="text-sm font-black text-[#521256]">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} type={modalType} availableCategories={categories} onAddCategory={onAddCategory} onOpenCategoryManager={onOpenCategoryManager} closingDay={closingDay} />
      {selectedCategory && ( <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[150] flex items-center justify-center p-4"><div className="bg-white p-8 rounded-2xl w-full max-w-md"><div className="flex justify-between mb-4"><h3 className="font-bold text-[#521256]">{selectedCategory}</h3><button onClick={() => setSelectedCategory(null)}>Fechar</button></div><div className="max-h-[60vh] overflow-y-auto">{categoryTransactions.map(t => (<div key={t.id} className="flex justify-between py-2 border-b border-gray-100"><span className="text-sm">{t.description}</span><span className="font-bold text-red-500">- R$ {t.amount.toLocaleString('pt-BR')}</span></div>))}</div></div></div> )}

      {activeDetailType && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Detalhamento</p>
                        <h3 className="text-2xl font-black text-[#521256]">
                            {activeDetailType === 'INCOME' ? 'Receitas 🤑' : (activeDetailType === 'DEBIT' ? 'Saídas (Débito) 🔻' : 'Faturas de Cartão 💳')}
                        </h3>
                    </div>
                    <button onClick={() => setActiveDetailType(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><svg className="w-6 h-6 text-[#521256]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {detailTransactions.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-4 bg-[#efd2fe]/20 rounded-2xl border border-transparent hover:border-[#f170c3]/30 transition-colors">
                            <div className="flex items-center gap-3">
                                {activeDetailType === 'CREDIT' && (
                                    <span className="text-lg" title={t.cardType === 'Porto' ? 'Porto' : 'Nubank'}>{t.cardType === 'Porto' ? '🔵' : '🟣'}</span>
                                )}
                                <div><p className="font-bold text-[#521256] text-sm">{t.description}</p><p className="text-[10px] opacity-50 font-bold uppercase">{new Date(t.date).toLocaleDateString('pt-BR')}</p></div>
                            </div>
                            <span className={`font-black text-sm ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-500'}`}>{t.type === TransactionType.INCOME ? '+ ' : '- '} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
