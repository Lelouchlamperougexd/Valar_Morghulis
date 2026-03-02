package store

// Role names
const (
	RoleUser      = "user"
	RoleAgency    = "agency"
	RoleDeveloper = "developer"
	RoleAdmin     = "admin"
	RoleModerator = "moderator"
)

// Company verification statuses
const (
	VerificationPending  = "pending"
	VerificationVerified = "verified"
	VerificationRejected = "rejected"
)

// Listing statuses
const (
	ListingStatusDraft      = "draft"
	ListingStatusModeration = "moderation"
	ListingStatusActive     = "active"
	ListingStatusRejected   = "rejected"
	ListingStatusArchived   = "archived"
)

// Application statuses
const (
	ApplicationStatusNew      = "new"
	ApplicationStatusReview   = "review"
	ApplicationStatusApproved = "approved"
	ApplicationStatusRejected = "rejected"
)
