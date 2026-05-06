package handlers

import (
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func GetURLMetadata(c *gin.Context) {
	rawURL := c.Query("url")
	if rawURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL is required"})
		return
	}

	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL"})
		return
	}

	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only HTTP/HTTPS URLs are allowed"})
		return
	}

	hostname := strings.ToLower(parsedURL.Hostname())
	blockedHosts := []string{"localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254"}
	for _, h := range blockedHosts {
		if hostname == h {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Private/internal URLs are not allowed"})
			return
		}
	}
	if strings.HasPrefix(hostname, "10.") || strings.HasPrefix(hostname, "192.168.") || strings.HasPrefix(hostname, "172.") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Private/internal URLs are not allowed"})
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch URL"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		c.JSON(resp.StatusCode, gin.H{"error": "Failed to fetch URL"})
		return
	}

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20)) 
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	html := string(bodyBytes)

	getMetaTag := func(property string) *string {
		patterns := []string{
			`(?i)<meta[^>]+(?:property|name)=["'](?:og:)?` + property + `["'][^>]+content=["']([^"']+)["']`,
			`(?i)<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:)?` + property + `["']`,
			`(?i)<meta[^>]+(?:property|name)=["'](?:twitter:)?` + property + `["'][^>]+content=["']([^"']+)["']`,
			`(?i)<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:twitter:)?` + property + `["']`,
		}
		for _, p := range patterns {
			re := regexp.MustCompile(p)
			if m := re.FindStringSubmatch(html); len(m) > 1 {
				val := strings.TrimSpace(m[1])
				if val != "" {
					return &val
				}
			}
		}
		return nil
	}

	getImage := func() *string {
		if img := getMetaTag("image"); img != nil {
			return img
		}
		if img := getMetaTag("image:src"); img != nil {
			return img
		}
		if img := getMetaTag("thumbnail"); img != nil {
			return img
		}
		// Try to find first image if none of the above work? (Optional, might be noisy)
		return nil
	}

	getTitle := func() *string {
		if t := getMetaTag("title"); t != nil {
			return t
		}
		re := regexp.MustCompile(`(?i)<title[^>]*>([^<]+)</title>`)
		if m := re.FindStringSubmatch(html); len(m) > 1 {
			val := strings.TrimSpace(m[1])
			return &val
		}
		return nil
	}

	c.JSON(http.StatusOK, gin.H{
		"title":       getTitle(),
		"description": getMetaTag("description"),
		"image":       getImage(),
		"url":         rawURL,
	})
}
