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

// Complaint types
const (
	ComplaintTypeIncorrectListing = "incorrect_listing"
	ComplaintTypeRuleViolation    = "rule_violation"
	ComplaintTypeFraud            = "fraud"
)

// Complaint statuses
const (
	ComplaintStatusNew        = "new"
	ComplaintStatusInProgress = "in_progress"
	ComplaintStatusClosed     = "closed"
)
