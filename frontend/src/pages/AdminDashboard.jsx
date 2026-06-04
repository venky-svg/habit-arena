import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';
import { GlassCard } from '../components/GlassCard.jsx';
import { Shield, ShieldAlert, Users, Trophy, ClipboardCheck, Server, Ban, RotateCcw, Trash2, ArrowLeft } from 'lucide-react';

export const AdminDashboard = ({ onBack }) => {
  const { user } = useAuth();
  
  // Lists
  const [stats, setStats] = useState(null);
  const [userList, setUserList] = useState([]);
  const [challengesList, setChallengesList] = useState([]);
  
  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchAdminData();
    } else {
      setError('Access Denied. You do not have permission to view this page.');
      setLoading(false);
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const statsData = await api.get('/admin/stats');
      const usersData = await api.get('/admin/users');
      const myRooms = await api.get('/challenges/my-challenges'); // Exposes active challenges

      setStats(statsData);
      setUserList(usersData);
      setChallengesList(myRooms);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to retrieve administrative data.');
      setLoading(false);
    }
  };

  const handleToggleBan = async (targetId, currentBanState) => {
    if (!confirm(`Are you sure you want to ${currentBanState ? 'lift suspension for' : 'suspend'} this user?`)) return;
    try {
      const res = await api.post(`/admin/users/${targetId}/ban`);
      alert(res.message);
      fetchAdminData();
    } catch (err) {
      alert(err.message || 'Failed to update user ban state.');
    }
  };

  const handleDeleteChallenge = async (roomId) => {
    if (!confirm('Are you sure you want to delete this challenge room and all its checklists/chat messages? This action is irreversible.')) return;
    try {
      const res = await api.delete(`/admin/challenges/${roomId}`);
      alert(res.message);
      fetchAdminData();
    } catch (err) {
      alert(err.message || 'Failed to delete challenge.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-neonCyan border-white/20 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || user.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
        <h3 className="text-xl font-bold text-white">Access Violation</h3>
        <p className="text-gray-400 text-sm">{error || 'Administrator credentials required.'}</p>
        <button onClick={onBack} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-all bg-transparent border-none cursor-pointer mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <h2 className="text-3xl font-extrabold text-white flex items-center tracking-wide">
            <Shield className="w-8 h-8 mr-2.5 text-neonCyan" /> System Control Center
          </h2>
        </div>
      </div>

      {/* METRIC CARDS GRID */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <GlassCard className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-neonCyan/10 border border-neonCyan/20 flex items-center justify-center text-neonCyan">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Total Members</span>
              <strong className="text-2xl text-white font-extrabold">{stats.totalUsers}</strong>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-neonViolet/10 border border-neonViolet/20 flex items-center justify-center text-neonViolet">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Active Rooms</span>
              <strong className="text-2xl text-white font-extrabold">{stats.activeChallenges}</strong>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-neonGreen/10 border border-neonGreen/20 flex items-center justify-center text-neonGreen">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Completion Rate</span>
              <strong className="text-2xl text-white font-extrabold">{stats.completionRate}%</strong>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Server className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Server Memory</span>
              <strong className="text-lg text-white font-bold truncate block">{stats.serverHealth.memoryUsage}</strong>
            </div>
          </GlassCard>

        </div>
      )}

      {/* MODERATION LAYOUTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Users lists table */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-extrabold text-white tracking-wide">Member Moderation</h3>

          <div className="glass rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">User</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">XP</th>
                    <th className="p-4">Level</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {userList.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 duration-150">
                      <td className="p-4 font-semibold text-white flex items-center space-x-2">
                        <img src={u.profilePhoto} alt={u.username} className="w-6 h-6 rounded-full object-cover" />
                        <span>{u.username}</span>
                        {u.role === 'admin' && <span className="text-[8px] bg-neonCyan/20 text-neonCyan px-1.5 py-0.5 rounded uppercase font-bold">Admin</span>}
                      </td>
                      <td className="p-4 text-gray-400 text-xs">{u.email}</td>
                      <td className="p-4 font-bold text-neonCyan">{u.xp}</td>
                      <td className="p-4 text-xs font-bold text-gray-400">{u.level}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          u.isBanned ? 'bg-red-950/20 text-red-400 border border-red-500/20' : 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {u.isBanned ? 'suspended' : 'active'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleBan(u.id, u.isBanned)}
                            className={`p-2 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 ml-auto transition-all ${
                              u.isBanned 
                                ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/50' 
                                : 'bg-red-950/10 border-red-500/20 text-red-400 hover:border-red-500/50'
                            }`}
                            title={u.isBanned ? 'Lift Ban' : 'Suspend User'}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{u.isBanned ? 'Unban' : 'Suspend'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Challenges moderation list */}
        <div className="space-y-4">
          <h3 className="text-xl font-extrabold text-white tracking-wide">Challenge Moderator</h3>

          <div className="space-y-3">
            {challengesList.length === 0 ? (
              <GlassCard className="text-center py-6">
                <p className="text-gray-500 text-xs">No active challenges found.</p>
              </GlassCard>
            ) : (
              challengesList.map(c => (
                <GlassCard key={c.id} className="p-4 flex items-center justify-between border border-white/5">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm line-clamp-1">{c.title}</h4>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      by {c.creatorName} • {c.members.length} members
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteChallenge(c.id)}
                    className="p-2.5 bg-red-950/10 border border-red-500/20 hover:border-red-500/50 text-red-400 rounded-lg transition-all"
                    title="Delete Room"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </GlassCard>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
