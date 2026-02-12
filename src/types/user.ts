export interface NotificationSchedule {
  monday: string;    // "09:00", "disabled", etc.
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface UserPreferences {
  wellness: NotificationSchedule;
  rpe: NotificationSchedule;
}

// Valores por defecto (Todo desactivado)
export const DEFAULT_SCHEDULE: NotificationSchedule = {
  monday: "disabled",
  tuesday: "disabled",
  wednesday: "disabled",
  thursday: "disabled",
  friday: "disabled",
  saturday: "disabled",
  sunday: "disabled"
};