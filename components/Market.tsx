import React, { useState, useMemo } from 'react';
import { MarketItem } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface MarketProps {
  items: MarketItem[];
  onAddItem: (item: Omit<MarketItem, 'id'>) => void;
  onDeleteItem: (id: string) => void;
}

const Market: React.FC<MarketProps> = ({ items, onAddItem, onDeleteItem }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(''); // Valor Unitário
  const [quantity, setQuantity] = useState('1'); // Nova Quantidade
  const [type, setType] = useState<'essential' | 'luxury' | 'maintenance'>('essential');
  
  const recentItems = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const groupedItems = useMemo(() => {
    const summary: Record<string, number> = {};
    items.forEach(item => {
      summary[item.name] = (summary[item.name] || 0) + item.amount;
    });
    return Object.entries(summary)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [items]);

  const typeStats = useMemo(() => {
    const summary = { essential: 0, luxury: 0, maintenance: 0 };
    items.forEach(item => {
      summary[item.type] = (summary[item.type] || 0) + item.amount;
    });
    return [
      { name: 'Essencial', value: summary.essential, color: '#a3e635' },
      { name: 'Mimo / Extra', value: summary.luxury, color: '#f472b6' },
      { name: 'Casa / Limpeza', value: summary.maintenance, color: '#60a5fa' }
    ].filter(i => i.value > 0);
  }, [items]);

  const totalSpent = items.reduce((acc, curr) => acc + curr.amount, 0);

  const handleAdd = (itemName: string = name, itemType: 'essential' | 'luxury' | 'maintenance' = type) => {
    const unitPrice = parseFloat(amount.replace(',', '.'));
    const qty = parseInt(quantity);

    if (!unitPrice || !itemName || !qty) return;

    // Calcula o total (Unitário x Quantidade)
    const totalAmount = unitPrice * qty;

    onAddItem({
      name: itemName,
      amount: totalAmount, // Salva o valor total da compra
      quantity: qty,       // Salva a quantidade para histórico
      type: itemType,
      date: new Date().toISOString().split('T')[0]
    });

    setName('');
    setAmount('');
    setQuantity('1'); // Reseta para 1
  };

  const QuickButton = ({ label, type }: { label: string, type: 'essential' | 'luxury' | 'maintenance' }) => (
    <button 
      onClick={() => { setName(label); setType(type); }}
      className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition-all
        ${name === label 
          ? 'bg-[#521256] text-white border-[#521256]' 
          : 'bg-white text-[#521256]/60 border-transparent hover:border-[#f170c3]/30'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#521256]">Mercado & Consumo 🛒</h2>
          <p className="text-sm font-bold opacity-60">Entenda seu carrinho de compras</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-black opacity-40 block">Total do Mês</span>
          <span className="text-2xl font-black text-[#521256]">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA 1: LANÇAMENTO */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-[#521256]/5">
            <h3 className="text-lg font-black text-[#521256] mb-4">Adicionar Item</h3>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <QuickButton label="Açougue" type="essential" />
              <QuickButton label="Hortifruti" type="essential" />
              <QuickButton label="Limpeza" type="maintenance" />
              <QuickButton label="Higiene" type="maintenance" />
              <QuickButton label="Besteiras" type="luxury" />
              <QuickButton label="Bebidas" type="luxury" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">O que comprou?</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Café, Arroz, 'Compras do Mês'..."
                  className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] focus:outline-none focus:ring-2 focus:ring-[#f170c3]"
                />
              </div>

              <div className="flex gap-3">
                {/* CAMPO DE QUANTIDADE */}
                <div className="w-1/3">
                  <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Qtd</label>
                  <input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-center"
                  />
                </div>

                <div className="w-2/3">
                  <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Valor Unitário</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] focus:outline-none focus:ring-2 focus:ring-[#f170c3]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Tipo</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-4 py-3 bg-[#efd2fe]/30 rounded-xl font-bold text-[#521256] focus:outline-none focus:ring-2 focus:ring-[#f170c3]"
                >
                  <option value="essential">Essencial 🥬</option>
                  <option value="maintenance">Casa/Limpeza 🧹</option>
                  <option value="luxury">Mimo/Extra 🍫</option>
                </select>
              </div>

              <button 
                onClick={() => handleAdd()}
                className="w-full py-4 bg-[#521256] text-white font-black rounded-xl hover:scale-[1.02] transition-all shadow-lg flex justify-center items-center gap-2"
              >
                <span>ADICIONAR</span>
                {amount && quantity && (
                   <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                     (Total: R$ {(parseFloat(amount) * parseInt(quantity) || 0).toLocaleString('pt-BR')})
                   </span>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-[#521256]/5">
             <h3 className="text-sm font-black text-[#521256] mb-4 text-center">Raio-X do Consumo</h3>
             <div className="h-40 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={typeStats}
                     cx="50%"
                     cy="50%"
                     innerRadius={40}
                     outerRadius={60}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                   >
                     {typeStats.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip 
                     formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                     contentStyle={{ borderRadius: '10px', border: 'none' }}
                   />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-4 mt-2">
                {typeStats.map(t => (
                  <div key={t.name} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }}></div>
                    <span className="text-[10px] font-bold opacity-60">{t.name}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* COLUNA 2: LISTA DE ITENS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {groupedItems.slice(0, 4).map((item, idx) => (
               <div key={item.name} className="bg-white p-4 rounded-2xl border border-[#efd2fe] shadow-sm">
                 <div className="flex justify-between items-start mb-1">
                   <span className="text-[10px] font-black opacity-40">#{idx + 1}</span>
                   <span className="text-[10px] font-bold text-[#f170c3]">TOP</span>
                 </div>
                 <p className="font-black text-[#521256] truncate">{item.name}</p>
                 <p className="text-sm font-bold text-[#521256]/60">R$ {item.total.toLocaleString('pt-BR')}</p>
               </div>
             ))}
          </div>

          <div className="bg-white/60 rounded-[2.5rem] p-6 border border-white/40 min-h-[400px]">
            <h3 className="text-lg font-black text-[#521256] mb-6">Histórico de Itens</h3>
            <div className="space-y-3">
              {recentItems.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl flex justify-between items-center group hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                      ${item.type === 'essential' ? 'bg-lime-100' : (item.type === 'luxury' ? 'bg-pink-100' : 'bg-blue-100')}
                    `}>
                      {item.type === 'essential' ? '🥬' : (item.type === 'luxury' ? '🍫' : '🧹')}
                    </div>
                    <div>
                      {/* MOSTRANDO A QUANTIDADE AQUI */}
                      <p className="font-bold text-[#521256]">
                        {item.quantity && item.quantity > 1 && <span className="text-[#f170c3]">{item.quantity}x </span>}
                        {item.name}
                      </p>
                      <p className="text-[10px] opacity-50 uppercase font-black">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-[#521256]">R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <button 
                      onClick={() => onDeleteItem(item.id)}
                      className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              {recentItems.length === 0 && (
                <div className="text-center py-20 opacity-40">
                  <p>Seu carrinho está vazio. Comece a lançar! 🛒</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Market;
