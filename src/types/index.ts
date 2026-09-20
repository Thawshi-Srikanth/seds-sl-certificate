export interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  certificate_code_hash: string;
  certificate_enabled: boolean;
  code_expires_at: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  email: string;
  registration_id: string | null;
  eligible: boolean;
  certificate_path: string | null;
  certificate_claimed: boolean;
  claimed_at: string | null;
  created_at: string;
}

export interface CertificateClaim {
  id: string;
  event_id: string;
  participant_id: string;
  email: string;
  claimed_at: string;
  ip_hash: string | null;
  user_agent: string | null;
  participant?: {
    name: string;
    registration_id: string | null;
  };
}

export interface VerificationResponse {
  success: boolean;
  participant_name?: string;
  registration_id?: string | null;
  event_name?: string;
  download_url?: string;
  expires_in_seconds?: number;
  already_claimed?: boolean;
  message?: string;
  error_code?: string;
}

export interface CsvParticipantRow {
  name: string;
  email: string;
  registration_id?: string;
  eligible?: boolean | string;
  certificate_path?: string;
}

export interface DashboardStats {
  totalParticipants: number;
  eligibleParticipants: number;
  claimedCertificates: number;
  unclaimedCertificates: number;
  claimRate: number;
}
