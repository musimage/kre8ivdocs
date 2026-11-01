/**
 * KRE8ivDocs intake form label map (A.R.I.S.E. Family Welcome, Consent & ISP v7.0).
 *
 * Text fields are matched by their template field label.
 * Checkboxes have no label in the template, so they are matched by
 * `${page}:${Math.round(positionX)}:${Math.round(positionY)}`. Copies of the
 * template keep the same positions, so they match too.
 */

export type IntakeSection = "about" | "program" | "choices" | "other";

export const INTAKE_SECTIONS: {
  id: IntakeSection;
  title: string;
  hint?: string;
}[] = [
  { id: "about", title: "Part 2. About the student and family" },
  { id: "program", title: "Part 3. Program and Individual Service Plan" },
  {
    id: "choices",
    title: "Part 4. Choices",
    hint: "Tap to check. Blank means not authorized.",
  },
  { id: "other", title: "Other fields" },
];

export type IntakeTextLabel = {
  label: string;
  section: IntakeSection;
  multiline?: boolean;
  placeholder?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
};

export const INTAKE_TEXT_LABELS: Record<string, IntakeTextLabel> = {
  "Student name": { label: "Student name", section: "about" },
  DOB: { label: "Date of birth", section: "about", placeholder: "MM/DD/YYYY" },
  "School & grade": { label: "School and grade", section: "about" },
  "Student phone/email": { label: "Student phone or email", section: "about" },
  "Guardian name & relationship": {
    label: "Guardian name and relationship",
    section: "about",
  },
  "Guardian phone": {
    label: "Guardian phone",
    section: "about",
    inputMode: "tel",
  },
  "Guardian email": {
    label: "Guardian email",
    section: "about",
    inputMode: "email",
  },
  "Home address": { label: "Home address", section: "about" },
  "Best time/language": {
    label: "Best time to reach / language",
    section: "about",
  },
  "Race/gender": { label: "Race / gender (optional)", section: "about" },
  "Emergency contact": {
    label: "Emergency contact (name, relationship)",
    section: "about",
  },
  "Emergency phone": {
    label: "Emergency phone",
    section: "about",
    inputMode: "tel",
  },
  "Custody restrictions": {
    label: 'Custody or contact restrictions (or "None")',
    section: "about",
  },
  "Referral contact": { label: "Referral source contact", section: "about" },
  "Referral phone/email": {
    label: "Referral phone or email",
    section: "about",
  },
  "Doctor/phone": { label: "Doctor and phone", section: "about" },

  "Class location": { label: "Class location", section: "program" },
  "Class day & time": { label: "Class day and time", section: "program" },
  "Start date": {
    label: "Start date",
    section: "program",
    placeholder: "MM/DD/YYYY",
  },
  Graduation: {
    label: "Graduation date",
    section: "program",
    placeholder: "MM/DD/YYYY",
  },
  Length: { label: "Program length", section: "program" },
  "Referral date": {
    label: "Referral date",
    section: "program",
    placeholder: "MM/DD/YYYY",
  },
  "Date of plan": {
    label: "Date of plan",
    section: "program",
    placeholder: "MM/DD/YYYY",
  },
  Strengths: { label: "Strengths", section: "program", multiline: true },
  Needs: { label: "Needs", section: "program", multiline: true },
  Skills: { label: "Skills to build", section: "program", multiline: true },
  Goals: { label: "Goals", section: "program", multiline: true },
  Strategies: {
    label: "Strategies and supports",
    section: "program",
    multiline: true,
  },
  "Review 1": {
    label: "Review date 1",
    section: "program",
    placeholder: "MM/DD/YYYY",
  },
  "Review 2": {
    label: "Review date 2",
    section: "program",
    placeholder: "MM/DD/YYYY",
  },
  "Review 3": {
    label: "Review date 3",
    section: "program",
    placeholder: "MM/DD/YYYY",
  },
  "Review 4": {
    label: "Review date 4",
    section: "program",
    placeholder: "MM/DD/YYYY",
  },
  "Review 5": {
    label: "Review date 5",
    section: "program",
    placeholder: "MM/DD/YYYY",
  },
  "Plan developed by": { label: "Plan developed by", section: "program" },

  "Allergies/medical": {
    label: "Allergies / medical needs (list)",
    section: "choices",
    multiline: true,
  },
  "Emergency limits": {
    label: "Emergency care limits or notes",
    section: "choices",
    multiline: true,
  },
  "Pickup location": { label: "Pickup location", section: "choices" },
  "Pickup address": { label: "Pickup address", section: "choices" },
  "Dropoff name": { label: "Drop-off: adult name", section: "choices" },
  "Dropoff address": { label: "Drop-off address", section: "choices" },
  "Authorized adults": {
    label: "Other adults authorized for pickup",
    section: "choices",
  },
  "C Other text": { label: 'Share with "Other": who?', section: "choices" },
};

