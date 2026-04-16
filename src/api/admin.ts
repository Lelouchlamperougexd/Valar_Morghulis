import api from './index';

// ─── TYPES ────────────────────────────────────────────────────────────────────

// Backend wraps ALL successful responses in { data: ... }
interface Envelope<T> {
  data: T;
}

export interface Company {
  id: number;
  name: string;
  type: string;
  verification_status: string;
  city: string;
  email: string;
  phone: string;
  registration_number: string;
  created_at: string;
  updated_at: string;
}

export interface ListingMedia {
  id: number;
  listing_id: number;
  position: number;
  url: string;
}

export interface RentConstraints {
  allow_children: boolean;
  allow_pets: boolean;
  allow_students: boolean;
  listing_id: number;
  max_occupants: number;
  min_term_months: number;
}

export interface Listing {
  id: number;
  title: string;
  status: string;
  company_id: number;
  company_name: string;
  price: number;
  deal_type: string;
  property_type: string;
  address: string;
  city: string;
  area: number;
  rooms: number;
  floor: number;
  total_floors: number;
  description: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  media: ListingMedia[];
  rent_constraints: RentConstraints | null;
  latitude: number;
  longitude: number;
  project_id: number;
}

export interface Complaint {
  id: number;
  type: string;
  target_id: number;
  target_name: string;
  target_type: string;
  author_name: string;
  user_id: number;
  status: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  level: number;
  description: string;
}

export interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  role: Role;
  role_id: number;
  is_active: boolean;
  created_at: string;
  company_id: number;
  country: string;
  job_title: string;
  push_opt_in: boolean;
}

export interface AdminLog {
  id: number;
  action_type: string;
  admin_id: number;
  admin_name: string;
  admin_role: string;
  created_at: string;
  details: string;
  target_id: number;
  target_type: string;
}

export interface StatsOverview {
  on_moderation: number;
  total_companies: number;
  total_listings: number;
  total_users: number;
}

export interface ActivityPoint {
  date: string;
  new_companies: number;
  new_listings: number;
  new_users: number;
}

export interface Invite {
  company_type: string;
  expires_at: string;
  token: string;
  url: string;
}

// ─── API FUNCTIONS ────────────────────────────────────────────────────────────

export const adminAPI = {
  // Companies
  getCompanies: (params?: { limit?: number; offset?: number }) =>
    api.get<Envelope<Company[]>>('/admin/companies', { params }).then(r => r.data.data ?? r.data),

  getCompany: (id: number) =>
    api.get<Envelope<Company>>(`/admin/companies/${id}`).then(r => r.data.data ?? r.data),

  verifyCompany: (id: number, status: 'verified' | 'rejected') =>
    api.put<Envelope<Company>>(`/admin/companies/${id}/verify`, { status }).then(r => r.data.data ?? r.data),

  // Listings
  getListings: (params?: { status?: string; deal_type?: string; city?: string; property_type?: string; limit?: number; offset?: number }) =>
    api.get<Envelope<Listing[]>>('/admin/listings', { params }).then(r => r.data.data ?? r.data),

  updateListingStatus: (id: number, status: string) =>
    api.put<Envelope<Listing>>(`/admin/listings/${id}/status`, { status }).then(r => r.data.data ?? r.data),

  // Complaints
  getComplaints: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get<Envelope<Complaint[]>>('/admin/complaints', { params }).then(r => r.data.data ?? r.data),

  getComplaint: (id: number) =>
    api.get<Envelope<Complaint>>(`/admin/complaints/${id}`).then(r => r.data.data ?? r.data),

  updateComplaintStatus: (id: number, status: 'new' | 'in_progress' | 'closed') =>
    api.patch<Envelope<Complaint>>(`/admin/complaints/${id}/status`, { status }).then(r => r.data.data ?? r.data),

  // Users
  getUsers: (params?: { search?: string; limit?: number; offset?: number }) =>
    api.get<Envelope<AdminUser[]>>('/admin/users', { params }).then(r => r.data.data ?? r.data),

  updateUserRole: (id: number, role_id: number) =>
    api.patch(`/admin/users/${id}/role`, { role_id }),

  updateUserStatus: (id: number, is_active: boolean) =>
    api.patch(`/admin/users/${id}/status`, { is_active }),

  // Logs
  getLogs: (params?: { limit?: number; offset?: number }) =>
    api.get<Envelope<AdminLog[]>>('/admin/logs', { params }).then(r => r.data.data ?? r.data),

  // Stats
  getStatsOverview: () =>
    api.get<Envelope<StatsOverview>>('/admin/stats/overview').then(r => r.data.data ?? r.data),

  getStatsActivity: (days?: number) =>
    api.get<Envelope<ActivityPoint[]>>('/admin/stats/activity', { params: { days } }).then(r => r.data.data ?? r.data),

  // Invites
  createInvite: (company_type: 'agency' | 'developer') =>
    api.post<Envelope<Invite>>('/admin/invites', { company_type }).then(r => r.data.data ?? r.data),

  // Company self-check
  getCompanyById: (id: number) =>
    api.get<Envelope<Company>>(`/admin/companies/${id}`).then(r => r.data.data ?? r.data),
};
