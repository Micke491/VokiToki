package services

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSendBrevoHTTP_Success(t *testing.T) {
	originalURL := brevoURL
	defer func() { brevoURL = originalURL }()

	var receivedPayload BrevoEmailPayload
	var receivedAPIKey string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAPIKey = r.Header.Get("api-key")
		
		if r.Header.Get("content-type") != "application/json" {
			t.Errorf("expected content-type to be application/json, got %s", r.Header.Get("content-type"))
		}
		if r.Header.Get("accept") != "application/json" {
			t.Errorf("expected accept to be application/json, got %s", r.Header.Get("accept"))
		}

		err := json.NewDecoder(r.Body).Decode(&receivedPayload)
		if err != nil {
			t.Errorf("failed to decode request body: %v", err)
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"messageId": "msg-12345"}`))
	}))
	defer server.Close()

	brevoURL = server.URL

	err := sendBrevoHTTP("test-key-999", "Test App", "sender@test.com", "recipient@test.com", "Subject Lines", "<h1>Hello</h1>")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if receivedAPIKey != "test-key-999" {
		t.Errorf("expected API Key to be 'test-key-999', got %s", receivedAPIKey)
	}
	if receivedPayload.Sender.Name != "Test App" || receivedPayload.Sender.Email != "sender@test.com" {
		t.Errorf("sender payload mismatch: %+v", receivedPayload.Sender)
	}
	if len(receivedPayload.To) != 1 || receivedPayload.To[0].Email != "recipient@test.com" {
		t.Errorf("recipient payload mismatch: %+v", receivedPayload.To)
	}
	if receivedPayload.Subject != "Subject Lines" {
		t.Errorf("subject payload mismatch: %s", receivedPayload.Subject)
	}
	if receivedPayload.HTMLContent != "<h1>Hello</h1>" {
		t.Errorf("htmlContent payload mismatch: %s", receivedPayload.HTMLContent)
	}
}

func TestSendBrevoHTTP_Failure(t *testing.T) {
	originalURL := brevoURL
	defer func() { brevoURL = originalURL }()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"code": "invalid_parameter", "message": "Email is invalid"}`))
	}))
	defer server.Close()

	brevoURL = server.URL

	err := sendBrevoHTTP("bad-key", "Test", "sender@test.com", "recipient@test.com", "Subj", "Body")
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	if !strings.Contains(err.Error(), "status code 400") {
		t.Errorf("expected error to mention status code 400, got: %s", err.Error())
	}
}
