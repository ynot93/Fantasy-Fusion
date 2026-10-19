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
import LinkFpl from './pages/LinkFpl';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ResponsibleGaming from './pages/ResponsibleGaming';
import ProtectedRoute from './components/ProtectedRoute';

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
        <Routes location={location}>
            <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin', 'super_admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute roles={['admin', 'super_admin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/leagues" element={<ProtectedRoute roles={['admin', 'super_admin']}><LeagueManagement /></ProtectedRoute>} />
            <Route path="/admin/leagues/:leagueId" element={<ProtectedRoute roles={['admin', 'super_admin']}><LeagueDetailPage /></ProtectedRoute>} />
            <Route path="/admin/transactions" element={<ProtectedRoute roles={['admin', 'super_admin']}><Transactions /></ProtectedRoute>} />
            <Route path="/admin/content" element={<ProtectedRoute roles={['admin', 'super_admin']}><ContentManagement /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute roles={['admin', 'super_admin']}><Reports /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute roles={['admin', 'super_admin']}><SystemSettings /></ProtectedRoute>} />
        </Routes>
      </AdminLayout>
    )
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/leagues" element={<Dashboard />} />
          <Route path="/my-leagues" element={<ProtectedRoute><MyLeagues /></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/link-fpl" element={<ProtectedRoute><LinkFpl /></ProtectedRoute>} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/responsible-gaming" element={<ResponsibleGaming />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
}

export default App;