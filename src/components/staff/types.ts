export const SQUAD_NAMES = [
  "Eider Egaña", "Helene Altuna", "Paula Rubio", "Ainhize Antolín",
  "Aintzane Fernándes", "Maialen Gómez", "Estrella Lorente", "Carla Cerain",
  "Iraide Revuelta", "Aiala Mugueta", "Maialen Garlito", "Izaro Rubio",
  "Naroa García", "Irati Collantes", "Irati Martínez", "Ariadna Nayaded",
  "Izaro Tores", "Iratxe Balanzategui", "Naiara Óliver", "Lucía Daisa",
  "Jennifer Ngo", "Sofía Martínez", "Rania Zaaboul", "Erika Nicole",
];

export interface Player {
  id: string;
  name: string;
  position: string;
  wellness?: {
    sleep: number;
    fatigue: number;
    soreness: number;
    stress: number;
    mood: number;
    menstruation: "none" | "active" | "pms";
    status: "ready" | "warning" | "risk";
    submittedAt: string;
    notes?: string;
  };
  rpe?: {
    yesterday: number;
    todaySession: number;
    notes?: string;
    submittedAt: string;
    isLate?: boolean;
  };
}