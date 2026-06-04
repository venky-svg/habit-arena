import { db } from '../database/db.js';

// Reward/Penalty Constants
const COMPLETE_ALL_BONUS_XP = 30;
const MISSED_TASK_PENALTY_XP = 10;

/**
 * Checks and updates achievements/badges for a user based on their statistics
 */
export async function evaluateBadges(userId) {
  const user = await db.findOne('users', u => u.id === userId);
  if (!user) return [];

  const newBadges = [...(user.badges || [])];
  const userTasks = await db.find('tasks', t => t.userId === userId && t.completed);
  
  // Badge criteria definitions
  const badgeCriteria = [
    { name: '3-Day Warrior', desc: 'Maintain a 3-day consistency streak', check: u => u.streak >= 3 },
    { name: '7-Day Beast', desc: 'Maintain a 7-day consistency streak', check: u => u.streak >= 7 },
    { name: '30-Day Legend', desc: 'Reach a legendary 30-day streak', check: u => u.streak >= 30 },
    { name: 'First Steps', desc: 'Complete your first habit task', check: () => userTasks.length >= 1 },
    { name: 'Consistency King', desc: 'Complete 50 tasks in total', check: () => userTasks.length >= 50 },
    { name: 'Night Grinder', desc: 'Complete a task between 9 PM and 4 AM', check: () => {
      return userTasks.some(t => {
        if (!t.completionTime) return false;
        const hour = new Date(t.completionTime).getHours();
        return hour >= 21 || hour < 4;
      });
    }}
  ];

  let unlockedNew = false;
  for (const badge of badgeCriteria) {
    if (badge.check(user) && !newBadges.some(b => b.name === badge.name)) {
      newBadges.push({
        name: badge.name,
        description: badge.desc,
        unlockedAt: new Date().toISOString()
      });
      unlockedNew = true;
      
      // Add activity log
      await db.insert('messages', {
        challengeId: 'system',
        userId: 'system',
        username: 'System',
        text: `🎉 ${user.username} unlocked the "${badge.name}" badge!`,
        reactions: [],
        timestamp: new Date().toISOString()
      });
    }
  }

  if (unlockedNew) {
    await db.updateOne('users', u => u.id === userId, { badges: newBadges });
  }

  return newBadges;
}

/**
 * Evaluates Level based on XP
 * Levels: Bronze (0-100 XP), Silver (101-300 XP), Gold (301-700 XP), Platinum (701-1500 XP), Diamond (1500+ XP)
 */
export function calculateLevel(xp) {
  if (xp >= 1500) return 'Diamond';
  if (xp >= 700) return 'Platinum';
  if (xp >= 300) return 'Gold';
  if (xp >= 100) return 'Silver';
  return 'Bronze';
}

/**
 * Transitions task completion state and streaks when days are advanced or changed
 * @param {string} prevDateStr Date format YYYY-MM-DD that has just completed
 */
