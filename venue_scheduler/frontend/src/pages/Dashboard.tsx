import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, AlertCircle, Clock, MapPin, Camera, ShieldCheck, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../api/client';
import SpotlightCard from '../components/SpotlightCard';
import type { User, Booking, WaitlistEntry, Venue } from '../types';

interface DashboardProps { user: User; }

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    confirmed:  'bg-emerald-50 text-emerald-700 border-emerald-100',
    completed:  'bg-blue-50 text-blue-700 border-blue-100',
    cancelled:  'bg-slate-100 text-slate-500 border-slate-200',
    no_show:    'bg-rose-50 text-rose-700 border-rose-100',
    overridden: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors[status] || 'bg-slate-100'}`}>
      {status.replace('_', '-')}
    </span>
  );
};

const Dashboard = ({ user }: DashboardProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [venueMap, setVenueMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, wRes, vRes] = await Promise.all([
        api.get<Booking[]>('/bookings/my'),
        api.get<WaitlistEntry[]>('/waitlist/my'),
        api.get<Venue[]>('/venues/'),
      ]);
      setBookings(bRes.data);
      setWaitlist(wRes.data);
      // Build id → name map for quick lookup
      const map: Record<number, string> = {};
      vRes.data.forEach((v) => { map[v.id] = v.name; });
      setVenueMap(map);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCheckIn = async (bookingId: number) => {
    try {
      await api.post(`/bookings/${bookingId}/check-in`);
      toast.success('Check-in successful! Enjoy your session.');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Check-in failed');
    }
  };

  const handleCancel = async (bookingId: number) => {
    if (!window.confirm('Cancel this booking? The slot will be released to the waitlist.')) return;
    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      toast.success('Booking cancelled. Slot released to waitlist.');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Cancellation failed');
    }
  };

  const handleLeaveWaitlist = async (entryId: number) => {
    try {
      await api.delete(`/waitlist/${entryId}`);
      toast.success('Removed from waitlist');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to leave waitlist');
    }
  };

  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const recentBookings = bookings.filter((b) => b.status !== 'confirmed').slice(0, 3);
  const fairPlayPct = Math.max(0, 100 - user.fair_play_strikes * 34);
  const isVip = user.role === 'vip' || user.role === 'govt_super_admin';

  const venueName = (id: number) => venueMap[id] || `Venue #${id}`;

  const formatRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const sameDay = s.toDateString() === e.toDateString();
    return sameDay
      ? `${s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${s.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} – ${e.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
      : `${s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  };

  return (
    <div className="animate-slide-up">
      {/* Page header */}
      <div className="flex flex-wrap justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Welcome, {user.name.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage your public resource bookings in Eluru, Andhra Pradesh.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isVip && (
            <span className="px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Star className="w-4 h-4 fill-current" />
              {user.role === 'govt_super_admin' ? 'Government Admin' : 'VIP Member'}
            </span>
          )}
          <span className={`px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold border ${
            user.is_suspended
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
          }`}>
            <ShieldCheck className="w-4 h-4" />
            {user.is_suspended ? 'Account Suspended' : `Fair-Play: ${fairPlayPct}%`}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <SpotlightCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><CalendarDays className="w-5 h-5" /></div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Bookings</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900">{loading ? '—' : activeBookings.length}</span>
            <span className="text-sm font-medium text-blue-600">Confirmed</span>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><AlertCircle className="w-5 h-5" /></div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fair-Play Strikes</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900">{user.fair_play_strikes}</span>
            <span className="text-sm font-medium text-rose-600">of 3 max</span>
          </div>
          <div className="flex gap-1.5 mt-3">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.1 }}
                className={`h-2 flex-1 rounded-full ${i < user.fair_play_strikes ? 'bg-rose-400' : 'bg-slate-100'}`} />
            ))}
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock className="w-5 h-5" /></div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Waitlist</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900">{loading ? '—' : waitlist.length}</span>
            <span className="text-sm font-medium text-amber-600">Slots queued</span>
          </div>
        </SpotlightCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming bookings */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">My Upcoming Sessions</h3>
          {loading ? (
            [1, 2].map((i) => (
              <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-slate-100" />
            ))
          ) : activeBookings.length === 0 ? (
            <div className="text-center py-14 border-2 border-dashed border-slate-200 rounded-2xl">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-400">No upcoming bookings.</p>
              <p className="text-xs text-slate-400 mt-1">Go to <strong>Browse Venues</strong> to book a slot!</p>
            </div>
          ) : (
            activeBookings.map((b) => (
              <motion.div key={b.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    b.booking_type === 'vip' ? 'bg-amber-50' : 'bg-blue-50'
                  }`}>
                    {b.booking_type === 'vip'
                      ? <Star className="w-5 h-5 text-amber-500 fill-current" />
                      : <MapPin className="w-5 h-5 text-blue-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{venueName(b.venue_id)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatRange(b.start_time, b.end_time)}</p>
                    <div className="flex gap-1.5 mt-1.5">
                      <StatusBadge status={b.status} />
                      {b.booking_type !== 'standard' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-100">
                          {b.booking_type === 'vip' ? '⭐ VIP' : '🏛 Govt'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  <button onClick={() => handleCheckIn(b.id)}
                    className="bg-[#0078D4] text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-[#005A9E] transition-all">
                    <Camera className="w-3.5 h-3.5" /> Check-in
                  </button>
                  <button onClick={() => handleCancel(b.id)}
                    className="text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-lg text-xs font-semibold transition-all">
                    Cancel
                  </button>
                </div>
              </motion.div>
            ))
          )}

          {/* Recent history */}
          {!loading && recentBookings.length > 0 && (
            <>
              <h3 className="text-base font-semibold text-slate-700 pt-2">Recent History</h3>
              {recentBookings.map((b) => (
                <div key={b.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{venueName(b.venue_id)}</p>
                      <p className="text-xs text-slate-400">{formatRange(b.start_time, b.end_time)}</p>
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-slate-900">Waitlist Queue</h3>
          {loading ? (
            <div className="h-20 bg-white rounded-xl animate-pulse border border-slate-100" />
          ) : waitlist.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center text-sm text-slate-400">
              Not in any waitlist
            </div>
          ) : (
            waitlist.map((w) => (
              <div key={w.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-bold text-slate-700 truncate">{venueName(w.venue_id)}</p>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0 ml-2">
                    #{w.queue_position}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  {new Date(w.requested_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <button onClick={() => handleLeaveWaitlist(w.id)}
                  className="text-xs text-rose-500 hover:underline font-semibold">
                  Leave waitlist
                </button>
              </div>
            ))
          )}

          <div className="bg-[#0078D4]/5 border border-blue-100 rounded-xl p-5">
            <p className="text-xs font-bold text-blue-600 uppercase mb-2">📢 Municipal Notice</p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Maintenance at Helapuri Town Hall this Sunday. All morning bookings may be shifted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
