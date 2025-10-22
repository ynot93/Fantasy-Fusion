
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminUser, UserStatus, UserRole } from '../../types';
import { fantasyApi } from '../../services/fantasyApi';
// FIX: Import `UsersIcon` to resolve reference error.
import { MoreVerticalIcon, SlashIcon, KeyIcon, ShieldCheckIcon, UsersIcon } from '../../components/Icons';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const roleColors: Record<UserRole, string> = {
  Admin: 'bg-red-500/20 text-red-300',
  Moderator: 'bg-yellow-500/20 text-yellow-300',
  User: 'bg-blue-500/20 text-blue-300',
};

const statusColors: Record<UserStatus, string> = {
  Active: 'bg-green-500/20 text-green-300',
  Banned: 'bg-slate-500/20 text-slate-400',
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'All'>('All');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // FIX: Change ref type from `HTMLDivElement` to `HTMLTableCellElement` to match the `<td>` element it's attached to.
  const menuRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      const data = await fantasyApi.getUsers();
      setUsers(data);
      setIsLoading(false);
    };
    fetchUsers();
  }, []);

   useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredUsers = useMemo(() => {
    return users
      .filter(user => statusFilter === 'All' || user.status === statusFilter)
      .filter(user => roleFilter === 'All' || user.role === roleFilter)
      .filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [users, searchTerm, statusFilter, roleFilter]);
  
  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    const result = await fantasyApi.updateUserStatus(userId, newStatus);
    if (result.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        setOpenMenuId(null);
    } else {
        alert("Failed to update status.");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    const result = await fantasyApi.updateUserRole(userId, newRole);
    if (result.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setOpenMenuId(null);
    } else {
        alert("Failed to update role.");
    }
  }

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }}>
      <h1 className="text-4xl font-bold text-white mb-8">User Management</h1>

      <div className="mb-6 flex flex-wrap gap-4 items-center bg-brand-secondary/50 p-4 rounded-lg border border-brand-border">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent">
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Banned">Banned</option>
        </select>
         <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)} className="bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent">
          <option value="All">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="Moderator">Moderator</option>
          <option value="User">User</option>
        </select>
      </div>

      <div className="overflow-x-auto bg-brand-secondary/50 rounded-lg border border-brand-border">
        <table className="min-w-full divide-y divide-brand-border">
          <thead className="bg-brand-dark/30">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">User</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Role</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white hidden md:table-cell">Joined Date</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                  <div className="flex items-center">
                    <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt="" />
                    <div className="ml-4">
                      <div className="font-medium text-white">{user.name}</div>
                      <div className="text-slate-400">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 text-sm text-slate-300">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleColors[user.role]}`}>{user.role}</span>
                </td>
                <td className="px-3 py-4 text-sm text-slate-300">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[user.status]}`}>{user.status}</span>
                </td>
                <td className="hidden md:table-cell px-3 py-4 text-sm text-slate-300">{new Date(user.joinedDate).toLocaleDateString()}</td>
                <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6" ref={openMenuId === user.id ? menuRef : null}>
                  <button onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)} className="p-1 rounded-full hover:bg-brand-dark">
                    <MoreVerticalIcon className="w-5 h-5 text-slate-400"/>
                  </button>
                  <AnimatePresence>
                  {openMenuId === user.id && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 mt-2 w-48 bg-brand-secondary border border-brand-border rounded-md shadow-lg z-10 origin-top-right"
                    >
                        <ul className="py-1">
                            <li>
                                <button onClick={() => handleUpdateStatus(user.id, user.status === 'Active' ? 'Banned' : 'Active')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-200 hover:bg-brand-dark/50">
                                    <SlashIcon className="w-4 h-4"/>{user.status === 'Active' ? 'Ban User' : 'Unban User'}
                                </button>
                            </li>
                            <li>
                                <button onClick={() => alert('Password reset email sent!')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-200 hover:bg-brand-dark/50">
                                    <KeyIcon className="w-4 h-4"/>Reset Password
                                </button>
                            </li>
                            {user.role !== 'Admin' && 
                                <li>
                                    <button onClick={() => handleUpdateRole(user.id, 'Admin')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-200 hover:bg-brand-dark/50">
                                        <ShieldCheckIcon className="w-4 h-4"/>Make Admin
                                    </button>
                                </li>
                            }
                            {user.role !== 'Moderator' && 
                                <li>
                                    <button onClick={() => handleUpdateRole(user.id, 'Moderator')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-200 hover:bg-brand-dark/50">
                                        <ShieldCheckIcon className="w-4 h-4"/>Make Moderator
                                    </button>
                                </li>
                            }
                             {user.role !== 'User' && 
                                <li>
                                    <button onClick={() => handleUpdateRole(user.id, 'User')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-200 hover:bg-brand-dark/50">
                                        <UsersIcon className="w-4 h-4"/>Make User
                                    </button>
                                </li>
                            }
                        </ul>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default UserManagement;