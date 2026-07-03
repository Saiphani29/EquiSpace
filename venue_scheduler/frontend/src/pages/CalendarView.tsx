import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { api } from '../api/client';
import type { Booking } from '../types';

const STATUS_COLORS: Record<string, string> = {
  confirmed:  '#0078D4',
  completed:  '#10b981',
  cancelled:  '#94a3b8',
  no_show:    '#ef4444',
  overridden: '#f59e0b',
};

const CalendarView = () => {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    api.get<Booking[]>('/bookings/my')
      .then((res) => {
        setEvents(
          res.data.map((b) => ({
            id: String(b.id),
            title: `Venue #${b.venue_id}`,
            start: b.start_time,
            end: b.end_time,
            backgroundColor: STATUS_COLORS[b.status] || '#0078D4',
            borderColor: 'transparent',
            extendedProps: { status: b.status, type: b.booking_type },
          }))
        );
      })
      .catch(() => toast.error('Failed to load calendar events'));
  }, []);

  return (
    <div className="animate-slide-up h-full flex flex-col">
      <header className="mb-6 shrink-0">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Live Schedule</h1>
        <p className="text-slate-500 mt-1 text-sm">Your personal booking calendar at a glance.</p>
      </header>

      <div className="flex gap-3 mb-4 flex-wrap shrink-0">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5 text-xs text-slate-500 capitalize">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
            {status.replace('_', ' ')}
          </span>
        ))}
      </div>

      <div className="fluent-card rounded-2xl p-4 bg-white flex-1 min-h-0">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          height="100%"
          events={events}
          eventContent={(info) => (
            <div className="px-1 py-0.5 overflow-hidden">
              <p className="text-[10px] font-bold truncate">{info.event.title}</p>
              <p className="text-[9px] opacity-80 capitalize">
                {info.event.extendedProps.status}
              </p>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default CalendarView;
