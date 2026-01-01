import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [isBalanceCalibrating, setIsBalanceCalibrating] = useState(false);
  const [isCreditCalibrating, setIsCreditCalibrating] = useState(false);
  const [isLimitCalibrating, setIsLimitCalibrating] = useState(false);
  const [isPayingBill, setIsPayingBill] = useState(false);
  const [calibrationValue, setCalibrationValue] = useState('');

  const PAYMENT_CATEGORY = "Pagamento de Fatura";

  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => 
      t.type === TransactionType.EXPENSE && 
      t.category !== PAYMENT_CATEGORY
    );
    
    const summary: Record<string, number> = {};
    expenses.forEach(t => {
      summary[t.category] = (summary[t.category] || 0) + t.amount;
    });
    
    const total = Object.values(summary).reduce((a, b) => a + b, 0);

    return Object.entries(summary)
      .map(([name, value]) => ({ 
        name, 
        value,
        percent: total > 0 ? (value / total) * 100 : 0 
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const stats = useMemo(() => {
    // 1. Receitas
    const receitas = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);

    // 2. Despesas Imediatas (Débito/Dinheiro/Pix)
    const immediateExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod !== PaymentMethod.CREDIT_CARD)
      .reduce((acc, curr) => acc + curr.amount, 0);

    // 3. Gastos no Cartão (Aumentam a fatura)
    const faturaNovosGastos = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD)
      .reduce((acc, curr) => acc + curr.amount, 0);

    // 4. Pagamentos de Fatura
    const pagamentosFatura = transactions
      .filter(t => t.category === PAYMENT_CATEGORY)
      .reduce((acc, curr) => acc + curr.amount, 0);

    // --- CÁLCULOS FINAIS ---

    const faturaTotal = (initialCreditBill + faturaNovosGastos) - pagamentosFatura;
    
    // Despesas da Conta (Só Débito/Pix, removendo o pagamento da fatura para não duplicar visualmente)
    const despesasConta = immediateExpenses - pagamentosFatura;

    // Despesas TOTAIS (Custo de Vida Real: Tudo de crédito + Tudo de débito)
    const totalGeralGastos = despesasConta + faturaNovosGastos;
    
    const cardExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    return {
      saldo: initialBalance + receitas - immediateExpenses, // Saldo real (desconta tudo que saiu da conta)
      receitas,
      despesasConta,    // Saídas (Débito)
      totalGeralGastos, // Despesas Totais (Crédito + Débito)
      fatura: Math.max(0, faturaTotal),
      limiteTotal: totalCreditLimit,
      cardExpenses
    };
  }, [transactions, initialBalance, initialCreditBill, totalCreditLimit]);

  const progressPercentage = (stats.fatura / stats.limiteTotal) * 100;

  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions
      .filter(t => t.category === selectedCategory && t.type === TransactionType.EXPENSE)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCategory, transactions]);

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
      date: t.date!,
      createdAt: Date.now()
    } as any;
    onAddTransaction(newTransaction);
  };

  const handlePayBill = () => {
    const val = parseFloat(calibrationValue.replace(',', '.'));
    if (!val) return;

    const now = new Date();
    const localDate = now.toLocaleDateString('pt-BR').split('/').reverse().join('-');

    const paymentTransaction: Transaction = {
      id: Math.random().toString(36).substring(7),
      description: 'Pagamento de Fatura 💳',
      amount: val,
      category: PAYMENT_CATEGORY,
      type: TransactionType.EXPENSE,
      paymentMethod: PaymentMethod.DEBIT, 
      isRecurring: false,
      date: localDate, 
      createdAt: Date.now() 
    } as any;

    onAddTransaction(paymentTransaction);
    setCalibrationValue('');
    setIsPayingBill(false);
    alert("Pagamento registrado! Ele aparecerá no seu Extrato. ✨");
  };

  const openBalanceCalibration = () => { setCalibrationValue(initialBalance.toString()); setIsBalanceCalibrating(true); };
  const openCreditCalibration = () => { setCalibrationValue(initialCreditBill.toString()); setIsCreditCalibrating(true); };
  const openLimitCalibration = () => { setCalibrationValue(totalCreditLimit.toString()); setIsLimitCalibrating(true); };

  const saveCalibration = () => {
    const val = parseFloat(calibrationValue.replace(',', '.')) || 0;
    if (isBalanceCalibrating) onUpdateInitialBalance(val);
    if (isCreditCalibrating) onUpdateInitialCreditBill(val);
    if (isLimitCalibrating) onUpdateTotalCreditLimit(val);
    setCalibrationValue('');
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
      {/* ATUALIZAÇÃO DO GRID: Garante que os 5 cards se acomodem em qualquer tela */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        
        {/* 1. Saldo Disponível */}
        <StatCard title="Saldo Disponível" value={stats.saldo} bgColor={COLORS.BASE} onClick={openBalanceCalibration} />

        {/* 2. Receitas */}
        <StatCard title="Receitas do Mês" value={stats.receitas} color={COLORS.POSITIVE} />
        
        {/* 3. Despesas Totais (NOVO - SOMA TUDO) */}
        <StatCard title="Despesas Totais" value={stats.totalGeralGastos} color={COLORS.NEGATIVE} />

        {/* 4. Saídas da Conta (Só Débito) */}
        <StatCard title="Saídas (Débito)" value={stats.despesasConta} />

        {/* 5. Fatura Atual */}
        <StatCard title="Fatura Atual" value={stats.fatura} onClick={openCreditCalibration} />
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
            <div className="flex gap-4 items-center">
              <button 
                onClick={() => setIsPayingBill(true)}
                className="text-[10px] bg-[#521256] text-white px-3 py-1.5 rounded-full font-black hover:scale-105 transition-all shadow-md"
              >
                PAGAR FATURA
              </button>

              <button 
                onClick={openLimitCalibration}
                className="flex items-center gap-1 text-xs font-bold text-[#521256]/40 hover:text-[#521256] transition-colors group"
              >
                R$ {stats.limiteTotal.toLocaleString('pt-BR')} total
                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2
