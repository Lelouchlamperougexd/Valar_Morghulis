package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/sikozonpc/social/internal/env"
	"github.com/sikozonpc/social/internal/mailer"
)

func main() {
	to := flag.String("to", "", "recipient email address")
	username := flag.String("username", "Test User", "recipient display username")
	activationURL := flag.String("activation-url", "http://localhost:5173/confirm/test-token", "activation URL to include in email")
	flag.Parse()

	if *to == "" {
		fmt.Fprintln(os.Stderr, "missing required --to")
		os.Exit(2)
	}

	cfg := mailer.SMTPConfig{
		Host:               env.GetString("SMTP_HOST", ""),
		Port:               env.GetInt("SMTP_PORT", 587),
		Username:           env.GetString("SMTP_USERNAME", ""),
		Password:           env.GetString("SMTP_PASSWORD", ""),
		FromEmail:          env.GetString("FROM_EMAIL", ""),
		UseTLS:             env.GetBool("SMTP_TLS", false),
		InsecureSkipVerify: env.GetBool("SMTP_INSECURE_SKIP_VERIFY", false),
	}

	client, err := mailer.NewSMTPClient(cfg)
	if err != nil {
		fmt.Fprintln(os.Stderr, "SMTP config error:", err)
		os.Exit(1)
	}

	vars := struct {
		Username      string
		ActivationURL string
	}{
		Username:      *username,
		ActivationURL: *activationURL,
	}

	status, err := client.Send(mailer.UserWelcomeTemplate, *username, *to, vars, true)
	if err != nil {
		fmt.Fprintln(os.Stderr, "send failed:", err)
		os.Exit(1)
	}

	fmt.Println("sent OK, status:", status)
}
