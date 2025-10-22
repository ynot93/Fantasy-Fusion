import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MyLeagues from './pages/MyLeagues';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import Login from './pages/Login';
import Signup from './pages/Signup';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ResponsibleGaming from './pages/ResponsibleGaming';

// Admin Imports
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import LeagueManagement from './pages/admin/LeagueManagement';
import Transactions from './pages/admin/Transactions';
import ContentManagement from './pages/admin/ContentManagement';
import Reports from './pages/admin/Reports';
import SystemSettings from './pages/admin/SystemSettings';
import LeagueDetailPage from './pages/admin/LeagueDetailPage';


function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <AdminLayout>
        <Routes location={location} key={location.pathname}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/leagues" element={<LeagueManagement />} />
            <Route path="/admin/leagues/:leagueId" element={<LeagueDetailPage />} />
            <Route path="/admin/transactions" element={<Transactions />} />
            <Route path="/admin/content" element={<ContentManagement />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/settings" element={<SystemSettings />} />
        </Routes>
      </AdminLayout>
    )
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leagues" element={<Dashboard />} />
          <Route path="/my-leagues" element={<MyLeagues />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/responsible-gaming" element={<ResponsibleGaming />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
}

export default App;