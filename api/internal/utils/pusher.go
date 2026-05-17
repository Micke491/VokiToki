package utils

import (
	"bytes"
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"chat-app/internal/config"
)

func TriggerPusher(channel, event string, data interface{}) {
	go func() {
		cfg := config.AppConfig
		if cfg.PusherAppID == "" || cfg.PusherKey == "" || cfg.PusherSecret == "" {
			return
		}

		payload, err := json.Marshal(map[string]interface{}{
			"name":     event,
			"channel":  channel,
			"data":     mustMarshalString(data),
		})
		if err != nil {
			log.Printf("TriggerPusher marshal error: %v", err)
			return
		}

		bodyMD5 := md5Hex(payload)
		timestamp := strconv.FormatInt(time.Now().Unix(), 10)
		path := fmt.Sprintf("/apps/%s/events", cfg.PusherAppID)

		params := map[string]string{
			"auth_key":       cfg.PusherKey,
			"auth_timestamp": timestamp,
			"auth_version":   "1.0",
			"body_md5":       bodyMD5,
		}

		keys := make([]string, 0, len(params))
		for k := range params {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		parts := make([]string, 0, len(keys))
		for _, k := range keys {
			parts = append(parts, k+"="+params[k])
		}
		queryString := strings.Join(parts, "&")

		stringToSign := "POST\n" + path + "\n" + queryString
		mac := hmac.New(sha256.New, []byte(cfg.PusherSecret))
		mac.Write([]byte(stringToSign))
		authSignature := hex.EncodeToString(mac.Sum(nil))

		cluster := cfg.PusherCluster
		if cluster == "" {
			cluster = "mt1"
		}
		host := fmt.Sprintf("https://api-%s.pusher.com", cluster)
		url := fmt.Sprintf("%s%s?%s&auth_signature=%s", host, path, queryString, authSignature)

		resp, err := http.Post(url, "application/json", bytes.NewReader(payload))
		if err != nil {
			log.Printf("TriggerPusher request error: %v", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 300 {
			log.Printf("TriggerPusher non-2xx status: %d", resp.StatusCode)
		}
	}()
}

func md5Hex(data []byte) string {
	h := md5.Sum(data)
	return hex.EncodeToString(h[:])
}

func mustMarshalString(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}
