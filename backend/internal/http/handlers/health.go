package handlers

import "github.com/gin-gonic/gin"

func RegisterHealth(rg *gin.RouterGroup) {
	rg.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	rg.GET("/livez", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "live"})
	})
}
