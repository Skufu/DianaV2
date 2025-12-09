package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/internal/models"
	"github.com/skufu/DianaV2/internal/store"
)

type PatientsHandler struct {
	store store.Store
}

func NewPatientsHandler(store store.Store) *PatientsHandler {
	return &PatientsHandler{store: store}
}

func (h *PatientsHandler) Register(rg *gin.RouterGroup) {
	rg.GET("", h.list)
	rg.POST("", h.create)
}

func (h *PatientsHandler) list(c *gin.Context) {
	patients, err := h.store.Patients().List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list patients"})
		return
	}
	c.JSON(http.StatusOK, patients)
}

func (h *PatientsHandler) create(c *gin.Context) {
	var req models.Patient
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}
	created, err := h.store.Patients().Create(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create patient"})
		return
	}
	c.JSON(http.StatusCreated, created)
}
