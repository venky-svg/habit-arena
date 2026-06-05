import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, SOCKET_URL } from '../utils/api.js';
import { GlassCard } from '../components/GlassCard.jsx';
import { io } from 'socket.io-client';
import { 
  Flame, Trophy, Users, Send, Plus, CheckCircle, Calendar,
  Trash2, X, Clipboard, MessageSquare, 
  ArrowLeft, Zap, AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const ChallengeRoom = ({ challengeId, onBack }) => {
  const { user } = useAuth();
  
  // Data State
  const [challenge, setChallenge] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [systemDate, setSystemDate] = useState('');
  
  // Input State
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDifficulty, setNewTaskDifficulty] = useState('easy');
  const [chatMessage, setChatMessage] = useState('');
  
  // UI State
  const [selectedMemberTasks, setSelectedMemberTasks] = useState(null); // Show friend's tasks
  const [memberTasksList, setMemberTasksList] = useState([]); // Loaded list of friend tasks
  const [activeTab, setActiveTab] = useState('tasks'); // tasks, leaderboard, chat
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadChallengeData();
    initSocketConnection();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_room', { challengeId });
        socketRef.current.disconnect();
      }
    };
  }, [challengeId]);

  useEffect(() => {
    // Scroll chat to bottom
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const loadChallengeData = async () => {
    try {
      const data = await api.get(`/challenges/${challengeId}`);
      setChallenge(data.challenge);
      setMembers(data.members);

      // Load current simulated system date
      const timeData = await api.get('/developer/time');
      setSystemDate(timeData.dateString);

      // Load tasks
      const taskList = await api.get(`/tasks/challenge/${challengeId}?date=${timeData.dateString}`);
      setTasks(taskList.filter(t => t.userId === user.id));

      // Load messages
      const msgList = await api.get(`/messages/challenge/${challengeId}`);
      setMessages(msgList);

      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load challenge room details.');
      setLoading(false);
    }
  };

  const initSocketConnection = () => {
    socketRef.current = io('https://habit-arena-backend.onrender.com');
    
    socketRef.current.emit('join_room', { challengeId });

    socketRef.current.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socketRef.current.on('receive_reaction', ({ messageId, reactions }) => {
      setMessages((prev) => 
        prev.map(m => m.id === messageId ? { ...m, reactions } : m)
      );
    });

    socketRef.current.on('leaderboard_update', () => {
      // Reload leaderboard & metrics
      reloadLeaderboardOnly();
    });

    socketRef.current.on('time_shifted', ({ newDate }) => {
      setSystemDate(newDate);
      loadChallengeData(); // Complete reload
    });
  };

  const reloadLeaderboardOnly = async () => {
    try {
      const data = await api.get(`/challenges/${challengeId}`);
      setChallenge(data.challenge);
    } catch (err) {
      console.error('Failed to refresh leaderboard:', err);
    }
  };

  // Copy Invite Code
  const handleCopyInvite = () => {
    navigator.clipboard.writeText(challenge.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add Habit Task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    try {
      const res = await api.post('/tasks', {
        taskName: newTaskName,
        difficulty: newTaskDifficulty,
        challengeId
      });
      
      setTasks((prev) => [...prev, res.task]);
      setNewTaskName('');
      
      // Notify other clients to refresh leaderboard
      socketRef.current.emit('task_completed', { 
        challengeId, 
        username: user.username,
        taskName: newTaskName,
        xpGained: 0 // Just task addition
      });

      // Reload challenge rankings
      reloadLeaderboardOnly();
    } catch (err) {
      alert(err.message || 'Failed to add task.');
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (taskId) => {
    try {
      const res = await api.post(`/tasks/${taskId}/toggle`);
      
      // Update state
      setTasks((prev) => 
        prev.map(t => t.id === taskId ? res.task : t)
      );

      // Notify other users for live leaderboard update
      socketRef.current.emit('task_completed', {
        challengeId,
        username: user.username,
        taskName: res.task.taskName,
        xpGained: res.xpGained
      });

      // Reload rankings
      reloadLeaderboardOnly();
    } catch (err) {
      alert(err.message || 'Failed to toggle task.');
    }
  };

  // Delete Habit Task
  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter(t => t.id !== taskId));
      
      socketRef.current.emit('task_completed', { challengeId });
      reloadLeaderboardOnly();
    } catch (err) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  // Send Chat message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    try {
      const newMsg = await api.post(`/messages/challenge/${challengeId}`, { text: chatMessage });
      
      // Emit via socket
      socketRef.current.emit('send_message', newMsg);
      
      setChatMessage('');
    } catch (err) {
      alert(err.message || 'Failed to send message.');
    }
  };

  // Reaction click
  const handleReact = async (messageId, emoji) => {
    try {
      const updatedMsg = await api.post(`/messages/${messageId}/react`, { emoji });
      
      // Emit via socket
      socketRef.current.emit('reaction_update', {
        challengeId,
        messageId,
        reactions: updatedMsg.reactions
      });
    } catch (err) {
      console.error(err);
    }
  };

  // View a friend's tasks list
  const handleViewFriendTasks = async (friendId, friendUsername) => {
    try {
      const taskList = await api.get(`/tasks/challenge/${challengeId}?date=${systemDate}`);
      const friendTasks = taskList.filter(t => t.userId === friendId);
      setSelectedMemberTasks({ id: friendId, username: friendUsername });
      setMemberTasksList(friendTasks);
    } catch (err) {
      alert('Failed to load member tasks.');
    }
  };

  // Finish challenge manual finalizer
  const handleFinalizeChallenge = async () => {
    try {
      const res = await api.post(`/challenges/${challengeId}/finalize`);
      setChallenge(res.challenge);
      alert('Challenge finalized! Rankings calculated!');
    } catch (err) {
      alert(err.message || 'Failed to finalize challenge.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-neonViolet border-white/20 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-xl font-bold text-white">Error Loading Room</h3>
        <p className="text-gray-400 text-sm">{error || 'Challenge not found.'}</p>
        <button onClick={onBack} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isCompleted = challenge.status === 'completed';

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 relative">
      
      {/* Back link & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-all bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        {/* Info panel */}
        <div className="flex items-center space-x-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">invite code:</span>
          <span className="text-sm font-extrabold text-neonCyan tracking-wider uppercase">{challenge.inviteCode}</span>
          <button 
            onClick={handleCopyInvite}
            className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-neonCyan rounded-lg transition-all"
            title="Copy Invite Code"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-neonGreen" /> : <Clipboard className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Challenge Title Banner */}
      <GlassCard className="relative overflow-hidden" glowColor="violet">
        <div className="absolute top-0 right-0 p-6 flex flex-col items-end text-right">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">room timeline</span>
          <span className="text-sm text-white font-extrabold mt-1">
            {new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()}
          </span>
        </div>

        <div className="max-w-2xl space-y-2">
          <h2 className="text-3xl font-extrabold text-white tracking-wide">{challenge.title}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{challenge.description || 'No description provided for this challenge room.'}</p>
          
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">
            <span className="flex items-center"><Users className="w-4 h-4 mr-1 text-neonViolet" /> {members.length} Members</span>
            <span className="flex items-center"><Calendar className="w-4 h-4 mr-1 text-neonCyan" /> {challenge.duration} Days Duration</span>
            <span className="flex items-center"><Zap className="w-4 h-4 mr-1 text-neonPink" /> Created by {challenge.creatorName}</span>
          </div>
        </div>
      </GlassCard>

      {/* WINNER SCREEN OVERLAY (IF COMPLETED) */}
      {isCompleted && (
        <GlassCard className="border-2 border-yellow-500/30 bg-yellow-950/5 p-8 relative overflow-hidden" glowColor="gold">
          {/* Confetti Elements */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500 via-transparent to-transparent"></div>

          <div className="text-center space-y-6 max-w-3xl mx-auto relative z-10">
            <div className="inline-flex items-center space-x-2 bg-yellow-950/50 border border-yellow-500/30 px-4 py-2 rounded-full text-xs font-extrabold text-yellow-400 uppercase tracking-widest animate-bounce">
              <Trophy className="w-5 h-5" />
              <span>Challenge Concluded</span>
            </div>

            {challenge.winner ? (
              <div className="space-y-2">
                <h3 className="text-4xl sm:text-5xl font-black text-white leading-tight">
                  👑 Winner: <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">{challenge.winner.username}</span> 👑
                </h3>
                <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                  Outstanding discipline! {challenge.winner.username} dominated the arena with {challenge.winner.xp} XP and a {challenge.winner.completionRate}% daily completion score!
                </p>
              </div>
            ) : (
              <h3 className="text-3xl font-black text-white">No winner decided.</h3>
            )}

            {/* Recharts Completion Bar graph */}
            <div className="w-full h-56 pt-6 bg-white/5 rounded-xl border border-white/5 p-4">
              <h4 className="text-xs uppercase font-extrabold tracking-wider text-gray-500 text-left mb-4">Participant Completion Rates (%)</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={challenge.leaderboard}>
                  <XAxis dataKey="username" stroke="#6b7280" fontSize={10} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={10} domain={[0, 100]} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#16161c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}
                    labelStyle={{ color: 'white', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="completionRate" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Rankings table list */}
            <div className="space-y-3 pt-6 text-left">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Final Standings</h4>
              <div className="space-y-2">
                {(challenge.leaderboard || []).map((rank, idx) => (
                  <div key={rank.userId} className={`flex items-center justify-between p-3.5 rounded-xl border ${
                    idx === 0 ? 'bg-yellow-950/20 border-yellow-500/30' : 'bg-white/5 border-white/5'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <span className={`w-6 h-6 flex items-center justify-center font-bold text-xs rounded-full ${
                        idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-white text-sm">{rank.username}</span>
                    </div>

                    <div className="flex items-center space-x-6 text-xs text-gray-400">
                      <span>XP: <strong className="text-white">{rank.totalXp}</strong></span>
                      <span>Rate: <strong className="text-white">{rank.completionRate}%</strong></span>
                      <span>Tasks: <strong className="text-white">{rank.tasksCompleted}/{rank.totalTasks}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </GlassCard>
      )}

      {/* TABS (FOR MOBILE VIEW OR DIVISION) */}
      <div className="md:hidden flex border-b border-white/10">
        {['tasks', 'leaderboard', 'chat'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
              activeTab === tab 
                ? 'border-neonViolet text-neonViolet' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* TASK BOARD */}
        <div className={`space-y-6 md:col-span-2 ${activeTab !== 'tasks' ? 'hidden md:block' : ''}`}>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-xl font-bold tracking-wide flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-neonGreen" /> My Daily Task Board
            </h3>
            
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1.5 rounded-full flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-neonCyan" /> Today: {systemDate}
            </div>
          </div>

          {/* Add task block */}
          {!isCompleted && (
            <GlassCard className="p-4">
              <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row items-center gap-3">
                <input 
                  type="text"
                  required
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  placeholder="e.g. Workout 30 mins, Solve 2 DSA..."
                  className="flex-1 w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neonViolet text-sm"
                />

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <select
                    value={newTaskDifficulty}
                    onChange={e => setNewTaskDifficulty(e.target.value)}
                    className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none text-xs uppercase font-bold tracking-wider"
                  >
                    <option value="easy" className="bg-darkBg">Easy (+10 XP)</option>
                    <option value="medium" className="bg-darkBg">Medium (+20 XP)</option>
                    <option value="hard" className="bg-darkBg">Hard (+40 XP)</option>
                  </select>

                  <button 
                    type="submit"
                    className="px-4 py-2.5 bg-neonViolet hover:bg-neonViolet/80 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </form>
            </GlassCard>
          )}

          {/* Tasks list */}
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <GlassCard className="text-center py-8">
                <p className="text-gray-400 text-sm">No tasks added for today. Create your daily checklist above!</p>
              </GlassCard>
            ) : (
              tasks.map(task => (
                <div 
                  key={task.id} 
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    task.completed 
                      ? 'bg-neonGreen/5 border-neonGreen/20 shadow-[0_0_12px_rgba(16,185,129,0.05)]' 
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Checkbox */}
                    <button 
                      onClick={() => !isCompleted && handleToggleTask(task.id)}
                      disabled={isCompleted}
                      className={`custom-checkbox ${task.completed ? 'checked' : ''} ${isCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {task.completed && <span className="text-xs">✓</span>}
                    </button>

                    <div>
                      <span className={`font-semibold text-sm ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                        {task.taskName}
                      </span>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded ${
                          task.difficulty === 'hard' 
                            ? 'bg-red-950/20 text-red-400 border border-red-500/20' 
                            : task.difficulty === 'medium'
                            ? 'bg-yellow-950/20 text-yellow-400 border border-yellow-500/20'
                            : 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {task.difficulty}
                        </span>
                        {task.completionTime && (
                          <span className="text-[10px] text-gray-500">
                            Completed at {new Date(task.completionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isCompleted && (
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-all"
                      title="Delete Habit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* VIEW MEMBER CHECKLISTS (ACCOUNTABILITY PANEL) */}
          <div className="pt-6 border-t border-white/5">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">View Team Checklists</h4>
            
            <div className="flex flex-wrap gap-2">
              {members.filter(m => m.id !== user.id).map(m => (
                <button
                  key={m.id}
                  onClick={() => handleViewFriendTasks(m.id, m.username)}
                  className={`px-3.5 py-2 border rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                    selectedMemberTasks?.id === m.id
                      ? 'bg-neonCyan/20 border-neonCyan text-neonCyan'
                      : 'bg-white/5 border-white/5 hover:border-white/10 text-gray-300'
                  }`}
                >
                  <img src={m.profilePhoto} alt={m.username} className="w-5 h-5 rounded-full object-cover" />
                  <span>{m.username}</span>
                </button>
              ))}
            </div>

            {selectedMemberTasks && (
              <GlassCard className="mt-4 p-4 border border-neonCyan/20">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-sm font-bold text-white flex items-center">
                    <Users className="w-4 h-4 mr-1.5 text-neonCyan" /> {selectedMemberTasks.username}'s checklist for today
                  </h5>
                  <button onClick={() => setSelectedMemberTasks(null)} className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {memberTasksList.length === 0 ? (
                    <p className="text-xs text-gray-500">No tasks added by {selectedMemberTasks.username} yet.</p>
                  ) : (
                    memberTasksList.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs">
                        <div className="flex items-center space-x-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${t.completed ? 'bg-neonGreen shadow-[0_0_8px_#10B981]' : 'bg-gray-600'}`}></span>
                          <span className={`font-semibold ${t.completed ? 'line-through text-gray-500' : 'text-white'}`}>{t.taskName}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">{t.difficulty}</span>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            )}
          </div>

        </div>

        {/* SIDEBAR: LEADERBOARD & CHAT */}
        <div className="space-y-6 md:col-span-1">
          
          {/* LEADERBOARD VIEW */}
          <div className={`${activeTab !== 'leaderboard' ? 'hidden md:block' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold tracking-wide flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-neonViolet" /> Rankings
              </h3>

              {/* Finalizer check */}
              {user.id === challenge.creatorId && !isCompleted && (
                <button
                  onClick={handleFinalizeChallenge}
                  className="px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 text-[9px] font-extrabold uppercase tracking-widest rounded transition-all"
                >
                  Conclude
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {(challenge.leaderboard || []).map((rank, idx) => {
                const isMe = rank.userId === user.id;
                
                return (
                  <div 
                    key={rank.userId} 
                    className={`flex items-center justify-between p-3.5 rounded-xl border ${
                      isMe 
                        ? 'bg-neonViolet/10 border-neonViolet/30 shadow-[0_0_15px_rgba(139,92,246,0.08)]' 
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-5 h-5 flex items-center justify-center font-black text-[10px] rounded-full ${
                        idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-500'
                      }`}>
                        {idx + 1}
                      </span>
                      
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                        <img src={rank.profilePhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${rank.username}`} alt={rank.username} className="w-full h-full object-cover" />
                      </div>

                      <div>
                        <span className="font-bold text-sm text-white block leading-tight">{rank.username}</span>
                        <span className="text-[9px] text-orange-400 font-bold uppercase flex items-center mt-0.5">
                          <Flame className="w-3 h-3 fill-orange-500 text-orange-500 mr-0.5" /> {rank.streak} Day
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-neonCyan block leading-none">{rank.totalXp} XP</span>
                      <span className="text-[10px] text-gray-500 mt-0.5 block">{rank.completionRate}% rate</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GROUP CHAT VIEW */}
          <div className={`space-y-4 ${activeTab !== 'chat' ? 'hidden md:block' : ''} pt-6 border-t md:border-none border-white/5`}>
            <h3 className="text-lg font-bold tracking-wide flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-neonPink" /> Team Chat Room
            </h3>

            <GlassCard className="p-0 border border-white/5 flex flex-col h-[400px]">
              
              {/* Message scroll list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-gray-600 mt-10">Room is quiet. Send the first message to motivate your team!</p>
                ) : (
                  messages.map(msg => {
                    const isSystem = msg.userId === 'system';
                    const isMe = msg.userId === user.id;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="text-center py-1 bg-white/5 border border-white/5 rounded-lg">
                          <span className="text-[10px] text-indigo-300 font-medium px-3">{msg.text}</span>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex items-start space-x-2.5 max-w-[90%] ${isMe ? 'ml-auto flex-row-reverse space-x-reverse' : ''}`}>
                        <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                          <img src={msg.profilePhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${msg.username}`} alt={msg.username} className="w-full h-full object-cover" />
                        </div>
                        
                        <div className="space-y-1">
                          <div className={`flex items-center space-x-1.5 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <span className="text-[10px] font-bold text-gray-400">{msg.username}</span>
                            <span className="text-[8px] text-gray-600">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isMe ? 'bg-neonPink/20 text-white rounded-tr-none border border-neonPink/20' : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/5'
                          }`}>
                            {msg.text}
                          </div>

                          {/* Reaction row */}
                          <div className={`flex flex-wrap items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                            {/* Available reaction emoji triggers */}
                            {['🔥', '💪', '👑', '👏'].map(emoji => {
                              const list = msg.reactions || [];
                              const count = list.filter(r => r.emoji === emoji).length;
                              const userReacted = list.some(r => r.userId === user.id && r.emoji === emoji);

                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(msg.id, emoji)}
                                  className={`px-1.5 py-0.5 rounded border text-[9px] font-bold flex items-center space-x-1 transition-all ${
                                    userReacted 
                                      ? 'bg-neonViolet/25 border-neonViolet/40 text-white' 
                                      : 'bg-white/5 border-transparent text-gray-500 hover:text-gray-300'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  {count > 0 && <span className="text-[8px] font-extrabold text-neonCyan">{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input box */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 flex items-center gap-2">
                <input 
                  type="text"
                  required
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  placeholder="Motivate the team..."
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neonPink text-xs"
                />
                <button 
                  type="submit"
                  className="p-2 bg-neonPink hover:bg-neonPink/80 text-white rounded-xl transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

            </GlassCard>
          </div>

        </div>

      </div>

    </div>
  );
};
