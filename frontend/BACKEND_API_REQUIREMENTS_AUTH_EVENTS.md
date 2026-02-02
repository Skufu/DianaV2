# Backend API Requirements for Real-time Auth Events

This document describes the backend API endpoints required to support the real-time authentication event viewer in the admin dashboard.

## Overview

The frontend `AuthEventLogViewer.jsx` component uses Server-Sent Events (SSE) to stream authentication events in real-time to admin users.

## Required Endpoints

### 1. SSE Stream Endpoint

**Endpoint**: `GET /api/v1/admin/events/stream`

**Purpose**: Stream authentication events to admin users in real-time using Server-Sent Events.

**Authentication**: Requires valid JWT Bearer token

**Query Parameters**:

- `token` (string): JWT token for authentication (passed by frontend)

**Response Format (SSE)**:

The server should send events with event name `auth_event`:

```
event: auth_event
data: {"id": "uuid", "event_type": "login", "email": "user@example.com", "timestamp": "2024-01-15T10:30:00Z", "ip_address": "192.168.1.1", "user_agent": "Mozilla/5.0...", "success": true}
```

**Event Data Schema**:

```json
{
  "id": "string (uuid)",
  "event_type": "login|logout|failed_login|token_refresh",
  "email": "string (user email)",
  "timestamp": "ISO8601 datetime",
  "ip_address": "string (IP address)",
  "user_agent": "string (browser user agent)",
  "success": "boolean (default true)",
  "device_info": {
    "browser": "string",
    "os": "string",
    "device": "string"
  },
  "location": {
    "country": "string",
    "city": "string",
    "latitude": "number",
    "longitude": "number"
  },
  "metadata": {
    "failure_reason": "string (for failed_logins)",
    "session_id": "string",
    "refresh_token_hash": "string (for token_refresh)"
  }
}
```

**Event Types**:

1. **login**: Successful user login

   - Required: `email`, `ip_address`, `user_agent`, `success=true`

2. **logout**: User logout

   - Required: `email`, `timestamp`, `success=true`

3. **failed_login**: Failed login attempt

   - Required: `email`, `ip_address`, `user_agent`, `success=false`, `metadata.failure_reason`

4. **token_refresh**: Token refresh
   - Required: `email`, `timestamp`, `success=true`

**Error Handling**:

Send error events with event name `error`:

```
event: error
data: {"message": "Authentication failed"}
```

**Connection Management**:

- Keep connections alive: Send a comment (`:keep-alive`) every 30 seconds
- Handle disconnections gracefully: Allow clients to reconnect
- Rate limiting: Limit to 5 concurrent SSE connections per admin user

### 2. Historical Auth Events (Future / Not Implemented)

**Endpoint**: `GET /api/v1/admin/auth/events` (Proposed)

**Purpose**: Retrieve historical authentication events (for CSV export or initial load)

> **Note**: This endpoint is currently **NOT IMPLEMENTED** in the backend. The frontend relies solely on real-time SSE events. Future implementation should follow this specification.

**Authentication**: Requires valid JWT Bearer token

**Query Parameters**:

- `page` (integer, default: 1)
- `page_size` (integer, default: 50)
- `event_type` (string, optional): Filter by event type
- `user` (string, optional): Filter by email
- `start_date` (date, optional): ISO8601 date
- `end_date` (date, optional): ISO8601 date

**Response Format**:

```json
{
  "data": [...],
  "total": 1000,
  "page": 1,
  "page_size": 50,
  "total_pages": 20
}
```

**Data Schema**: Same as SSE events above

## Implementation Notes

### Backend Storage

You'll need to store auth events in your database. Recommended schema:

```sql
CREATE TABLE auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  device_info JSONB,
  location JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_auth_events_timestamp ON auth_events(timestamp DESC);
CREATE INDEX idx_auth_events_email ON auth_events(email);
CREATE INDEX idx_auth_events_type ON auth_events(event_type);
```

### SSE Implementation Examples

#### Go (Gin)

```go
func (h *Handler) StreamAuthEvents(c *gin.Context) {
    token := c.Query("token")
    if !validateToken(token) {
        c.SSEvent("error", gin.H{"message": "Authentication failed"})
        return
    }

    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    c.Header("Connection", "keep-alive")

    // Create channel for events
    eventChan := make(chan AuthEvent, 100)

    // Subscribe to auth event stream
    eventBroker.Subscribe(eventChan)
    defer eventBroker.Unsubscribe(eventChan)

    // Stream events
    for {
        select {
        case event := <-eventChan:
            c.SSEvent("auth_event", event)
            c.Writer.Flush()
        case <-time.After(30 * time.Second):
            c.Writer.Write([]byte(":keep-alive\n\n"))
            c.Writer.Flush()
        case <-c.Request.Context().Done():
            return
        }
    }
}
```

#### Python (Flask)

```python
from flask import Response, stream_with_context

@app.route('/admin/auth/events/stream')
def stream_auth_events():
    def generate():
        while True:
            event = get_next_auth_event()
            if event:
                yield f"event: auth_event\ndata: {json.dumps(event)}\n\n"
            time.sleep(1)  # Keepalive

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    )
```

### Event Logging Integration

Log auth events in your authentication handlers:

```go
func (h *Handler) Login(c *gin.Context) {
    // ... authentication logic ...

    // Log auth event
    event := AuthEvent{
        EventType: "login",
        Email:     user.Email,
        IPAddress: c.ClientIP(),
        UserAgent: c.GetHeader("User-Agent"),
        Success:   true,
    }
    eventBroker.Publish(event)

    // ... return response ...
}
```

## Frontend Integration

The frontend `AuthEventLogViewer.jsx` component is already implemented and will connect to this endpoint automatically when an admin navigates to the "Auth Events" tab.

## Security Considerations

1. **Authorization**: Only users with `admin` role should access these endpoints
2. **Rate Limiting**: Limit SSE connections to prevent abuse
3. **Data Privacy**: Auth events contain sensitive information (IP addresses, user agents)
4. **Connection Limits**: Implement per-admin connection limits (max 5 concurrent)
5. **Authentication**: Validate JWT token on SSE connection establishment

## Testing

Test your SSE endpoint using curl:

```bash
curl -N -H "Accept: text/event-stream" \
  "http://localhost:8080/api/v1/admin/auth/events/stream?token=YOUR_JWT_TOKEN"
```

Expected output:

```
:keep-alive

event: auth_event
data: {"id": "...", "event_type": "login", "email": "...", ...}

event: auth_event
data: {"id": "...", "event_type": "logout", "email": "...", ...}
```
