package handlers

import (
	"net/http"
	"net/http/pprof"
	"runtime"
	"runtime/debug"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

// DebugHandler handles debug and profiling endpoints
// These endpoints are intended for development and troubleshooting only
// and should be protected in production.
type DebugHandler struct {
	enabled bool
}

// NewDebugHandler creates a new debug handler
func NewDebugHandler(enabled bool) *DebugHandler {
	return &DebugHandler{enabled: enabled}
}

// Register registers debug endpoints
// Note: In production, these should be behind authentication or disabled
func (h *DebugHandler) Register(rg *gin.RouterGroup) {
	if !h.enabled {
		return
	}

	// pprof endpoints
	rg.GET("/pprof/", h.index)
	rg.GET("/pprof/cmdline", h.cmdline)
	rg.GET("/pprof/profile", h.profile)
	rg.GET("/pprof/symbol", h.symbol)
	rg.GET("/pprof/trace", h.trace)
	rg.GET("/pprof/allocs", h.allocs)
	rg.GET("/pprof/block", h.block)
	rg.GET("/pprof/goroutine", h.goroutine)
	rg.GET("/pprof/heap", h.heap)
	rg.GET("/pprof/mutex", h.mutex)
	rg.GET("/pprof/threadcreate", h.threadcreate)

	// Custom debug endpoints
	rg.GET("/gc", h.triggerGC)
	rg.GET("/memstats", h.memStats)
	rg.GET("/runtime", h.runtimeStats)
	rg.POST("/set-gc-percent", h.setGCPercent)
	rg.POST("/free-os-memory", h.freeOSMemory)
}

func (h *DebugHandler) index(c *gin.Context) {
	pprof.Index(c.Writer, c.Request)
}

func (h *DebugHandler) cmdline(c *gin.Context) {
	pprof.Cmdline(c.Writer, c.Request)
}

func (h *DebugHandler) profile(c *gin.Context) {
	log.Info().
		Str("remote_addr", c.ClientIP()).
		Msg("CPU profiling started")
	
	pprof.Profile(c.Writer, c.Request)
	
	log.Info().
		Str("remote_addr", c.ClientIP()).
		Msg("CPU profiling completed")
}

func (h *DebugHandler) symbol(c *gin.Context) {
	pprof.Symbol(c.Writer, c.Request)
}

func (h *DebugHandler) trace(c *gin.Context) {
	log.Info().
		Str("remote_addr", c.ClientIP()).
		Msg("Execution tracing started")
	
	pprof.Trace(c.Writer, c.Request)
	
	log.Info().
		Str("remote_addr", c.ClientIP()).
		Msg("Execution tracing completed")
}

func (h *DebugHandler) allocs(c *gin.Context) {
	c.Header("Content-Type", "application/octet-stream")
	c.Status(http.StatusOK)
	pprof.Handler("allocs").ServeHTTP(c.Writer, c.Request)
}

func (h *DebugHandler) block(c *gin.Context) {
	c.Header("Content-Type", "application/octet-stream")
	c.Status(http.StatusOK)
	pprof.Handler("block").ServeHTTP(c.Writer, c.Request)
}

func (h *DebugHandler) goroutine(c *gin.Context) {
	c.Header("Content-Type", "application/octet-stream")
	c.Status(http.StatusOK)
	pprof.Handler("goroutine").ServeHTTP(c.Writer, c.Request)
}

func (h *DebugHandler) heap(c *gin.Context) {
	c.Header("Content-Type", "application/octet-stream")
	c.Status(http.StatusOK)
	pprof.Handler("heap").ServeHTTP(c.Writer, c.Request)
}

func (h *DebugHandler) mutex(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Mutex profiling info",
		"note":    "Use runtime.SetMutexProfileFraction to enable mutex profiling",
	})
}

func (h *DebugHandler) threadcreate(c *gin.Context) {
	c.Header("Content-Type", "application/octet-stream")
	c.Status(http.StatusOK)
	pprof.Handler("threadcreate").ServeHTTP(c.Writer, c.Request)
}

// triggerGC triggers a garbage collection cycle
func (h *DebugHandler) triggerGC(c *gin.Context) {
	start := time.Now()
	runtime.GC()
	duration := time.Since(start)
	
	log.Info().
		Dur("duration", duration).
		Str("remote_addr", c.ClientIP()).
		Msg("Garbage collection triggered manually")
	
	c.JSON(http.StatusOK, gin.H{
		"message":  "Garbage collection triggered",
		"duration": duration.String(),
	})
}

