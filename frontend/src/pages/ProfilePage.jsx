import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { GlassCard } from '../components/GlassCard.jsx';
import { Award, Flame, User, Key, Sparkles, Image, Check } from 'lucide-react';

export const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  
  // Forms
  const [photoUrl, setPhotoUrl] = useState(user?.profilePhoto || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI status
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Avatar presets
  const avatarSeeds = ['Leo', 'Milo', 'Luna', 'Cleo', 'Oliver', 'Bella', 'Charlie', 'Lucy'];
  const avatarPresets = avatarSeeds.map(seed => `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setStatus(null);

    const updates = {};
    if (photoUrl !== user.profilePhoto) {
      updates.profilePhoto = photoUrl;
    }

    if (password) {
      if (password.length < 6) {
        return setStatus({ type: 'error', text: 'Password must be at least 6 characters.' });
      }
      if (password !== confirmPassword) {
        return setStatus({ type: 'error', text: 'Passwords do not match.' });
      }
      updates.password = password;
    }

    if (Object.keys(updates).length === 0) {
      return setStatus({ type: 'error', text: 'No modifications entered.' });
    }

    setLoading(true);
    try {
      await updateProfile(updates);
      setPassword('');
      setConfirmPassword('');
      setStatus({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Profile update failed.' });
    } finally {
      setLoading(false);
    }
  };

  const selectAvatar = (url) => {
    setPhotoUrl(url);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8 relative">
      
      {/* Background Neon Orbs */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-neonViolet/5 blur-3xl -z-10 animate-pulse"></div>

      <h2 className="text-3xl font-extrabold text-white tracking-wide flex items-center">
        <User className="w-8 h-8 mr-2 text-neonViolet" /> My Profile & Badges
      </h2>

      {status && (
        <div className={`p-4 rounded-xl border text-sm ${
          status.type === 'success' 
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-950/20 border-red-500/30 text-red-400'
        }`}>
          {status.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Side: Avatar selector & stats info */}
        <div className="space-y-6">
          <GlassCard className="text-center p-6" glowColor="violet">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-neonViolet/30 mx-auto p-0.5 shadow-neonViolet">
              <img src={photoUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.username}`} alt={user.username} className="w-full h-full object-cover rounded-xl" />
            </div>

            <h3 className="text-xl font-bold text-white mt-4">{user.username}</h3>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 border border-orange-500/20 text-orange-400 bg-orange-950/20 rounded-full inline-flex items-center mt-2">
              <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500 mr-1 animate-pulse" /> {user.streak} Day Streak
            </span>

            <div className="grid grid-cols-2 gap-4 border-t border-white/5 mt-6 pt-6 text-xs text-gray-400">
              <div className="text-center bg-white/5 border border-white/5 p-3 rounded-xl">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Tier Level</span>
                <strong className="text-white font-extrabold text-sm block mt-1 uppercase text-neonCyan">{user.level}</strong>
              </div>

              <div className="text-center bg-white/5 border border-white/5 p-3 rounded-xl">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Arena XP</span>
                <strong className="text-white font-extrabold text-sm block mt-1 text-neonPink">{user.xp} XP</strong>
              </div>
            </div>
          </GlassCard>

          {/* Quick presets list */}
          <GlassCard className="p-4 space-y-3">
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-gray-400 flex items-center">
              <Image className="w-4 h-4 mr-1 text-neonCyan" /> Choose Avatar
            </h4>

            <div className="grid grid-cols-4 gap-2">
              {avatarPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => selectAvatar(preset)}
                  className={`w-10 h-10 rounded-lg overflow-hidden border transition-all relative group cursor-pointer ${
                    photoUrl === preset ? 'border-neonCyan scale-105' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={preset} alt="preset" className="w-full h-full object-cover" />
                  {photoUrl === preset && (
                    <div className="absolute inset-0 bg-neonCyan/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Account Forms & Badges lists */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Unlocked Badges */}
          <GlassCard className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center tracking-wide">
              <Award className="w-5 h-5 mr-2 text-yellow-400" /> Unlocked Badges ({user.badges?.length || 0})
            </h3>

            {(user.badges || []).length === 0 ? (
              <p className="text-xs text-gray-500">Complete tasks and win challenge rooms to unlock achievements!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user.badges.map((badge, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 rounded-xl border border-white/5 bg-white/5 hover:border-yellow-500/20 hover:bg-yellow-500/[0.01] duration-300">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 flex-shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">{badge.name}</h4>
                      <p className="text-gray-400 text-[10px] leading-relaxed mt-0.5">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Edit account password form */}
          <GlassCard className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center tracking-wide">
              <Key className="w-5 h-5 mr-2 text-neonPink" /> Change Security Password
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neonViolet text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neonViolet text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-neonViolet to-neonPink hover:shadow-neonViolet hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Update Settings'}
                </button>
              </div>
            </form>
          </GlassCard>

        </div>

      </div>

    </div>
  );
};
