package services

import (
	"fmt"
	"net/mail"
	"net/smtp"
	"chat-app/internal/config"
)

func SendEmail(to, subject, body string) error {
	fromConfig := config.AppConfig.EmailFrom
	pass := config.AppConfig.SMTPPass
	user := config.AppConfig.SMTPUser
	host := config.AppConfig.SMTPHost
	port := config.AppConfig.SMTPPort

	fromAddr, err := mail.ParseAddress(fromConfig)
	var from string
	if err == nil {
		from = fromAddr.Address
	} else {
		from = fromConfig 
	}

	msg := fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"MIME-version: 1.0;\r\n"+
		"Content-Type: text/html; charset=\"UTF-8\";\r\n"+
		"\r\n"+
		"%s\r\n", from, to, subject, body)

	auth := smtp.PlainAuth("", user, pass, host)
	addr := fmt.Sprintf("%s:%s", host, port)

	err = smtp.SendMail(addr, auth, from, []string{to}, []byte(msg))
	if err != nil {
		return err
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
