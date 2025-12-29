import React from 'react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onProfileClick: () => void;
  currentUser: User;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onProfileClick, currentUser }) => {
  const NavItem = ({ id, label, icon }: { id: string, label: string, icon: React.ReactNode }) => (
    <button 
      onClick={() => onTabChange(id)}
      className={`flex lg:flex-row flex-col items-center gap-3 p-3 lg:px-6 lg:py-4 rounded-2xl transition-all w-full
        ${activeTab === id 
          ? 'bg-[#f170c3] text-white shadow-lg lg:scale-105' 
          : 'text-[#521256] opacity-60 hover:opacity-100 hover:bg-white/40'}`}
    >
      {icon}
      <span className="text-[10px] lg:text-sm font-semibold text-left">{label}</span>
    </button>
  );

  const icons = {
    dashboard: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    investments: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    history: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    planning: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    reports: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#efd2fe] text-[#521256]">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 bg-white/20 backdrop-blur-xl border-r border-white/30 p-8 z-40">
        <div className="mb-12">
          {/* MUDANÇA AQUI: Título e Subtítulo atualizados */}
          <h1 className="text-2xl font-bold text-[#521256] flex flex-wrap items-center gap-2 leading-tight">
            Guia de finanças pessoais <span className="text-[#f170c3]">✨</span>
          </h1>
          <p className="text-xs opacity-70 mt-2 font-bold uppercase tracking-widest">Controle & Organização</p>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem id="dashboard" label="Dashboard" icon={icons.dashboard} />
          <NavItem id="investments" label="Investimentos" icon={icons.investments} />
          <NavItem id="planning" label="Planejamento" icon={icons.planning} />
          <NavItem id="reports" label="Relatórios" icon={icons.reports} />
          <NavItem id="history" label="Extrato" icon={icons.history} />
        </nav>

        <button 
          onClick={onProfileClick}
          className="mt-auto pt-8 border-t border-white/30 flex items-center gap-4 group cursor-pointer hover:bg-white/10 rounded-2xl transition-all"
        >
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#f170c3] bg-white shadow-md transition-transform group-hover:scale-105">
            <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm">Olá, {currentUser.name.split(' ')[0]}! ✨</p>
            <p className="text-[10px] opacity-60">Configurações</p>
          </div>
        </button>
      </aside>

      {/* Header - Mobile Only */}
      <header className="lg:hidden p-6 pb-2 flex items-center justify-between sticky top-0 bg-[#efd2fe]/90 backdrop-blur-sm z-20">
        <div>
          {/* MUDANÇA AQUI: Título e Subtítulo atualizados para Mobile */}
          <h1 className="text-lg font-bold text-[#521256] flex items-center gap-1">
            Guia de finanças pessoais <span className="text-[#f170c3]">✨</span>
          </h1>
          <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Controle & Organização</p>
        </div>
        <button 
          onClick={onProfileClick}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#f170c3] bg-white shadow-sm"
        >
          <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 px-4 lg:px-10 py-4 lg:py-8 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-[#efd2fe] px-2 py-3 flex justify-around items-center z-30">
        <button onClick={() => onTabChange('dashboard')} className={`flex flex-col items-center ${activeTab === 'dashboard' ? 'text-[#f170c3]' : 'text-[#521256] opacity-60'}`}>
          {icons.dashboard}
          <span className="text-[10px] mt-1 font-semibold">Home</span>
        </button>
        <button onClick={() => onTabChange('investments')} className={`flex flex-col items-center ${activeTab === 'investments' ? 'text-[#f170c3]' : 'text-[#521256] opacity-60'}`}>
          {icons.investments}
          <span className="text-[10px] mt-1 font-semibold">Invest</span>
        </button>
        <button onClick={() => onTabChange('planning')} className={`flex flex-col items-center ${activeTab === 'planning' ? 'text-[#f170c3]' : 'text-[#521256] opacity-60'}`}>
          {icons.planning}
          <span className="text-[10px] mt-1 font-semibold">Plano</span>
        </button>
        <button onClick={() => onTabChange('reports')} className={`flex flex-col items-center ${activeTab === 'reports' ? 'text-[#f170c3]' : 'text-[#521256] opacity-60'}`}>
          {icons.reports}
          <span className="text-[10px] mt-1 font-semibold">Relat.</span>
        </button>
        <button onClick={() => onTabChange('history')} className={`flex flex-col items-center ${activeTab === 'history' ? 'text-[#f170c3]' : 'text-[#521256] opacity-60'}`}>
          {icons.history}
          <span className="text-[10px] mt-1 font-semibold">Extra</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
