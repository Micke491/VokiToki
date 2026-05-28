package services

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/mail"
	"net/smtp"
	"time"

	"chat-app/internal/config"
)

type BrevoSender struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email"`
}

type BrevoRecipient struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email"`
}

type BrevoEmailPayload struct {
	Sender      BrevoSender      `json:"sender"`
	To          []BrevoRecipient `json:"to"`
	Subject     string           `json:"subject"`
	HTMLContent string           `json:"htmlContent"`
}

var brevoURL = "https://api.brevo.com/v3/smtp/email"

func sendBrevoHTTP(apiKey, fromName, fromEmail, toEmail, subject, htmlContent string) error {
	payload := BrevoEmailPayload{
		Sender: BrevoSender{
			Name:  fromName,
			Email: fromEmail,
		},
		To: []BrevoRecipient{
			{
				Email: toEmail,
			},
		},
		Subject:     subject,
		HTMLContent: htmlContent,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal Brevo payload: %w", err)
	}

	req, err := http.NewRequest("POST", brevoURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to create Brevo HTTP request: %w", err)
	}

	req.Header.Set("accept", "application/json")
	req.Header.Set("api-key", apiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute Brevo HTTP request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var errResp map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		return fmt.Errorf("Brevo API returned status code %d: %v", resp.StatusCode, errResp)
	}

	return nil
}

func SendEmail(to, subject, body string) error {
	fromConfig := config.AppConfig.EmailFrom
	apiKey := config.AppConfig.BrevoAPIKey

	fromAddr, err := mail.ParseAddress(fromConfig)
	var fromEmail string
	var fromName string
	if err == nil {
		fromEmail = fromAddr.Address
		fromName = fromAddr.Name
	} else {
		fromEmail = fromConfig
		fromName = "Chat App"
	}

	if apiKey != "" {
		return sendBrevoHTTP(apiKey, fromName, fromEmail, to, subject, body)
	}

	pass := config.AppConfig.SMTPPass
	user := config.AppConfig.SMTPUser
	host := config.AppConfig.SMTPHost
	port := config.AppConfig.SMTPPort
	from := fromEmail

	msg := fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"MIME-version: 1.0;\r\n"+
		"Content-Type: text/html; charset=\"UTF-8\";\r\n"+
		"\r\n"+
		"%s\r\n", from, to, subject, body)

	addr := fmt.Sprintf("%s:%s", host, port)

	if port == "465" {
		tlsConfig := &tls.Config{
			InsecureSkipVerify: false,
			ServerName:         host,
		}

		conn, err := tls.Dial("tcp", addr, tlsConfig)
		if err != nil {
			return fmt.Errorf("failed to connect via TLS: %w", err)
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, host)
		if err != nil {
			return fmt.Errorf("failed to create SMTP client: %w", err)
		}
		defer client.Close()

		auth := smtp.PlainAuth("", user, pass, host)
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP authentication failed: %w", err)
		}

		if err = client.Mail(from); err != nil {
			return err
		}
		if err = client.Rcpt(to); err != nil {
			return err
		}

		w, err := client.Data()
		if err != nil {
			return err
		}

		_, err = w.Write([]byte(msg))
		if err != nil {
			return err
		}

		err = w.Close()
		if err != nil {
			return err
		}

		return client.Quit()
	}

	auth := smtp.PlainAuth("", user, pass, host)
	err = smtp.SendMail(addr, auth, from, []string{to}, []byte(msg))
	if err != nil {
		return fmt.Errorf("failed to send standard email: %w", err)
	}

	return nil
}

func GeneratePasswordResetEmail(username, resetURL string) string {
	return fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: sans-serif; background-color: #f4f4f4; padding: 20px; }
				.container { background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: auto; }
				.button { background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
			</style>
		</head>
		<body>
			<div class="container">
				<h2>Password Reset Request</h2>
				<p>Hi %s,</p>
				<p>Click below to reset your password:</p>
				<a href="%s" class="button">Reset Password</a>
				<p>Or copy this link: %s</p>
			</div>
		</body>
		</html>
	`, username, resetURL, resetURL)
}
