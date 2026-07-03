import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../api/client';
import SpotlightCard from '../components/SpotlightCard';
import type { Booking } from '../types';

const PublicAuditView = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Booking[]>('/bookings/?limit=50')
      .then((r) => setBookings(r.data))
      .catch(() => toast.error('Failed to load audit data'))
      .finally(() => setLoading(false));
  }, []);

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const overrides = bookings.filter((b) => b.status === 'overridden');

  const BAR_COLORS: Record<string, string> = {
    confirmed: '#0078D4',
    completed: '#10b981',
    cancelled: '#94a3b8',
    no_show:   '#ef4444',
    overridden:'#f59e0b',
  };

  return (
    <div className="animate-slide-up">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Public Transparency Audit</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Real-time data on venue utilization, fairness metrics, and government actions.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <SpotlightCard>
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Booking Status Breakdown
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(counts).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-20 capitalize shrink-0">{status.replace('_', ' ')}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / bookings.length) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ backgroundColor: BAR_COLORS[status] || '#64748b' }}
                      className="h-full rounded-full"
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-6 text-right">{count}</span>
                </div>
              ))}
              <p className="text-xs text-slate-400 mt-3">Total: {bookings.length} records</p>
            </div>
          )}
        </SpotlightCard>

        <SpotlightCard>
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-5 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Anti-Corruption Ledger
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-1 max-h-52 overflow-y-auto custom-scrollbar">
              {bookings.slice(0, 30).map((b) => (
                <div key={b.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-50 last:border-0">
                  <span className="text-slate-600 font-mono">
                    #TX-{String(b.id).padStart(5, '0')}
                  </span>
                  {b.status === 'overridden' ? (
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      Override: {b.override_reason?.slice(0, 20) || 'N/A'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </SpotlightCard>
      </div>

      {overrides.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Government Overrides</h3>
          <div className="space-y-3">
            {overrides.map((b) => (
              <div key={b.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-800">Booking #TX-{String(b.id).padStart(5, '0')} — Venue #{b.venue_id}</p>
                  <p className="text-xs text-slate-600 mt-0.5">Reason: {b.override_reason || 'Not specified'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Overridden on {new Date(b.start_time).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicAuditView;