export type IntakeCheckboxLabel = {
  group: string;
  label: string;
  section: IntakeSection;
  /** Only one option in the group can be checked. */
  single?: boolean;
};

export const INTAKE_CHECKBOX_LABELS: Record<string, IntakeCheckboxLabel> = {
  "2:29:33": {
    group: "County",
    label: "Union County",
    section: "program",
    single: true,
  },
  "2:43:33": {
    group: "County",
    label: "Davidson County",
    section: "program",
    single: true,
  },

  "3:9:17": {
    group: "A. Emergency medical care",
    label: "Yes, authorize",
    section: "choices",
    single: true,
  },
  "3:23:17": {
    group: "A. Emergency medical care",
    label: "No, discuss with staff first",
    section: "choices",
    single: true,
  },
  "3:24:19": {
    group: "Known allergies",
    label: "No known allergies",
    section: "choices",
    single: true,
  },
  "3:41:19": {
    group: "Known allergies",
    label: "Yes, known allergies",
    section: "choices",
    single: true,
  },

  "3:42:33": {
    group: "B. Needs help with transportation?",
    label: "Yes",
    section: "choices",
    single: true,
  },
  "3:49:33": {
    group: "B. Needs help with transportation?",
    label: "No, family transport",
    section: "choices",
    single: true,
  },
  "3:66:33": {
    group: "B. Needs help with transportation?",
    label: "Discuss first",
    section: "choices",
    single: true,
  },
  "3:23:35": {
    group: "If yes, pick up from",
    label: "Home",
    section: "choices",
  },
  "3:32:35": {
    group: "If yes, pick up from",
    label: "School",
    section: "choices",
  },

  "3:9:53": {
    group: "C. Share attendance/grades with",
    label: "Court counselor / DJJ",
    section: "choices",
  },
  "3:27:53": {
    group: "C. Share attendance/grades with",
    label: "School",
    section: "choices",
  },
  "3:36:53": {
    group: "C. Share attendance/grades with",
    label: "Primary care physician",
    section: "choices",
  },
  "3:55:53": {
    group: "C. Share attendance/grades with",
    label: "Other",
    section: "choices",
  },
  "3:76:53": {
    group: "C. Share attendance/grades with",
    label: "Do not share",
    section: "choices",
  },

  "3:9:61": {
    group: "D. Photos, video and audio",
    label: "No public use",
    section: "choices",
  },
  "3:22:61": {
    group: "D. Photos, video and audio",
    label: "Website / official channels",
    section: "choices",
  },
  "3:43:61": {
    group: "D. Photos, video and audio",
    label: "Print and presentations",
    section: "choices",
  },
  "3:61:61": {
    group: "D. Photos, video and audio",
    label: "Public showcases",
    section: "choices",
  },
  "3:17:63": {
    group: "Name use",
    label: "No name",
    section: "choices",
    single: true,
  },
  "3:28:63": {
    group: "Name use",
    label: "First name only",
    section: "choices",
    single: true,
  },
};

export const getCheckboxKey = (
  page: number,
  positionX: number,
  positionY: number,
) => `${page}:${Math.round(positionX)}:${Math.round(positionY)}`;

export const EXECUTIVE_DIRECTOR_OPTIONS = [
  { name: "Douglas Greene", email: "douglas@kre8ivu.org" },
  { name: "Jouie", email: "jouie@kre8ivu.org" },
];
