package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// Uploader defines storage operations for listing media.
type Uploader interface {
	Upload(ctx context.Context, key string, r io.Reader, contentType string) (string, error)
	Delete(ctx context.Context, key string) error
}

type S3Config struct {
	Bucket    string
	Region    string
	Endpoint  string
	KeyID     string
	SecretKey string
}

type S3Uploader struct {
	bucket   string
	region   string
	endpoint string
	uploader *manager.Uploader
	client   *s3.Client
}

func NewS3Uploader(ctx context.Context, cfg S3Config) (*S3Uploader, error) {
	if cfg.Bucket == "" {
		return nil, errors.New("storage bucket is required")
	}
	if cfg.Region == "" {
		return nil, errors.New("storage region is required")
	}

	loadOpts := []func(*config.LoadOptions) error{config.WithRegion(cfg.Region)}
	if cfg.KeyID != "" || cfg.SecretKey != "" {
		loadOpts = append(loadOpts, config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.KeyID, cfg.SecretKey, "")))
	}

	awsCfg, err := config.LoadDefaultConfig(ctx, loadOpts...)
	if err != nil {
		return nil, err
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if cfg.Endpoint != "" {
			o.UsePathStyle = true
			o.BaseEndpoint = aws.String(cfg.Endpoint)
		}
	})

	return &S3Uploader{
		bucket:   cfg.Bucket,
		region:   cfg.Region,
		endpoint: strings.TrimSuffix(cfg.Endpoint, "/"),
		uploader: manager.NewUploader(client),
		client:   client,
	}, nil
}

func (u *S3Uploader) Upload(ctx context.Context, key string, r io.Reader, contentType string) (string, error) {
	input := &s3.PutObjectInput{
		Bucket:      aws.String(u.bucket),
		Key:         aws.String(key),
		Body:        r,
		ContentType: aws.String(contentType),
	}

	if _, err := u.uploader.Upload(ctx, input); err != nil {
		return "", err
	}

	return u.objectURL(key), nil
}

func (u *S3Uploader) Delete(ctx context.Context, key string) error {
	_, err := u.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(u.bucket),
		Key:    aws.String(key),
	})
	return err
}

func (u *S3Uploader) objectURL(key string) string {
	escapedKey := strings.ReplaceAll(url.PathEscape(key), "%2F", "/")
	if u.endpoint != "" {
		return fmt.Sprintf("%s/%s/%s", u.endpoint, u.bucket, escapedKey)
	}

	if u.region == "us-east-1" {
		return fmt.Sprintf("https://%s.s3.amazonaws.com/%s", u.bucket, escapedKey)
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", u.bucket, u.region, escapedKey)
}

type LocalUploader struct {
	rootDir string
	baseURL string
}

func NewLocalUploader(rootDir string) (*LocalUploader, error) {
	if rootDir == "" {
		rootDir = "./uploads"
	}
	if err := os.MkdirAll(rootDir, 0o755); err != nil {
		return nil, err
	}

	return &LocalUploader{rootDir: rootDir, baseURL: "/uploads"}, nil
}

func (u *LocalUploader) Upload(ctx context.Context, key string, r io.Reader, contentType string) (string, error) {
	_ = ctx
	_ = contentType

	rel, err := sanitizeLocalKey(key)
	if err != nil {
		return "", err
	}

	fullPath := filepath.Join(u.rootDir, rel)
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		return "", err
	}

	f, err := os.Create(fullPath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	if _, err := io.Copy(f, r); err != nil {
		return "", err
	}

	return fmt.Sprintf("%s/%s", strings.TrimSuffix(u.baseURL, "/"), strings.TrimLeft(filepath.ToSlash(rel), "/")), nil
}

func (u *LocalUploader) Delete(ctx context.Context, key string) error {
	_ = ctx

	rel, err := sanitizeLocalKey(key)
	if err != nil {
		return err
	}

	err = os.Remove(filepath.Join(u.rootDir, rel))
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}

	return nil
}

func sanitizeLocalKey(key string) (string, error) {
	clean := filepath.Clean(filepath.FromSlash(strings.TrimSpace(key)))
	if clean == "." || strings.HasPrefix(clean, "..") || path.IsAbs(strings.ReplaceAll(clean, "\\", "/")) {
		return "", fmt.Errorf("invalid object key")
	}
	return clean, nil
}
