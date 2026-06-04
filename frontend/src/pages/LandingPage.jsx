import React from 'react';
import { Trophy, Flame, ShieldAlert, Sparkles, MessageCircle, BarChart3, ChevronRight, Zap } from 'lucide-react';

export const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="relative min-h-screen flex flex-col justify-between py-12 px-6 overflow-hidden">
      
      {/* Background Neon Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-neonViolet/10 blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-neonCyan/10 blur-3xl -z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="max-w-6xl mx-auto w-full flex-grow flex flex-col justify-center items-center text-center space-y-12">
        
        {/* Logo Badge */}
        <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider text-neonViolet shadow-[0_0_15px_rgba(139,92,246,0.1)]">
          <Sparkles className="w-4 h-4 text-neonPink animate-spin" style={{ animationDuration: '4s' }} />
          <span>Level Up Your Routine</span>
        </div>

        {/* Hero Headline */}
        <div className="space-y-4 max-w-4xl">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
            Forge Discipline Into{' '}
            <span className="bg-gradient-to-r from-neonViolet via-neonPink to-neonCyan bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(139,92,246,0.2)]">
              Social Competition
            </span>
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Create challenge rooms with friends, complete daily habits, maintain streaks, and battle on live leaderboards. Level up your life, together.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <button 
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-neonViolet to-neonPink hover:from-neonViolet hover:to-neonViolet text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-[1.03] shadow-neonViolet hover:shadow-[0_0_25px_rgba(139,92,246,0.6)]"
          >
            <span>Enter the Arena</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-12">
          
          <div className="glass p-8 rounded-2xl text-left border border-white/5 hover:border-neonViolet/30 duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-neonViolet/10 flex items-center justify-center border border-neonViolet/20 mb-6 group-hover:bg-neonViolet/20 transition-all">
              <Trophy className="w-6 h-6 text-neonViolet" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Challenge Rooms</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Create customized spaces for 10, 20, or 30 days. Set private invite codes or join public rooms. Compete with custom tasks and difficulty levels.
            </p>
          </div>

          <div className="glass p-8 rounded-2xl text-left border border-white/5 hover:border-neonCyan/30 duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-neonCyan/10 flex items-center justify-center border border-neonCyan/20 mb-6 group-hover:bg-neonCyan/20 transition-all">
              <Zap className="w-6 h-6 text-neonCyan" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">XP & Levels</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Earn XP based on task difficulties: Easy (+10), Medium (+20), or Hard (+40). Level up your rank from Bronze to legendary Diamond.
            </p>
          </div>

          <div className="glass p-8 rounded-2xl text-left border border-white/5 hover:border-neonPink/30 duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-neonPink/10 flex items-center justify-center border border-neonPink/20 mb-6 group-hover:bg-neonPink/20 transition-all">
              <MessageCircle className="w-6 h-6 text-neonPink" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Real-Time Social</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Chat with room members, react to comments using emojis (🔥, 💪, 👑, 👏), and track a live activity feed showing who completed what task.
            </p>
          </div>

        </div>

      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 mt-12">
        <span>© 2026 HabitArena. Design inspired by neon glassmorphic aesthetics.</span>
      </div>

    </div>
  );
};
