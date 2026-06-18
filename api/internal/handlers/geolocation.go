package handlers

import (
	"chat-app/internal/cache"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func SearchLocation(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	cacheKey := "geo_search:" + url.QueryEscape(strings.ToLower(q))
	if cached, err := cache.Get(c.Request.Context(), cacheKey); err == nil && cached != "" {
		var result interface{}
		json.Unmarshal([]byte(cached), &result)
		c.JSON(http.StatusOK, result)
		return
	}

	reqUrl := fmt.Sprintf("https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=%s&limit=5", url.QueryEscape(q))
	req, err := http.NewRequest("GET", reqUrl, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	req.Header.Set("User-Agent", "Vokitoki/1.0 (vokitoki-development-agent)")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to query geocoding service"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(resp.StatusCode, gin.H{"error": "Geocoding service returned error status"})
		return
	}

	var result interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode response"})
		return
	}

	if data, err := json.Marshal(result); err == nil {
		cache.Set(c.Request.Context(), cacheKey, string(data), 24*time.Hour)
	}

	c.JSON(http.StatusOK, result)
}

func ReverseGeocode(c *gin.Context) {
	lat := c.Query("lat")
	lon := c.Query("lon")
	if lat == "" || lon == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Latitude and longitude parameters are required"})
		return
	}

	cacheKey := "geo_rev:" + lat + "," + lon
	if cached, err := cache.Get(c.Request.Context(), cacheKey); err == nil && cached != "" {
		var result interface{}
		json.Unmarshal([]byte(cached), &result)
		c.JSON(http.StatusOK, result)
		return
	}

	reqUrl := fmt.Sprintf("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=%s&lon=%s", url.QueryEscape(lat), url.QueryEscape(lon))
	req, err := http.NewRequest("GET", reqUrl, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	req.Header.Set("User-Agent", "ChatApp/1.0 (chatapp-development-agent)")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to query geocoding service"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(resp.StatusCode, gin.H{"error": "Geocoding service returned error status"})
		return
	}

	var result interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode response"})
		return
	}

	if data, err := json.Marshal(result); err == nil {
		cache.Set(c.Request.Context(), cacheKey, string(data), 24*time.Hour)
	}

	c.JSON(http.StatusOK, result)
}