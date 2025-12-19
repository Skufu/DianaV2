package handlers

import (
	"net/http"
	"strconv"

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
	rg.GET("/:id", h.get)
	rg.PUT("/:id", h.update)
	rg.DELETE("/:id", h.delete)
}

func (h *PatientsHandler) list(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	patients, err := h.store.Patients().List(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list patients"})
		return
	}
	c.JSON(http.StatusOK, patients)
}

func (h *PatientsHandler) create(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req models.Patient
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	// Set user_id for ownership
	req.UserID = int64(userID)

	created, err := h.store.Patients().Create(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create patient"})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h *PatientsHandler) get(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient ID"})
		return
	}

	patient, err := h.store.Patients().Get(c.Request.Context(), int32(id), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
		return
	}
	c.JSON(http.StatusOK, patient)
}

func (h *PatientsHandler) update(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient ID"})
		return
	}

	var req models.Patient
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	// Set the ID from the URL parameter and user_id for ownership
	req.ID = id
	req.UserID = int64(userID)

	updated, err := h.store.Patients().Update(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update patient"})
		return
	}
	c.JSON(http.StatusOK, updated)
}

func (h *PatientsHandler) delete(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient ID"})
		return
	}

	if err := h.store.Patients().Delete(c.Request.Context(), int32(id), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete patient"})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
