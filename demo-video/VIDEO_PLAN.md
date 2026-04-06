# Diana V2 - Prototype Demonstration Video Plan

## Video Overview
- **Duration**: 5-7 minutes
- **Purpose**: Thesis defense showcase + portfolio piece
- **Target Audience**: Academic committee, potential employers, healthcare stakeholders
- **Format**: Screen recording with professional captions/overlays + background music
- **Resolution**: 1920x1080 (Full HD)

---

## Storyboard & Script

### Scene 1: Opening Hook (0:00-0:30)
**Visual**: Animated title card with Diana V2 logo
**Text Overlay**: 
- "Diabetes affects 1 in 4 menopausal women"
- "Early detection saves lives"
- "Introducing Diana V2"
**Audio**: Subtle, professional background music
**Transition**: Fade to app

---

### Scene 2: Problem Statement (0:30-1:00)
**Visual**: Split screen showing statistics + app interface
**Text Overlay**:
- "Traditional diabetes screening misses early warning signs"
- "Menopausal women face unique metabolic risks"
- "Machine learning can predict risk years before diagnosis"
**On-screen**: Brief glimpse of NHANES dataset visualization
**Transition**: Slide to login screen

---

### Scene 3: User Journey - Registration & Onboarding (1:00-1:45)
**Visual**: Screen recording of signup flow
**Actions**:
1. Show registration form
2. Complete onboarding questionnaire
3. Highlight consent management (GDPR-compliant)
**Text Overlay**: "Secure, privacy-first design"
**Key Points**: 
- JWT authentication
- Role-based access control
- Data consent management
**Transition**: Fade to dashboard

---

### Scene 4: Core Feature - Risk Assessment (1:45-3:00)
**Visual**: Assessment form being filled
**Actions**:
1. Navigate to "New Assessment"
2. Input biomarkers (BMI, age, waist circumference, etc.)
3. Submit assessment
4. Show real-time ML prediction result
**Text Overlay**:
- "Non-invasive biomarkers only"
- "No HbA1c or fasting glucose required for screening"
- "Logistic Regression + Random Forest ensemble"
**Key Features to Highlight**:
- Form validation
- SHAP explanations showing feature contributions
- Risk classification (Low/Moderate/High)
- Ahlqvist subtype clustering (SIRD, SIDD, MOD, MARD)
**Transition**: Split screen to results

---

### Scene 5: Results & Insights (3:00-4:00)
**Visual**: Dashboard with assessment results
**Actions**:
1. Show risk score visualization
2. Display personalized recommendations
3. Navigate to Insights tab
4. Show trend charts and correlations
**Text Overlay**:
- "Personalized risk insights"
- "Track changes over time"
- "Evidence-based recommendations"
**Visual Elements**:
- Animated risk indicator
- Interactive charts (Recharts/Victory)
- Cluster comparison visualization
**Transition**: Zoom to admin view

---

### Scene 6: Admin & Analytics (4:00-4:45)
**Visual**: Admin dashboard
**Actions**:
1. Switch to admin role
2. Show user management
3. Display audit logs
4. Model performance metrics
**Text Overlay**:
- "Clinic-ready admin tools"
- "Full audit trail"
- "Model monitoring & drift detection"
**Key Features**:
- User CRUD operations
- Audit log viewer with SSE streaming
- Model traceability
**Transition**: Slide to tech stack

---

### Scene 7: Technical Architecture (4:45-5:30)
**Visual**: Architecture diagram + code snippets
**Text Overlay**:
- "Go + Gin REST API"
- "React + Vite frontend"
- "Python Flask ML service"
- "PostgreSQL + SQLC"
- "Docker containerized"
**Visual Elements**:
- System architecture diagram
- Brief code highlights (handlers, ML predictor)
- Database schema glimpse
**Transition**: Fade to export feature

---

### Scene 8: Export & Mobile (5:30-6:15)
**Visual**: PDF export + mobile responsive view
**Actions**:
1. Generate PDF report
2. Show mobile-responsive design
3. Brief glimpse of PWA capabilities
**Text Overlay**:
- "Exportable PDF reports"
- "Mobile-first responsive design"
- "Works on any device"
**Transition**: Fade to closing

