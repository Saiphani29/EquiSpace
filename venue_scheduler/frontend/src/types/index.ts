export interface User {
  id: number;
  name: string;
  phone_number: string;
  role: 'citizen' | 'vip' | 'venue_manager' | 'govt_super_admin' | 'guest';
  is_suspended: boolean;
  fair_play_strikes: number;
  penalty_points: number;
}

export interface Venue {
  id: number;
  name: string;
  location: string;
  capacity: number;
  requires_deposit: boolean;
  deposit_amount: number;
  image_url?: string;
}

export interface Booking {
  id: number;
  user_id: number;
  venue_id: number;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'overridden';
  booking_type: 'standard' | 'vip' | 'govt_override';
  created_at: string;
  override_reason: string | null;
}

export interface WaitlistEntry {
  id: number;
  user_id: number;
  venue_id: number;
  requested_start: string;
  requested_end: string;
  queue_position: number;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_bookings: number;
  suspended_users: number;
  vip_users: number;
}
