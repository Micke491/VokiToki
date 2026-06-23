package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"chat-app/internal/config"
	"chat-app/internal/db"
	"chat-app/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

const maxAvatarSize = 10 * 1024 * 1024 

func UploadProfilePicture(c *gin.Context) {
    authUser := c.MustGet("user").(models.User)

    file, header, err := c.Request.FormFile("file")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
        return
    }
    defer file.Close()

    if header.Size > maxAvatarSize {
        c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 10MB limit"})
        return
    }

    contentType := header.Header.Get("Content-Type")
    if !strings.HasPrefix(contentType, "image/") {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Only images are allowed"})
		return
    }

    fileBytes, err := io.ReadAll(file)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
        return
    }

    uploadResult, err := uploadToCloudinary(fileBytes, config.AppConfig.CloudinaryURL)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload failed"})
        return
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    _, err = db.UserCollection.UpdateOne(ctx,
        bson.M{"_id": authUser.ID},
        bson.M{"$set": bson.M{
            "avatar":    uploadResult.SecureURL, 
            "updatedAt": time.Now(),
        }},
    )

    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update database"})
        return
    }

    if db.RedisClient != nil {
        db.RedisClient.Del(ctx, "user_auth:"+authUser.ID.Hex())
    }

    c.JSON(http.StatusOK, gin.H{
        "url":     uploadResult.SecureURL,
        "message": "Profile picture updated successfully",
    })
}

type cloudinaryUploadResult struct {
	SecureURL string `json:"secure_url"`
	PublicID  string `json:"public_id"`
}

func uploadToCloudinary(data []byte, cloudinaryURL string) (*cloudinaryUploadResult, error) {
	trimmed := strings.TrimPrefix(cloudinaryURL, "cloudinary://")
	atIdx := strings.LastIndex(trimmed, "@")
	if atIdx == -1 {
		return nil, fmt.Errorf("invalid CLOUDINARY_URL format")
	}
	cloudName := trimmed[atIdx+1:]
	credentials := trimmed[:atIdx]
	colonIdx := strings.Index(credentials, ":")
	if colonIdx == -1 {
		return nil, fmt.Errorf("invalid CLOUDINARY_URL credentials")
	}
	apiKey := credentials[:colonIdx]
	apiSecret := credentials[colonIdx+1:]

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)

	fw, err := mw.CreateFormFile("file", "avatar")
	if err != nil {
		return nil, err
	}
	if _, err = fw.Write(data); err != nil {
		return nil, err
	}
	_ = mw.WriteField("folder", "profile_avatars")
	_ = mw.WriteField("transformation", "w_400,h_400,c_fill,g_face")
	mw.Close()

	uploadURL := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/upload", cloudName)
	req, err := http.NewRequest(http.MethodPost, uploadURL, &body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.SetBasicAuth(apiKey, apiSecret)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("cloudinary error %d: %s", resp.StatusCode, string(respBody))
	}

	var uploadRes cloudinaryUploadResult
	if err := json.NewDecoder(resp.Body).Decode(&uploadRes); err != nil {
		return nil, err
	}

	return &uploadRes, nil
}
