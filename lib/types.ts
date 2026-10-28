export type EventRow = {
  id: string;
  name: string;
  start_time: string;
  reveal_delay_hours: number;
  shot_limit: number;
  prompts: string[];
  admin_key: string;
  notified: boolean;
};

export type GuestRow = {
  id: string;
  event_id: string;
  name: string | null;
  email: string | null;
  shots_taken: number;
};

export type PhotoRow = {
  id: string;
  event_id: string;
  guest_id: string;
  storage_path: string;
  prompt: string | null;
  created_at: string;
};

export function revealTime(event: EventRow): Date {
  const start = new Date(event.start_time).getTime();
  return new Date(start + event.reveal_delay_hours * 60 * 60 * 1000);
}
