package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

func parseIDParam(c *gin.Context, name string) (int64, error) {
	raw := c.Param(name)
	return strconv.ParseInt(raw, 10, 64)
}
