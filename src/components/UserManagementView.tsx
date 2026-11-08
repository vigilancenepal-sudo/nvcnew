import React, { useState } from 'react';
import { supabase, OperationType, handleSupabaseError } from '../supabase';
import { UserProfile, RoleLevel, MahashakhaId, ShakhaId } from '../types/nvc';
import {
  MAHASHAKHAS,
  SHAKHAS,
  getMahashakhaName,
  getShakhaName,
  toNepaliDigits,
} from '../data/nvcStructure';
import { Plus, Pencil, Trash2, Check, X, ShieldCheck, Search, Clock, UserCheck, AlertCircle } from 'lucide-react';

interface UserManagementViewProps {
  users: UserProfile[];
  currentAdminUid: string;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentAdminUid,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'pending' | RoleLevel>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const pendingCount = users.filter((u) => u.status !== 'active').length;

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState<RoleLevel>('shakha');
  const [mahashakhaId, setMahashakhaId] = useState<MahashakhaId>('maha_admin');
  const [shakhaId, setShakhaId] = useState<ShakhaId>('shakha_admin_plan');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const availableShakhas = SHAKHAS.filter((s) => s.mahashakhaId === mahashakhaId);

  const openCreateModal = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setDesignation('शाखा अधिकृत');
    setRole('shakha');
    setMahashakhaId('maha_admin');
    setShakhaId('shakha_admin_plan');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setFullName(u.fullName);
    setEmail(u.email);
    setDesignation(u.designation);
    setRole(u.role);
    const mId = (u.mahashakhaId as MahashakhaId) || 'maha_admin';
    setMahashakhaId(mId);
    const matchingShakhas = SHAKHAS.filter((s) => s.mahashakhaId === mId);
    const sId = matchingShakhas.some((s) => s.id === u.shakhaId)
      ? (u.shakhaId as ShakhaId)
      : matchingShakhas[0]?.id || 'shakha_admin_plan';
    setShakhaId(sId);
    setStatus(u.status);
    setIsModalOpen(true);
  };

  const handleMahashakhaChange = (newMaha: MahashakhaId) => {
    setMahashakhaId(newMaha);
    const firstShakha = SHAKHAS.find((s) => s.mahashakhaId === newMaha);
    if (firstShakha) {
      setShakhaId(firstShakha.id);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !designation.trim()) return;
    setSubmitting(true);

    const normalizedMaha = role === 'admin' ? 'all' : mahashakhaId;
    const normalizedShakha = role === 'shakha' ? shakhaId : 'all';

    try {
      if (editingUser) {
        const { error } = await supabase.from('profiles').update({
          fullName: fullName.trim().slice(0, 120),
          email: email.trim().toLowerCase().slice(0, 160),
          designation: designation.trim().slice(0, 120),
          role,
          mahashakhaId: normalizedMaha,
          shakhaId: normalizedShakha,
          status,
          updatedAt: new Date().toISOString(),
        }).eq('id', editingUser.id);
        if (error) throw error;
        setFeedbackMsg(`प्रयोगकर्ता "${fullName}" को विवरण अद्यावधिक गरियो।`);
      } else {
        const generatedId = crypto.randomUUID();
        const { error } = await supabase.from('profiles').insert({
          id: generatedId,
          uid: generatedId,
          email: email.trim().toLowerCase().slice(0, 160),
          fullName: fullName.trim().slice(0, 120),
          designation: designation.trim().slice(0, 120),
          role,
          mahashakhaId: normalizedMaha,
          shakhaId: normalizedShakha,
          status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        if (error) throw error;
        setFeedbackMsg(`नयाँ प्रयोगकर्ता "${fullName}" सफलतापूर्वक दर्ता गरियो।`);
      }
      setIsModalOpen(false);
    } catch (err) {
      handleSupabaseError(
        err,
        editingUser ? OperationType.UPDATE : OperationType.CREATE,
        'users'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickToggleStatus = async (u: UserProfile) => {
    if (u.uid === currentAdminUid) return;
    const nextStatus = u.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase.from('profiles').update({
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      }).eq('id', u.id);
      if (error) throw error;
      setFeedbackMsg(
        `"${u.fullName}" को स्थिति ${nextStatus === 'active' ? 'सक्रिय' : 'निष्क्रिय'} बनाइयो।`
      );
    } catch (err) {
      handleSupabaseError(err, OperationType.UPDATE, `profiles/${u.id}`);
    }
  };

  const handleQuickRoleChange = async (u: UserProfile, nextRole: RoleLevel) => {
    if (u.uid === currentAdminUid) return;
    const nextMaha =
      nextRole === 'admin'
        ? 'all'
        : u.mahashakhaId && u.mahashakhaId !== 'all'
        ? u.mahashakhaId
        : 'maha_admin';
    const nextShakha =
      nextRole === 'shakha'
        ? SHAKHAS.find((s) => s.mahashakhaId === nextMaha)?.id || 'shakha_admin_plan'
        : 'all';

    try {
      const { error } = await supabase.from('profiles').update({
        role: nextRole,
        mahashakhaId: nextMaha,
        shakhaId: nextShakha,
        updatedAt: new Date().toISOString(),
      }).eq('id', u.id);
      if (error) throw error;
      setFeedbackMsg(`"${u.fullName}" को भूमिका परिवर्तन गरियो।`);
    } catch (err) {
      handleSupabaseError(err, OperationType.UPDATE, `profiles/${u.id}`);
    }
  };

  const handleDeleteUser = async (u: UserProfile) => {
    if (u.uid === currentAdminUid) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', u.id);
      if (error) throw error;
      setConfirmDeleteId(null);
      setFeedbackMsg(`प्रयोगकर्ता "${u.fullName}" प्रणालीबाट हटाइयो।`);
    } catch (err) {
      handleSupabaseError(err, OperationType.DELETE, `profiles/${u.id}`);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole =
      roleFilter === 'all'
        ? true
        : roleFilter === 'pending'
        ? u.status !== 'active'
        : u.role === roleFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.designation.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-900" />
              प्रयोगकर्ता तथा पहुँच व्यवस्थापन (User & RBAC Management)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              एडमिनद्वारा महाशाखा तथा १३ वटै शाखाका कर्मचारी प्रयोगकर्ताहरू थप्ने, सम्पादन गर्ने, भूमिका (Role) र स्थिति (Status) परिवर्तन गर्ने कन्सोल
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            नयाँ प्रयोगकर्ता थप्नुहोस्
          </button>
        </div>

        {/* Pending Approval Alert Banner */}
        {pendingCount > 0 && (
          <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                <strong>{toNepaliDigits(pendingCount)} जना नयाँ प्रयोगकर्ताको पहुँच स्वीकृति प्रतीक्षारत छ।</strong> कृपया पहिचान, पद र महाशाखा/शाखा रुजु गरी पहुँच प्रदान गर्नुहोस्।
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRoleFilter('pending')}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md text-[11px] transition-colors cursor-pointer"
            >
              स्वीकृति प्रतीक्षारत सूची हेर्नुहोस्
            </button>
          </div>
        )}

        {feedbackMsg && (
          <div className="mt-4 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs text-slate-800">
            <span>{feedbackMsg}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="नाम, इमेल वा पद खोज्नुहोस्..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-900"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(
              [
                { id: 'all', label: `सबै (${toNepaliDigits(users.length)})` },
                {
                  id: 'pending',
                  label: `स्वीकृति प्रतीक्षारत (${toNepaliDigits(pendingCount)})`,
                  isPending: true,
                },
                { id: 'admin', label: 'एडमिन' },
                { id: 'mahashakha', label: 'महाशाखा तह' },
                { id: 'shakha', label: 'शाखा तह' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id as any)}
                className={`relative px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  roleFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                } ${
                  'isPending' in tab && tab.isPending && pendingCount > 0
                    ? 'text-amber-800 font-semibold'
                    : ''
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50/70">
                <th className="py-2.5 px-3">कर्मचारीको नाम र इमेल</th>
                <th className="py-2.5 px-3">पद</th>
                <th className="py-2.5 px-3">पहुँच तह (Role)</th>
                <th className="py-2.5 px-3">महाशाखा / शाखा</th>
                <th className="py-2.5 px-3">स्थिति (Status)</th>
                <th className="py-2.5 px-3 text-right">कार्यहरू</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    कुनै प्रयोगकर्ता फेला परेन।
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.uid === currentAdminUid;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">
                          {u.fullName} {isSelf && <span className="text-blue-800">(तपाईं)</span>}
                        </div>
                        <div className="text-slate-500 font-mono-num text-[11px]">{u.email}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{u.designation}</td>
                      <td className="py-3 px-3">
                        <select
                          disabled={isSelf}
                          value={u.role}
                          onChange={(e) =>
                            handleQuickRoleChange(u, e.target.value as RoleLevel)
                          }
                          className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 disabled:opacity-60 focus:outline-none focus:border-blue-900"
                        >
                          <option value="admin">Admin (सबै तह)</option>
                          <option value="mahashakha">Division / महाशाखा</option>
                          <option value="shakha">Shakha / शाखा</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {u.role === 'admin' ? (
                          <span>केन्द्रीय पूर्ण पहुँच (सबै महाशाखा/शाखा)</span>
                        ) : u.role === 'mahashakha' ? (
                          <span>{getMahashakhaName(u.mahashakhaId)}</span>
                        ) : (
                          <div>
                            <div className="text-slate-800 font-medium">
                              {getShakhaName(u.shakhaId)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {getMahashakhaName(u.mahashakhaId)}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {u.status === 'active' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3" /> सक्रिय
                            </span>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleQuickToggleStatus(u)}
                                className="text-[11px] text-slate-400 hover:text-red-700 underline cursor-pointer"
                                title="खाता निष्क्रिय गरी पहुँच रोक्नुहोस्"
                              >
                                रोक्नुहोस्
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" /> स्वीकृति बाँकी
                            </span>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleQuickToggleStatus(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors cursor-pointer shadow-2xs"
                                title="पहुँच स्वीकृत गरी प्रणाली सक्रिय बनाउनुहोस्"
                              >
                                <Check className="w-3.5 h-3.5" /> पहुँच दिनुहोस्
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="सम्पादन गर्नुहोस्"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {!isSelf && (
                            <>
                              {confirmDeleteId === u.id ? (
                                <span className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1 text-red-700 hover:bg-red-50 rounded cursor-pointer"
                                    title="पक्का हटाउनुहोस्"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="p-1 text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                                    title="रद्द गर्नुहोस्"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(u.id)}
                                  className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="हटाउनुहोस्"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? 'प्रयोगकर्ता विवरण सम्पादन' : 'नयाँ प्रयोगकर्ता दर्ता'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">पूरा नाम *</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="उदा: सहसचिव श्री हरिकुमार शर्मा"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">पद (Designation) *</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="उदा: उपसचिव / सिनियर डिभिजनल इन्जिनियर"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">इमेल ठेगाना *</label>
                  <input
                    type="email"
                    required
                    maxLength={160}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@nvc.gov.np"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">स्थिति (Status) *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-900"
                  >
                    <option value="active">सक्रिय (Active)</option>
                    <option value="inactive">निष्क्रिय (Inactive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  पहुँचको तह (Access Role Level) *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleLevel)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-900"
                >
                  <option value="admin">१. एडमिन (Admin - सबै महाशाखा र शाखाको डेटामा पहुँच)</option>
                  <option value="mahashakha">
                    २. महाशाखा तह (Division/Mahashakha - आफ्नो अन्तर्गतका शाखाहरूको पहुँच)
                  </option>
                  <option value="shakha">
                    ३. शाखा तह (Shakha - आफ्नो शाखाको मात्र डेटामा पहुँच)
                  </option>
                </select>
              </div>

              {role !== 'admin' && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">महाशाखा छान्नुहोस् *</label>
                  <select
                    value={mahashakhaId}
                    onChange={(e) => handleMahashakhaChange(e.target.value as MahashakhaId)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-900"
                  >
                    {MAHASHAKHAS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code}. {m.nameNe}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {role === 'shakha' && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">शाखा छान्नुहोस् *</label>
                  <select
                    value={shakhaId}
                    onChange={(e) => setShakhaId(e.target.value as ShakhaId)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-900"
                  >
                    {availableShakhas.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.nameNe}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-lg text-[11px] text-blue-950 leading-relaxed">
                <strong>💡 पहुँच नीति:</strong> एडमिनले यहाँ कर्मचारीको आधिकारिक Google इमेल र पद, महाशाखा/शाखा तोकेर <strong>'सक्रिय'</strong> अवस्थामा दर्ता गरेपछि ती कर्मचारीले आफ्नो Google खाताबाट लगइन गर्दा सिधै ड्यासबोर्डमा प्रवेश पाउनेछन्। नयाँ अनधिकृत खाताहरू स्वतः <strong>'निष्क्रिय'</strong> अवस्थामा रहनेछन्।
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-md disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'सेभ हुँदैछ...' : 'सुरक्षित गर्नुहोस्'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
