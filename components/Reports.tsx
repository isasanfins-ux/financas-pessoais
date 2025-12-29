import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Transaction, TransactionType } from '../types';
import { COLORS } from '../constants';

interface ReportsProps {
  transactions: Transaction[]; // Recebe TODAS as transações (Histórico completo)
}

const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  
  // Processa os dados para agrupar por mês (Jan, Fev, Mar...)
  const annualData = useMemo(() => {
    const summary: Record<string, { name: string, sortKey: string, receitas: number, despesas: number }> = {};
    
    transactions.forEach(t => {
      // Ajuste de fuso para garantir o mês correto
      const date = new Date(t.date + 'T12:00:00');
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Ex: 2025-12
      
      if (!summary[key]) {
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        summary[key] = {
          name: `${monthName}/${date.getFullYear().toString().slice(2)}`, // Ex: dez/25
          sortKey: key,
          receitas: 0,
          despesas: 0
        };
      }

      if (t.type === TransactionType.INCOME) {
        summary[key].receitas += t.amount;
      } else if (t.type === TransactionType.EXPENSE) {
        summary[key].despesas += t.amount;
      }
    });

    // Transforma em array e ordena por data
    return Object.values(summary).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [transactions]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header */}
      <div className="bg-[#521256] rounded-[2.5rem] p-10 text-white shadow-2xl shadow-[#521256]/20 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2">Relatórios Anuais 📊</h2>
          <p className="opacity-60 font-medium">Acompanhe sua evolução financeira mês a mês.</p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-[#f170c3] rounded-full blur-[100px] opacity-30 -mr-20 -mt-20"></div>
      </div>

      {/* Gráfico de Barras (Receitas x Despesas) */}
      <div className="bg-white rounded-[2.5rem] p-8 lg:p-12 shadow-xl shadow-[#521256]/5 border border-white/40">
        <h3 className="text-xl font-black text-[#521256] mb-8">Fluxo de Caixa Anual</h3>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={annualData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#efd2fe" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#521256', fontSize: 12, fontWeight: 'bold' }} 
                dy={10}
              />
              <Tooltip 
                cursor={{ fill: '#efd2fe', opacity: 0.3 }}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                // LINHA NOVA ABAIXO: Formata o valor para Real (R$)
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontWeight: 'bold', fontSize: '12px', color: '#521256' }}
              />
              <Bar name="Receitas" dataKey="receitas" fill={COLORS.POSITIVE} radius={[6, 6, 0, 0]} barSize={40} />
              <Bar name="Despesas" dataKey="despesas" fill={COLORS.ACCENT} radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {annualData.length === 0 && (
           <p className="text-center text-xs opacity-40 italic mt-4">Nenhum dado registrado ainda.</p>
        )}
      </div>
    </div>
  );
};

export default Reports;
