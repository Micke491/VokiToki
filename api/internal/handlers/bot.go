package handlers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"chat-app/internal/config"
	"chat-app/internal/db"
	"chat-app/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)


const (
	geminiModel = "gemini-3.5-flash"
	maxUserMessageRunes = 8000
	maxTitleRunes = 60
	geminiRequestTimeout = 60 * time.Second

	maxGeminiRetries = 3
	retryBaseDelay = 500 * time.Millisecond
	retryMaxDelay = 4 * time.Second
)

var geminiHTTPClient = &http.Client{
	Timeout: geminiRequestTimeout,
}

func isRetryableStatus(code int) bool {
	return code == http.StatusServiceUnavailable || // 503
		code == http.StatusTooManyRequests || // 429
		code == http.StatusInternalServerError || // 500
		code == http.StatusBadGateway || // 502
		code == http.StatusGatewayTimeout // 504
}

func callGeminiWithRetry(ctx context.Context, apiURL string, reqBodyBytes []byte, apiKey string) (*http.Response, error) {
	var lastErr error

	for attempt := 0; attempt <= maxGeminiRetries; attempt++ {
		if attempt > 0 {
			delay := backoffDelay(attempt)
			log.Printf("SendBotMessage: retrying Gemini call (attempt %d/%d) after %v", attempt, maxGeminiRetries, delay)
			select {
			case <-time.After(delay):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		httpReq, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewReader(reqBodyBytes))
		if err != nil {
			return nil, fmt.Errorf("failed to build request: %w", err)
		}
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("x-goog-api-key", apiKey)

		resp, err := geminiHTTPClient.Do(httpReq)
		if err != nil {
			lastErr = err
			log.Printf("SendBotMessage: Gemini request failed (attempt %d/%d): %v", attempt+1, maxGeminiRetries+1, err)
			continue
		}

		if resp.StatusCode == http.StatusOK || !isRetryableStatus(resp.StatusCode) {
			return resp, nil
		}

		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		log.Printf("SendBotMessage: Gemini returned retryable status %d (attempt %d/%d): %s",
			resp.StatusCode, attempt+1, maxGeminiRetries+1, string(respBody))
		lastErr = fmt.Errorf("gemini returned status %d", resp.StatusCode)
	}

	return nil, lastErr
}

func backoffDelay(attempt int) time.Duration {
	delay := retryBaseDelay * time.Duration(1<<uint(attempt-1))
	if delay > retryMaxDelay {
		delay = retryMaxDelay
	}
	jitter := time.Duration(rand.Int63n(int64(delay) / 2))
	return delay/2 + jitter
}

func GetBotChats(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.M{"updatedAt": -1})
	cursor, err := db.BotChatCollection.Find(ctx, bson.M{"userId": authUser.ID}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bot chats"})
		return
	}
	defer cursor.Close(ctx)

	var chats []models.BotChat
	if err = cursor.All(ctx, &chats); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode bot chats"})
		return
	}

	if chats == nil {
		chats = []models.BotChat{}
	}

	c.JSON(http.StatusOK, chats)
}

func GetBotChat(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	chatIDStr := c.Param("id")

	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID format"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var chat models.BotChat
	err = db.BotChatCollection.FindOne(ctx, bson.M{"_id": chatID, "userId": authUser.ID}).Decode(&chat)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chat"})
		return
	}

	c.JSON(http.StatusOK, chat)
}

