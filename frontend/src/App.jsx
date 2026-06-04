import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { ChallengeRoom } from './pages/ChallengeRoom.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';

function MainAppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('landing'); // landing, login, dashboard, profile, admin, challenge-room
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);

  // If session verification is active
  if (loading) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-neonViolet border-white/20 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Not Logged In
  if (!user) {
    if (currentPage === 'login') {
      return <LoginPage onBackToLanding={() => setCurrentPage('landing')} />;
    }
    return <LandingPage onGetStarted={() => setCurrentPage('login')} />;
  }

  // Logged In routing fallback
  const getActiveScreen = () => {
    // If user is logged in but stuck on landing/login, send to dashboard
    if (currentPage === 'landing' || currentPage === 'login') {
      return 'dashboard';
    }
    return currentPage;
  };

  const activeScreen = getActiveScreen();

  const handleSelectChallenge = (id) => {
    setSelectedChallengeId(id);
    setCurrentPage('challenge-room');
  };

  return (
    <div className="min-h-screen bg-darkBg flex flex-col justify-between pb-12">
      <Navbar currentPage={activeScreen} setCurrentPage={setCurrentPage} />
      
      <main className="flex-grow">
        {activeScreen === 'dashboard' && (
          <Dashboard onSelectChallenge={handleSelectChallenge} />
        )}
        {activeScreen === 'profile' && (
          <ProfilePage />
        )}
        {activeScreen === 'admin' && (
          <AdminDashboard onBack={() => setCurrentPage('dashboard')} />
        )}
        {activeScreen === 'challenge-room' && (
          <ChallengeRoom 
            challengeId={selectedChallengeId} 
            onBack={() => {
              setSelectedChallengeId(null);
              setCurrentPage('dashboard');
            }} 
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;
