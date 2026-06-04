import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Lock, Mail, User, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { GlassCard } from '../components/GlassCard.jsx';

export const LoginPage = ({ onBackToLanding }) => {
  const { login, signup } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  
  // Inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // States
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isRegister) {
      if (!username || !email || !password) {
        return setError('All fields are required.');
      }
      if (password !== confirmPassword) {
        return setError('Passwords do not match.');
      }
      if (password.length < 6) {
        return setError('Password must be at least 6 characters.');
      }
    } else {
      if (!email || !password) {
        return setError('Email/Username and password are required.');
      }
    }

    setLoading(true);
    try {
      if (isRegister) {
        await signup(username, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-6 relative overflow-hidden">
      
      {/* Background Neon Orbs */}
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-neonViolet/10 blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-neonCyan/10 blur-3xl -z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md">
        
        {/* Logo click back */}
        <div 
          onClick={onBackToLanding} 
          className="flex items-center justify-center space-x-2 mb-8 cursor-pointer group"
        >
          <Sparkles className="w-6 h-6 text-neonViolet group-hover:text-neonPink duration-300" />
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-neonViolet to-neonPink bg-clip-text text-transparent">
            HABITARENA
          </span>
        </div>

        <GlassCard className="border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isRegister ? 'Join rooms and challenge your friends' : 'Log in to continue your streaks'}
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center space-x-2 p-4 bg-red-950/20 border border-red-500/30 text-red-400 text-sm rounded-xl">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="venky"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neonViolet focus:ring-1 focus:ring-neonViolet/30 text-sm transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                {isRegister ? 'Email Address' : 'Email or Username'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type={isRegister ? 'email' : 'text'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isRegister ? 'venky@example.com' : 'venky or venky@example.com'}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neonViolet focus:ring-1 focus:ring-neonViolet/30 text-sm transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neonViolet focus:ring-1 focus:ring-neonViolet/30 text-sm transition-all"
                />
              </div>
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Confirm Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neonViolet focus:ring-1 focus:ring-neonViolet/30 text-sm transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-neonViolet to-neonPink hover:shadow-neonViolet hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Processing...' : isRegister ? 'Sign Up' : 'Log In'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

          </form>

          <div className="mt-8 text-center text-xs">
            <span className="text-gray-500">
              {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <button 
              onClick={toggleAuthMode}
              className="text-neonViolet hover:underline font-semibold bg-transparent border-none cursor-pointer"
            >
              {isRegister ? 'Log In' : 'Sign Up'}
            </button>
          </div>

        </GlassCard>

      </div>
    </div>
  );
};
