import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';
import { GlassCard } from '../components/GlassCard.jsx';
import { 
  Flame, Award, Trophy, Users, Plus, Key, Calendar, 
  ChevronRight, Compass, ShieldAlert, Sparkles, CheckCircle2 
} from 'lucide-react';

export const Dashboard = ({ onSelectChallenge }) => {
  const { user, refreshUser } = useAuth();
  
  // Lists
  const [myChallenges, setMyChallenges] = useState([]);
  const [publicChallenges, setPublicChallenges] = useState([]);
  const [systemTimeInfo, setSystemTimeInfo] = useState({ systemTime: '', dateString: '' });
  
  // Actions
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Creation form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('10');
  const [isPublic, setIsPublic] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState('10');
  
  // Join form
  const [inviteCode, setInviteCode] = useState('');
  
  // Alert/Status
  const [statusMessage, setStatusMessage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const myRooms = await api.get('/challenges/my-challenges');
      const publicRooms = await api.get('/challenges/public');
      const timeData = await api.get('/developer/time');
      
      setMyChallenges(myRooms);
      setPublicChallenges(publicRooms);
      setSystemTimeInfo(timeData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/challenges', {
        title,
        description,
        duration,
        isPublic,
        maxParticipants
      });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setDuration('10');
      setIsPublic(true);
      setMaxParticipants('10');
      
      setStatusMessage({ type: 'success', text: `Challenge "${res.challenge.title}" created successfully!` });
      fetchDashboardData();
      refreshUser();
    } catch (err) {
      setError(err.message || 'Failed to create challenge.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/challenges/join', { inviteCode });
      setShowJoinModal(false);
      setInviteCode('');
      
      setStatusMessage({ type: 'success', text: `Successfully joined "${res.challenge.title}"!` });
      fetchDashboardData();
      refreshUser();
    } catch (err) {
      setError(err.message || 'Failed to join challenge.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoinPublic = async (code) => {
    try {
      const res = await api.post('/challenges/join', { inviteCode: code });
      setStatusMessage({ type: 'success', text: `Successfully joined "${res.challenge.title}"!` });
      fetchDashboardData();
      refreshUser();
    } catch (err) {
      alert(err.message || 'Failed to join public challenge.');
    }
  };

  // Developer Tool: Advance system time to test reset logic
  const handleAdvanceDay = async () => {
    try {
      const res = await api.post('/developer/advance-day', { days: 1 });
      setStatusMessage({ 
        type: 'info', 
        text: `⏰ Developer: Shifted clock to ${res.newDate}. Checked streaks & reset tasks!` 
      });
      fetchDashboardData();
      refreshUser();
    } catch (err) {
      alert('Failed to advance clock.');
    }
  };

  const getLevelNextThreshold = (xp) => {
    if (xp >= 1500) return { current: 'Diamond', next: 'Max Level', required: 0, pct: 100 };
    if (xp >= 700) return { current: 'Platinum', next: 'Diamond', required: 1500, pct: Math.round(((xp - 700) / 800) * 100) };
    if (xp >= 300) return { current: 'Gold', next: 'Platinum', required: 700, pct: Math.round(((xp - 300) / 400) * 100) };
    if (xp >= 100) return { current: 'Silver', next: 'Gold', required: 300, pct: Math.round(((xp - 100) / 200) * 100) };
    return { current: 'Bronze', next: 'Silver', required: 100, pct: Math.min(100, Math.round((xp / 100) * 100)) };
  };

  const levelInfo = getLevelNextThreshold(user.xp || 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10 relative">
      
      {/* Alert Banners */}
      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between border ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
            : 'bg-indigo-950/20 border-indigo-500/30 text-indigo-400'
        }`}>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs hover:underline font-semibold bg-transparent border-none cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Welcome & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card & XP Level */}
        <GlassCard className="lg:col-span-2 flex flex-col justify-between" glowColor="violet">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-neonViolet/30 shadow-neonViolet p-0.5">
                <img 
                  src={user.profilePhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.username}`} 
                  alt={user.username} 
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold flex items-center">
                  Welcome, {user.username}!
                  <Sparkles className="w-4 h-4 ml-1.5 text-yellow-400 animate-pulse" />
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">Arena Rank: {user.role === 'admin' ? 'Administrator' : 'Challenger'}</p>
              </div>
            </div>

            {/* Simulated Server Clock status */}
            <div className="flex flex-col items-end text-right bg-white/5 border border-white/10 rounded-xl px-4 py-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-neonCyan" /> System Date
              </span>
              <span className="text-sm font-extrabold text-neonCyan mt-0.5">{systemTimeInfo.dateString || 'Loading...'}</span>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <div className="flex justify-between items-end text-xs">
              <span className="text-gray-400 font-semibold uppercase tracking-wider flex items-center">
                <Award className="w-4 h-4 mr-1 text-neonViolet" /> Level {levelInfo.current}
              </span>
              <span className="text-gray-400">
                {levelInfo.required > 0 ? `${user.xp} / ${levelInfo.required} XP to ${levelInfo.next}` : 'Max Level Reached'}
              </span>
            </div>
            
            {/* XP progress bar */}
            <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-white/5 relative">
              <div 
                className="h-full bg-gradient-to-r from-neonViolet to-neonPink animate-pulse-glow"
                style={{ width: `${levelInfo.pct}%` }}
              ></div>
            </div>
          </div>
        </GlassCard>

        {/* Global Streak Counter */}
        <GlassCard className="flex flex-col items-center justify-center text-center relative" glowColor="cyan">
          <div className="absolute top-4 right-4">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2.5 py-1 border border-white/10 rounded-full">
              consistency
            </span>
          </div>

          <div className="w-20 h-20 rounded-full bg-orange-950/20 border-2 border-orange-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.15)] mb-4">
            <Flame className="w-10 h-10 fill-orange-500 text-orange-500 animate-bounce" style={{ animationDuration: '3s' }} />
          </div>

          <h3 className="text-5xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
            {user.streak || 0}
          </h3>
          <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mt-1">Active Streak Days</p>
          <p className="text-gray-500 text-xs mt-2 max-w-[180px] leading-relaxed">
            Complete all tasks in your challenges within 24 hours to increase your streak!
          </p>
        </GlassCard>

      </div>

      {/* Main Grid: My Challenges & Side Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Active Challenges List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-wide flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-neonViolet" /> My Active Challenges
            </h3>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-2 bg-neonViolet/10 hover:bg-neonViolet/20 border border-neonViolet/30 text-neonViolet text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Room</span>
              </button>

              <button 
                onClick={() => setShowJoinModal(true)}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Key className="w-4 h-4 text-neonCyan" />
                <span>Join with Code</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {myChallenges.length === 0 ? (
              <GlassCard className="text-center py-10">
                <p className="text-gray-400 text-sm">You are not in any challenge rooms yet.</p>
                <button 
                  onClick={() => setShowCreateModal(true)} 
                  className="mt-4 px-4 py-2 bg-neonViolet hover:bg-neonViolet/80 text-white font-bold rounded-lg text-xs cursor-pointer transition-all"
                >
                  Create Your First Challenge
                </button>
              </GlassCard>
            ) : (
              myChallenges.map(room => (
                <GlassCard 
                  key={room.id} 
                  onClick={() => onSelectChallenge(room.id)}
                  className="glass-hover flex items-center justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${room.status === 'completed' ? 'bg-gray-500' : 'bg-neonGreen animate-ping'}`}></span>
                      <h4 className="text-lg font-bold text-white tracking-wide">{room.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        room.status === 'completed' 
                          ? 'bg-gray-800 text-gray-400 border border-gray-700' 
                          : 'bg-neonViolet/20 text-neonViolet border border-neonViolet/30'
                      }`}>
                        {room.status === 'completed' ? 'completed' : 'active'}
                      </span>
                    </div>

                    <p className="text-gray-400 text-xs line-clamp-1 max-w-xl">{room.description || 'No description provided.'}</p>
                    
                    <div className="flex items-center space-x-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold pt-1">
                      <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" /> {room.members.length} Members</span>
                      <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> {room.duration} Days</span>
                      {room.inviteCode && <span className="text-neonCyan border border-neonCyan/20 px-2 py-0.5 rounded bg-neonCyan/5">Code: {room.inviteCode}</span>}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:border-neonViolet/30 text-gray-400 group-hover:text-neonViolet transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </div>

        {/* Public Arena Feed & Dev Console */}
        <div className="space-y-6">
          
          {/* Public Rooms */}
          <div>
            <h3 className="text-xl font-bold tracking-wide flex items-center mb-6">
              <Compass className="w-5 h-5 mr-2 text-neonCyan" /> Public Arena
            </h3>

            <div className="space-y-4">
              {publicChallenges.length === 0 ? (
                <GlassCard className="text-center py-6">
                  <p className="text-gray-500 text-xs">No public challenges available right now.</p>
                </GlassCard>
              ) : (
                publicChallenges.map(room => (
                  <GlassCard key={room.id} className="p-4 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{room.title}</h4>
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2 leading-relaxed">{room.description}</p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{room.members.length} members • {room.duration} days</span>
                      <button 
                        onClick={() => handleQuickJoinPublic(room.inviteCode)}
                        className="px-3 py-1 bg-neonCyan/20 hover:bg-neonCyan/30 border border-neonCyan/40 text-neonCyan text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                      >
                        Join Room
                      </button>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          </div>

          {/* Developer Testing Console (Time Shift Simulator) */}
          <GlassCard className="border border-indigo-500/20 bg-indigo-950/5 relative" glowColor="">
            <div className="absolute -top-3 left-4 bg-indigo-900 border border-indigo-500 text-indigo-300 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest">
              Testing Console
            </div>

            <p className="text-xs text-indigo-200 mt-2 leading-relaxed">
              Habits reset every 24 hours. Use the shift time button to simulate day shifts, streak evaluation, and challenge expiration!
            </p>
            
            <button
              onClick={handleAdvanceDay}
              className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transform hover:scale-[1.01] transition-all flex items-center justify-center space-x-2"
            >
              <span>Simulate Next Day (24 hrs)</span>
            </button>
          </GlassCard>

        </div>

      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-lg">
            <GlassCard className="relative border border-white/10" glowColor="violet">
              <h3 className="text-2xl font-bold mb-6 text-white">Create Challenge Room</h3>
              {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
              
              <form onSubmit={handleCreateChallenge} className="space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Challenge Name</label>
                  <input 
                    type="text" 
                    required 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="e.g. 30-Day DSA Grind Challenge"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-neonViolet text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="e.g. Solve at least 2 LeetCode problems daily, maintain consistency, and win together."
                    rows="3"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-neonViolet text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Duration (Days)</label>
                    <input 
                      type="number" 
                      required 
                      value={duration} 
                      onChange={e => setDuration(e.target.value)} 
                      min="1"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-neonViolet text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Max Participants</label>
                    <input 
                      type="number" 
                      required 
                      value={maxParticipants} 
                      onChange={e => setMaxParticipants(e.target.value)} 
                      min="2"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-neonViolet text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="isPublic" 
                    checked={isPublic} 
                    onChange={e => setIsPublic(e.target.checked)}
                    className="w-4 h-4 accent-neonViolet cursor-pointer"
                  />
                  <label htmlFor="isPublic" className="text-xs text-gray-300 font-medium cursor-pointer">Make Room Public (visible in public arena)</label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-white/10 hover:bg-white/5 text-gray-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-5 py-2.5 bg-neonViolet hover:bg-neonViolet/80 text-white font-bold rounded-lg text-xs"
                  >
                    {loading ? 'Creating...' : 'Create Room'}
                  </button>
                </div>

              </form>
            </GlassCard>
          </div>
        </div>
      )}

      {/* JOIN MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <GlassCard className="relative border border-white/10" glowColor="cyan">
              <h3 className="text-2xl font-bold mb-4 text-white">Join Challenge Room</h3>
              <p className="text-xs text-gray-400 mb-6">Enter the 6-character room invite code shared by your friends.</p>
              {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
              
              <form onSubmit={handleJoinChallenge} className="space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Invite Code</label>
                  <input 
                    type="text" 
                    required 
                    maxLength="6"
                    value={inviteCode} 
                    onChange={e => setInviteCode(e.target.value.toUpperCase())} 
                    placeholder="e.g. ABCXYZ"
                    className="w-full text-center tracking-widest font-black uppercase px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-neonCyan text-lg"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                  <button 
                    type="button" 
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2 border border-white/10 hover:bg-white/5 text-gray-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-5 py-2.5 bg-neonCyan text-black hover:bg-neonCyan/80 font-bold rounded-lg text-xs"
                  >
                    {loading ? 'Joining...' : 'Join Arena'}
                  </button>
                </div>

              </form>
            </GlassCard>
          </div>
        </div>
      )}

    </div>
  );
};
