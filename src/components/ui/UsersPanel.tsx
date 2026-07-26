'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetchUsersList, insertUserRecord, updateUserRecord } from '@/lib/supabase/client';
import { 
  Plus, 
  Search, 
  Edit3, 
  UserCheck, 
  UserX,
  X, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown
} from 'lucide-react';

interface UsersPanelProps {
  currentUser: any;
}

export default function UsersPanel({ currentUser }: UsersPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown status filters states
  const [roleFilter, setRoleFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // New user form state
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'Ventas',
    status: 'Activo'
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'Ventas',
    status: 'Activo'
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsersList(searchQuery);
      
      let filtered = data;
      if (roleFilter !== 'Todos') {
        filtered = filtered.filter(u => u.role === roleFilter);
      }
      if (statusFilter !== 'Todos') {
        filtered = filtered.filter(u => u.status === statusFilter);
      }
      
      setUsers(filtered);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [searchQuery, roleFilter, statusFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }
    try {
      await insertUserRecord({
        name: newUserForm.name,
        email: newUserForm.email,
        role: newUserForm.role,
        status: newUserForm.status
      });
      setIsAddModalOpen(false);
      showToast('🎉 ¡Usuario agregado con éxito!');
      setNewUserForm({
        name: '',
        email: '',
        role: 'Ventas',
        status: 'Activo'
      });
      loadUsers();
    } catch (err) {
      console.error('Error inserting user:', err);
    }
  };

  const handleStartEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const success = await updateUserRecord(editingUser.id, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        status: editForm.status
      });
      if (success) {
        setEditingUser(null);
        showToast('💾 ¡Cambios de usuario guardados!');
        loadUsers();
      }
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === 'Activo' ? 'Bloqueado' : 'Activo';
    try {
      const success = await updateUserRecord(user.id, { status: nextStatus });
      if (success) {
        showToast(`🔒 Usuario ${user.name} ahora está ${nextStatus === 'Activo' ? 'Activo' : 'Bloqueado'}`);
        loadUsers();
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-950/95 text-slate-100 border border-slate-800 px-5 py-3.5 rounded-xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-500 animate-bounce" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center p-4 bg-slate-950/60 border border-slate-900/80 rounded-2xl backdrop-blur-xl relative z-20">
        
        {/* Search Input Box */}
        <div className="flex-1 max-w-xs relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-600 transition-all font-medium"
          />
        </div>

        {/* Dropdowns Filters and Add button */}
        <div className="flex items-center gap-3 justify-end shrink-0">
          
          {/* Role Dropdown */}
          <div className="relative" ref={roleDropdownRef}>
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/60 hover:bg-slate-855 border border-slate-850 hover:border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-slate-100 transition-all active:scale-[0.98]"
            >
              <span>Rol: <strong className="text-slate-200">{roleFilter}</strong></span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden z-30 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                {['Todos', 'Ventas', 'Tecnico', 'Soporte', 'Administrador'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setRoleFilter(role);
                      setIsRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold transition-all ${
                      roleFilter === role 
                        ? 'bg-cyan-950/40 text-cyan-400 font-bold' 
                        : 'text-slate-300 hover:bg-slate-850 hover:text-slate-100'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              type="button"
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/60 hover:bg-slate-855 border border-slate-850 hover:border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-slate-100 transition-all active:scale-[0.98]"
            >
              <span>Estado: <strong className="text-slate-200">{statusFilter}</strong></span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden z-30 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                {['Todos', 'Activo', 'Bloqueado'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter(status);
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold transition-all ${
                      statusFilter === status 
                        ? 'bg-cyan-950/40 text-cyan-400 font-bold' 
                        : 'text-slate-300 hover:bg-slate-850 hover:text-slate-100'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add user button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-650 hover:bg-emerald-555 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-md shadow-emerald-950/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo usuario</span>
          </button>
        </div>
      </div>

      {/* Users List Table */}
      {loading ? (
        <div className="text-center py-24 bg-slate-950/20 border border-slate-900 rounded-3xl">
          <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-cyan-500 animate-spin mx-auto mb-3" />
          <span className="text-xs text-slate-500">Cargando directorio de usuarios...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 bg-slate-950/20 border border-slate-900 rounded-3xl text-slate-500 space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-700 mx-auto" />
          <h3 className="font-semibold text-slate-400">Sin usuarios encontrados</h3>
          <p className="text-xs text-slate-600">Prueba cambiando los términos de búsqueda.</p>
        </div>
      ) : (
        <div className="bg-slate-950/20 border border-slate-900 rounded-3xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-900/30 text-slate-400 font-mono text-[9px] uppercase tracking-wider">
                  <th className="py-4 px-6 font-semibold">Nombre</th>
                  <th className="py-4 px-6 font-semibold">Correo</th>
                  <th className="py-4 px-6 font-semibold text-center">Rol</th>
                  <th className="py-4 px-6 font-semibold text-center">Estado</th>
                  <th className="py-4 px-6 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-4 px-6 text-slate-200 font-semibold text-xs">
                      {user.name}
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-mono text-xs">
                      {user.email}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-block px-3 py-1 bg-cyan-950/30 border border-cyan-800/40 text-cyan-400 text-[10px] font-bold rounded-full">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-3 py-1 text-[10px] font-bold rounded-full border ${
                        user.status === 'Activo'
                          ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400'
                          : 'bg-rose-950/30 border-rose-800/40 text-rose-400'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleStartEdit(user)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/10 text-cyan-400 text-xs font-semibold rounded-lg transition-all active:scale-95"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 border text-xs font-semibold rounded-lg transition-all active:scale-95 ${
                          user.status === 'Activo'
                            ? 'border-rose-500/30 hover:border-rose-400 bg-rose-950/10 text-rose-400'
                            : 'border-emerald-500/30 hover:border-emerald-400 bg-emerald-950/10 text-emerald-400'
                        }`}
                      >
                        {user.status === 'Activo' ? (
                          <>
                            <UserX className="w-3 h-3" />
                            <span>Bloquear</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3" />
                            <span>Activar</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-950/80 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-500" />
                Agregar Nuevo Usuario
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-850 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Nombre <span className="text-red-500 text-sm font-extrabold ml-0.5 align-middle">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Manuel Garcia"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Correo Electrónico <span className="text-red-500 text-sm font-extrabold ml-0.5 align-middle">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="Ej. m.garcia@site.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Rol</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="Ventas">Ventas</option>
                    <option value="Tecnico">Técnico</option>
                    <option value="Soporte">Soporte</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Estado</label>
                  <select
                    value={newUserForm.status}
                    onChange={(e) => setNewUserForm({...newUserForm, status: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-850 -mx-6 -mb-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-md shadow-cyan-950/20"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-950/80 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-500" />
                Editar Usuario
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-850 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Nombre <span className="text-red-500 text-sm font-extrabold ml-0.5 align-middle">*</span></label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Correo Electrónico <span className="text-red-500 text-sm font-extrabold ml-0.5 align-middle">*</span></label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Rol</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="Ventas">Ventas</option>
                    <option value="Tecnico">Técnico</option>
                    <option value="Soporte">Soporte</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Estado</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-850 -mx-6 -mb-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-md shadow-cyan-950/20"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
