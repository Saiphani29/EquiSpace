import { ShieldCheck, AlertCircle, Star } from 'lucide-react';
import SpotlightCard from '../components/SpotlightCard';
import type { User } from '../types';

const SettingsView = ({ user }: { user: User }) => {
  const fairPlayPct = Math.max(0, 100 - user.fair_play_strikes * 34);
  const roleLabel: Record<string, string> = {
    citizen: 'Citizen',
    vip: 'VIP Member',
    venue_manager: 'Venue Manager',
    govt_super_admin: 'Government Super Admin',
    guest: 'Guest',
  };

  return (
    <div className="animate-slide-up">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Account Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Your profile and fair-play standing in Eluru.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SpotlightCard className="mb-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Profile Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Full Name</label>
                <input defaultValue={user.name}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Phone Number (Verified)</label>
                <input defaultValue={user.phone_number} disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm opacity-50 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Account Role</label>
                <input defaultValue={roleLabel[user.role] || user.role} disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm opacity-50 cursor-not-allowed" />
              </div>
              <button className="bg-[#0078D4] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#005A9E] transition-all shadow-md shadow-blue-500/20">
                Save Changes
              </button>
            </div>
          </SpotlightCard>
        </div>

        <div className="space-y-5">
          {/* Fair-play card */}
          <SpotlightCard>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${user.fair_play_strikes === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Fair-Play Score</p>
                <p className="text-2xl font-bold text-slate-900">{fairPlayPct}%</p>
              </div>
            </div>
            <div className="flex gap-1.5 mb-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-2.5 flex-1 rounded-full ${i < user.fair_play_strikes ? 'bg-rose-400' : 'bg-slate-100'}`} />
              ))}
            </div>
            <p className="text-xs text-slate-500">
              {user.fair_play_strikes === 0
                ? 'Great record! Keep it up.'
                : `${user.fair_play_strikes}/3 strikes. ${3 - user.fair_play_strikes} more will suspend your account.`}
            </p>
          </SpotlightCard>

          {/* VIP badge */}
          {(user.role === 'vip' || user.role === 'govt_super_admin') && (
            <SpotlightCard>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                  <Star className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    {user.role === 'govt_super_admin' ? 'Government Admin' : 'VIP Member'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {user.role === 'govt_super_admin'
                      ? 'Full system access. All actions are logged.'
                      : '8 bookings/month. Sunday prime-time priority.'}
                  </p>
                </div>
              </div>
            </SpotlightCard>
          )}

          {user.is_suspended && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">Account Suspended</p>
                <p className="text-xs text-red-600 mt-1">
                  Your account has been suspended due to fair-play violations. Contact the municipal office to appeal.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
