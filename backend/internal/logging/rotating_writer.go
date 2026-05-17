package logging

import (
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"sync"
)

const (
	DefaultMaxBytes   int64 = 5 * 1024 * 1024
	DefaultMaxBackups       = 3
)

// RotatingFileWriter appends logs to a fixed file and rotates it by size.
type RotatingFileWriter struct {
	mu         sync.Mutex
	path       string
	maxBytes   int64
	maxBackups int
	file       *os.File
}

func NewRotatingFileWriter(path string, maxBytes int64, maxBackups int) (*RotatingFileWriter, error) {
	if path == "" {
		return nil, errors.New("log path is required")
	}
	if maxBytes <= 0 {
		maxBytes = DefaultMaxBytes
	}
	if maxBackups < 1 {
		maxBackups = DefaultMaxBackups
	}

	cleanPath := filepath.Clean(path)
	if err := os.MkdirAll(filepath.Dir(cleanPath), 0o750); err != nil {
		return nil, err
	}

	w := &RotatingFileWriter{
		path:       cleanPath,
		maxBytes:   maxBytes,
		maxBackups: maxBackups,
	}
	if err := w.open(); err != nil {
		return nil, err
	}
	return w, nil
}

func (w *RotatingFileWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.file == nil {
		if err := w.open(); err != nil {
			return 0, err
		}
	}

	if info, err := w.file.Stat(); err == nil && info.Size()+int64(len(p)) > w.maxBytes {
		if err := w.rotate(); err != nil {
			return 0, err
		}
	}

	return w.file.Write(p)
}

func (w *RotatingFileWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.file == nil {
		return nil
	}
	err := w.file.Close()
	w.file = nil
	return err
}

func (w *RotatingFileWriter) open() error {
	file, err := os.OpenFile(w.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o640)
	if err != nil {
		return err
	}
	w.file = file
	return nil
}

func (w *RotatingFileWriter) rotate() error {
	if w.file != nil {
		if err := w.file.Close(); err != nil {
			return err
		}
		w.file = nil
	}

	for i := w.maxBackups - 1; i >= 1; i-- {
		src := backupPath(w.path, i)
		dst := backupPath(w.path, i+1)
		if _, err := os.Stat(src); err == nil {
			_ = os.Rename(src, dst)
		}
	}

	if _, err := os.Stat(w.path); err == nil {
		_ = os.Rename(w.path, backupPath(w.path, 1))
	}

	return w.open()
}

func backupPath(path string, index int) string {
	return path + "." + strconv.Itoa(index)
}
