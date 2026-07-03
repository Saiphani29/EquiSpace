import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarDays, Clock, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../api/client';
import type { Venue } from '../types';

interface BookingModalProps {
  venue: Venue;
  onClose: () => void;
  onSuccess: () => void;
}

/** Format a Date as YYYY-MM-DDTHH:MM in LOCAL time (what datetime-local needs) */
const toLocalISO = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

type Step = 'form' | 'conflict';

const BookingModal = ({ venue, onClose, onSuccess }: BookingModalProps) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Min = now + 30 min in LOCAL time (not UTC)
  const minStr = toLocalISO(new Date(Date.now() + 30 * 60 * 1000));

  const durationHours = startTime && endTime
    ? Math.round(((new Date(endTime).getTime() - new Date(startTime).getTime()) / 3600000) * 10) / 10
    : null;

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startTime || !endTime) {
      toast.error('Please fill in both start and end times');
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      toast.error('End time must be after start time');
      return;
    }
    if (new Date(startTime) < new Date()) {
      toast.error('Start time must be in the future');
      return;
    }
    if (durationHours && durationHours > 12) {
      toast.error('A single booking cannot exceed 12 hours');
      return;
    }

    setLoading(true);
    try {
      await api.post('/bookings/', {
        venue_id: venue.id,
        start_time: startTime,
        end_time: endTime,
      });
      toast.success(`Booking confirmed at ${venue.name}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setStep('conflict');
      } else {
        const detail = err.response?.data?.detail;
        if (Array.isArray(detail)) {
          toast.error(detail[0]?.msg || 'Booking failed');
        } else {
          toast.error(detail || 'Booking failed. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    setWaitlistLoading(true);
    try {
      const res = await api.post('/waitlist/', {
        venue_id: venue.id,
        start_time: startTime,
        end_time: endTime,
      });
      toast.success(`Added to waitlist! You are position #${res.data.position} 🎉`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to join waitlist');
    } finally {
      setWaitlistLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <CalendarDays className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Book a Slot</h2>
                <p className="text-xs text-slate-500 mt-0.5">{venue.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Venue meta */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              <span>{venue.capacity.toLocaleString()} capacity</span>
            </div>
            {venue.requires_deposit && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>₹{venue.deposit_amount.toLocaleString()} deposit required</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-7 py-6">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleBook}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    min={minStr}
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      if (endTime && e.target.value >= endTime) setEndTime('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    min={startTime || minStr}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                    required
                  />
                </div>

                {/* Duration preview */}
                {durationHours && durationHours > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5"
                  >
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700 font-medium">
                      Duration: {durationHours} hour{durationHours !== 1 ? 's' : ''}
                    </span>
                    {durationHours > 12 && (
                      <span className="text-xs text-rose-600 font-bold ml-auto">Max 12h</span>
                    )}
                  </motion.div>
                )}

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs text-blue-700">
                    <strong>Remember:</strong> Check in within 30 min of your start time. Missing check-in adds a fair-play strike.
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (!!durationHours && durationHours > 12)}
                    className="flex-1 bg-[#0078D4] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#005A9E] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Confirm Booking
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="conflict"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-center"
              >
                <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Slot Already Taken</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  This time slot is currently booked. Join the waitlist and you'll be
                  <strong> automatically assigned</strong> if it gets cancelled.
                </p>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 text-left">
                  <p className="text-xs font-bold text-amber-700 mb-1">How waitlist works:</p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    <li>• You'll be placed in a queue</li>
                    <li>• If the current booking is cancelled, you automatically get it</li>
                    <li>• You receive a real-time notification</li>
                    <li>• No action needed from your side!</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('form')}
                    className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleJoinWaitlist}
                    disabled={waitlistLoading}
                    className="flex-1 bg-amber-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {waitlistLoading && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    Join Waitlist
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BookingModal;
