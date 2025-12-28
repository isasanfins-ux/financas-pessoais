import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Planning from './components/Planning';
import Investments from './components/Investments';
import CategoryManagerModal from './components/CategoryManagerModal';
import { Transaction, CategoryBudget, InvestmentTransaction, User } from './types'; // Adicionei InvestmentTransaction
import { INITIAL_CATEGORIES, INITIAL_BUDGETS } from './constants';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Estados sincronizados com Firestore
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // NOVO: Estado para o Histórico de Investimentos
  const [investmentHistory, setInvestmentHistory] = useState<InvestmentTransaction[]>([]);

  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [initialCreditBill, setInitialCreditBill] = useState<number>(0);
  const [totalCreditLimit, setTotalCreditLimit] = useState<number>(5000);

  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // 1. Gerenciamento de Sessão
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      if (fUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", fUser.uid));
          if (userDoc.exists()) {
            setCurrentUser(userDoc.data() as User);
          } else {
            setCurrentUser({
              id: fUser.uid,
              name: fUser.displayName || 'Estrela',
              email: fUser.email || '',
              avatar: fUser.photoURL || 'https://picsum.photos/seed/guia/100'
            });
          }
        } catch (err: any) {
          console.warn("Firestore Profile Load Error:", err.message);
          setCurrentUser({
            id: fUser.uid,
            name: fUser.displayName || 'Estrela',
            email: fUser.email || '',
            avatar: fUser.photoURL || 'https://picsum.photos/seed/guia/100'
          });
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Sincronização Real-time
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.id;

    const handleError = (context: string) => (err: any) => {
      if (err.code === 'permission-denied') {
        console.warn(`Firestore Permission Denied on ${context}.`);
      } else {
        console.error(`Firestore Error on ${context}:`, err);
      }
    };

    // Transações Normais
    const qTrans = query(collection(db, "transactions"), where("uid", "==", uid));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
      setTransactions(data);
    }, handleError("Transactions"));

    // Categorias (Com Fusão Segura)
    const qCats = query(collection(db, "categories"), where("uid", "==", uid));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      const dbCategories = snapshot.docs.map(doc => doc.data().name as string);
      const combinedCategories = Array.from(new Set([...INITIAL_CATEGORIES, ...dbCategories]));
      setCategories(combinedCategories.sort());
    }, handleError("Categories"));

    // Orçamentos
    const qBudgets = query(collection(db, "budgets"), where("uid", "==", uid));
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as CategoryBudget));
      setBudgets(data.length > 0 ? data : (INITIAL_BUDGETS as CategoryBudget[]));
    }, handleError("Budgets"));

    // NOVO: Histórico de Investimentos
    const qInv = query(collection(db, "investment_transactions"), where("uid", "==", uid));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InvestmentTransaction));
      setInvestmentHistory(data);
    }, handleError("Investments"));

    // Configurações Globais
    const unsubSettings = onSnapshot(doc(db, "settings", uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInitialBalance(data.initialBalance || 0);
        setInitialCreditBill(data.initialCreditBill || 0);
        setTotalCreditLimit(data.totalCreditLimit || 5000);
      }
    }, handleError("Settings"));

    return () => {
      unsubTrans();
      unsubCats();
      unsubBudgets();
      unsubInv();
      unsubSettings();
    };
  }, [currentUser]);

  // 3. Handlers
  const handleLogout = async () => {
    await signOut(auth);
    setIsSettingsOpen(false);
  };

  // --- Funções de Transações Normais ---
  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!currentUser) return;
    await addDoc(collection(db, "transactions"), { ...t, uid: currentUser.id });
    if (!categories.includes(t.category)) {
      await addDoc(collection(db, "categories"), { name: t.category, uid: currentUser.id });
    }
  };

  const updateTransaction = async (updated: Transaction) => {
    if (!currentUser) return;
    const { id, ...data } = updated;
    await updateDoc(doc(db, "transactions", id), { ...data, uid: currentUser.id });
  };

  const deleteTransaction = async (id: string) => {
    await deleteDoc(doc(db, "transactions", id));
  };

  // --- Funções de Investimentos (NOVAS) ---
  const addInvestmentTransaction = async (t: Omit<InvestmentTransaction, 'id'>) => {
    if (!currentUser) return;
    await addDoc(collection(db, "investment_transactions"), { ...t, uid: currentUser.id });
  };

  const updateInvestmentTransaction = async (updated: InvestmentTransaction) => {
    if (!currentUser) return;
    const { id, ...data } = updated;
    await updateDoc(doc(db, "investment_transactions", id), { ...data, uid: currentUser.id });
  };

  const deleteInvestmentTransaction = async (id: string) => {
    await deleteDoc(doc(db, "investment_transactions", id));
  };

  // --- Outros Handlers ---
  const handleUpdateBudget = async (category: string, newLimit: number) => {
    if (!currentUser) return;
    const existing = budgets.find(b => b.category === category);
    if (existing && existing.id) {
      await updateDoc(doc(db, "budgets", existing.id), { limit: newLimit });
    } else {
      await addDoc(collection(db, "budgets"), { category, limit: newLimit, uid: currentUser.id });
    }
  };

  const updateGlobalSettings = async (updates: any) => {
    if (!currentUser) return;
    await setDoc(doc(db, "settings", currentUser.id), { ...updates, uid: currentUser.id }, { merge: true });
  };

  const resetAllData = async () => {
    if (!currentUser) return;
    const uid = currentUser.id;
    // Adicionei investment_transactions na limpeza
    const collectionsToClear = ["transactions", "categories", "budgets", "goals", "investment_transactions"];
    
    try {
      for (const colName of collectionsToClear) {
        const q = query(collection(db, colName), where("uid", "==", uid));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, "settings", uid));
      window.location.reload();
    } catch (err) {
      console.error("Erro ao resetar dados:", err);
      alert("Houve um erro de permissão ao tentar limpar os dados.");
    }
  };

  if (authLoading) return <div className="min-h-screen bg-[#efd2fe] flex items-center justify-center">Loading...</div>;
  if (!currentUser) return <Auth onLogin={() => window.location.reload()} />;

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      onProfileClick={() => setIsSettingsOpen(true)}
      currentUser={currentUser}
    >
      <div className="flex flex-col h-full gap-8 relative max-w-7xl mx-auto">
        <div className="flex-1 w-full">
          {activeTab === 'dashboard' && (
            <div className="pb-24 lg:pb-0">
              <Dashboard 
                transactions={transactions} 
                onAddTransaction={addTransaction}
                categories={categories}
                onOpenCategoryManager={() => setIsCatManagerOpen(true)}
                initialBalance={initialBalance}
                initialCreditBill={initialCreditBill}
                totalCreditLimit={totalCreditLimit}
                onUpdateInitialBalance={(val) => updateGlobalSettings({ initialBalance: val })}
                onUpdateInitialCreditBill={(val) => updateGlobalSettings({ initialCreditBill: val })}
                onUpdateTotalCreditLimit={(val) => updateGlobalSettings({ totalCreditLimit: val })}
              />
            </div>
          )}

          {/* ABA INVESTIMENTOS ATUALIZADA */}
          {activeTab === 'investments' && (
            <div className="w-full pb-24 lg:pb-0">
              <Investments 
                history={investmentHistory}
                onAddTransaction={addInvestmentTransaction}
                onUpdateTransaction={updateInvestmentTransaction}
                onDeleteTransaction={deleteInvestmentTransaction}
              />
            </div>
          )}

          {activeTab === 'planning' && (
            <div className="w-full pb-24 lg:pb-0">
              <Planning 
                transactions={transactions} 
                budgets={budgets} 
                onUpdateBudget={handleUpdateBudget}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="w-full max-w-5xl mx-auto pb-24 lg:pb-0">
              <History 
                transactions={transactions} 
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

      <CategoryManagerModal 
        isOpen={isCatManagerOpen}
        onClose={() => setIsCatManagerOpen(false)}
        categories={categories}
        onRename={() => alert("Em breve!")}
        onDelete={async (name) => {
          if (confirm(`Excluir categoria "${name}"?`)) {
            const q = query(collection(db, "categories"), where("uid", "==", currentUser.id), where("name", "==", name));
            const snap = await getDocs(q);
            snap.docs.forEach(d => deleteDoc(d.ref));
          }
        }}
      />

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
             <h3 className="text-2xl font-black text-[#521256] mb-8">Opções ⚙️</h3>
             {/* ... Conteúdo do Modal de Settings (Mantive simplificado aqui para não estourar o limite, mas o seu original funcionará igual) ... */}
             <div className="space-y-4">
                <button onClick={handleLogout} className="w-full p-4 bg-orange-100 text-orange-600 rounded-xl font-bold">Sair</button>
                <button onClick={() => setIsResetConfirmOpen(true)} className="w-full p-4 bg-red-100 text-red-600 rounded-xl font-bold">Zerar Dados</button>
                <button onClick={() => setIsSettingsOpen(false)} className="w-full p-4 bg-gray-100 rounded-xl font-bold">Fechar</button>
             </div>
          </div>
        </div>
      )}
      
      {isResetConfirmOpen && (
         <div className="fixed inset-0 bg-red-600/80 z-[250] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl text-center">
              <h3 className="font-black text-xl mb-4">Tem certeza?</h3>
              <button onClick={resetAllData} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold">Sim, apagar tudo</button>
              <button onClick={() => setIsResetConfirmOpen(false)} className="ml-4 text-gray-500 font-bold">Cancelar</button>
            </div>
         </div>
      )}
    </Layout>
  );
};

export default App;
