package handlers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"chat-app/internal/config"
	"chat-app/internal/db"
	"chat-app/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

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

	title := body.Title
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
	
	appContext := " You are seamlessly integrated into VokiToki, a modern real-time chat application. You are powered by the Google Gemini 3.5 Flash model."
	return base + appContext
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

	apiKey := config.AppConfig.GeminiAPIKey
	if apiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI API Key is not configured on the server."})
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

	userInput := body.Text

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
		Contents: []GeminiContent{},
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

	reqBytes, _ := json.Marshal(geminiReq)
	
	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key=%s", apiKey)
	
	httpReq, err := http.NewRequestWithContext(reqCtx, "POST", apiURL, bytes.NewBuffer(reqBytes))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to build AI request"})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to connect to AI provider"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("AI provider error: %s", string(respBody))})
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")

	initData, _ := json.Marshal(map[string]interface{}{
		"type":        "init",
		"userMessage": userMsg,
	})
	fmt.Fprintf(c.Writer, "data: %s\n\n", initData)
	c.Writer.Flush()

	reader := bufio.NewReader(resp.Body)
	var fullBotText string

	for {
		line, err := reader.ReadBytes('\n')
		if err != nil {
			break 
		}

		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}

		if bytes.HasPrefix(line, []byte("data: ")) {
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
			
			if err := json.Unmarshal(dataStr, &chunk); err == nil {
				if len(chunk.Candidates) > 0 && len(chunk.Candidates[0].Content.Parts) > 0 {
					textPiece := chunk.Candidates[0].Content.Parts[0].Text
					fullBotText += textPiece

					chunkData, _ := json.Marshal(map[string]string{
						"type": "chunk",
						"text": textPiece,
					})
					fmt.Fprintf(c.Writer, "data: %s\n\n", chunkData)
					c.Writer.Flush()
				}
			}
		}
	}

	botMsg := models.BotMessage{
		ID:        bson.NewObjectID(),
		Role:      "model",
		Text:      fullBotText,
		CreatedAt: time.Now(),
	}

	updateFields := bson.M{"updatedAt": time.Now()}
	if len(chat.Messages) == 0 {
		title := body.Text
		updateFields["title"] = title
		chat.Title = title
	}

	dbCtx, dbCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer dbCancel()

	pushData := bson.M{"$each": []models.BotMessage{userMsg, botMsg}}
	if fullBotText == "" {
		pushData = bson.M{"$each": []models.BotMessage{userMsg}}
	}

	_, err = db.BotChatCollection.UpdateOne(dbCtx,
		bson.M{"_id": chatID},
		bson.M{
			"$set":  updateFields,
			"$push": bson.M{"messages": pushData},
		},
	)

	if reqCtx.Err() == nil {
		finalData, _ := json.Marshal(map[string]interface{}{
			"type":       "done",
			"botMessage": botMsg,
			"chatTitle":  chat.Title,
		})
		fmt.Fprintf(c.Writer, "data: %s\n\n", finalData)
		c.Writer.Flush()
	}
}