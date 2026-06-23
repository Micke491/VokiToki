package handlers

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

const (
	thumbnailMaxDimension = 480
	thumbnailJPEGQuality  = 72
	ffmpegTimeout         = 8 * time.Second
)

func resizeImageForThumbnail(raw []byte, mimeType string) ([]byte, error) {
	img, _, err := image.Decode(bytes.NewReader(raw))
	if err == nil {
		src := img.Bounds()
		srcW, srcH := src.Dx(), src.Dy()
		if srcW > 0 && srcH > 0 {
			dstW, dstH := srcW, srcH
			if srcW > thumbnailMaxDimension || srcH > thumbnailMaxDimension {
				if srcW >= srcH {
					dstW = thumbnailMaxDimension
					dstH = maxInt(1, int(float64(srcH)*(float64(thumbnailMaxDimension)/float64(srcW))))
				} else {
					dstH = thumbnailMaxDimension
					dstW = maxInt(1, int(float64(srcW)*(float64(thumbnailMaxDimension)/float64(srcH))))
				}
			}

			resized := image.NewRGBA(image.Rect(0, 0, dstW, dstH))
			nearestNeighborScale(resized, img, src, dstW, dstH)

			var out bytes.Buffer
			if err := jpeg.Encode(&out, resized, &jpeg.Options{Quality: thumbnailJPEGQuality}); err == nil {
				return out.Bytes(), nil
			}
		}
	}

	ffmpegPath, errFFmpeg := findFFmpegPath()
	if errFFmpeg == nil {
		ext := ".bin"
		switch mimeType {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		case "image/heic":
			ext = ".heic"
		case "image/heif":
			ext = ".heif"
		}

		inFile, err := os.CreateTemp("", "vt-img-in-*"+ext)
		if err == nil {
			defer os.Remove(inFile.Name())
			if _, err := inFile.Write(raw); err == nil {
				inFile.Close()

				outFile, err := os.CreateTemp("", "vt-img-out-*.jpg")
				if err == nil {
					outPath := outFile.Name()
					outFile.Close()
					defer os.Remove(outPath)

					cmd := exec.Command(ffmpegPath,
						"-y",
						"-i", inFile.Name(),
						"-frames:v", "1",
						"-vf", fmt.Sprintf("scale='min(%d,iw)':'-2'", thumbnailMaxDimension),
						outPath,
					)

					done := make(chan error, 1)
					go func() { done <- cmd.Run() }()

					var runErr error
					select {
					case runErr = <-done:
					case <-time.After(ffmpegTimeout):
						if cmd.Process != nil {
							_ = cmd.Process.Kill()
						}
						runErr = fmt.Errorf("ffmpeg timeout")
					}

					if runErr == nil {
						frameBytes, err := os.ReadFile(outPath)
						if err == nil && len(frameBytes) > 0 {
							return frameBytes, nil
						}
					}
				}
			} else {
				inFile.Close()
			}
		}
	}

	return nil, fmt.Errorf("failed to decode and resize image")
}

func nearestNeighborScale(dst *image.RGBA, src image.Image, srcRect image.Rectangle, dstW, dstH int) {
	srcW, srcH := srcRect.Dx(), srcRect.Dy()
	for y := 0; y < dstH; y++ {
		srcY := srcRect.Min.Y + (y*srcH)/dstH
		for x := 0; x < dstW; x++ {
			srcX := srcRect.Min.X + (x*srcW)/dstW
			dst.Set(x, y, src.At(srcX, srcY))
		}
	}
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func extractVideoFrameThumbnail(videoBytes []byte, mimeType string) string {
	ffmpegPath, err := findFFmpegPath()
	if err != nil {
		log.Printf("SendBotMessage: ffmpeg not found, skipping video thumbnail: %v", err)
		return ""
	}

	inFile, err := os.CreateTemp("", "vt-thumb-in-*"+extensionForVideoMime(mimeType))
	if err != nil {
		return ""
	}
	defer os.Remove(inFile.Name())
	if _, err := inFile.Write(videoBytes); err != nil {
		inFile.Close()
		return ""
	}
	inFile.Close()

	outFile, err := os.CreateTemp("", "vt-thumb-out-*.jpg")
	if err != nil {
		return ""
	}
	outPath := outFile.Name()
	outFile.Close()
	defer os.Remove(outPath)

	cmd := exec.Command(ffmpegPath,
		"-y",
		"-ss", "0.5",
		"-i", inFile.Name(),
		"-frames:v", "1",
		"-vf", "scale='min(640,iw)':'-2'",
		outPath,
	)

	done := make(chan error, 1)
	go func() { done <- cmd.Run() }()

	select {
	case runErr := <-done:
		if runErr != nil {
			return ""
		}
	case <-time.After(ffmpegTimeout):
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		return ""
	}

	frameBytes, err := os.ReadFile(outPath)
	if err != nil || len(frameBytes) == 0 {
		return ""
	}

	resized, err := resizeImageForThumbnail(frameBytes, "image/jpeg")
	if err != nil {
		return ""
	}

	return "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(resized)
}

func extensionForVideoMime(mime string) string {
	switch mime {
	case "video/mp4":
		return ".mp4"
	case "video/webm":
		return ".webm"
	case "video/quicktime":
		return ".mov"
	default:
		return ".bin"
	}
}

func findFFmpegPath() (string, error) {
	p, err := exec.LookPath("ffmpeg")
	if err == nil {
		return p, nil
	}

	// Fallback for Windows winget install
	userProfile := os.Getenv("USERPROFILE")
	if userProfile != "" {
		fallbackPath := filepath.Join(userProfile, "AppData", "Local", "Microsoft", "WinGet", "Packages", "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe", "ffmpeg-8.1.1-full_build", "bin", "ffmpeg.exe")
		if _, err := os.Stat(fallbackPath); err == nil {
			return fallbackPath, nil
		}
	}

	return "", fmt.Errorf("ffmpeg not found")
}
