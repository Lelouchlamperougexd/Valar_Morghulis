import api from './index';

// ─── Envelope ─────────────────────────────────────────────────────────────────
interface Envelope<T> { data: T; }

// ─── Types (mirror backend models) ───────────────────────────────────────────

export interface FavoriteListing {
  listing_id: number;
  title: string;
  city: string;
  price: number;
  area?: number;
  cover_url?: string;
  created_at: string;
}

export interface ApplicationSummary {
  id: number;
  listing_title: string;
  company_name: string;
  status: 'new' | 'review' | 'approved' | 'rejected';
  updated_at: string;
}

export interface DashboardOverview {
  favorites_count: number;
  active_applications_count: number;
  unread_messages_count: number;
  recent_listings: FavoriteListing[];
  recent_applications: ApplicationSummary[];
}

export interface Application {
  id: number;
  listing_id: number;
  listing_title?: string;
  user_id: number;
  full_name: string;
  phone: string;
  email: string;
  status: 'new' | 'review' | 'approved' | 'rejected';
  is_compatible: boolean;
  deal_type: string;
  occupant_count?: number;
  has_children?: boolean;
  has_pets?: boolean;
  is_student?: boolean;
  stay_term_months?: number;
  needs_mortgage?: boolean;
  purchase_term?: string;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSummary {
  application_id: number;
  listing_title: string;
  company_name: string;
  user_name?: string;      // applicant's name (company-side chats)
  last_message: string;
  last_message_at: string;
  is_unread: boolean;
}

export interface ApplicationMessage {
  id: number;
  application_id: number;
  sender_user_id?: number;
  body: string;
  created_at: string;
}

export interface CreateApplicationPayload {
  full_name: string;
  phone: string;
  email: string;
  deal_type: 'rent' | 'sale';
  comment?: string;
  occupant_count?: number;
  has_children?: boolean;
  has_pets?: boolean;
  is_student?: boolean;
  stay_term_months?: number;
  needs_mortgage?: boolean;
  purchase_term?: string;
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
  new_password_confirmation: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

/** GET /dashboard/overview */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const res = await api.get<Envelope<DashboardOverview>>('/dashboard/overview');
  return res.data.data;
}

/** GET /favorites */
export async function getFavorites(): Promise<FavoriteListing[]> {
  const res = await api.get<Envelope<FavoriteListing[]>>('/favorites');
  return res.data.data ?? [];
}

/** POST /favorites/{listingID} */
export async function addFavorite(listingId: number): Promise<void> {
  await api.post(`/favorites/${listingId}`);
}

/** DELETE /favorites/{listingID} */
export async function removeFavorite(listingId: number): Promise<void> {
  await api.delete(`/favorites/${listingId}`);
}

/** GET /applications — my applications */
export async function getMyApplications(params?: { status?: string }): Promise<Application[]> {
  const res = await api.get<Envelope<Application[]>>('/applications', { params });
  return res.data.data ?? [];
}

/** POST /listings/{listingID}/applications */
export async function createApplication(
  listingId: number,
  payload: CreateApplicationPayload
): Promise<Application> {
  const res = await api.post<Envelope<Application>>(`/listings/${listingId}/applications`, payload);
  return res.data.data;
}

/** GET /chats */
export async function getChats(): Promise<ChatSummary[]> {
  const res = await api.get<Envelope<ChatSummary[]>>('/chats');
  return res.data.data ?? [];
}

/** GET /applications/{applicationID}/messages */
export async function getMessages(applicationId: number): Promise<ApplicationMessage[]> {
  const res = await api.get<Envelope<ApplicationMessage[]>>(
    `/applications/${applicationId}/messages`
  );
  return res.data.data ?? [];
}

/** POST /applications/{applicationID}/messages */
export async function sendMessage(applicationId: number, body: string): Promise<ApplicationMessage> {
  const res = await api.post<Envelope<ApplicationMessage>>(
    `/applications/${applicationId}/messages`,
    { body }
  );
  return res.data.data;
}

/** PATCH /users/me — update profile */
export async function updateProfile(payload: UpdateProfilePayload) {
  const res = await api.patch<Envelope<unknown>>('/users/me', payload);
  return res.data.data;
}

/** PUT /users/me/password — change password */
export async function changePassword(payload: ChangePasswordPayload) {
  const res = await api.put<Envelope<{ message: string }>>('/users/me/password', payload);
  return res.data.data;
}

/** PATCH /applications/{applicationID}/status — update application status (company only) */
export async function updateApplicationStatus(applicationId: number, status: 'new' | 'review' | 'approved' | 'rejected'): Promise<Application> {
  const res = await api.patch<Envelope<Application>>(`/applications/${applicationId}/status`, { status });
  return res.data.data;
}

// ─── Company / Agency ─────────────────────────────────────────────────────────

export interface CompanyListing {
  id: number;
  title: string;
  status: string;
  deal_type: string;
  property_type: string;
  price: number;
  city: string;
  address: string;
  area: number | null;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  company_id: number;
  company_name: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  media: { id: number; listing_id: number; url: string; position: number }[];
}

export interface CreateListingPayload {
  title: string;
  description: string;
  property_type: string;
  deal_type: 'rent' | 'sale';
  price: number;
  city: string;
  address?: string;
  rooms?: number;
  area?: number;
  floor?: number;
  total_floors?: number;
}

/** GET /listings/mine — company's own listings (all statuses) */
export async function getCompanyListings(params?: { status?: string; limit?: number; offset?: number }): Promise<CompanyListing[]> {
  const res = await api.get<Envelope<CompanyListing[]>>('/listings/mine', { params });
  return res.data.data ?? [];
}

/** POST /listings — create a new listing */
export async function createListing(payload: CreateListingPayload): Promise<CompanyListing> {
  const res = await api.post<Envelope<CompanyListing>>('/listings', payload);
  return res.data.data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    new: 'Новая',
    review: 'На рассмотрении',
    approved: 'Одобрена',
    rejected: 'Отклонена',
  };
  return map[status] ?? status;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    new: '#faad14',
    review: '#70a0ff',
    approved: '#52c97a',
    rejected: '#f5222d',
  };
  return map[status] ?? '#939393';
}
