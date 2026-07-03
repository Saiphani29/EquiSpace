import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { API_BASE_URL } from '../api/client';
import HeroScene from '../components/three/HeroScene';
import type { User } from '../types';

interface LoginPageProps {
  onLogin: (token: string, user: User) => void;
}

type Mode = 'login' | 'register';

const DEMO_CREDS = [
  { label: 'Citizen', subtitle: 'Venkatesh Rao', phone: '9848012345', pass: 'user123' },
  { label: 'Admin', subtitle: 'Municipal Admin', phone: '9999999999', pass: 'admin123' },
  { label: 'VIP', subtitle: 'MLA Office', phone: '9000000001', pass: 'vip123' },
];

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ name: '', phone_number: '', password: '' });
  const [loading, setLoading] = useState(false);

  const update = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('username', form.phone_number);
      params.append('password', form.password);
      const res = await axios.post(`${API_BASE_URL}/auth/login`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const token: string = res.data.access_token;
      const userRes = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Welcome back, ${userRes.data.name.split(' ')[0]}!`);
      onLogin(token, userRes.data as User);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Please enter your name'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, form);
      toast.success('Account created! You can now sign in.');
      setMode('login');
      setForm((p) => ({ ...p, name: '', password: '' }));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left: 3D Hero */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden login-hero">
        <HeroScene />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-12 z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.9 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-[#0078D4] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/40 glow-blue">
              <CalendarDays className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-3">Eluru Connect</h1>
            <p className="text-blue-200 text-lg font-light mb-2">Municipal Venue Portal</p>
            <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed mt-2">
              Fair, transparent, and equal access to public spaces in Eluru, Andhra Pradesh.
              No backdoor deals — everything is public.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-6 text-center">
              {[{ label: 'Public Venues', value: '10+' }, { label: 'Fair-Play', value: '100%' }, { label: 'Transparent', value: 'Always' }].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-[#0078D4] rounded-xl flex items-center justify-center shadow-lg">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg leading-tight">Eluru Connect</p>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">Municipal Portal</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {mode === 'login' ? 'Welcome back 👋' : 'Create your account'}
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            {mode === 'login' ? 'Sign in with your phone number' : 'Register as a citizen of Eluru'}
          </p>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Full Name</label>
                <input name="name" type="text" value={form.name} onChange={update} placeholder="Venkatesh Rao"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" required />
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Phone Number</label>
              <input name="phone_number" type="tel" value={form.phone_number} onChange={update} placeholder="9848012345"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Password</label>
              <input name="password" type="password" value={form.password} onChange={update} placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#0078D4] text-white py-3 rounded-xl font-semibold hover:bg-[#005A9E] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-md shadow-blue-500/20">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            {mode === 'login' ? "New here? " : 'Already registered? '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-[#0078D4] font-semibold hover:underline">
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>

          {/* Demo credentials */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center mb-3 font-semibold uppercase tracking-wider">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_CREDS.map((c) => (
                <button key={c.label}
                  onClick={() => { setForm({ name: '', phone_number: c.phone, password: c.pass }); setMode('login'); }}
                  className="text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-xl px-3 py-2.5 transition-all">
                  <p className="text-xs font-bold text-slate-700">{c.label}</p>
                  <p className="text-[10px] text-slate-400 truncate">{c.subtitle}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
