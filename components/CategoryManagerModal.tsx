
import React, { useState } from 'react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose, categories, onRename, onDelete }) => {
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (cat: string) => {
    setEditingCat(cat);
    setTempName(cat);
  };

  const handleSaveEdit = () => {
    if (editingCat && tempName.trim() && tempName !== editingCat) {
      onRename(editingCat, tempName.trim());
    }
    setEditingCat(null);
  };

  return (
    <div className="fixed inset-0 bg-[#521256]/60 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-black text-[#521256]">Categorias ⚙️</h3>
            <p className="text-xs font-bold opacity-50 uppercase tracking-widest">Organize suas listas</p>
          </div>
          <button onClick={onClose} className="text-[#521256]/40 hover:text-[#521256] transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scroll">
          {categories.map(cat => (
            <div key={cat} className="group flex items-center gap-3 p-4 bg-[#efd2fe]/30 rounded-2xl hover:bg-white border border-transparent hover:border-[#efd2fe] transition-all">
              {editingCat === cat ? (
                <div className="flex-1 flex gap-2">
                  <input 
                    autoFocus
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 bg-white px-4 py-2 rounded-xl text-sm font-bold text-[#521256] focus:outline-none focus:ring-2 focus:ring-[#f170c3]"
                  />
                  <button onClick={handleSaveEdit} className="p-2 text-green-500 hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sm shadow-sm shrink-0">🏷️</div>
                  <span className="flex-1 text-sm font-black text-[#521256]">{cat}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleStartEdit(cat)}
                      className="p-2 text-[#521256]/40 hover:text-[#521256] hover:bg-white rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button 
                      onClick={() => onDelete(cat)}
                      className="p-2 text-[#521256]/40 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 py-4 bg-[#521256] text-white font-black rounded-2xl hover:opacity-90 transition-opacity"
        >
          CONCLUÍDO
        </button>
      </div>
    </div>
  );
};

export default CategoryManagerModal;
