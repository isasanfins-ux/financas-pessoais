
import React, { useState } from 'react';
import { User } from '../types';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('https://picsum.photos/seed/user/200');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validação proativa de senha
    if (!isLogin && password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres para sua segurança. 🛡️');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fUser = userCredential.user;

        // Atualiza perfil no Auth Service
        await updateProfile(fUser, { displayName: name, photoURL: avatar });
        
        // Cria documento do usuário no Firestore
        await setDoc(doc(db, "users", fUser.uid), {
          id: fUser.uid,
          name,
          email,
          avatar,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error("Auth Error Code:", err.code);
      switch(err.code) {
        case 'auth/weak-password': 
          setError('Senha muito fraca. Tente misturar letras e números.'); 
          break;
        case 'auth/email-already-in-use': 
          setError('Este e-mail já está em uso por outra conta. 📧'); 
          break;
        case 'auth/invalid-credential': 
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('E-mail ou senha incorretos. Verifique e tente de novo.'); 
          break;
        case 'auth/permission-denied':
        case 'permission-denied':
          setError('Erro de permissão no banco. Verifique as regras do Firestore.');
          break;
        case 'auth/invalid-api-key': 
          setError('Configuração inválida: API Key do Firebase está incorreta.'); 
          break;
        default: 
          setError('Houve um erro na autenticação. Tente novamente em instantes.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#efd2fe] flex items-center justify-center p-6">
      <div className="bg-white rounded-[3rem] w-full max-w-md p-10 lg:p-14 shadow-2xl shadow-[#521256]/20 animate-in zoom-in duration-500">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-[#521256] mb-2">Guia <span className="text-[#f170c3]">✨</span></h1>
          <p className="text-sm font-bold opacity-50 uppercase tracking-widest">
            {isLogin ? 'Bem-vinda de volta!' : 'Crie sua conta agora'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold mb-6 text-center border border-red-100 animate-in fade-in zoom-in duration-200">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && (
            <>
              <div>
                <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-1.5 block">Nome Completo</label>
                <input 
                  required
                  disabled={loading}
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-6 py-4 bg-[#efd2fe]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold transition-all disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col items-center gap-3 mb-4">
                <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest block">Sua Foto / Avatar</label>
                <div className="flex gap-4 overflow-x-auto py-2 w-full no-scrollbar">
                  {[1, 2, 3, 4, 5].map(i => {
                    const url = `https://picsum.photos/seed/avatar${i}/100`;
                    return (
                      <button 
                        key={i}
                        type="button"
                        disabled={loading}
                        onClick={() => setAvatar(url)}
                        className={`shrink-0 w-12 h-12 rounded-full border-2 transition-all ${avatar === url ? 'border-[#f170c3] scale-110 shadow-lg' : 'border-transparent opacity-50'}`}
                      >
                        <img src={url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-1.5 block">E-mail</label>
            <input 
              required
              disabled={loading}
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-6 py-4 bg-[#efd2fe]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-[#521256]/50 uppercase tracking-widest mb-1.5 block">Senha (mín. 6 caracteres)</label>
            <input 
              required
              disabled={loading}
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-6 py-4 bg-[#efd2fe]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f170c3] text-[#521256] font-bold transition-all disabled:opacity-50"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-[#f170c3] text-white font-black rounded-2xl shadow-xl shadow-[#f170c3]/20 hover:scale-[1.02] active:scale-95 transition-all uppercase text-xs tracking-widest mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            {isLogin ? 'Entrar Agora' : 'Finalizar Cadastro'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            disabled={loading}
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-xs font-black text-[#521256]/40 hover:text-[#f170c3] transition-colors uppercase tracking-widest disabled:opacity-50"
          >
            {isLogin ? 'Não tem conta? Crie uma!' : 'Já tem conta? Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
