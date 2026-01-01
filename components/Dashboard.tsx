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

    // 2. Despesas Imediatas (Débito/Dinheiro/Pix) - Inclui pagamento de fatura
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
    
    // Despesas Operacionais da Conta (Só Débito, sem pagamento de fatura)
    const despesasConta = immediateExpenses - pagamentosFatura;

    // Despesas TOTAIS (Custo de Vida Real: Tudo que gastou no crédito + Tudo que gastou no débito)
    const totalGeralGastos = despesasConta + faturaNovosGastos;
    
    const cardExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    return {
      saldo: initialBalance + receitas - immediateExpenses, // Saldo real (desconta tudo)
      receitas,
      despesasConta,    // Só débito
      totalGeralGastos, // Soma de tudo (Crédito + Débito)
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
