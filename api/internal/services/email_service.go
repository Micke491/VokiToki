package services

import (
	"crypto/tls"
	"fmt"
	"log"
	"strconv"

	"chat-app/internal/config"
	"gopkg.in/gomail.v2"
)

func SendEmail(to, subject, body string) error {
	fromConfig := config.AppConfig.EmailFrom
	pass := config.AppConfig.SMTPPass
	user := config.AppConfig.SMTPUser
	host := config.AppConfig.SMTPHost
	portStr := config.AppConfig.SMTPPort

	port, err := strconv.Atoi(portStr)
	if err != nil {
		port = 587
	}

	m := gomail.NewMessage()
	m.SetHeader("From", fromConfig)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	d := gomail.NewDialer(host, port, user, pass)
	
	d.TLSConfig = &tls.Config{
		ServerName: host,
	}

	log.Printf("Attempting to send email to %s via %s:%d...", to, host, port)

	if err := d.DialAndSend(m); err != nil {
		log.Printf("ERROR sending email to %s: %v", to, err)
		return fmt.Errorf("failed to send email via gomail: %w", err)
	}

	log.Printf("SUCCESS: Email sent to %s", to)
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

func GenerateVerificationEmail(username, verifyURL string) string {
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
				<h2>Verify Your Email Address</h2>
				<p>Hi %s,</p>
				<p>Thank you for registering! Please click the button below to verify your email address and activate your account:</p>
				<a href="%s" class="button">Verify Email</a>
				<p>Or copy this link: %s</p>
			</div>
		</body>
		</html>
	`, username, verifyURL, verifyURL)
}