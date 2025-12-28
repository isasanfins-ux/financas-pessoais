import React from 'react';

interface MonthSelectorProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({ currentDate, onPrevMonth, onNextMonth }) => {
  const monthLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="flex items-center gap-4 bg-[#efd2fe]/30 p-2 rounded-2xl self-start mb-6">
      <button 
        onClick={onPrevMonth} 
        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white text-[#521256] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
      </button>
      
      <span className="text-sm font-black text-[#521256] min-w-[140px] text-center capitalize">
        {monthLabel}
      </span>
      
      <button 
        onClick={onNextMonth} 
        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white text-[#521256] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};

export default MonthSelector;
