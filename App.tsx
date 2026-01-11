import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Planning from './components/Planning';
import Investments from './components/Investments';
import Reports from './components/Reports';
import Market from './components/Market'; 
import ChatAssistant from './components/ChatAssistant';
import CategoryManagerModal from './components/CategoryManagerModal';
import MonthSelector from './components/MonthSelector';
import { Transaction, CategoryBudget, InvestmentTransaction, User, MarketItem } from './types';
import { INITIAL_CATEGORIES } from './constants';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut, updateProfile, updatePassword } from 'firebase/auth';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, 
  doc, setDoc, getDoc, writeBatch, getDocs 
} from 'firebase/firestore';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  
  // CONFIGURAÇÕES
  const [closingDay, setClosingDay] = useState<number>(6); 
  const [dueDay, setDueDay] = useState<number>(13);       

  // --- O FILTRO DO CALENDÁRIO (Para Gráfico e Extrato) ---
  const monthlyTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      const tDate = new Date(t.date + 'T12:00:00');
      return tDate.getMonth() === currentDate.getMonth() && 
             tDate.getFullYear() === currentDate.getFullYear();
    });
  }, [allTransactions, currentDate]);

  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [investmentHistory, setInvestmentHistory] = useState<InvestmentTransaction[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]); 

  // SALDOS
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [initialCreditBill, setInitialCreditBill] = useState<number>(0);
  const [totalCreditLimit, setTotalCreditLimit] = useState<number>(5000);
  // NOVO: Valor manual da próxima fatura
  const [nextMonthInvoice, setNextMonthInvoice] = useState<number>(0);

  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));

  // CARREGAR DADOS
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      if (fUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", fUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setCurrentUser(userData);
            setEditName(userData.name);
            setEditAvatar(userData.avatar);
          } else {
            const newUser = { id: fUser.uid, name: fUser.displayName || 'Estrela', email: fUser.email || '', avatar: fUser.photoURL || 'https://picsum.photos/seed/guia/100' };
            setCurrentUser(newUser);
            setEditName(newUser.name);
            setEditAvatar(newUser.avatar);
          }
        } catch (err) { 
           const fallbackUser = { id: fUser.uid, name: fUser.displayName || 'Estrela', email: fUser.email || '', avatar: fUser.photoURL || 'https://picsum.photos/seed/guia/100' };
           setCurrentUser(fallbackUser);
           setEditName(fallbackUser.name);
           setEditAvatar(fallbackUser.avatar);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.id;

    const qTrans = query(collection(db, "transactions"), where("uid", "==", uid));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
      setAllTransactions(data);
    });

    const qCats = query(collection(db, "categories"), where("uid", "==", uid));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      const dbCategories = snapshot.docs.map(doc => doc.data().name as string);
      setCategories(Array.from(new Set([...INITIAL_CATEGORIES, ...dbCategories])).sort());
    });

    const qBudgets = query(collection(db, "budgets"), where("uid", "==", uid));
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      const allBudgets = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      const currentMonthBudgets = allBudgets.filter((b: any) => 
        b.month === currentDate.getMonth() && 
        b.year === currentDate.getFullYear()
      );
      setBudgets(currentMonthBudgets);
    });

    const qInv = query(collection(db, "investment_transactions"), where("uid", "==", uid));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      setInvestmentHistory(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InvestmentTransaction)));
    });

    const qMarket = query(collection(db, "market_items"), where("uid", "==", uid));
    const unsubMarket = onSnapshot(qMarket, (snapshot) => {
      const allMarketItems = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MarketItem));
      const currentMonthMarketItems = allMarketItems.filter(item => {
        const itemDate = new Date(item.date + 'T12:00:00');
        return itemDate.getMonth() === currentDate.getMonth() &&
               itemDate.getFullYear() === currentDate.getFullYear();
      });
      setMarketItems(currentMonthMarketItems);
    });

    // SETTINGS (Recuperando valor manual da próxima fatura)
    const unsubSettings = onSnapshot(doc(db, "settings", uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInitialBalance(data.initialBalance || 0);
        setInitialCreditBill(data.initialCreditBill || 0);
        setTotalCreditLimit(data.totalCreditLimit || 5000);
        setNextMonthInvoice(data.nextMonthInvoice || 0); // Lendo valor salvo
        if (data.closingDay) setClosingDay(data.closingDay);
        if (data.dueDay) setDueDay(data.dueDay);
      }
    });

    return () => { unsubTrans(); unsubCats(); unsubBudgets(); unsubInv(); unsubMarket(); unsubSettings(); };
  }, [currentUser, currentDate]);

  const updSet = async (u: any) => currentUser && setDoc(doc(db, "settings", currentUser.id), { 
    initialBalance, 
    initialCreditBill, 
    totalCreditLimit,
    nextMonthInvoice, // Garante persistência
    closingDay,
    dueDay,
    ...u, 
    uid: currentUser.id 
  }, { merge: true });

  const handleSaveProfile = async () => { /* Mantido */ };
  const handleLogout = async () => { await signOut(auth); setIsSettingsOpen(false); };
  
  const addTransaction = async (t: Omit<Transaction, 'id'>) => { 
    if (!currentUser) return; 
    if (t.isRecurring) {
        const startDate = new Date(t.date + 'T12:00:00');
        let startInvoiceDate = t.invoiceMonth ? new Date(t.invoiceMonth + '-02') : null;
        // Lógica automática de primeira fatura
        if (!startInvoiceDate && t.type === 'EXPENSE' && t.paymentMethod === 'Cartão de Crédito') {
           const day = startDate.getDate();
           if (day > closingDay) startDate.setMonth(startDate.getMonth() + 1);
           startInvoiceDate = startDate;
        }
        for (let i = 0; i < 12; i++) {
            const futureDate = new Date(startDate); 
            futureDate.setMonth(new Date(t.date + 'T12:00:00').getMonth() + i);
            const isoDate = futureDate.toISOString().split('T')[0];
            let futureInvoiceMonth = undefined;
            if (startInvoiceDate) {
               const fInvoice = new Date(startInvoiceDate); 
               fInvoice.setMonth(startInvoiceDate.getMonth() + i);
               futureInvoiceMonth = fInvoice.toISOString().slice(0, 7); 
            }
            await addDoc(collection(db, "transactions"), { ...t, date: isoDate, invoiceMonth: futureInvoiceMonth, uid: currentUser.id, createdAt: Date.now() + i });
        }
        alert("Lançamento fixo criado para os próximos 12 meses! 🗓️✨");
    } else {
        await addDoc(collection(db, "transactions"), { ...t, uid: currentUser.id });
    }
    if (!categories.includes(t.category)) {
        await addDoc(collection(db, "categories"), { name: t.category, uid: currentUser.id });
    }
  };

  const updateTransaction = async (u: Transaction) => { if (currentUser) { const { id, ...d } = u; await updateDoc(doc(db, "transactions", id), { ...d, uid: currentUser.id }); }};
  const deleteTransaction = async (id: string) => { await deleteDoc(doc(db, "transactions", id)); };
  const addInv = async (t: any) => currentUser && addDoc(collection(db, "investment_transactions"), { ...t, uid: currentUser.id });
  const updInv = async (u: any) => currentUser && updateDoc(doc(db, "investment_transactions", u.id), { ...u, uid: currentUser.id });
  const delInv = async (id: string) => deleteDoc(doc(db, "investment_transactions", id));
  const addMarketItem = async (t: any) => currentUser && addDoc(collection(db, "market_items"), { ...t, uid: currentUser.id });
  const deleteMarketItem = async (id: string) => deleteDoc(doc(db, "market_items", id));
  const updBudg = async (c: string, l: number) => { if(!currentUser) return; const ex = budgets.find(b => b.category === c); if(ex?.id) { await updateDoc(doc(db, "budgets", ex.id), { limit: l }); } else { await addDoc(collection(db, "budgets"), { category: c, limit: l, uid: currentUser.id, month: currentDate.getMonth(), year: currentDate.getFullYear() }); }};
  const delBudg = async (category: string) => { if(!currentUser) return; const ex = budgets.find(b => b.category === category); if(ex?.id) await deleteDoc(doc(db, "budgets", ex.id)); };
  const resetAllData = async () => { /* Mantido */ };

  if (authLoading) return <div className="min-h-screen bg-[#efd2fe] flex items-center justify-center">Loading...</div>;
  if (!currentUser) return <Auth onLogin={() => window.location.reload()} />;

  const monthSelector = <MonthSelector currentDate={currentDate} onPrevMonth={prevMonth} onNextMonth={nextMonth} />;

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} onProfileClick={() => setIsSettingsOpen(true)} currentUser={currentUser}>
      <div className="flex flex-col h-full gap-8 relative max-w-7xl mx-auto">
        <div className="flex-1 w-full">
          {activeTab === 'dashboard' && (
            <div className="pb-24 lg:pb-0">
              {monthSelector}
              <Dashboard 
                transactions={monthlyTransactions} // Lista filtrada (Calendário) para o Gráfico
                allTransactions={allTransactions} // Lista completa para Fatura
                currentDate={currentDate} 
                onAddTransaction={addTransaction}
                categories={categories}
                onOpenCategoryManager={() => setIsCatManagerOpen(true)}
                initialBalance={initialBalance}
                initialCreditBill={initialCreditBill}
                totalCreditLimit={totalCreditLimit}
                nextMonthInvoice={nextMonthInvoice} // Passando o valor manual
                onUpdateInitialBalance={(v) => updSet({ initialBalance: v })}
                onUpdateInitialCreditBill={(v) => updSet({ initialCreditBill: v })}
                onUpdateTotalCreditLimit={(v) => updSet({ totalCreditLimit: v })}
                onUpdateNextMonthInvoice={(v) => updSet({ nextMonthInvoice: v })} // Função salvar manual
                closingDay={closingDay}
              />
            </div>
          )}
          {activeTab === 'market' && ( <div className="w-full pb-24 lg:pb-0"> {monthSelector} <Market items={marketItems} onAddItem={addMarketItem} onDeleteItem={deleteMarketItem} /> </div> )}
          {activeTab === 'reports' && ( <div className="w-full pb-24 lg:pb-0"> <Reports transactions={allTransactions} /> </div> )}
          {activeTab === 'investments' && ( <div className="w-full pb-24 lg:pb-0"> <Investments history={investmentHistory} onAddTransaction={addInv} onUpdateTransaction={updInv} onDeleteTransaction={delInv} /> </div> )}
          {activeTab === 'planning' && ( <div className="w-full pb-24 lg:pb-0"> {monthSelector} <Planning transactions={monthlyTransactions} budgets={budgets} categories={categories} onUpdateBudget={updBudg} onDeleteBudget={delBudg} /> </div> )}
          {activeTab === 'history' && (
            <div className="w-full max-w-5xl mx-auto pb-24 lg:pb-0">
              {monthSelector}
              <History 
                transactions={monthlyTransactions} // Histórico segue calendário
                onAddTransaction={addTransaction}
                onUpdateTransaction={updateTransaction}
                onDeleteTransaction={deleteTransaction}
                categories={categories}
                onOpenCategoryManager={() => setIsCatManagerOpen(true)}
              />
            </div>
          )}
        </div>
      </div>
      
      <CategoryManagerModal isOpen={isCatManagerOpen} onClose={() => setIsCatManagerOpen(false)} categories={categories} onRename={() => {}} onDelete={async (name) => { if (confirm(`Excluir categoria "${name}"?`)) { const q = query(collection(db, "categories"), where("uid", "==", currentUser.id), where("name", "==", name)); const snap = await getDocs(q); snap.docs.forEach(d => deleteDoc(d.ref)); }}} />
      {isSettingsOpen && <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4"><div className="bg-white p-8 rounded-xl"><button onClick={() => setIsSettingsOpen(false)}>Fechar</button></div></div>}
      {isResetConfirmOpen && <div className="fixed inset-0 bg-red-600/80 z-[250] flex items-center justify-center"><div className="bg-white p-8"><button onClick={() => setIsResetConfirmOpen(false)}>Cancelar</button></div></div>}
      <ChatAssistant transactions={allTransactions} marketItems={marketItems} budgets={budgets} currentBalance={initialBalance} />
    </Layout>
  );
};
export default App;
