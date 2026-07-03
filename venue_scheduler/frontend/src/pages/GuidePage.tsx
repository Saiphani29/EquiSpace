import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Clock, ShieldCheck, Star, Building2, Eye, Zap, CheckCircle2 } from 'lucide-react';

interface GuideCardProps {
  icon: React.ElementType;
  title: string;
  color: string;
  steps: string[];
  tip?: string;
  badge?: string;
}

const GuideCard = ({ icon: Icon, title, color, steps, tip, badge }: GuideCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    transition={{ type: 'spring', stiffness: 300 }}
    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl bg-${color}-50`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
      {badge && (
        <span className="text-[10px] font-bold uppercase px-2 py-1 bg-slate-100 text-slate-500 rounded-full">
          {badge}
        </span>
      )}
    </div>
    <h3 className="text-base font-bold text-slate-900 mb-3">{title}</h3>
    <ol className="space-y-2.5">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
          <span className={`text-${color}-600 font-bold text-xs bg-${color}-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5`}>
            {i + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
    {tip && (
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3">
        <p className="text-xs text-blue-700"><span className="font-bold">💡 Pro Tip: </span>{tip}</p>
      </div>
    )}
  </motion.div>
);

const GuidePage = () => (
  <div className="animate-slide-up">
    <header className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Feature Guide</h1>
      <p className="text-slate-500 mt-1 text-sm">
        New to Eluru Connect? Here's everything you need to know — simple and easy! 🚀
      </p>
    </header>

    {/* Quick intro */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-8 text-white"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-white/20 rounded-xl shrink-0">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-1">What is Eluru Connect?</h2>
          <p className="text-blue-100 text-sm leading-relaxed">
            Eluru Connect is a government platform that lets citizens fairly book public venues like stadiums, halls, and parks.
            No more calling someone you know — everything is transparent and equal. Anyone can see who booked what and why!
          </p>
        </div>
      </div>
    </motion.div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <GuideCard
        icon={MapPin}
        title="📍 Browsing & Booking a Venue"
        color="blue"
        badge="Start Here"
        steps={[
          'Go to "Browse Venues" in the sidebar.',
          'Scroll through the list — each card shows the venue name, location, and capacity.',
          'Click "Book Slot" on any venue you want.',
          'A popup appears — pick your start date/time and end date/time.',
          'Hit "Confirm Booking" and you\'re done! 🎉',
        ]}
        tip="You can book up to 4 slots per venue per month. VIP members get 8!"
      />

      <GuideCard
        icon={Clock}
        title="⏳ Joining the Waitlist"
        color="amber"
        steps={[
          'Try to book a slot — if it\'s already taken, a popup asks if you want to join the waitlist.',
          'Click "Yes" to join. Your position in the queue is shown.',
          'When the current booking gets cancelled, you automatically get the slot.',
          'You\'ll see a real-time notification appear in your browser.',
          'Check "My Sessions" on the dashboard to see your new confirmed booking.',
        ]}
        tip="The waitlist is first-come, first-served. Join early for better positions!"
      />

      <GuideCard
        icon={CalendarDays}
        title="✅ Check-In Process"
        color="emerald"
        steps={[
          'When your booking slot is approaching, go to the Dashboard.',
          'Find your booking in "My Upcoming Sessions".',
          'Click the blue "Check-in" button — it opens 30 minutes before your start time.',
          'Confirm your presence and enjoy your session!',
          'If you miss the check-in window, it auto-marks as No-Show.',
        ]}
        tip="Set a reminder! Missing check-in 3 times will suspend your account."
      />

      <GuideCard
        icon={ShieldCheck}
        title="⚖️ Fair-Play System"
        color="rose"
        steps={[
          'The system tracks your behaviour — good and bad.',
          'No-show (missing check-in) = 1 Fair-Play Strike.',
          'You have a maximum of 3 strikes before suspension.',
          'Strikes can be cleared by a government admin after review.',
          'Your Fair-Play Score is shown on the Dashboard and Settings pages.',
        ]}
        tip="Always cancel bookings you won't use! It releases the slot to someone else."
      />

      <GuideCard
        icon={Star}
        title="⭐ VIP Membership"
        color="amber"
        badge="Special Role"
        steps={[
          'VIP members are assigned by government admins.',
          'VIP gets 8 bookings per month (instead of 4).',
          'VIP users have first access to prime-time slots (Sunday mornings).',
          'Ordinary citizens can access those slots 48 hours before the event.',
          'VIP status can be revoked for fair-play violations.',
        ]}
        tip="VIP is for official organisations like MLA offices, not personal requests."
      />

      <GuideCard
        icon={Building2}
        title="🏛️ Government Overrides"
        color="purple"
        badge="Admin Only"
        steps={[
          'Govt Admins can override any booking for urgent municipal needs.',
          'Reasons must be written and are visible to the public.',
          'Examples: election booths, disaster relief, VIP events.',
          'Every override is permanently logged in the Audit Trail.',
          'Citizens can view all overrides in the Public Audit tab.',
        ]}
        tip="All overrides are public — this prevents misuse by officials."
      />

      <GuideCard
        icon={Eye}
        title="🔍 Public Transparency Audit"
        color="slate"
        steps={[
          'Go to "Public Audit" in the sidebar.',
          'See a breakdown of all bookings and their statuses.',
          'Government overrides are clearly listed with official reasons.',
          'You can verify that no one is getting special treatment.',
          'All data is real-time and cannot be deleted.',
        ]}
        tip="This is what makes Eluru Connect different — corruption is impossible when everything is public!"
      />

      <GuideCard
        icon={CalendarDays}
        title="📅 Live Schedule (Calendar)"
        color="blue"
        steps={[
          'Go to "Live Schedule" in the sidebar.',
          'See all your bookings on an interactive calendar.',
          'Switch between month, week, and day views.',
          'Colour-coded: blue=confirmed, green=completed, grey=cancelled, red=no-show.',
          'Click any event to see details.',
        ]}
        tip="The calendar only shows YOUR bookings. The public audit shows everyone's."
      />

      <GuideCard
        icon={CheckCircle2}
        title="🔐 Account & Security"
        color="emerald"
        steps={[
          'Login with your registered phone number and password.',
          'Passwords must be at least 6 characters.',
          'Your JWT session expires after 24 hours — you\'ll need to log in again.',
          'Suspended accounts cannot login until reinstated by an admin.',
          'Never share your password — the government will never ask for it.',
        ]}
        tip="Use a strong password! Your account controls public resources."
      />
    </div>

    {/* Footer tip */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="mt-10 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center"
    >
      <p className="text-2xl mb-2">🎯</p>
      <h3 className="text-base font-bold text-slate-800 mb-1">Golden Rule of Eluru Connect</h3>
      <p className="text-sm text-slate-600 max-w-xl mx-auto">
        <strong>Only book what you'll actually use.</strong> Public venues are a shared resource.
        Cancelling early helps others. No-shows waste community property and hurt your fair-play score.
      </p>
    </motion.div>
  </div>
);

export default GuidePage;
