// Who runs GoodsMandi and who people can contact. Used by the Terms, the Privacy
// Notice, the sign-up form and the request form.
//
// BEFORE LAUNCH: replace every value marked CONFIRM with the real one, and have a
// lawyer read the Privacy Notice and the Terms. The Digital Personal Data Protection
// Act, 2023 requires the notice to say who is responsible for the data (the "Data
// Fiduciary") and to give a contact who can answer questions.

export const SERVICE_NAME = 'GoodsMandi';

// CONFIRM: the person or registered entity that decides why and how student data is
// used (the Data Fiduciary). For a pilot this is usually the individual(s) running the site.
export const FIDUCIARY_NAME = 'Arunava Roy';

// CONFIRM: a named person students can contact about their data and complaints, and an
// email address on the project's own domain.
export const GRIEVANCE_OFFICER_NAME = 'Arunava Roy';
export const SUPPORT_EMAIL = 'goodsmandi.support@gmail.com';

// Raise this whenever the Privacy Notice changes in a way that needs people to agree
// again. It is stored with each person's consent, so we can show what they agreed to.
// Everyone whose latest consent has another version is asked to agree again
// (src/components/layout/ConsentCheck.tsx). It covers the Terms too.
export const PRIVACY_NOTICE_VERSION = '2026-11-26';
export const PRIVACY_NOTICE_DATE = 'November 26, 2026';
export const TERMS_DATE = 'November 21, 2026';

// The email service that sends sign-up and password emails
export const EMAIL_PROVIDER = 'Resend';

// How quickly we promise to answer a request or complaint (also set as the due date
// of each request in the database, see the privacy_requests table).
export const REQUEST_RESPONSE_DAYS = 15;

export const PRIVACY_REQUEST_KINDS = [
  { value: 'access', label: 'See what data you hold about me' },
  { value: 'correction', label: 'Correct or update my data' },
  { value: 'erasure', label: 'Delete my data' },
  { value: 'nomination', label: 'Name someone to act for me if I die or cannot act' },
  { value: 'grievance', label: 'Make a complaint about how my data is handled' },
  { value: 'other', label: 'Something else about my data' },
] as const;

export type PrivacyRequestKind = (typeof PRIVACY_REQUEST_KINDS)[number]['value'];
export type PrivacyRequestStatus = 'open' | 'in_progress' | 'resolved' | 'rejected';

export const PRIVACY_REQUEST_STATUS_LABEL: Record<PrivacyRequestStatus, string> = {
  open: 'Received',
  in_progress: 'Being handled',
  resolved: 'Done',
  rejected: 'Not possible',
};
