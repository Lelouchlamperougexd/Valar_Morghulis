package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/sikozonpc/social/internal/store"
)

const (
	maxListingMediaBytes  int64 = 10 << 20 // 10MB
	maxMultipartOverhead  int64 = 1 << 20
	listingMediaFieldName       = "file"
)

var listingMediaExtensions = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// uploadListingMediaHandler godoc
//
//	@Summary		Upload listing photo (agency/developer)
//	@Description	Uploads one image for a listing owned by the current company
//	@Tags			listings
//	@Accept			mpfd
//	@Produce		json
//	@Param			listingID	path		int		true	"Listing ID"
//	@Param			file		formData	file	true	"Listing image (jpeg/png/webp, max 10MB)"
//	@Success		201			{object}	store.ListingMedia
//	@Failure		400			{object}	error
//	@Failure		401			{object}	error
//	@Failure		403			{object}	error
//	@Failure		404			{object}	error
//	@Failure		500			{object}	error
//	@Security		ApiKeyAuth
//	@Router			/listings/{listingID}/media [post]
func (app *application) uploadListingMediaHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if user.CompanyID == nil || (user.Role.Name != store.RoleAgency && user.Role.Name != store.RoleDeveloper) {
		app.forbiddenResponse(w, r)
		return
	}

	listingID, err := strconv.ParseInt(chi.URLParam(r, "listingID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	listing, err := app.store.Listings.GetByID(r.Context(), listingID)
	if err != nil {
		if err == store.ErrNotFound {
			app.notFoundResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}
	if listing.CompanyID != *user.CompanyID {
		app.forbiddenResponse(w, r)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxListingMediaBytes+maxMultipartOverhead)
	if err := r.ParseMultipartForm(maxListingMediaBytes + maxMultipartOverhead); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("failed to parse multipart form: %w", err))
		return
	}

	file, _, err := r.FormFile(listingMediaFieldName)
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("%s field is required", listingMediaFieldName))
		return
	}
	defer file.Close()

	blob, err := io.ReadAll(io.LimitReader(file, maxListingMediaBytes+1))
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if len(blob) == 0 {
		app.badRequestResponse(w, r, fmt.Errorf("file is empty"))
		return
	}
	if int64(len(blob)) > maxListingMediaBytes {
		app.badRequestResponse(w, r, fmt.Errorf("file exceeds 10MB"))
		return
	}

	contentType := http.DetectContentType(blob)
	ext, ok := listingMediaExtensions[contentType]
	if !ok {
		app.badRequestResponse(w, r, fmt.Errorf("unsupported file type: %s", contentType))
		return
	}

	key := fmt.Sprintf("listings/%d/%s%s", listingID, uuid.New().String(), ext)
	uploadedURL, err := app.uploader.Upload(r.Context(), key, bytes.NewReader(blob), contentType)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	media := &store.ListingMedia{ListingID: listingID, URL: uploadedURL}
	if err := app.store.Listings.CreateMedia(r.Context(), media); err != nil {
		_ = app.uploader.Delete(r.Context(), key)
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusCreated, media); err != nil {
		app.internalServerError(w, r, err)
	}
}

// deleteListingMediaHandler godoc
//
//	@Summary		Delete listing photo (agency/developer)
//	@Description	Deletes one image from a listing owned by the current company
//	@Tags			listings
//	@Produce		json
//	@Param			listingID	path	int	true	"Listing ID"
//	@Param			mediaID		path	int	true	"Media ID"
//	@Success		204			{string}	string	"Deleted"
//	@Failure		400			{object}	error
//	@Failure		401			{object}	error
//	@Failure		403			{object}	error
//	@Failure		404			{object}	error
//	@Failure		500			{object}	error
//	@Security		ApiKeyAuth
//	@Router			/listings/{listingID}/media/{mediaID} [delete]
func (app *application) deleteListingMediaHandler(w http.ResponseWriter, r *http.Request) {
	user := getUserFromContext(r)
	if user.CompanyID == nil || (user.Role.Name != store.RoleAgency && user.Role.Name != store.RoleDeveloper) {
		app.forbiddenResponse(w, r)
		return
	}

	listingID, err := strconv.ParseInt(chi.URLParam(r, "listingID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	mediaID, err := strconv.ParseInt(chi.URLParam(r, "mediaID"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	listing, err := app.store.Listings.GetByID(r.Context(), listingID)
	if err != nil {
		if err == store.ErrNotFound {
			app.notFoundResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}
	if listing.CompanyID != *user.CompanyID {
		app.forbiddenResponse(w, r)
		return
	}

	media, err := app.store.Listings.GetMediaByID(r.Context(), listingID, mediaID)
	if err != nil {
		if err == store.ErrNotFound {
			app.notFoundResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	key, err := listingMediaKeyFromURL(listingID, media.URL)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.uploader.Delete(r.Context(), key); err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.store.Listings.DeleteMedia(r.Context(), listingID, mediaID); err != nil {
		if err == store.ErrNotFound {
			app.notFoundResponse(w, r, err)
			return
		}
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusNoContent, ""); err != nil {
		app.internalServerError(w, r, err)
	}
}

func listingMediaKeyFromURL(listingID int64, mediaURL string) (string, error) {
	parsed, err := url.Parse(mediaURL)
	if err != nil {
		return "", err
	}

	name := path.Base(parsed.Path)
	if name == "" || name == "." || name == "/" {
		return "", fmt.Errorf("invalid media url")
	}

	return fmt.Sprintf("listings/%d/%s", listingID, name), nil
}