func CreateBotChat(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	var body struct {
		Title string `json:"title"`
	}
	c.ShouldBindJSON(&body)

	title := sanitizeTitle(body.Title)
	if title == "" {
		title = "New AI Chat"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	newChat := models.BotChat{
		ID:        bson.NewObjectID(),
		UserID:    authUser.ID,
		Title:     title,
		Messages:  []models.BotMessage{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err := db.BotChatCollection.InsertOne(ctx, newChat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chat"})
		return
	}

	c.JSON(http.StatusCreated, newChat)
}

func DeleteBotChat(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	chatIDStr := c.Param("id")

	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID format"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := db.BotChatCollection.DeleteOne(ctx, bson.M{"_id": chatID, "userId": authUser.ID})
	if err != nil || result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found or failed to delete"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

type GeminiPart struct {
	Text string `json:"text"`
}
type GeminiContent struct {
	Role  string       `json:"role"`
	Parts []GeminiPart `json:"parts"`
}
type GeminiSysInst struct {
	Parts []GeminiPart `json:"parts"`
}
type GeminiRequest struct {
	SystemInstruction *GeminiSysInst  `json:"system_instruction,omitempty"`
	Contents          []GeminiContent `json:"contents"`
}

func getSystemInstruction(persona string) string {
	base := ""
	switch persona {
	case "sarcastic":
		base = "You are a highly sarcastic, witty, and humorous AI. Keep answers concise, funny, and playfully mocking but ultimately helpful."
	case "coding":
		base = "You are an expert software engineer. Provide clear, concise code examples, explain technical concepts professionally, and prioritize best practices."
	case "coach":
		base = "You are a motivational professional coach. Be extremely encouraging, structured, goal-oriented, and uplifting."
	default:
		base = "You are a helpful, friendly, and concise AI assistant. Format your answers clearly."
	}

	appContext := fmt.Sprintf(
		" You are seamlessly integrated into VokiToki, a modern real-time chat application. You are powered by the Google %s model.",
		geminiModel,
	)
	return base + appContext
}

func sanitizeTitle(s string) string {
	s = strings.TrimSpace(s)
	if utf8.RuneCountInString(s) <= maxTitleRunes {
		return s
	}
	runes := []rune(s)
	return strings.TrimSpace(string(runes[:maxTitleRunes])) + "…"
}

func SendBotMessage(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	chatIDStr := c.Param("id")

	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID format"})
		return
	}

	var body struct {
		Text string `json:"text" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message text is required"})
		return
	}

	userInput := strings.TrimSpace(body.Text)
	if userInput == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message text is required"})
		return
	}
	if utf8.RuneCountInString(userInput) > maxUserMessageRunes {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Message is too long (max %d characters)", maxUserMessageRunes),
		})
		return
	}

	apiKey := config.AppConfig.GeminiAPIKey
	if apiKey == "" {
		log.Println("SendBotMessage: GEMINI_API_KEY is not configured")
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service is not configured on the server."})
		return
	}

	reqCtx := c.Request.Context()

	var chat models.BotChat
	err = db.BotChatCollection.FindOne(reqCtx, bson.M{"_id": chatID, "userId": authUser.ID}).Decode(&chat)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chat"})
		return
	}

	isFirstMessage := len(chat.Messages) == 0

	userMsg := models.BotMessage{
		ID:        bson.NewObjectID(),
		Role:      "user",
		Text:      userInput,
		CreatedAt: time.Now(),
	}

	geminiReq := GeminiRequest{
		SystemInstruction: &GeminiSysInst{
			Parts: []GeminiPart{{Text: getSystemInstruction(authUser.BotPersona)}},
		},
		Contents: make([]GeminiContent, 0, len(chat.Messages)+1),
	}

	for _, m := range chat.Messages {
		role := m.Role
		if role == "bot" {
			role = "model"
		}
		geminiReq.Contents = append(geminiReq.Contents, GeminiContent{
			Role:  role,
			Parts: []GeminiPart{{Text: m.Text}},
		})
	}
	geminiReq.Contents = append(geminiReq.Contents, GeminiContent{
		Role:  "user",
		Parts: []GeminiPart{{Text: userInput}},
	})

	reqBytes, err := json.Marshal(geminiReq)
	if err != nil {
		log.Printf("SendBotMessage: failed to marshal gemini request: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to build AI request"})
		return
	}

	apiURL := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?alt=sse",
		geminiModel,
	)

	resp, err := callGeminiWithRetry(reqCtx, apiURL, reqBytes, apiKey)
	if err != nil {
		log.Printf("SendBotMessage: Gemini call failed after retries: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "The AI provider is temporarily unavailable. Please try again in a moment."})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("SendBotMessage: Gemini returned non-retryable %d: %s", resp.StatusCode, string(respBody))
		c.JSON(http.StatusBadGateway, gin.H{"error": "The AI provider returned an error. Please try again."})
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")
	c.Writer.Header().Set("X-Accel-Buffering", "no") 

	initData, _ := json.Marshal(map[string]interface{}{
		"type":        "init",
		"userMessage": userMsg,
	})
	fmt.Fprintf(c.Writer, "data: %s\n\n", initData)
	c.Writer.Flush()

	reader := bufio.NewReader(resp.Body)
	var fullBotText strings.Builder

	for {
		if reqCtx.Err() != nil {
			break
		}

		line, err := reader.ReadBytes('\n')
		if err != nil {
			break
		}

		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}

		if !bytes.HasPrefix(line, []byte("data: ")) {
			continue
		}
		dataStr := bytes.TrimPrefix(line, []byte("data: "))

		if string(dataStr) == "[DONE]" {
			continue
		}

		var chunk struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}

		if err := json.Unmarshal(dataStr, &chunk); err != nil {
			log.Printf("SendBotMessage: skipping unparsable SSE chunk: %v", err)
			continue
		}
		if len(chunk.Candidates) == 0 || len(chunk.Candidates[0].Content.Parts) == 0 {
			continue
		}

		textPiece := chunk.Candidates[0].Content.Parts[0].Text
		fullBotText.WriteString(textPiece)

		chunkData, _ := json.Marshal(map[string]string{
			"type": "chunk",
			"text": textPiece,
		})
		fmt.Fprintf(c.Writer, "data: %s\n\n", chunkData)
		c.Writer.Flush()
	}

	botText := fullBotText.String()
	botMsg := models.BotMessage{
		ID:        bson.NewObjectID(),
		Role:      "model",
		Text:      botText,
		CreatedAt: time.Now(),
	}

	dbCtx, dbCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer dbCancel()

	newMessages := []models.BotMessage{userMsg}
	if botText != "" {
		newMessages = append(newMessages, botMsg)
	}

	_, pushErr := db.BotChatCollection.UpdateOne(dbCtx,
		bson.M{"_id": chatID},
		bson.M{
			"$set":  bson.M{"updatedAt": time.Now()},
			"$push": bson.M{"messages": bson.M{"$each": newMessages}},
		},
	)
	if pushErr != nil {
		log.Printf("SendBotMessage: failed to persist messages for chat %s: %v", chatID.Hex(), pushErr)

	}

	finalTitle := chat.Title
	if isFirstMessage {
		finalTitle = sanitizeTitle(userInput)
		if finalTitle == "" {
			finalTitle = "New AI Chat"
		}

		_, titleErr := db.BotChatCollection.UpdateOne(dbCtx,
			bson.M{"_id": chatID, "title": chat.Title},
			bson.M{"$set": bson.M{"title": finalTitle}},
		)
		if titleErr != nil {
			log.Printf("SendBotMessage: failed to set title for chat %s: %v", chatID.Hex(), titleErr)
		}
	}

	if reqCtx.Err() == nil {
		finalData, _ := json.Marshal(map[string]interface{}{
			"type":       "done",
			"botMessage": botMsg,
			"chatTitle":  finalTitle,
			"model":      geminiModel,
		})
		fmt.Fprintf(c.Writer, "data: %s\n\n", finalData)
		c.Writer.Flush()
	}
}