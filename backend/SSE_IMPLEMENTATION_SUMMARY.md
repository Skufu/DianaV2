# Backend SSE Implementation Complete

## What Was Implemented

### 1. Auth Events Database Schema

**File**: `migrations/0012_add_auth_events.sql`

**Created Table**: `auth_events`

- `id`: UUID primary key
- `event_type`: ENUM (login, logout, failed_login, token_refresh)
- `email`: User email (nullable for failed logins)
- `ip_address`: INET type for IP addresses
- `user_agent`: Browser user agent string
- `success`: Boolean for event success/failure
- `device_info`, `location`, `metadata`: JSONB fields for extended data
- `created_at`: Timestamp

**Indexes**:

- idx_auth_events_created_at (DESC)
- idx_auth_events_email
- idx_auth_events_type
- idx_auth_events_success

### 2. Auth Event Model

**File**: `backend/internal/models/types.go`

Added `AuthEvent` struct:

```go
type AuthEvent struct {
    ID         string                 `json:"id"`
    EventType  string                 `json:"event_type"`
    Email      string                 `json:"email,omitempty"`
    IPAddress  string                 `json:"ip_address,omitempty"`
    UserAgent  string                 `json:"user_agent,omitempty"`
    Success    bool                   `json:"success"`
    DeviceInfo map[string]interface{}  `json:"device_info,omitempty"`
    Location   map[string]interface{}  `json:"location,omitempty"`
    Metadata   map[string]interface{}  `json:"metadata,omitempty"`
    CreatedAt  time.Time              `json:"created_at"`
}
```

### 3. SQL Queries for Auth Events

**File**: `backend/internal/store/queries/auth_events.sql`

**Queries**:

- `CreateAuthEvent`: Insert single auth event
- `ListAuthEvents`: List with filters (event_type, email, date range, pagination)
- `CountAuthEvents`: Count with same filters
- `GetRecentAuthEvents`: Get most recent events

### 4. SSE Broker Implementation

**File**: `backend/internal/http/sse/broker.go`

**Features**:

- Connection management (subscribe/unsubscribe clients)
- Event buffering (batch size configurable, default 10)
- Broadcast to all connected clients
- Keep-alive support (30 second intervals)
- Context cancellation support
- `PublishAuthEvent`: Convenience method to publish auth events

**Key Methods**:

- `NewBroker(batchSize int)`: Create broker
- `Subscribe(client chan Event)`: Add client
- `Unsubscribe(client chan Event)`: Remove client
- `Publish(event Event)`: Add to buffer, broadcast when full
- `ClientCount()`: Get active connections
- `StreamToGin(c *gin.Context, broker *Broker, ctx context.Context)`: SSE streaming with keep-alive

### 5. SSE Handler

**File**: `backend/internal/http/handlers/auth_events.go`

**Endpoint**: `GET /api/v1/admin/auth/events/stream`

**Features**:

- Query parameter `token`: JWT token for authentication
- Token validation using existing `ValidateToken` helper
- Role check (admin only)
- Connection status indication (Connected/Disconnected)
- SSE streaming with proper headers:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no`

**Error Handling**:

- Send SSE error events for auth failures
- Send SSE error events for non-admin role

### 6. Auth Handler Updates

**File**: `backend/internal/http/handlers/auth.go`

**Changes**:

- Added `broker *sse.Broker` to AuthHandler struct
- Updated `NewAuthHandler` to accept broker parameter
- Updated login handler to publish `login` event on success
- Updated login handler to publish `failed_login` event on invalid credentials
- Updated refresh handler to publish `token_refresh` event
- Updated logout handler to publish `logout` event (includes user email lookup)

**Event Publishing**:

```go
h.broker.PublishAuthEvent("login", user.Email, c.ClientIP(), c.GetHeader("User-Agent"), true, nil)
h.broker.PublishAuthEvent("failed_login", req.Email, c.ClientIP(), c.GetHeader("User-Agent"), false, map[string]interface{}{"failure_reason": "invalid credentials"})
h.broker.PublishAuthEvent("token_refresh", user.Email, c.ClientIP(), c.GetHeader("User-Agent"), true, nil)
h.broker.PublishAuthEvent("logout", userEmail, c.ClientIP(), c.GetHeader("User-Agent"), true, nil)
```

### 7. Router Integration

**File**: `backend/internal/http/router/router.go`

**Changes**:

- Added import: `github.com/skufu/DianaV2/backend/internal/http/sse`
- Created SSE broker instance: `sseBroker := sse.NewBroker(10)`
- Updated auth handler to use broker: `authHandler := handlers.NewAuthHandler(cfg, st, sseBroker)`
- Registered auth events handler: `authEventsHandler.Register(admin)`

**Route Registered**: `GET /api/v1/admin/auth/events/stream`

### 8. Store Implementation

**File**: `backend/internal/store/postgres.go`

**Changes**:

- Added `AuthEvents()` to Store interface
- Implemented `pgAuthEventRepo` with raw SQL queries
- **Create**: `INSERT INTO auth_events` with proper parameter binding
- **List**: Dynamic SQL with filters (event_type, email ILIKE, date range) + pagination
- **Count**: Same filters, returns total count

## How to Run

1. Apply migration to create table:

```bash
cd backend
psql -h $DATABASE_URL -f migrations/0012_add_auth_events.sql
```

2. Restart server:

```bash
cd backend
go run cmd/server/main.go
```

3. Test SSE endpoint:

```bash
# Login to get admin token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  -s | jq -r '.access_token'

