import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Planning from './components/Planning';
import Investments from './components/Investments';
import Reports from './components/Reports';
import CategoryManagerModal from './components/CategoryManagerModal';
import MonthSelector from './components/MonthSelector';
import { Transaction, CategoryBudget, InvestmentTransaction, User } from './types';
import { INITIAL_CATEGORIES, INITIAL_BUDGETS } from './constants';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, 
  doc, setDoc, getDoc, writeBatch, getDocs 
} from 'firebase/firestore';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // DATA GLOBAL (Controla o app todo)
  const [currentDate, setCurrentDate] = useState(new Date());

  // Dados Crus do Firebase (Histórico Completo)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  
  // Dados Filtrados (Apenas o mês selecionado para Dashboard/Extrato)
  const monthlyTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      // Gambiarra segura para fuso horário
      const tDate = new Date(t.date + 'T12:00:00');
      return tDate.getMonth() === currentDate.getMonth() && 
             tDate.getFullYear() === currentDate.getFullYear();
    });
  }, [allTransactions, currentDate]);

  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [investmentHistory, setInvestmentHistory] = useState<InvestmentTransaction[]>([]);

  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [initialCreditBill, setInitialCreditBill] = useState<number>(0);
  const [totalCreditLimit, setTotalCreditLimit] = useState<number>(5000);

  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Navegação de Mês
  const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));

  // 1. Auth e Load de Usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      if (fUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", fUser.uid));
          if (userDoc.exists()) setCurrentUser(userDoc.data() as User);
          else setCurrentUser({ id: fUser.uid, name: fUser.displayName || 'Estrela', email: fUser.email || '', avatar: fUser.photoURL || 'https://picsum.photos/seed/guia/100' });
        } catch (err) { setCurrentUser({ id: fUser.uid, name: fUser.displayName || 'Estrela', email: fUser.email || '', avatar: fUser.photoURL || 'https://picsum.photos/seed/guia/100' }); }
      } else setCurrentUser(null);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Sync
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.id;

    // Transações
    const qTrans = query(collection(db, "transactions"), where("uid", "==", uid));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
      setAllTransactions(data);
    });

    // Categorias
    const qCats = query(collection(db, "categories"), where("uid", "==", uid));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      const dbCategories = snapshot.docs.map(doc => doc.data().name as string);
      setCategories(Array.from(new Set([...INITIAL_CATEGORIES, ...dbCategories])).sort());
    });

    // Orçamentos (CORREÇÃO AQUI: Removemos o fallback para INITIAL_BUDGETS)
    const qBudgets = query(collection(db, "budgets"), where("uid", "==", uid));
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as CategoryBudget));
      setBudgets(data); // Agora mostra apenas o que está realmente no banco!
    });

    // Investimentos
    const qInv = query(collection(db, "investment_transactions"), where("uid", "==", uid));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      setInvestmentHistory(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InvestmentTransaction)));
    });

    // Configurações
    const unsubSettings = onSnapshot(doc(db, "settings", uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInitialBalance(data.initialBalance || 0);
        setInitialCreditBill(data.initialCreditBill || 0);
        setTotalCreditLimit(data.totalCreditLimit || 5000);
      }
    });

    return () => { unsubTrans(); unsubCats(); unsubBudgets(); unsubInv(); unsubSettings(); };
  }, [currentUser]);

  // Handlers
  const handleLogout = async () => { await signOut(auth); setIsSettingsOpen(false); };
  const addTransaction = async (t: Omit<Transaction, 'id'>) => { if (currentUser) { await addDoc(collection(db, "transactions"), { ...t, uid: currentUser.id }); if (!categories.includes(t.category)) await addDoc(collection(db, "categories"), { name: t.category, uid: currentUser.id }); }};
  const updateTransaction = async (u: Transaction) => { if (currentUser) { const { id, ...d } = u; await updateDoc(doc(db, "transactions", id), { ...d, uid: currentUser.id }); }};
  const deleteTransaction = async (id: string) => { await deleteDoc(doc(db, "transactions", id)); };
  
  const addInv = async (t: any) => currentUser && addDoc(collection(db, "investment_transactions"), { ...t, uid: currentUser.id });
  const updInv = async (u: any) => currentUser && updateDoc(doc(db, "investment_transactions", u.id), { ...u, uid: currentUser.id });
  const delInv = async (id: string) => deleteDoc(doc(db, "investment_transactions", id));
  
  // --- FUNÇÕES DE ORÇAMENTO (TETO) ---
  const updBudg = async (c: string, l: number) => { 
    if(!currentUser) return; 
    const ex = budgets.find(b => b.category === c); 
    if(ex?.id) await updateDoc(doc(db, "budgets", ex.id), { limit: l }); 
    else await addDoc(collection(db, "budgets"), { category: c, limit: l, uid: currentUser.id });
  };

  // NOVA FUNÇÃO: Deletar Teto
  const delBudg = async (category: string) => {
    if(!currentUser) return;
    const ex = budgets.find(b => b.category === category);
    if(ex?.id) await deleteDoc(doc(db, "budgets", ex.id));
  };
  // -----------------------------------

  const updSet = async (u: any) => currentUser && setDoc(doc(db, "settings", currentUser.id), { ...u, uid: currentUser.id }, { merge: true });

  const resetAllData = async () => {
    if (!currentUser) return;
    const collectionsToClear = ["transactions", "categories", "budgets", "goals", "investment_transactions"];
    try {
      for (const colName of collectionsToClear) {
        const q = query(collection(db, colName), where("uid", "==", currentUser.id));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, "settings", currentUser.id));
      window.location.reload();
    } catch (err) { alert("Erro ao limpar dados."); }
  };

  if (authLoading) return <div className="min-h-screen bg-[#efd2fe] flex items-center justify-center">Loading...</div>;
  if (!currentUser) return <Auth onLogin={() => window.location.reload()} />;

  const monthSelector = (
    <MonthSelector 
      currentDate={currentDate} 
      onPrevMonth={prevMonth} 
      onNextMonth={nextMonth} 
    />
  );

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} onProfileClick={() => setIsSettingsOpen(true)} currentUser={currentUser}>
      <div className="flex flex-col h-full gap-8 relative max-w-7xl mx-auto">
        <div className="flex-1 w-full">
          
          {/* DASHBOARD (Visão do Mês) */}
          {activeTab === 'dashboard' && (
            <div className="pb-24 lg:pb-0">
              {monthSelector}
              <Dashboard 
                transactions={monthlyTransactions}
                onAddTransaction={addTransaction}
                categories={categories}
                onOpenCategoryManager={() => setIsCatManagerOpen(true)}
                initialBalance={initialBalance}
                initialCreditBill={initialCreditBill}
                totalCreditLimit={totalCreditLimit}
                onUpdateInitialBalance={(v) => updSet({ initialBalance: v })}
                onUpdateInitialCreditBill={(v) => updSet({ initialCreditBill: v })}
                onUpdateTotalCreditLimit={(v) => updSet({ totalCreditLimit: v })}
              />
            </div>
          )}

          {/* RELATÓRIOS (Visão Anual Completa) */}
          {activeTab === 'reports' && (
            <div className="w-full pb-24 lg:pb-0">
              <Reports transactions={allTransactions} />
            </div>
          )}

          {/* INVESTIMENTOS */}
          {activeTab === 'investments' && (
            <div className="w-full pb-24 lg:pb-0">
              <Investments 
                history={investmentHistory}
                onAddTransaction={addInv}
                onUpdateTransaction={updInv}
                onDeleteTransaction={delInv}
              />
            </div>
          )}

          {/* PLANEJAMENTO (Visão do Mês) */}
          {activeTab === 'planning' && (
            <div className="w-full pb-24 lg:pb-0">
              {monthSelector}
              <Planning 
                transactions={monthlyTransactions} 
                budgets={budgets} 
                categories={categories}
                onUpdateBudget={updBudg}
                onDeleteBudget={delBudg} // <--- Conectado aqui
              />
            </div>
          )}

          {/* EXTRATO (Visão do Mês) */}
          {activeTab === 'history' && (
            <div className="w-full max-w-5xl mx-auto pb-24 lg:pb-0">
              {monthSelector}
              <History 
                transactions={monthlyTransactions}
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
       {isSettingsOpen && ( <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4"> <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl overflow-y-auto max-h-[90vh]"> <h3 className="text-2xl font-black text-[#521256] mb-8">Opções ⚙️</h3> <div className="space-y-4"> <button onClick={handleLogout} className="w-full p-4 bg-orange-100 text-orange-600 rounded-xl font-bold">Sair</button> <button onClick={() => setIsResetConfirmOpen(true)} className="w-full p-4 bg-red-100 text-red-600 rounded-xl font-bold">Zerar Dados</button> <button onClick={() => setIsSettingsOpen(false)} className="w-full p-4 bg-gray-100 rounded-xl font-bold">Fechar</button> </div> </div> </div> )}
       {isResetConfirmOpen && ( <div className="fixed inset-0 bg-red-600/80 z-[250] flex items-center justify-center p-4"> <div className="bg-white p-8 rounded-2xl text-center"> <h3 className="font-black text-xl mb-4">Tem certeza?</h3> <button onClick={resetAllData} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold">Sim, apagar tudo</button> <button onClick={() => setIsResetConfirmOpen(false)} className="ml-4 text-gray-500 font-bold">Cancelar</button> </div> </div> )}
    </Layout>
  );
};
export default App;
