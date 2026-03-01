# Diana V2 - Architecture Map

> **Last Updated**: February 20, 2026  
> **Purpose**: Visual reference for system architecture, data flows, and component relationships

---

## Table of Contents
1. [High-Level System Architecture](#high-level-system-architecture)
2. [Request Flow Diagrams](#request-flow-diagrams)
3. [Component Hierarchy](#component-hierarchy)
4. [Database Schema Overview](#database-schema-overview)
5. [ML Pipeline Architecture](#ml-pipeline-architecture)

---

## High-Level System Architecture

### Overall System Topology

```mermaid
flowchart TB
    subgraph Client["🖥️ Client Layer"]
        Browser["Web Browser"]
        Mobile["Mobile Device"]
    end

    subgraph Frontend["⚛️ Frontend (React/Vite)"]
        React["React 18 SPA"]
        Vite["Vite Build Tool"]
        Tailwind["Tailwind CSS"]
        API["API Client Layer"]
    end

    subgraph Backend["🚀 Backend (Go/Gin)"]
        direction TB
        Gin["Gin HTTP Server<br/>Port: 8080"]
        
        subgraph Middleware["Middleware Stack"]
            Auth["JWT Auth"]
            CORS["CORS"]
            RateLimit["Rate Limiting"]
            Security["Security Headers"]
            Audit["Audit Logging"]
        end
        
        subgraph Handlers["HTTP Handlers"]
            AuthH["Auth Handler"]
            UserH["Users Handler"]
            AssessH["Assessments Handler"]
            AnalyticsH["Analytics Handler"]
            InsightsH["Insights Handler"]
            AdminH["Admin Handlers"]
        end
        
        subgraph Services["Services"]
            PDF["PDF Export"]
            Validation["Biomarker Validation"]
            Notify["Notifications"]
        end
    end

    subgraph ML["🧠 ML Service (Python/Flask)"]
        Flask["Flask Server<br/>Port: 5001"]
        Predictor["DianaPredictor"]
        Explainer["SHAP Explainer"]
        Clustering["K-Means Clustering"]
        Drift["Drift Detection"]
        AB["A/B Testing"]
    end

    subgraph Data["🗄️ Data Layer"]
        Postgres["PostgreSQL"]
        Redis["Redis Cache"]
        Models["Trained Models<br/>(.joblib files)"]
    end

    subgraph External["🌐 External"]
        NHANES["NHANES Dataset"]
    end

    Browser -->|"HTTP 4000"| React
    Mobile -->|"HTTP 4000"| React
    
    React -->|"REST API<br/>JWT Bearer"| Gin
    
    Gin --> Middleware
    Middleware --> Handlers
    Handlers --> Services
    
    AssessH -->|"POST /predict"| Flask
    Flask -->|"Prediction + Cluster"| AssessH
    
    Handlers -->|"SQLC Queries"| Postgres
    Handlers -->|"Cache Ops"| Redis
    
    Flask -->|"Load"| Models
    
    Scripts -->|"Download & Process"| NHANES
    Scripts -->|"Train & Save"| Models

    style Client fill:#e3f2fd
    style Frontend fill:#fff3e0
    style Backend fill:#e8f5e9
    style ML fill:#fce4ec
    style Data fill:#f3e5f5
    style External fill:#ffebee
```

---

## Request Flow Diagrams

### 1. Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Frontend<br/>(React)
    participant Backend as Backend<br/>(Go/Gin)
    participant DB as PostgreSQL
    participant Redis as Redis

    User->>Frontend: Enter credentials
    Frontend->>Backend: POST /api/v1/auth/login
    
    Backend->>DB: GetUserByEmail(email)
    DB-->>Backend: User record
    
    Backend->>Backend: bcrypt.CompareHash
    
    alt Invalid credentials
        Backend-->>Frontend: 401 Unauthorized
        Frontend-->>User: Show error
    else Valid credentials
        Backend->>Backend: Generate JWT<br/>(HS256, 24h expiry)
        Backend->>Redis: Cache session
        Backend-->>Frontend: 200 OK + JWT + Refresh Token
        Frontend->>Frontend: Store tokens
        Frontend-->>User: Redirect to dashboard
    end
```

### 2. Assessment Creation Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Frontend
    participant Backend as Backend
    participant ML as ML Server<br/>(Flask)
    participant DB as PostgreSQL
    participant Redis as Redis

    User->>Frontend: Submit biomarkers
    Frontend->>Backend: POST /api/v1/users/me/assessments
    
    Backend->>Backend: Validate biomarkers
    
    alt Validation Failed
        Backend-->>Frontend: 400 Bad Request
    else Valid
        Backend->>ML: POST /predict<br/>{biomarkers, model_type}
        
        alt ML Server Error
            ML-->>Backend: Error/Timeout
            Backend->>Backend: cluster="error", risk=0
        else ML Success
            ML-->>Backend: {cluster, risk_score, confidence}
        end
        
        Backend->>DB: CreateAssessment()
        DB-->>Backend: Assessment ID
        
        Backend->>Redis: Invalidate cache
        Backend-->>Frontend: 201 Created + Assessment
        
        Frontend-->>User: Show results + SHAP explanation
    end
```

### 3. Admin Dashboard Flow

```mermaid
sequenceDiagram
    actor Admin
    participant Frontend as Admin UI
    participant Backend as Backend
    participant SSE as SSE Broker
    participant DB as PostgreSQL
    participant Redis as Redis

    Admin->>Frontend: Open admin dashboard
    Frontend->>Backend: GET /api/v1/admin/dashboard<br/>(JWT + admin role)
    
    Backend->>Backend: RBAC check
    
    alt Not admin
        Backend-->>Frontend: 403 Forbidden
    else Admin
        Backend->>Redis: Get cached stats
        
        alt Cache miss
            Redis-->>Backend: nil
            Backend->>DB: Query aggregates
            DB-->>Backend: Stats
            Backend->>Redis: Cache (5 min)
        end
        
        Backend-->>Frontend: Dashboard data
        
        Frontend->>Backend: GET /api/v1/admin/events/stream
        Backend->>SSE: Subscribe
        
        loop Real-time updates
            SSE-->>Frontend: Auth events
        end
    end
```

---

## Component Hierarchy

### Backend Package Structure

```mermaid
graph TD
    subgraph Backend["Backend (Go)"]
        Main["cmd/server/main.go<br/>Entry Point"]
        
        subgraph Config["Config"]
            Cfg["config.go<br/>Environment & Settings"]
        end
        
        subgraph HTTP["HTTP Layer"]
            Router["router.go<br/>Route Definitions"]
            
            subgraph MW["Middleware"]
                JWT["auth.go<br/>JWT Validation"]
                RBAC["rbac.go<br/>Role Checks"]
                RL["ratelimit.go<br/>Rate Limiting"]
                Sec["security.go<br/>Security Headers"]
                Cors["cors.go<br/>CORS"]
            end
            
            subgraph H["Handlers"]
                AuthH["auth.go<br/>Login/Register"]
                UserH["users.go<br/>Profile/Onboarding"]
                AssessH["assessments.go<br/>Create/List"]
                AnalyticsH["analytics.go<br/>Dashboard Stats"]
                InsightsH["insights.go<br/>ML Metrics"]
                AdminH["admin_*.go<br/>Admin Operations"]
            end
        end
        
        subgraph Store["Data Layer"]
            StoreI["store.go<br/>Interface"]
            Postgres["postgres.go<br/>Implementation"]
            SQLC["sqlc/<br/>Generated Queries"]
        end
        
        subgraph MLInt["ML Integration"]
            PredictorI["Predictor Interface"]
            HTTPPred["http_predictor.go<br/>HTTP Client"]
            MockPred["mock.go<br/>Mock Predictor"]
            Validation["validation.go<br/>Biomarker Validation"]
        end
        
        subgraph Services["Services"]
            PDF["pdf/<br/>PDF Generation"]
            Cache["cache/<br/>Redis Cache"]
            SSE["http/sse/<br/>Event Streaming"]
            ValSvc["validation_service.go"]
            PDFSvc["pdf_export_service.go"]
            Notify["notification_service.go"]
        end
        
        subgraph Models["Domain Models"]
            Types["types.go<br/>User, Assessment, etc."]
        end
    end

    Main --> Config
    Main --> Router
    Router --> MW
    Router --> H
    H --> Store
    H --> MLInt
    H --> Services
    Store --> SQLC
    MLInt --> HTTPPred
    MLInt --> MockPred
    Services --> Cache
```

### Frontend Component Structure

```mermaid
graph TD
    subgraph Frontend["Frontend (React)"]
        App["App.jsx<br/>Root + Routing"]
        API["api.js<br/>HTTP Client"]
        
        subgraph Auth["Authentication"]
            Login["Login.jsx"]
            Signup["Signup.jsx"]
        end
        
        subgraph UserComponents["User Features"]
            Dashboard["Dashboard_user.jsx"]
            Profile["UserProfile.jsx"]
            Onboarding["Onboarding.jsx"]
            Trends["PersonalTrends.jsx"]
            Assessment["AssessmentForm.jsx"]
        end
        
        subgraph Insights["Insights & Analytics"]
            InsightsMain["Insights.jsx"]
            TrendsChart["BiomarkerTrends.jsx"]
            ClusterComp["ClusterComparison.jsx"]
            Cohort["CohortAnalysis.jsx"]
            ModelPerf["ModelPerformance.jsx"]
            RiskDist["RiskDistribution.jsx"]
        end
        
        subgraph Admin["Admin Dashboard"]
            AdminDash["AdminDashboard.jsx"]
            UserMgmt["UserManagement.jsx"]
            Audit["AuditLogViewer.jsx"]
            ModelTrace["ModelTraceability.jsx"]
            AuthEvents["AuthEventLogViewer.jsx"]
        end
        
        subgraph Common["Common Components"]
            Sidebar["Sidebar.jsx"]
            AdminSidebar["AdminSidebar.jsx"]
            BioNetwork["BiologicalNetwork.jsx<br/>Animated BG"]
            Input["BiomarkerInput.jsx"]
            Button["Button.jsx"]
            RiskInd["RiskIndicator.jsx"]
            SHAP["SHAPExplanation.jsx"]
            PDF["PDFExport.jsx"]
        end
        
        subgraph Layout["Layout"]
            BioBg["BiologicalNetwork.jsx"]
            MouseGlow["MouseGlow.jsx"]
            Cursor["CustomCursor.jsx"]
        end
    end

    App --> Auth
    App --> UserComponents
    App --> Insights
    App --> Admin
    App --> Layout
    
    UserComponents --> Common
    Insights --> Common
    Admin --> Common
    
    Auth --> API
    UserComponents --> API
    Insights --> API
    Admin --> API
```

---

## Database Schema Overview

```mermaid
erDiagram
    USERS ||--o{ ASSESSMENTS : creates
    USERS ||--o{ REFRESH_TOKENS : has
    USERS ||--o{ AUDIT_EVENTS : generates
    USERS ||--o{ AUTH_EVENTS : generates
    USERS }o--o{ CLINICS : belongs_to
    ASSESSMENTS ||--o{ MODEL_RUNS : uses

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string role
        boolean is_admin
        jsonb profile_data
        jsonb consent_settings
        boolean onboarding_completed
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    ASSESSMENTS {
        uuid id PK
        uuid user_id FK
        float hba1c
        float fbs
        float bmi
        float cholesterol
        float ldl
        float hdl
        float triglycerides
        float systolic_bp
        float diastolic_bp
        boolean family_history
        string activity_level
        string menopause_status
        string cluster
        float risk_score
        float confidence
        string model_version
        string dataset_hash
        string validation_status
        timestamp created_at
        timestamp updated_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        string token_hash
        timestamp expires_at
        timestamp created_at
    }

    AUDIT_EVENTS {
        uuid id PK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        jsonb details
        timestamp created_at
    }

    AUTH_EVENTS {
        uuid id PK
        uuid user_id FK
        string event_type
        string email
        string ip_address
        string user_agent
        boolean success
        jsonb metadata
        timestamp created_at
    }

    CLINICS {
        uuid id PK
        string name
        string code UK
        jsonb settings
        timestamp created_at
    }

    CLINIC_MEMBERS {
        uuid clinic_id FK
        uuid user_id FK
        string role
        timestamp joined_at
    }

    MODEL_RUNS {
        uuid id PK
        string model_version
        string dataset_hash
        float accuracy
        float precision
        float recall
        float f1_score
        jsonb confusion_matrix
        timestamp trained_at
        string trained_by
    }
```

---

## ML Pipeline Architecture

### Training & Inference Pipeline

```mermaid
flowchart LR
    subgraph DataSource["📊 Data Sources"]
        NHANES["NHANES Dataset<br/>CDC Health Data"]
    end

    subgraph Pipeline["🔧 Data Pipeline"]
        Download["download_nhanes.py<br/>Fetch Raw Data"]
        Process["process_nhanes.py<br/>Clean & Merge"]
        Impute["impute_missing_data.py<br/>Handle Missing"]
        FeatureSel["feature_selection.py<br/>Mutual Information"]
    end

    subgraph Training["🎓 Training"]
        TrainV2["train_binary_v2_no_bp.py<br/>Binary Screening Model"]
        Clustering["clustering.py<br/>K-Means K=4"]
        Binary["train_binary_v2_no_bp.py<br/>Binary Classifier"]
    end

    subgraph Models["🤖 Model Artifacts"]
        Clinical["Clinical Model<br/>Logistic Regression"]
        Cluster["Clustering Model<br/>K-Means"]
        Scaler["Feature Scaler<br/>StandardScaler"]
        Features["Feature List<br/>JSON"]
    end

    subgraph Serving["🚀 Serving"]
        Flask["Flask Server<br/>server.py"]
        Predict["predict.py<br/>DianaPredictor"]
        Explain["explainability.py<br/>SHAP"]
    end

    subgraph Monitoring["📈 Monitoring"]
        Drift["drift_detection.py<br/>Data Drift"]
        AB["ab_testing.py<br/>Experiments"]
        MLflow["MLflow<br/>Experiment Tracking"]
    end

    NHANES --> Download
    Download --> Process
    Process --> Impute
    Impute --> FeatureSel
    FeatureSel --> TrainV2
    FeatureSel --> Clustering
    
    TrainV2 --> Clinical
    Clustering --> Cluster
    TrainV2 --> Scaler
    TrainV2 --> Features
    
    Clinical --> Flask
    Cluster --> Flask
    Scaler --> Flask
    Features --> Flask
    
    Flask --> Predict
    Predict --> Explain
    
    Predict --> Drift
    Predict --> AB
    TrainV2 --> MLflow
```

### ML Model Types

```mermaid
graph TB
    subgraph Clustering["Clustering (Ahlqvist Subtypes)"]
        K4["K-Means K=4"]
        SIDD["SIDD<br/>Severe Insulin-Deficient"]
        SIRD["SIRD<br/>Severe Insulin-Resistant"]
        MOD["MOD<br/>Mild Obesity-Related"]
        MARD["MARD<br/>Mild Age-Related"]
        
        K4 --> SIDD
        K4 --> SIRD
        K4 --> MOD
        K4 --> MARD
    end

    subgraph Classification["Classification"]
        Binary["Binary Classifier<br/>Diabetes Risk"]
        Clinical["Clinical Model<br/>Risk Score"]
    end

    subgraph Features["Input Features"]
        Bio["Biomarkers<br/>HbA1c, FBS, Lipids"]
        Demo["Demographics<br/>Age, Menopause"]
        Life["Lifestyle<br/>Activity, Family History"]
    end

    Features --> Classification
    Features --> Clustering
```

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Production["🌐 Production Environment"]
        subgraph CDN["CDN / Edge"]
            Vercel["Vercel<br/>Static Hosting"]
        end

        subgraph APILayer["API Layer"]
            Render["Render<br/>Go Backend"]
        end

        subgraph DataLayer["Data Layer"]
            Neon["Neon<br/>PostgreSQL"]
            Upstash["Upstash<br/>Redis"]
        end

        subgraph MLDeploy["ML Deployment"]
            RenderML["Render<br/>Python/Flask"]
            ModelsS3["Model Artifacts<br/>Object Storage"]
        end
    end

    User["User Browser"] -->|"HTTPS"| Vercel
    Vercel -->|"API Calls"| Render
    Render -->|"SQL"| Neon
    Render -->|"Cache"| Upstash
    Render -->|"HTTP 5001"| RenderML
    RenderML -->|"Load"| ModelsS3
```

---

## API Endpoint Map

### Public Endpoints

```mermaid
flowchart LR
    subgraph Public["Public (No Auth)"]
        H1["GET /healthz"]
        H2["GET /livez"]
        A1["POST /auth/login"]
        A2["POST /auth/register"]
        A3["POST /auth/refresh"]
        A4["POST /auth/logout"]
    end

    Client["Client"] --> H1
    Client --> H2
    Client --> A1
    Client --> A2
    Client --> A3
    Client --> A4
```

### Protected Endpoints

```mermaid
flowchart LR
    subgraph Protected["Protected (JWT Required)"]
        direction TB
        
        subgraph User["/users/me/*"]
            U1["GET /profile"]
            U2["PUT /profile"]
            U3["POST /onboarding"]
            U4["GET /consent"]
            U5["PUT /consent"]
            U6["GET /trends"]
            U7["GET /assessments"]
            U8["POST /assessments"]
            U9["GET /export/pdf"]
        end
        
        subgraph Analytics["/analytics"]
            An1["GET /summary"]
        end
        
        subgraph Insights["/insights"]
            I1["GET /metrics"]
            I2["GET /cluster"]
            I3["GET /cohort"]
        end
    end

    Client["Client (+ JWT)"] --> User
    Client --> Analytics
    Client --> Insights
```

### Admin Endpoints

```mermaid
flowchart LR
    subgraph Admin["Admin (JWT + Admin Role)"]
        direction TB
        
        AD1["GET /admin/dashboard"]
        AD2["GET /admin/users"]
        AD3["POST /admin/users"]
        AD4["PUT /admin/users/:id"]
        AD5["DELETE /admin/users/:id"]
        AD6["GET /admin/audit"]
        AD7["GET /admin/models"]
        AD8["GET /admin/events/stream<br/>(SSE)"]
    end

    AdminClient["Admin Client"] --> Admin
```

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 🔵 Blue | Client Layer |
| 🟠 Orange | Frontend |
| 🟢 Green | Backend |
| 🩷 Pink | ML Service |
| 🟣 Purple | Data Layer |
| 🔴 Red | External/Error |

---

## Quick Reference

| Component | Port | Language | Framework |
|-----------|------|----------|-----------|
| Frontend | 4000 | JavaScript | React 18 + Vite |
| Backend | 8080 | Go 1.21+ | Gin |
| ML Server | 5001 | Python 3.10+ | Flask |
| PostgreSQL | 5432 | SQL | PostgreSQL 15+ |
| Redis | 6379 | - | Redis 7+ |

---

## Related Documentation

- [Detailed Architecture](./docs/01-architecture/detailed-architecture.md)
- [Backend Guide](./docs/02-guides/backend.md)
- [Frontend Guide](./docs/02-guides/frontend.md)
- [ML System](./docs/02-guides/ml-system.md)
- [Database Schema](./docs/02-guides/database.md)
- [Deployment Guide](./docs/06-operations/deployment.md)
