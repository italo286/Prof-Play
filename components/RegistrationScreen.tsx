import React, { useState, useContext, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import { AVATARS } from '../data/avatars';

export const RegistrationScreen: React.FC = () => {
    const { login, register } = useContext(AuthContext);
    const { getAllUsers } = useContext(GameDataContext);
    
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [role, setRole] = useState<'student' | 'teacher'>('student');
    
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [classCode, setClassCode] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    
    const [error, setError] = useState('');
    
    const students = useMemo(() => getAllUsers(), [getAllUsers]);
    
    const usedAvatars = useMemo(() => {
        if (role !== 'student' || !classCode.trim()) return new Set();
        
        return new Set(
            students
                .filter(student => student.classCode === classCode.trim().toUpperCase() && student.avatar)
                .map(student => student.avatar)
        );
    }, [students, classCode, role]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !password.trim()) {
            setError('Nome de usuário e senha são obrigatórios.');
            return;
        }
        const result = await login(name.trim(), password);
        if (result === 'not_found') {
            setError('Usuário não encontrado. Verifique o nome ou registre-se.');
        } else if (result === 'wrong_pass') {
            setError('Senha incorreta.');
        }
    };
    
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !password.trim()) {
            setError('Nome de usuário e senha são obrigatórios.');
            return;
        }
        if (role === 'student' && !classCode.trim()) {
            setError('O código da turma é obrigatório para alunos.');
            return;
        }
        if (role === 'student' && !selectedAvatar) {
            setError('Por favor, escolha um avatar.');
            return;
        }

        const result = await register(name.trim(), password, role, classCode.trim().toUpperCase(), selectedAvatar || undefined);
        if (result.status !== 'success') {
            setError(result.message || 'Ocorreu um erro no registro.');
        }
    };

    const clearForm = () => {
        setName('');
        setPassword('');
        setClassCode('');
        setSelectedAvatar(null);
        setError('');
    };

    const toggleMode = (newMode: 'login' | 'register') => {
        setMode(newMode);
        clearForm();
    };

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="space-y-6">
             <div>
                <label htmlFor="login-name" className="block text-left text-sm font-medium text-slate-300 mb-1">Nome de Usuário</label>
                <input id="login-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 border border-slate-600 rounded-md shadow-sm text-base bg-slate-700 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Digite seu nome" required />
            </div>
             <div>
                <label htmlFor="login-password" className="block text-left text-sm font-medium text-slate-300 mb-1">Senha</label>
                <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 border border-slate-600 rounded-md shadow-sm text-base bg-slate-700 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Digite sua senha" required />
            </div>
            {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}
            <button type="submit"
                className="w-full px-6 py-3 bg-sky-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75">
                <i className="fas fa-sign-in-alt mr-2"></i>Entrar
            </button>
             <p className="text-center text-sm">
                Não tem uma conta?{' '}
                <button type="button" onClick={() => toggleMode('register')} className="font-semibold text-sky-400 hover:underline">
                    Registre-se aqui
                </button>
            </p>
        </form>
    );

    const renderRegisterForm = () => (
        <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-700 p-1">
                {(['student', 'teacher'] as const).map(r => (
                    <button type="button" key={r} onClick={() => setRole(r)}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${role === r ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-600/50'}`}>
                        {r === 'student' ? 'Sou Aluno' : 'Sou Professor'}
                    </button>
                ))}
            </div>
            <div>
                <label htmlFor="reg-name" className="block text-left text-sm font-medium text-slate-300 mb-1">Nome Completo</label>
                <input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 border border-slate-600 rounded-md shadow-sm text-base bg-slate-700 text-white focus:ring-2 focus:ring-sky-500"
                    placeholder="Seu nome de usuário único" required />
            </div>
            <div>
                <label htmlFor="reg-password" className="block text-left text-sm font-medium text-slate-300 mb-1">Crie uma Senha</label>
                <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 border border-slate-600 rounded-md shadow-sm text-base bg-slate-700 text-white focus:ring-2 focus:ring-sky-500"
                    placeholder="Pelo menos 6 caracteres" required />
            </div>
            {role === 'student' && (
                <>
                    <div>
                        <label htmlFor="class-code" className="block text-left text-sm font-medium text-slate-300 mb-1">Código da Turma</label>
                        <input id="class-code" type="text" value={classCode} onChange={(e) => setClassCode(e.target.value)}
                            className="w-full p-3 border border-slate-600 rounded-md shadow-sm text-base bg-slate-700 text-white focus:ring-2 focus:ring-sky-500"
                            placeholder="Peça ao seu professor" required />
                    </div>
                     <div>
                        <label className="block text-left text-sm font-medium text-slate-300 mb-2">Escolha seu Avatar</label>
                        <div className="grid grid-cols-5 md:grid-cols-6 gap-3 bg-slate-900/50 p-3 rounded-lg max-h-48 overflow-y-auto">
                            {AVATARS.map((avatarUrl) => {
                                const isTaken = usedAvatars.has(avatarUrl);
                                const isSelected = selectedAvatar === avatarUrl;
                                return (
                                    <button
                                        type="button"
                                        key={avatarUrl}
                                        onClick={() => !isTaken && setSelectedAvatar(avatarUrl)}
                                        disabled={isTaken}
                                        className={`w-14 h-14 rounded-full bg-cover bg-center transition-all duration-200 ease-in-out transform focus:outline-none 
                                            ${isSelected ? 'ring-4 ring-sky-400 scale-110' : ''} 
                                            ${isTaken ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'}`}
                                        style={{ backgroundImage: `url(${avatarUrl})` }}
                                        aria-label={`Avatar ${isTaken ? 'indisponível' : 'disponível'}`}
                                    >
                                        {isTaken && (
                                            <div className="w-full h-full rounded-full bg-black/60 flex items-center justify-center">
                                                <i className="fas fa-lock text-white"></i>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
             {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}
            <button type="submit"
                className="w-full px-6 py-3 bg-sky-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-sky-700 transition-colors">
                <i className="fas fa-user-plus mr-2"></i>Criar Conta
            </button>
            <p className="text-center text-sm">
                Já tem uma conta?{' '}
                <button type="button" onClick={() => toggleMode('login')} className="font-semibold text-sky-400 hover:underline">
                    Faça o login
                </button>
            </p>
        </form>
    );

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200 select-none">
            <div className="bg-slate-800 shadow-2xl rounded-xl p-6 md:p-10 w-full max-w-md text-center">
                <header className="mb-8">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <img src="https://i.ibb.co/bqK98gY/Google-AI-Studio-2025-08-22-T01-43-41-630-Z.png" alt="Logo do App" className="h-20 w-20 object-contain" />
                        <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                           {mode === 'login' ? 'Bem-vindo(a)!' : 'Crie sua Conta'}
                        </h1>
                    </div>
                    <p className="mt-4 text-slate-300">
                        {mode === 'login' ? 'Acesse sua conta para continuar seus desafios.' : 'Junte-se ao Prof-Play para aprender e se divertir!'}
                    </p>
                </header>

                {mode === 'login' ? renderLoginForm() : renderRegisterForm()}
            </div>
        </div>
    );
};