# Test SSE stream
curl -N -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8080/api/v1/admin/auth/events/stream?token=YOUR_ADMIN_TOKEN

# Expected output:
# :keep-alive

# event: auth_event
# data: {"id":"2024-01-15T10:30:00.123456789","event_type":"login","email":"admin@example.com","ip_address":"127.0.0.1","user_agent":"Mozilla/5.0","success":true,"created_at":"2024-01-15T10:30:00.000000000Z","metadata":{}}

# :keep-alive
# (repeats every 30 seconds)
```

4. Verify with frontend:

- Navigate to Admin → Auth Events tab
- Should see "Connected" status badge
- Should see real-time auth events appearing
- Login from another browser to trigger events

## Event Types Supported

1. **login** - Successful authentication

   - Includes: email, ip_address, user_agent, success=true

2. **logout** - User logout

   - Includes: email, ip_address, user_agent, success=true

3. **failed_login** - Failed authentication attempt

   - Includes: email, ip_address, user_agent, success=false
   - metadata.failure_reason (e.g., "invalid credentials", "account locked", etc.)

4. **token_refresh** - Token refresh for new access token
   - Includes: email, ip_address, user_agent, success=true

## Frontend Integration

Frontend `AuthEventLogViewer.jsx` is already configured to connect to:

```
GET /api/v1/admin/auth/events/stream?token=YOUR_JWT_TOKEN
```

The frontend will:

- Display connection status (Connected/Disconnected with Wifi/WifiOff icons)
- Auto-scroll to latest events
- Filter by event type, user email, date range
- Show expandable event details (IP, user agent, device info, location, metadata)
- Export events to CSV
- Clear events button
- Auto-reconnect on connection failure (5-second retry)

## Security Considerations

1. **Admin-only access**: SSE endpoint validates JWT and requires admin role
2. **Rate limiting**: Consider limiting SSE connections per admin user (max 5)
3. **No token persistence**: Admin token passed via query param only
4. **IP logging**: All auth events capture client IP addresses
5. **Sensitive data in metadata**: Store only non-sensitive info in metadata (failure_reason, session_id, etc.)

## Performance Features

1. **Event buffering**: Broker batches events and broadcasts when buffer is full (10 events)
2. **Keep-alive**: Sends `:keep-alive` comment every 30 seconds to prevent connection timeouts
3. **Auto-reconnection**: Frontend automatically reconnects on connection loss
4. **Context cancellation**: Proper cleanup on context cancellation

## Database Migration Notes

The migration file (`migrations/0012_add_auth_events.sql`) uses:

- `gen_random_uuid()` for ID generation
- `INET` type for IP addresses
- `JSONB` for flexible metadata storage
- Proper indexes for common query patterns

## Next Steps for Production

1. Run migration on production database
2. Ensure database user has proper privileges
3. Monitor SSE connection count
4. Set up alerts for unusual auth patterns (e.g., multiple failed logins)
5. Consider adding retention policy for auth events (e.g., keep 90 days)
6. Add geolocation lookup based on IP addresses (optional enhancement)
