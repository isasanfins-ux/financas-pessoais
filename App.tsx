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
  
  // NOVOS ESTADOS PARA O CARTÃO 💳
  const [closingDay, setClosingDay] = useState<number>(6); // Default 06
  const [dueDay, setDueDay] = useState<number>(13);       // Default 13

  // --- O FILTRO "CALENDÁRIO PURO" (CORRIGIDO) ---
  // Aqui voltamos ao básico: Se a data é de Janeiro, mostra em Janeiro.
  // Isso conserta o Gráfico e o Extrato.
  // A inteligência da fatura fica SÓ no Dashboard (Card Roxo), usando o allTransactions.
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

  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [initialCreditBill, setInitialCreditBill] = useState<number>(0);
  const [totalCreditLimit, setTotalCreditLimit] = useState<number>(5000);

  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));

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

    const unsubSettings = onSnapshot(doc(db, "settings", uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInitialBalance(data.initialBalance || 0);
        setInitialCreditBill(data.initialCreditBill || 0);
        setTotalCreditLimit(data.totalCreditLimit || 5000);
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
    closingDay,
    dueDay,
    ...u, 
    uid: currentUser.id 
  }, { merge: true });

  const handleSaveProfile = async () => {
    if (!auth.currentUser || !currentUser) return;
    try {
      await updateProfile(auth.currentUser, { displayName: editName, photoURL: editAvatar });
      await setDoc(doc(db, "users", currentUser.id), { name: editName, avatar: editAvatar, email: currentUser.email, id: currentUser.id }, { merge: true });
      if (newPassword) {
        if (newPassword.length < 6) { alert("A senha precisa ter pelo menos 6 caracteres! 🔒"); return; }
        await updatePassword(auth.currentUser, newPassword);
        alert("Senha atualizada! 🔐");
      }
      alert("Perfil salvo com sucesso! ✨");
      window.location.reload();
    } catch (error: any) {
      console.error("Erro no perfil:", error);
      alert(`Ops! Não foi possível salvar.\nErro: ${error.message}`);
    }
  };

  const handleLogout = async () => { await signOut(auth); setIsSettingsOpen(false); };
  
  // --- FUNÇÃO DE ADICIONAR COM RECORRÊNCIA E CÁLCULO DE FATURA 📅 ---
  const addTransaction = async (t: Omit<Transaction, 'id'>) => { 
    if (!currentUser) return; 

    if (t.isRecurring) {
        // Se for recorrente, cria 12 cópias
        const startDate = new Date(t.date + 'T12:00:00');
        let startInvoiceDate = t.invoiceMonth ? new Date(t.invoiceMonth + '-02') : null;

        // Se não veio invoiceMonth manual, calcula o inicial baseado na data
        if (!startInvoiceDate && t.type === 'EXPENSE' && t.paymentMethod === 'Cartão de Crédito') {
           const day = startDate.getDate();
           // Se comprou dia 28/12, a primeira parcela já cai na fatura de JANEIRO
           if (day > closingDay) startDate.setMonth(startDate.getMonth() + 1);
           startInvoiceDate = startDate;
        }

        for (let i = 0; i < 12; i++) {
            const futureDate = new Date(startDate); 
            // Avança a DATA da transação (Jan, Fev, Mar...)
            futureDate.setMonth(new Date(t.date + 'T12:00:00').getMonth() + i);
            const isoDate = futureDate.toISOString().split('T')[0];

            let futureInvoiceMonth = undefined;
            if (startInvoiceDate) {
               const fInvoice = new Date(startInvoiceDate); 
               // Avança a FATURA de referência
               fInvoice.setMonth(startInvoiceDate.getMonth() + i);
               futureInvoiceMonth = fInvoice.toISOString().slice(0, 7); 
            }

            await addDoc(collection(db, "transactions"), { 
                ...t, 
                date: isoDate, 
                invoiceMonth: futureInvoiceMonth,
                uid: currentUser.id,
                createdAt: Date.now() + i 
            });
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

  const updBudg = async (c: string, l: number) => { 
    if(!currentUser) return; 
    const ex = budgets.find(b => b.category === c); 
    if(ex?.id) { await updateDoc(doc(db, "budgets", ex.id), { limit: l }); } 
    else { await addDoc(collection(db, "budgets"), { category: c, limit: l, uid: currentUser.id, month: currentDate.getMonth(), year: currentDate.getFullYear() }); }
  };

  const delBudg = async (category: string) => {
    if(!currentUser) return;
    const ex = budgets.find(b => b.category === category);
    if(ex?.id) await deleteDoc(doc(db, "budgets", ex.id));
  };

  const resetAllData = async () => {
    if (!currentUser) return;
    const collectionsToClear = ["transactions", "categories", "budgets", "goals", "investment_transactions", "market_items"];
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
          
          {activeTab === 'dashboard' && (
            <div className="pb-24 lg:pb-0">
              {monthSelector}
              <Dashboard 
                transactions={monthlyTransactions}
                allTransactions={allTransactions}
                currentDate={currentDate} 
                onAddTransaction={addTransaction}
                categories={categories}
                onOpenCategoryManager={() => setIsCatManagerOpen(true)}
                initialBalance={initialBalance}
                initialCreditBill={initialCreditBill}
                totalCreditLimit={totalCreditLimit}
                onUpdateInitialBalance={(v) => updSet({ initialBalance: v })}
                onUpdateInitialCreditBill={(v) => updSet({ initialCreditBill: v })}
                onUpdateTotalCreditLimit={(v) => updSet({ totalCreditLimit: v })}
                closingDay={closingDay}
              />
            </div>
          )}

          {/* ... OUTRAS TABS IGUAIS ... */}
          {activeTab === 'market' && (
            <div className="w-full pb-24 lg:pb-0">
              {monthSelector}
              <Market items={marketItems} onAddItem={addMarketItem} onDeleteItem={deleteMarketItem} />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="w-full pb-24 lg:pb-0">
              <Reports transactions={allTransactions} />
            </div>
          )}

          {activeTab === 'investments' && (
            <div className="w-full pb-24 lg:pb-0">
              <Investments history={investmentHistory} onAddTransaction={addInv} onUpdateTransaction={updInv} onDeleteTransaction={delInv} />
            </div>
          )}

          {activeTab === 'planning' && (
            <div className="w-full pb-24 lg:pb-0">
              {monthSelector}
              <Planning transactions={monthlyTransactions} budgets={budgets} categories={categories} onUpdateBudget={updBudg} onDeleteBudget={delBudg} />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="w-full max-w-5xl mx-auto pb-24 lg:pb-0">
              {monthSelector}
              <History 
                transactions={monthlyTransactions} // Lista fiel ao calendário
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
      
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in duration-300">
             <div className="flex flex-col items-center mb-6">
               <div className="w-24 h-24 rounded-full p-1 border-2 border-[#f170c3] mb-4 relative group">
                 <img src={editAvatar || 'https://picsum.photos/seed/guia/200'} alt="Avatar" className="w-full h-full rounded-full object-cover" />
               </div>
               <h3 className="text-2xl font-black text-[#521256]">Meu Perfil 💖</h3>
               <p className="text-xs font-bold opacity-40">Personalize sua experiência</p>
             </div>

             <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-1 block">Seu Nome</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-1 block">Link da Foto (URL)</label>
                  <input type="text" value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-1 block">E-mail (Login)</label>
                  <div className="w-full px-4 py-3 bg-gray-100 rounded-xl text-gray-500 font-bold text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    {currentUser?.email}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#efd2fe]">
                  <h4 className="text-xs font-black text-[#521256] uppercase mb-3">Configuração do Cartão 💳</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-1 block">Dia Fechamento</label>
                      <input type="number" min="1" max="31" value={closingDay} onChange={(e) => { const val = Number(e.target.value); setClosingDay(val); updSet({ closingDay: val }); }} className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] text-center focus:outline-none focus:ring-2 focus:ring-[#f170c3]" />
                      <p className="text-[9px] text-[#521256]/40 mt-1">Dia que a fatura vira.</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-1 block">Dia Vencimento</label>
                      <input type="number" min="1" max="31" value={dueDay} onChange={(e) => { const val = Number(e.target.value); setDueDay(val); updSet({ dueDay: val }); }} className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] text-center focus:outline-none focus:ring-2 focus:ring-[#f170c3]" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#efd2fe]">
                  <label className="text-[10px] font-black text-[#f170c3] uppercase tracking-widest mb-1 block">Alterar Senha (Opcional)</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha..." className="w-full px-4 py-3 bg-white border-2 border-[#efd2fe] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold" />
                </div>
                <button onClick={handleSaveProfile} className="w-full py-4 bg-[#521256] text-white font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg">SALVAR ALTERAÇÕES</button>
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#efd2fe]">
                   <button onClick={handleLogout} className="py-3 bg-orange-100 text-orange-600 rounded-xl font-bold text-xs hover:bg-orange-200 transition-colors">SAIR DA CONTA</button>
                   <button onClick={() => setIsResetConfirmOpen(true)} className="py-3 bg-red-100 text-red-600 rounded-xl font-bold text-xs hover:bg-red-200 transition-colors">ZERAR DADOS</button>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="w-full py-3 text-[#521256]/50 font-bold text-xs hover:text-[#521256]">Fechar sem salvar</button>
             </div>
          </div>
        </div>
      )}

      {isResetConfirmOpen && ( <div className="fixed inset-0 bg-red-600/80 z-[250] flex items-center justify-center p-4"> <div className="bg-white p-8 rounded-2xl text-center"> <h3 className="font-black text-xl mb-4">Tem certeza?</h3> <button onClick={resetAllData} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold">Sim, apagar tudo</button> <button onClick={() => setIsResetConfirmOpen(false)} className="ml-4 text-gray-500 font-bold">Cancelar</button> </div> </div> )}
      
      <ChatAssistant 
        transactions={allTransactions}
        marketItems={marketItems}
        budgets={budgets}
        currentBalance={initialBalance} 
      />

    </Layout>
  );
};
export default App;
