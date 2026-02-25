package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"io"
	"strings"
)

const encryptedPrefix = "enc:"

var ErrInvalidKey = errors.New("invalid encryption key")

type Service struct {
	aead cipher.AEAD
}

func NewServiceFromBase64Key(key string) (*Service, error) {
	raw, err := base64.StdEncoding.DecodeString(key)
	if err != nil {
		return nil, ErrInvalidKey
	}
	if len(raw) != 32 {
		return nil, ErrInvalidKey
	}

	block, err := aes.NewCipher(raw)
	if err != nil {
		return nil, err
	}

	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	return &Service{aead: aead}, nil
}

func (s *Service) EncryptString(value string) (string, error) {
	if s == nil || s.aead == nil {
		return "", ErrInvalidKey
	}
	if value == "" {
		return "", nil
	}

	nonce := make([]byte, s.aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := s.aead.Seal(nil, nonce, []byte(value), nil)
	payload := append(nonce, ciphertext...)
	return encryptedPrefix + base64.StdEncoding.EncodeToString(payload), nil
}

func (s *Service) DecryptString(value string) (string, error) {
	if value == "" {
		return "", nil
	}
	if !strings.HasPrefix(value, encryptedPrefix) {
		return value, nil
	}
	if s == nil || s.aead == nil {
		return "", ErrInvalidKey
	}

	payload, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(value, encryptedPrefix))
	if err != nil {
		return "", err
	}

	nonceSize := s.aead.NonceSize()
	if len(payload) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := payload[:nonceSize], payload[nonceSize:]
	plaintext, err := s.aead.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func HashEmail(email string) string {
	normalized := strings.TrimSpace(strings.ToLower(email))
	hash := sha256.Sum256([]byte(normalized))
	return hex.EncodeToString(hash[:])
}
