package models

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUserStructJSONSerialization(t *testing.T) {
	t.Run("password_hash is excluded from JSON", func(t *testing.T) {
		user := User{
			ID:           1,
			Email:        "test@example.com",
			PasswordHash: "super-secret-hash-12345",
			FirstName:    "John",
			LastName:     "Doe",
			IsActive:     true,
		}

		data, err := json.Marshal(user)
		assert.NoError(t, err, "JSON marshaling should succeed")

		var result map[string]any
		err = json.Unmarshal(data, &result)
		assert.NoError(t, err, "JSON unmarshaling should succeed")

		_, exists := result["password_hash"]
		assert.False(t, exists, "password_hash should not be present in JSON output")

		assert.Equal(t, float64(1), result["id"])
		assert.Equal(t, "test@example.com", result["email"])
		assert.Equal(t, "John", result["first_name"])
		assert.Equal(t, "Doe", result["last_name"])
		assert.Equal(t, true, result["is_active"])
	})

	t.Run("User struct unmarshals correctly", func(t *testing.T) {
		jsonData := `{
			"id": 1,
			"email": "test@example.com",
			"first_name": "John",
			"last_name": "Doe",
			"is_active": true
		}`

		var user User
		err := json.Unmarshal([]byte(jsonData), &user)
		assert.NoError(t, err, "JSON unmarshaling should succeed")

		assert.Equal(t, int64(1), user.ID)
		assert.Equal(t, "test@example.com", user.Email)
		assert.Equal(t, "John", user.FirstName)
		assert.Equal(t, "Doe", user.LastName)
		assert.Equal(t, true, user.IsActive)
		assert.Empty(t, user.PasswordHash, "PasswordHash should remain empty when not in JSON")
	})
}
