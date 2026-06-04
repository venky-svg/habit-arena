import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Flame, LogOut, Shield, Award, Trophy, User, LayoutDashboard, Calendar } from 'lucide-react';

export const Navbar = ({ currentPage, setCurrentPage }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getLevelColor = (level) => {
    switch (level) {
      case 'Diamond': return 'text-cyan-400 bg-cyan-950/50 border-cyan-800';
      case 'Platinum': return 'text-purple-300 bg-purple-950/50 border-purple-800';
      case 'Gold': return 'text-yellow-400 bg-yellow-950/50 border-yellow-800';
      case 'Silver': return 'text-gray-300 bg-gray-900/50 border-gray-700';
      default: return 'text-orange-400 bg-orange-950/50 border-orange-900'; // Bronze
    }
  };

  return (
    <nav className="glass sticky top-0 z-40 border-b border-white/10 px-6 py-4 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo / Title */}
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setCurrentPage('dashboard')}>
          <Trophy className="w-8 h-8 text-neonViolet drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-neonViolet via-neonPink to-neonCyan bg-clip-text text-transparent">
            HABITARENA
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="hidden md:flex items-center space-x-1">
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === 'dashboard' 
                ? 'bg-neonViolet/20 text-neonViolet border border-neonViolet/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => setCurrentPage('profile')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === 'profile' 
                ? 'bg-neonViolet/20 text-neonViolet border border-neonViolet/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>

          {user.role === 'admin' && (
            <button 
              onClick={() => setCurrentPage('admin')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentPage === 'admin' 
                  ? 'bg-neonCyan/20 text-neonCyan border border-neonCyan/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Panel</span>
            </button>
          )}
        </div>

        {/* User Stats & Logout */}
        <div className="flex items-center space-x-4">
          
          {/* XP & Level Info */}
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-xs text-gray-400">Total Progress</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${getLevelColor(user.level)}`}>
                {user.level}
              </span>
              <span className="text-xs font-semibold text-neonCyan">{user.xp || 0} XP</span>
            </div>
          </div>

          {/* Daily Streak */}
          <div className="flex items-center space-x-1 bg-orange-950/20 border border-orange-500/20 px-3 py-1.5 rounded-full text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.1)]">
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500 animate-pulse" />
            <span className="text-sm font-bold">{user.streak || 0}</span>
          </div>

          {/* Avatar Profile */}
          <div 
            onClick={() => setCurrentPage('profile')}
            className="w-10 h-10 rounded-full border border-white/20 overflow-hidden cursor-pointer hover:border-neonViolet transition-all"
          >
            <img 
              src={user.profilePhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.username}`} 
              alt={user.username}
              className="w-full h-full object-cover" 
            />
          </div>

          {/* Logout button */}
          <button 
            onClick={logout}
            className="p-2.5 rounded-lg border border-red-500/20 bg-red-950/10 text-red-400 hover:bg-red-950/30 hover:border-red-500/50 transition-all"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </nav>
  );
};
