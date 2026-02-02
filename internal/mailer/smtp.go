package mailer

import (
	"bytes"
	"crypto/tls"
	"errors"
	"text/template"

	gomail "gopkg.in/mail.v2"
)

type SMTPConfig struct {
	Host               string
	Port               int
	Username           string
	Password           string
	FromEmail          string
	UseTLS             bool
	InsecureSkipVerify bool
}

type smtpClient struct {
	host               string
	port               int
	username           string
	password           string
	fromEmail          string
	useTLS             bool
	insecureSkipVerify bool
}

func NewSMTPClient(cfg SMTPConfig) (smtpClient, error) {
	if cfg.Host == "" {
		return smtpClient{}, errors.New("SMTP host is required")
	}
	if cfg.Port <= 0 {
		return smtpClient{}, errors.New("SMTP port is required")
	}
	if cfg.Username == "" {
		return smtpClient{}, errors.New("SMTP username is required")
	}
	if cfg.Password == "" {
		return smtpClient{}, errors.New("SMTP password is required")
	}
	if cfg.FromEmail == "" {
		return smtpClient{}, errors.New("FROM_EMAIL is required")
	}

	return smtpClient{
		host:               cfg.Host,
		port:               cfg.Port,
		username:           cfg.Username,
		password:           cfg.Password,
		fromEmail:          cfg.FromEmail,
		useTLS:             cfg.UseTLS,
		insecureSkipVerify: cfg.InsecureSkipVerify,
	}, nil
}

func (m smtpClient) Send(templateFile, username, email string, data any, isSandbox bool) (int, error) {
	// Template parsing and building
	tmpl, err := template.ParseFS(FS, "templates/"+templateFile)
	if err != nil {
		return -1, err
	}

	subject := new(bytes.Buffer)
	err = tmpl.ExecuteTemplate(subject, "subject", data)
	if err != nil {
		return -1, err
	}

	body := new(bytes.Buffer)
	err = tmpl.ExecuteTemplate(body, "body", data)
	if err != nil {
		return -1, err
	}

	message := gomail.NewMessage()
	message.SetAddressHeader("From", m.fromEmail, FromName)
	message.SetHeader("To", email)
	message.SetHeader("Subject", subject.String())
	message.AddAlternative("text/html", body.String())

	dialer := gomail.NewDialer(m.host, m.port, m.username, m.password)
	dialer.SSL = m.useTLS || m.port == 465
	dialer.TLSConfig = &tls.Config{
		ServerName:         m.host,
		InsecureSkipVerify: m.insecureSkipVerify,
	}

	if err := dialer.DialAndSend(message); err != nil {
		return -1, err
	}

	return 200, nil
}
