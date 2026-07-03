import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../api/client';
import SpotlightCard from '../components/SpotlightCard';
import BookingModal from '../components/BookingModal';
import type { Venue } from '../types';

const VenuesView = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Venue | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get<Venue[]>('/venues/')
      .then((r) => setVenues(r.data))
      .catch(() => toast.error('Failed to load venues'))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <div className="animate-slide-up">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Browse Venues</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Explore public parks, stadiums, and halls available in Eluru District.
        </p>
      </header>

      <AnimatePresence>
        {selected && (
          <BookingModal
            venue={selected}
            onClose={() => setSelected(null)}
            onSuccess={() => setRefreshKey((k) => k + 1)}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 fluent-card rounded-xl animate-pulse" />
            ))
          : venues.map((venue, idx) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <SpotlightCard className="p-0 border-0 cursor-pointer">
                  <div className="relative h-48 overflow-hidden rounded-t-xl">
                    <img
                      src={venue.image_url || 'https://images.unsplash.com/photo-1595113316349-9fa4ee24f884?auto=format&fit=crop&q=80&w=800'}
                      alt={venue.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                    <div className="absolute bottom-4 left-5">
                      <h3 className="text-lg font-bold text-white">{venue.name}</h3>
                      <p className="text-blue-100 text-xs flex items-center gap-1 mt-0.5 opacity-80">
                        <MapPin className="w-3 h-3" /> {venue.location}
                      </p>
                    </div>
                    {venue.requires_deposit && (
                      <div className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shadow">
                        Deposit ₹{venue.deposit_amount.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex justify-between items-center bg-white rounded-b-xl">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capacity</p>
                      <p className="text-sm font-bold text-slate-900">{venue.capacity.toLocaleString()} Pax</p>
                    </div>
                    <button
                      onClick={() => setSelected(venue)}
                      className="bg-[#0078D4] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#005A9E] transition-all shadow-md shadow-blue-500/20"
                    >
                      Book Slot
                    </button>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
      </div>
    </div>
  );
};

export default VenuesView;
