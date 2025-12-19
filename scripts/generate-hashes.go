package main

import (
	"fmt"
	"log"
	
	"golang.org/x/crypto/bcrypt"
)

func main() {
	passwords := map[string]string{
		"demo123":      "demo@diana.app",
		"password123":  "clinician@example.com", 
		"admin123":     "admin@diana.app",
		"research456":  "researcher@diana.app",
	}
	
	for password, email := range passwords {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("Failed to hash password for %s: %v", email, err)
		}
		fmt.Printf("-- %s / %s\n('***', '%s', '***'),\n\n", email, password, string(hash))
	}
}