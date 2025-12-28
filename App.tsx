
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Planning from './components/Planning';
import Investments from './components/Investments';
import CategoryManagerModal from './components/CategoryManagerModal';
import { Transaction, CategoryBudget, InvestmentGoal, User } from './types';
import { INITIAL_CATEGORIES, INITIAL_BUDGETS, INITIAL_GOALS } from './constants';
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
  const [investmentGoals, setInvestmentGoals] = useState<InvestmentGoal[]>([]);
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [initialCreditBill, setInitialCreditBill] = useState<number>(0);
  const [totalCreditLimit, setTotalCreditLimit] = useState<number>(5000);

  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // 1. Gerenciamento de Sessão de Autenticação com Fallback
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      if (fUser) {
        try {
          // Tenta buscar dados estendidos do Firestore
          const userDoc = await getDoc(doc(db, "users", fUser.uid));
          if (userDoc.exists()) {
            setCurrentUser(userDoc.data() as User);
          } else {
            // Se o documento ainda não existir (ex: logo após o cadastro), usa dados do Auth
            setCurrentUser({
              id: fUser.uid,
              name: fUser.displayName || 'Estrela',
              email: fUser.email || '',
              avatar: fUser.photoURL || 'https://picsum.photos/seed/guia/100'
            });
          }
        } catch (err: any) {
          console.warn("Firestore Profile Load Error (Permission or missing doc):", err.message);
          // Mesmo com erro de permissão no doc 'users', definimos o usuário básico 
          // para que os listeners de transações (que dependem do UID) possam tentar carregar.
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

  // 2. Sincronização Real-time com Filtro de UID e tratamento de erro silencioso
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.id;

    const handleError = (context: string) => (err: any) => {
      if (err.code === 'permission-denied') {
        console.warn(`Firestore Permission Denied on ${context}. Verifique as regras de segurança.`);
      } else {
        console.error(`Firestore Error on ${context}:`, err);
      }
    };

    // Escuta de Transações
    const qTrans = query(collection(db, "transactions"), where("uid", "==", uid));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
      setTransactions(data);
    }, handleError("Transactions"));

    // Escuta de Categorias
    const qCats = query(collection(db, "categories"), where("uid", "==", uid));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data().name as string);
      setCategories(data.length > 0 ? data : INITIAL_CATEGORIES);
    }, handleError("Categories"));

    // Escuta de Planejamento (Budgets)
    const qBudgets = query(collection(db, "budgets"), where("uid", "==", uid));
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      // Fix: Cast through unknown to resolve type mismatch when adding 'id' to doc data for CategoryBudget
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as CategoryBudget));
      setBudgets(data.length > 0 ? data : (INITIAL_BUDGETS as CategoryBudget[]));
    }, handleError("Budgets"));

    // Escuta de Investimentos (Goals)
    const qGoals = query(collection(db, "goals"), where("uid", "==", uid));
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InvestmentGoal));
      setInvestmentGoals(data.length > 0 ? data : INITIAL_GOALS);
    }, handleError("Goals"));

    // Escuta de Configurações Globais (Saldo/Limite)
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
      unsubGoals();
      unsubSettings();
    };
  }, [currentUser]);

  // 3. Handlers de Gravação
  const handleLogout = async () => {
    await signOut(auth);
    setIsSettingsOpen(false);
  };

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "transactions"), { ...t, uid: currentUser.id });
      if (!categories.includes(t.category)) {
        await addDoc(collection(db, "categories"), { name: t.category, uid: currentUser.id });
      }
    } catch (err) {
      alert("Erro ao salvar: Verifique sua conexão ou permissões.");
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

  const handleUpdateBudget = async (category: string, newLimit: number) => {
    if (!currentUser) return;
    const existing = budgets.find(b => b.category === category);
    // Fix: existing.id is now properly recognized as CategoryBudget has an optional id property
    if (existing && existing.id) {
      await updateDoc(doc(db, "budgets", existing.id), { limit: newLimit });
    } else {
      await addDoc(collection(db, "budgets"), { category, limit: newLimit, uid: currentUser.id });
    }
  };

  const handleAddGoal = async (goal: Omit<InvestmentGoal, 'id'>) => {
    if (!currentUser) return;
    await addDoc(collection(db, "goals"), { ...goal, uid: currentUser.id });
  };

  const handleUpdateGoalAmount = async (goalId: string, additionalAmount: number) => {
    const goal = investmentGoals.find(g => g.id === goalId);
    if (goal) {
      await updateDoc(doc(db, "goals", goalId), { currentAmount: goal.currentAmount + additionalAmount });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    await deleteDoc(doc(db, "goals", goalId));
  };

  const updateGlobalSettings = async (updates: any) => {
    if (!currentUser) return;
    await setDoc(doc(db, "settings", currentUser.id), { ...updates, uid: currentUser.id }, { merge: true });
  };

  const resetAllData = async () => {
    if (!currentUser) return;
    const uid = currentUser.id;
    const collectionsToClear = ["transactions", "categories", "budgets", "goals"];
    
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#efd2fe] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#f170c3] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#521256] font-black text-sm uppercase tracking-widest animate-pulse">Sincronizando com a Nuvem... ✨</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLogin={() => {}} />;
  }

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

          {activeTab === 'investments' && (
            <div className="w-full pb-24 lg:pb-0">
              <Investments 
                goals={investmentGoals}
                onAddGoal={handleAddGoal}
                onUpdateAmount={handleUpdateGoalAmount}
                onDeleteGoal={handleDeleteGoal}
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
        onRename={() => alert("A renomeação em massa requer atualização de todas as transações vinculadas. Em breve!")}
        onDelete={async (name) => {
          if (confirm(`Deseja excluir a categoria "${name}"?`)) {
            const q = query(collection(db, "categories"), where("uid", "==", currentUser.id), where("name", "==", name));
            const snap = await getDocs(q);
            snap.docs.forEach(d => deleteDoc(d.ref));
          }
        }}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-[#521256]">Opções ⚙️</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-[#521256]/40 hover:text-[#521256]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-[#efd2fe]/20 rounded-[2rem] border border-[#efd2fe] flex items-center gap-4">
                 <img src={currentUser.avatar} alt="User" className="w-16 h-16 rounded-full border-2 border-[#f170c3] object-cover" />
                 <div>
                   <p className="text-sm font-black text-[#521256]">{currentUser.name}</p>
                   <p className="text-xs font-bold opacity-50">{currentUser.email}</p>
                 </div>
              </div>

              <div className="p-6 bg-[#efd2fe]/20 rounded-[2rem] border border-[#efd2fe]">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-4">Ajustes Financeiros</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold block mb-2 opacity-70">Saldo Bancário Real (R$)</label>
                    <input 
                      type="number" 
                      value={initialBalance}
                      onChange={(e) => updateGlobalSettings({ initialBalance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-white rounded-xl text-[#521256] font-bold focus:outline-none focus:ring-2 focus:ring-[#f170c3]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-2 opacity-70">Gasto Anterior da Fatura (R$)</label>
                    <input 
                      type="number" 
                      value={initialCreditBill}
                      onChange={(e) => updateGlobalSettings({ initialCreditBill: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-white rounded-xl text-[#521256] font-bold focus:outline-none focus:ring-2 focus:ring-[#f170c3]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-5 bg-orange-50 border border-orange-100 rounded-2xl hover:bg-orange-100 transition-colors group"
                >
                  <span className="font-bold text-sm text-orange-600 uppercase tracking-widest">Sair da Conta</span>
                  <span>👋</span>
                </button>

                <button 
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="w-full flex items-center justify-between p-5 bg-red-50 border border-red-100 rounded-2xl hover:bg-red-100 transition-colors group"
                >
                  <span className="font-bold text-sm text-red-600 uppercase tracking-widest">ZERAR DADOS DA CONTA</span>
                  <span className="opacity-40 group-hover:opacity-100 transition-opacity text-red-500">⚠️</span>
                </button>
              </div>
            </div>

            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="w-full mt-8 py-5 bg-[#521256] text-white font-black rounded-2xl hover:opacity-90 transition-opacity uppercase text-xs tracking-widest"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-red-600/60 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-black text-[#521256] mb-2">Tem certeza? 🚨</h3>
            <p className="text-sm font-semibold text-[#521256]/60 mb-8 leading-relaxed">Isso apagará permanentemente todos os seus lançamentos desta conta. Outros usuários não serão afetados.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={resetAllData}
                className="w-full py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-colors shadow-xl shadow-red-600/20"
              >
                SIM, APAGAR MEUS DADOS
              </button>
              <button 
                onClick={() => setIsResetConfirmOpen(false)}
                className="w-full py-4 text-[#521256] font-black hover:bg-[#efd2fe]/50 rounded-2xl transition-colors"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