export async function processDayTransition(prevDateStr) {
  const challenges = await db.find('challenges', c => c.status === 'active');
  const systemTime = await db.getSystemTime();

  for (const challenge of challenges) {
    // Check if challenge has expired
    const endDate = new Date(challenge.endDate);
    if (systemTime > endDate) {
      // Challenge finished, mark status
      await db.updateOne('challenges', c => c.id === challenge.id, { status: 'completed' });
      // Trigger Winner Engine calculation
      await triggerWinnerEvaluation(challenge.id);
      continue;
    }

    // Process daily streaks for active challenges
    for (const memberId of challenge.members) {
      // Get tasks for this member in this challenge for the previous day
      const memberTasks = await db.find('tasks', t => 
        t.challengeId === challenge.id && 
        t.userId === memberId && 
        t.date === prevDateStr
      );

      // If user had no tasks defined, do not alter streak, but if they had tasks:
      if (memberTasks.length > 0) {
        const allCompleted = memberTasks.every(t => t.completed);
        const user = await db.findOne('users', u => u.id === memberId);
        
        if (user) {
          let newStreak = user.streak || 0;
          let newXp = user.xp || 0;
          
          if (allCompleted) {
            newStreak += 1;
            newXp += COMPLETE_ALL_BONUS_XP; // Streak completion bonus XP
            
            // Insert update into active feed
            await db.insert('messages', {
              challengeId: challenge.id,
              userId: 'system',
              username: 'System',
              text: `🔥 ${user.username} completed all tasks for ${prevDateStr}! Streak: ${newStreak}`,
              reactions: [],
              timestamp: new Date().toISOString()
            });
          } else {
            // Missed tasks reset streak
            newStreak = 0;
            // Penalty system: Deduct XP for missing tasks
            newXp = Math.max(0, newXp - MISSED_TASK_PENALTY_XP);

            await db.insert('messages', {
              challengeId: challenge.id,
              userId: 'system',
              username: 'System',
              text: `⚠️ ${user.username} missed daily tasks for ${prevDateStr}. Streak reset!`,
              reactions: [],
              timestamp: new Date().toISOString()
            });
          }

          const level = calculateLevel(newXp);
          await db.updateOne('users', u => u.id === memberId, { 
            streak: newStreak, 
            xp: newXp,
            level
          });

          // Check badges
          await evaluateBadges(memberId);
        }
      }
    }
  }
}

/**
 * Calculate challenge final rankings and winner when it finishes
 */
export async function triggerWinnerEvaluation(challengeId) {
  const challenge = await db.findOne('challenges', c => c.id === challengeId);
  if (!challenge) return;

  const members = challenge.members;
  const rankings = [];

  for (const memberId of members) {
    const user = await db.findOne('users', u => u.id === memberId);
    if (!user) continue;

    // Get all tasks for this member in this challenge
    const allTasks = await db.find('tasks', t => t.challengeId === challengeId && t.userId === memberId);
    const completedTasks = allTasks.filter(t => t.completed);
    
    // XP gained in this challenge:
    // Easy=10 XP, Medium=20 XP, Hard=40 XP
    let challengeXp = 0;
    completedTasks.forEach(t => {
      if (t.difficulty === 'hard') challengeXp += 40;
      else if (t.difficulty === 'medium') challengeXp += 20;
      else challengeXp += 10;
    });

    const completionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;

    rankings.push({
      userId: memberId,
      username: user.username,
      totalXp: challengeXp,
      tasksCompleted: completedTasks.length,
      totalTasks: allTasks.length,
      completionRate: Math.round(completionRate)
    });
  }

  // Sort rankings by total XP (primary) and completion rate (secondary)
  rankings.sort((a, b) => b.totalXp - a.totalXp || b.completionRate - a.completionRate);

  const winner = rankings.length > 0 ? rankings[0] : null;

  await db.updateOne('challenges', c => c.id === challengeId, {
    status: 'completed',
    leaderboard: rankings,
    winner: winner ? {
      userId: winner.userId,
      username: winner.username,
      xp: winner.totalXp,
      completionRate: winner.completionRate
    } : null
  });

  if (winner) {
    // Award Winner some global XP and update Level
    const user = await db.findOne('users', u => u.id === winner.userId);
    if (user) {
      const updatedXp = (user.xp || 0) + 150; // Challenge winner bonus
      const level = calculateLevel(updatedXp);
      
      const newBadges = [...(user.badges || [])];
      const winBadgeName = 'Consistency King';
      if (!newBadges.some(b => b.name === winBadgeName)) {
        newBadges.push({
          name: winBadgeName,
          description: 'Won your first HabitArena challenge!',
          unlockedAt: new Date().toISOString()
        });
      }
      
      await db.updateOne('users', u => u.id === winner.userId, {
        xp: updatedXp,
        level,
        badges: newBadges
      });
    }

    // Post to global chat or activity feed
    await db.insert('messages', {
      challengeId: challengeId,
      userId: 'system',
      username: 'System',
      text: `🏆 Challenge "${challenge.title}" has ended! The winner is ${winner.username} with ${winner.totalXp} XP and ${winner.completionRate}% completion rate! 👑`,
      reactions: [],
      timestamp: new Date().toISOString()
    });
  }
}
