package router

import "testing"

func TestNewCORSConfig_ExplicitOriginsAllowCredentials(t *testing.T) {
	cfg := newCORSConfig([]string{"http://localhost:4000", "https://app.example.com"})

	if cfg.AllowAllOrigins {
		t.Fatal("AllowAllOrigins = true, want false for explicit origins")
	}
	if !cfg.AllowCredentials {
		t.Fatal("AllowCredentials = false, want true for explicit origins")
	}
	if len(cfg.AllowOrigins) != 2 {
		t.Fatalf("AllowOrigins len = %d, want 2", len(cfg.AllowOrigins))
	}
	if cfg.AllowOrigins[0] != "http://localhost:4000" {
		t.Fatalf("AllowOrigins[0] = %q, want http://localhost:4000", cfg.AllowOrigins[0])
	}
}

func TestNewCORSConfig_WildcardDisablesCredentials(t *testing.T) {
	cfg := newCORSConfig([]string{"*"})

	if !cfg.AllowAllOrigins {
		t.Fatal("AllowAllOrigins = false, want true for wildcard origin")
	}
	if cfg.AllowCredentials {
		t.Fatal("AllowCredentials = true, want false because browsers reject wildcard credentialed CORS")
	}
	if len(cfg.AllowOrigins) != 0 {
		t.Fatalf("AllowOrigins len = %d, want 0 when AllowAllOrigins is true", len(cfg.AllowOrigins))
	}
}

func TestNewCORSConfig_OriginPatternEnablesWildcardMatching(t *testing.T) {
	cfg := newCORSConfig([]string{"https://diana-v2-*.vercel.app", "https://diana-v2.vercel.app"})

	if cfg.AllowAllOrigins {
		t.Fatal("AllowAllOrigins = true, want false for scoped origin patterns")
	}
	if !cfg.AllowWildcard {
		t.Fatal("AllowWildcard = false, want true for configured origin pattern")
	}
	if !cfg.AllowCredentials {
		t.Fatal("AllowCredentials = false, want true for scoped origin patterns")
	}
	if len(cfg.AllowOrigins) != 2 {
		t.Fatalf("AllowOrigins len = %d, want 2", len(cfg.AllowOrigins))
	}
}

func TestNewCORSConfig_DefaultsToLocalDevOrigins(t *testing.T) {
	cfg := newCORSConfig(nil)

	if cfg.AllowAllOrigins {
		t.Fatal("AllowAllOrigins = true, want false for local dev defaults")
	}
	if !cfg.AllowCredentials {
		t.Fatal("AllowCredentials = false, want true for local dev defaults")
	}
	if len(cfg.AllowOrigins) == 0 {
		t.Fatal("AllowOrigins is empty, want local dev defaults")
	}
}
