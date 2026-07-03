import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, ShieldCheck, Star, AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../api/client';
import SpotlightCard from '../components/SpotlightCard';
import type { User, AdminStats } from '../types';

const RoleBadge = ({ role }: { role: string }) => {
  const colors: Record<string, string> = {
    govt_super_admin: 'bg-red-50 text-red-700 border-red-200',
    venue_manager:    'bg-purple-50 text-purple-700 border-purple-200',
    vip:              'bg-amber-50 text-amber-700 border-amber-200',
    citizen:          'bg-blue-50 text-blue-700 border-blue-100',
    guest:            'bg-slate-50 text-slate-600 border-slate-200',
  };
  const labels: Record<string, string> = {
    govt_super_admin: '🏛 Govt Admin',
    venue_manager:    '🏟 Manager',
    vip:              '⭐ VIP',
    citizen:          '👤 Citizen',
    guest:            '👁 Guest',
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${colors[role] || 'bg-slate-50 text-slate-500'}`}>
      {labels[role] || role}
    </span>
  );
};

const AdminPanel = ({ currentUser }: { currentUser: User }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [overrideForm, setOverrideForm] = useState<{ bookingId: string; reason: string }>({ bookingId: '', reason: '' });

  const isSuperAdmin = currentUser.role === 'govt_super_admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get<User[]>('/admin/users'),
        api.get<AdminStats>('/admin/stats'),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const action = async (endpoint: string, userId: number, reason?: string) => {
    setActionLoading(userId);
    try {
      const url = reason ? `${endpoint}?reason=${encodeURIComponent(reason)}` : endpoint;
      await api.post(url);
      toast.success('Action applied successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideForm.bookingId || !overrideForm.reason) {
      toast.error('Please fill in both booking ID and reason');
      return;
    }
    try {
      await api.post(`/bookings/${overrideForm.bookingId}/override`, { reason: overrideForm.reason });
      toast.success('Booking overridden. Override logged in audit trail.');
      setOverrideForm({ bookingId: '', reason: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Override failed');
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Admin Control Panel</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage citizens, VIP status, suspensions, and government overrides.
          </p>
        </div>
        <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Citizens', value: stats.total_users, icon: Users, color: 'blue' },
            { label: 'Total Bookings', value: stats.total_bookings, icon: ShieldCheck, color: 'emerald' },
            { label: 'VIP Members', value: stats.vip_users, icon: Star, color: 'amber' },
            { label: 'Suspended', value: stats.suspended_users, icon: AlertTriangle, color: 'rose' },
          ].map(({ label, value, icon: Icon, color }) => (
            <SpotlightCard key={label} className="py-4">
              <div className={`text-${color}-500 mb-2`}><Icon className="w-5 h-5" /></div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </SpotlightCard>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* User management table */}
        <div className="xl:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Citizen Management</h3>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Loading users...</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Strikes</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                      {isSuperAdmin && <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900 truncate max-w-[140px]">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.phone_number}</p>
                        </td>
                        <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${u.fair_play_strikes >= 3 ? 'text-rose-600' : u.fair_play_strikes > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {u.fair_play_strikes}/3
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${u.is_suspended ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {u.is_suspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {!u.is_suspended ? (
                                <button
                                  disabled={actionLoading === u.id || u.role === 'govt_super_admin'}
                                  onClick={() => {
                                    const reason = prompt(`Reason for suspending ${u.name}:`);
                                    if (reason) action(`/admin/users/${u.id}/suspend`, u.id, reason);
                                  }}
                                  className="text-[10px] px-2 py-1 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 hover:bg-rose-100 transition-colors disabled:opacity-40"
                                >
                                  Suspend
                                </button>
                              ) : (
                                <button
                                  disabled={actionLoading === u.id}
                                  onClick={() => action(`/admin/users/${u.id}/unsuspend`, u.id)}
                                  className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                >
                                  Reinstate
                                </button>
                              )}
                              {u.role === 'citizen' && (
                                <button
                                  disabled={actionLoading === u.id}
                                  onClick={() => action(`/admin/users/${u.id}/promote-vip`, u.id)}
                                  className="text-[10px] px-2 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors"
                                >
                                  Grant VIP
                                </button>
                              )}
                              {u.role === 'vip' && (
                                <button
                                  disabled={actionLoading === u.id}
                                  onClick={() => action(`/admin/users/${u.id}/demote-citizen`, u.id)}
                                  className="text-[10px] px-2 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                                >
                                  Revoke VIP
                                </button>
                              )}
                              {u.fair_play_strikes > 0 && (
                                <button
                                  disabled={actionLoading === u.id}
                                  onClick={() => action(`/admin/users/${u.id}/clear-strikes`, u.id)}
                                  className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                                >
                                  Clear Strikes
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-slate-900">Government Override</h3>
          <SpotlightCard>
            <p className="text-xs text-slate-500 mb-4">
              Override a booking for municipal needs (elections, maintenance, emergencies). All overrides are logged publicly.
            </p>
            <form onSubmit={handleOverride} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Booking ID</label>
                <input
                  type="number"
                  placeholder="e.g. 42"
                  value={overrideForm.bookingId}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, bookingId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Reason (public)</label>
                <textarea
                  placeholder="e.g. Election booth setup on orders of District Collector"
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors resize-none"
                  rows={3}
                  required
                />
              </div>
              <button type="submit"
                className="w-full bg-rose-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors">
                Execute Override
              </button>
            </form>
          </SpotlightCard>

          <SpotlightCard>
            <h4 className="text-sm font-bold text-slate-700 mb-3">⚠️ Role Permissions</h4>
            <div className="space-y-2 text-xs text-slate-600">
              {[
                { role: 'GOVT_SUPER_ADMIN', perms: 'All actions: suspend, VIP, overrides, audit log' },
                { role: 'VENUE_MANAGER', perms: 'View users, create venues, basic overrides' },
                { role: 'VIP', perms: '8 bookings/month, prime-time priority' },
                { role: 'CITIZEN', perms: '4 bookings/month, standard slots only' },
              ].map((r) => (
                <div key={r.role} className="border-b border-slate-50 pb-2 last:border-0">
                  <p className="font-bold text-slate-800">{r.role}</p>
                  <p className="text-slate-500">{r.perms}</p>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