// memStats returns memory statistics
func (h *DebugHandler) memStats(c *gin.Context) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	
	c.JSON(http.StatusOK, gin.H{
		"alloc":         m.Alloc,
		"total_alloc":   m.TotalAlloc,
		"sys":           m.Sys,
		"lookups":       m.Lookups,
		"mallocs":       m.Mallocs,
		"frees":         m.Frees,
		"heap_alloc":    m.HeapAlloc,
		"heap_sys":      m.HeapSys,
		"heap_idle":     m.HeapIdle,
		"heap_inuse":    m.HeapInuse,
		"heap_released": m.HeapReleased,
		"heap_objects":  m.HeapObjects,
		"stack_inuse":   m.StackInuse,
		"stack_sys":     m.StackSys,
		"mspan_inuse":   m.MSpanInuse,
		"mspan_sys":     m.MSpanSys,
		"mcache_inuse":  m.MCacheInuse,
		"mcache_sys":    m.MCacheSys,
		"other_sys":     m.OtherSys,
		"gc_sys":        m.GCSys,
		"next_gc":       m.NextGC,
		"last_gc":       m.LastGC,
		"pause_total_ns": m.PauseTotalNs,
		"num_gc":        m.NumGC,
		"num_forced_gc": m.NumForcedGC,
		"gc_cpu_fraction": m.GCCPUFraction,
		"gc_metadata": gin.H{
			"enable_gc":     m.EnableGC,
			"debug_gc":      m.DebugGC,
		},
	})
}

// runtimeStats returns runtime statistics
func (h *DebugHandler) runtimeStats(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"goroutines":       runtime.NumGoroutine(),
		"cpus":             runtime.NumCPU(),
		"cgocalls":         runtime.NumCgoCall(),
		"max_procs":        runtime.GOMAXPROCS(0),
		"version":          runtime.Version(),
		"goos":             runtime.GOOS,
		"goarch":           runtime.GOARCH,
		"compiler":         runtime.Compiler,
		"num_cpu":          runtime.NumCPU(),
		"num_goroutine":    runtime.NumGoroutine(),
		"num_cgo_call":     runtime.NumCgoCall(),
	})
}

// setGCPercent sets the GC target percentage
func (h *DebugHandler) setGCPercent(c *gin.Context) {
	percentStr := c.PostForm("percent")
	if percentStr == "" {
		ErrBadRequest(c, "percent parameter required")
		return
	}
	
	percent, err := strconv.Atoi(percentStr)
	if err != nil {
		ErrBadRequest(c, "invalid percent value")
		return
	}
	
	oldPercent := debug.SetGCPercent(percent)
	
	log.Info().
		Int("old_percent", oldPercent).
		Int("new_percent", percent).
		Str("remote_addr", c.ClientIP()).
		Msg("GC percent changed")
	
	c.JSON(http.StatusOK, gin.H{
		"message":     "GC percent changed",
		"old_percent": oldPercent,
		"new_percent": percent,
	})
}

// freeOSMemory returns memory to the operating system
func (h *DebugHandler) freeOSMemory(c *gin.Context) {
	start := time.Now()
	debug.FreeOSMemory()
	duration := time.Since(start)
	
	log.Info().
		Dur("duration", duration).
		Str("remote_addr", c.ClientIP()).
		Msg("OS memory freed")
	
	c.JSON(http.StatusOK, gin.H{
		"message":  "OS memory freed",
		"duration": duration.String(),
	})
}

// ProfilingUsage returns documentation for profiling usage
func ProfilingUsage() string {
	return `
Profiling Usage Guide
=====================

CPU Profiling:
  curl -o cpu.prof http://localhost:8080/debug/pprof/profile?seconds=30
  go tool pprof cpu.prof

Memory Profiling:
  curl -o heap.prof http://localhost:8080/debug/pprof/heap
  go tool pprof heap.prof

Goroutine Analysis:
  curl -o goroutine.prof http://localhost:8080/debug/pprof/goroutine
  go tool pprof goroutine.prof

Execution Tracing:
  curl -o trace.out http://localhost:8080/debug/pprof/trace?seconds=5
  go tool trace trace.out

Allocs (since program start):
  curl -o allocs.prof http://localhost:8080/debug/pprof/allocs
  go tool pprof allocs.prof

Common pprof Commands:
  top              - Show top functions by CPU/memory usage
  top -cum         - Show top functions by cumulative usage
  list <func>      - Show source code for function
  web              - Open interactive web visualization
  pdf              - Generate PDF report
  png              - Generate PNG graph

Memory Statistics:
  curl http://localhost:8080/debug/memstats

Runtime Statistics:
  curl http://localhost:8080/debug/runtime

Trigger GC:
  curl http://localhost:8080/debug/gc

Free OS Memory:
  curl -X POST http://localhost:8080/debug/free-os-memory

Set GC Percent:
  curl -X POST -d "percent=50" http://localhost:8080/debug/set-gc-percent

NOTE: These endpoints should be protected in production environments.
Consider using authentication or network-level access controls.
`
}
