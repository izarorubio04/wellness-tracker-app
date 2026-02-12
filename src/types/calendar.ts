export type EventType = 'citation' | 'gym' | 'session' | 'video' | 'match' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string;
  type: EventType;
  notes?: string; // Campo opcional extra
}

export const EVENT_LABELS: Record<EventType, string> = {
  citation: "CITACIÓN",
  gym: "GYM",
  session: "SESIÓN",
  video: "VÍDEO",
  match: "PARTIDO",
  other: "OTRO"
};

export const EVENT_COLORS: Record<EventType, string> = {
  citation: "bg-amber-100 text-amber-800 border-amber-200", // Amarillo
  gym: "bg-blue-100 text-blue-800 border-blue-200",         // Azul
  session: "bg-emerald-100 text-emerald-800 border-emerald-200", // Verde
  video: "bg-purple-100 text-purple-800 border-purple-200",   // Morado
  match: "bg-rose-100 text-rose-800 border-rose-200",         // Rojo
  other: "bg-slate-100 text-slate-700 border-slate-200"       // Gris
};