---

### Scene 9: Closing & Impact (6:15-7:00)
**Visual**: Summary screen with key metrics
**Text Overlay**:
- "Diana V2: Predictive diabetes risk assessment"
- "Built with Go, React, Python ML"
- "Ready for clinical deployment"
**Call to Action**:
- GitHub repo link
- LinkedIn profile
- Contact information
**Audio**: Music swells, fade out

---

## Production Notes

### Tools Needed
1. **Screen Recording**: OBS Studio or Screen Studio (macOS)
2. **Video Editing**: DaVinci Resolve (free) or iMovie
3. **Motion Graphics**: Canva or After Effects (optional)
4. **Audio**: Epidemic Sound or YouTube Audio Library

### Recording Setup
- **Resolution**: 1920x1080
- **Frame Rate**: 30fps
- **Cursor**: Highlight clicks with tool like Cursor Pro
- **Browser**: Chrome in incognito, zoom at 100%
- **Environment**: Clean desktop, no notifications

### Caption Style
- Font: Inter or SF Pro Display
- Size: 48pt for titles, 32pt for body
- Color: White with subtle shadow
- Animation: Smooth fade-in, 0.3s duration

### Color Palette
- Primary: #3B82F6 (Blue - trust/health)
- Secondary: #10B981 (Green - success/low risk)
- Accent: #F59E0B (Amber - warning/moderate risk)
- Danger: #EF4444 (Red - high risk)
- Background: #0F172A (Dark slate)

---

## Recording Checklist

### Pre-Recording
- [ ] Start all services (`bash scripts/dev/start-all.sh`)
- [ ] Seed database with demo data (`make seed`)
- [ ] Clear browser cache
- [ ] Set screen resolution to 1920x1080
- [ ] Disable notifications
- [ ] Prepare demo accounts (demo@diana.app, admin@diana.app)

### Demo Data Setup
```bash
# Create diverse assessments for trends
# User: demo@diana.app / demopassword123
# Admin: admin@diana.app / admin123
```

### Recording Segments
- [ ] Scene 1: Title card (created in Canva/After Effects)
- [ ] Scene 2: Problem statement (static graphics)
- [ ] Scene 3: Registration flow (screen recording)
- [ ] Scene 4: Assessment creation (screen recording)
- [ ] Scene 5: Dashboard & insights (screen recording)
- [ ] Scene 6: Admin features (screen recording)
- [ ] Scene 7: Architecture slides (static/exported)
- [ ] Scene 8: Mobile view + PDF export (screen recording)
- [ ] Scene 9: Closing card (static graphics)

---

## Post-Production

### Editing Steps
1. Import all footage
2. Trim dead space and loading times
3. Add transitions (fade, slide)
4. Overlay captions/text
5. Add background music (duck during narration)
6. Color grade if needed
7. Export as MP4 (H.264, 1080p)

### Export Settings
- **Format**: MP4
- **Codec**: H.264
- **Resolution**: 1920x1080
- **Frame Rate**: 30fps
- **Bitrate**: 10-15 Mbps

---

## Deliverables

1. **Main Video**: `diana-v2-demo.mp4` (5-7 min)
2. **Thumbnail**: `thumbnail.png` (1280x720)
3. **GIF Teaser**: `diana-v2-teaser.gif` (for README)
4. **Script Document**: This file

---

## Quick Start Commands

```bash
# Start the full stack
cd /Users/adriangabriellfrancisco/workspace/github.com/Skufu/dianav2
bash scripts/dev/start-all.sh

# Seed demo data
make seed

# Access points:
# Frontend: http://localhost:4000
# Backend: http://localhost:8080
# ML Server: http://localhost:5001
```

---

## Success Metrics

This video should demonstrate:
- ✅ Full-stack development capability (Go + React + Python)
- ✅ ML/AI integration (scikit-learn, SHAP explanations)
- ✅ Healthcare domain knowledge (diabetes, biomarkers)
- ✅ Production-ready practices (auth, audit, Docker)
- ✅ UI/UX design skills (Tailwind, animations)

---

*Created for Diana V2 Thesis Defense & Portfolio*
*Adrian Francisco | 2026*
