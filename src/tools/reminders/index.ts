import { getLastReminder } from "./get_last_reminder.js";
import { checkReminderEligibility } from "./check_reminder_eligibility.js";
import { createReminder } from "./create_reminder.js";

export const tools = [
  getLastReminder,
  checkReminderEligibility,
  createReminder
];
