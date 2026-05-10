# AE Rule Engine — Complete Config Management System
### Applied Data Finance | AI Hackathon Project

A full-stack configuration management platform for the Affiliate Engine (AE) decision rules, cutoffs, constraints, and offer configurations — replacing manual Excel-based workflows with a governed, auditable, Bitbucket-style change management UI.

---

## 🚀 Quick Start (Easiest Way)

### Using start.sh (Recommended)
```bash
# From project root directory
bash start.sh

# This will:
# ✅ Start backend on http://localhost:8080
# ✅ Start frontend on http://localhost:5173
# ✅ Open browser automatically
# ✅ Show real-time logs
```

### Manual Startup (Alternative)

**Terminal 1 - Backend:**
```bash
cd Rule-Engine
./mvnw spring-boot:run
# Runs on http://localhost:8080
```

**Terminal 2 - Frontend:**
```bash
cd UI_UX
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 🏗 Project Structure

```
ae-rule-engine/
├── Rule-Engine/          ← Backend (Spring Boot 3.2, Java 17)
│   ├── pom.xml
│   └── src/main/java/com/adf/ruleengine/
│       ├── model/        Rule, StateConstraint, ChannelConstraint, OfferConfig
│       ├── repository/   JPA repositories
│       ├── service/      RuleService, ConstraintService, OfferConfigService
│       ├── controller/   RuleController, EmbeddedRuleController
│       └── config/       SecurityConfig, CORS
│
├── UI_UX/                ← Frontend (React 18 + Vite)
│   ├── src/
│   │   ├── pages/        Dashboard, Rules, StateConfig, ChannelConfig,
│   │   │                 ReviewQueue, PromoteToProd, AuditTrail, OfferConfigLoader
│   │   ├── components/   Sidebar, DiffViewer, RuleModal, LineageTracer
│   │   └── services/     api.js (Axios)
│   └── package.json
│
└── documents/            ← API docs, architecture diagrams
```

---

## 🎯 Core Features

### 1. 📋 Rule Management (`/rules`)
- **View & Filter**: All AE rules organized by phase (Before Data Pull, TU Pull, Credit Grade, Offer Logic)
- **Create/Edit**: Full form validation with real-time error messages
- **Pre-seeded**: 20 real rules from AE spec (AE_INVALID_STATE, AE_PTSMI, AE_LTI, AE_DEDUPE_DAYS, etc.)
- **Search**: By rule ID, description, or applicable segment
- **Timeout Fix**: Increased API timeout from 10s → 30s for reliable updates
- **Optimistic Updates**: UI updates immediately while backend processes

### 2. 🗺 State Configuration (`/states`)
- **Card + Table View**: All 35 FEB states with ON/OFF toggles
- **Pre-configured**: CO, NC, NE, NV, PA, SD, WA, CA, NM marked as OFF
- **Constraints**: Loan amount, APR, term, origination fee per state
- **Special Logic**: WI = `minimum($175, 5% of disbursal amount)`

### 3. 🔌 Channel Configuration (`/channels`)
- **Color-coded Cards**: 7 channels (CMPQ, CKPQ, CMACT, QS, LT, ML, MO)
- **Per-Channel Limits**: Loan amount, APR, term, origination fee
- **Quick Edit**: Inline editing with instant validation

### 4. 💼 Offer Configuration Loader (`/offer-config`) — NEW
- **Excel Upload**: Drag-and-drop or click to upload SimplifiedOfferLogicSampleConfig.xlsx
- **Auto-Parse**: Extracts 5 tables from Excel:
  - **External Bands**: Vantage Score ranges (EB1-EB6)
  - **Internal Bands**: V11 ADF + Market Score ranges (IB1-IB10)
  - **Grade Lookup Matrix**: EB × IB → Credit Grade mapping
  - **Grade Offers**: Credit grade limits (A1-F) with APR, loan amounts, fees
  - **Tenor Options**: Loan amount ranges with available tenor options
- **Batch Versioning**: Each upload gets unique batchId + version tracking
- **Fallback Data**: Uses hardcoded sample config if backend parsing fails
- **Real-time Display**: All 5 tabs update immediately after upload

### 5. 📊 Change Workflow
```
Analyst edits → Submit for Review → Manager reviews with DIFF → Approve/Reject → Promote to PROD
```

### 6. 🔍 Review Queue (`/reviews`) — Bitbucket-style
- **Unified Queue**: All pending items (Rules + States + Channels + Offers)
- **Field-level Diff**: Red (before) / Green (after) for each field
- **One-click Actions**: Approve or Reject with comments
- **Inline Compare**: Toggle to see full diff view

### 7. 🚀 Promote to Production (`/promote`)
- **Side-by-side Comparison**: TEST vs PROD configs
- **Status Grouping**: "Ready to Promote" (APPROVED) vs "Not Ready"
- **Diff Visualization**: Shows exactly what changes
- **One-click Deploy**: With spinner feedback

### 8. 📈 Audit Trail (`/audit`)
- **Timeline View**: All changes with who, what, when
- **Filters**: By entity type (Rule/State/Channel/Offer) and action
- **Relative Timestamps**: "2 hours ago", "May 10, 2026"
- **Stats Sidebar**: Count by action type

### 9. 🔗 Change Lineage (`/lineage`) — NEW
- **Rule History**: Complete audit trail for each rule
- **Event Timeline**: SEED → CUTOFF_CHANGE → APPROVED → PROMOTED
- **Value Changes**: Before/After comparison for each modification
- **Who Changed What**: Analyst name + timestamp for each event
- **Robust Date Handling**: Fallback timestamps if backend data missing

---

## 📋 Data Model

### Approval Lifecycle
```
DRAFT → PENDING_REVIEW → APPROVED → [Promote] → PROD
                       ↓
                    REJECTED → DRAFT (edit & resubmit)
```

### Rule Phases
| Phase | Examples |
|-------|---------|
| BEFORE_DATA_PULL | AE_INVALID_STATE, AE_PTSMI, AE_LTI, AE_DEDUPE_DAYS |
| TU_PULL | AE_TUSOFT_VANTAGE_SCORE, AE_TUSOFT_CV_SCORE, AE_THIN_FILE_RULE |
| CREDIT_GRADE | AE_GRADE_F |
| OFFER_LOGIC | Offer generation rules |

### Pre-seeded Rules (from Excel spec)
| Rule ID | Description |
|---------|-------------|
| AE_INVALID_STATE | FEB state check |
| AE_INVALID_ADDRESS | PO BOX rejection |
| AE_INVALID_REQUSET_AMOUNT | Per-channel loan amount cutoffs |
| AE_PTSMI | Payment-to-income check (59.5% APR, 36mo) |
| AE_LTI | Loan-to-income check (cutoff: 0.3) |
| AE_DEDUPE_DAYS | 30-day dedup logic |
| AE_NEGATIVE_FILE | Negative file check |
| AE_QS_Low_AnnualIncome_CreditRating | QS income+credit rating gate |
| AE_ASSIGNED_CREDIT_SCORE | LT FICO score gate (550) |
| AE_LOW_INCOME | Income floor by channel |
| AE_TUSOFT_NO_HIT | TU no-hit rejection |
| AE_TUSOFT_VANTAGE_SCORE | Vantage score thresholds |
| AE_TUSOFT_CV_SCORE | CV score thresholds |
| AE_TUSOFT_SUSPECT_SCORE_CV | Suspicious high CV score |
| AE_TUSOFT_SUSPECT_SCORE_VANTAGE | Suspicious high Vantage score |
| AE_TUSOFT_STUDENT_LOAN | Student loan attribute check |
| AE_THIN_FILE_RULE | Thin file by channel |
| AE_RISK_RULE | Non-student trades risk check |
| AE_HighChargeOffTrades | Charge-off trades gate |
| AE_GRADE_F | Credit grade F rejection |

---

## 🔌 API Endpoints

### Rules Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rules?env=TEST` | Get all rules (TEST or PROD) |
| POST | `/api/rules` | Create new rule |
| PUT | `/api/rules/{id}` | Update rule |
| POST | `/api/rules/{id}/submit` | Submit for review |
| POST | `/api/rules/{id}/review` | Approve / Reject with comment |
| POST | `/api/rules/{id}/promote` | Promote to PROD |
| GET | `/api/rules/{id}/audit` | Complete audit history |
| GET | `/api/lineage/{ruleId}` | Rule change lineage |

### State Constraints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/constraints/states?env=TEST` | Get all 35 states |
| POST | `/api/constraints/states` | Upsert state config |
| POST | `/api/constraints/states/{id}/submit` | Submit for review |
| POST | `/api/constraints/states/{id}/review` | Approve / Reject |
| POST | `/api/constraints/states/{id}/promote` | Promote to PROD |

### Channel Constraints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/constraints/channels?env=TEST` | Get all 7 channels |
| POST | `/api/constraints/channels` | Upsert channel config |
| POST | `/api/constraints/channels/{id}/submit` | Submit for review |
| POST | `/api/constraints/channels/{id}/review` | Approve / Reject |
| POST | `/api/constraints/channels/{id}/promote` | Promote to PROD |

### Offer Configuration (NEW)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/embedded/offer-config/load` | Upload & parse Excel file |
| GET | `/api/v1/embedded/offer-config/active` | Get active offer config |

### Dashboard & Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Summary stats (total rules, pending reviews) |
| GET | `/api/dashboard/activity` | Recent audit log entries |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.2, Java 17 |
| ORM | Spring Data JPA + Hibernate |
| Database | H2 (dev) / PostgreSQL (prod) |
| Security | Spring Security (CORS configured) |
| Frontend | React 18, Vite |
| Routing | React Router v6 |
| HTTP | Axios |
| Notifications | React Hot Toast |
| Icons | Lucide React |
| Dates | date-fns |

---

---

## � Prerequisites

Before starting, ensure you have:
- **Java 17+** installed (`java -version`)
- **Node.js 16+** installed (`node -v`)
- **Maven 3.8+** (usually bundled with Spring Boot)
- **Port 8080** (backend) and **5173** (frontend) available

---

## ⚙️ Environment Setup

### Backend Configuration
Edit `Rule-Engine/src/main/resources/application.properties`:
```properties
# Server
server.port=8080

# Database (H2 for dev)
spring.datasource.url=jdbc:h2:mem:ruleenginedb
spring.datasource.driver-class-name=org.h2.Driver
spring.h2.console.enabled=true

# JPA
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.jpa.hibernate.ddl-auto=create-drop

# CORS
server.servlet.context-path=/
```

### Frontend Configuration
Edit `UI_UX/vite.config.js`:
```javascript
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
}
```

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Clear Maven cache
rm -rf ~/.m2/repository

# Rebuild
cd Rule-Engine
./mvnw clean install
./mvnw spring-boot:run
```

### Frontend Port Already in Use
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

### API Timeout Errors
- Backend timeout is set to **30 seconds** (increased from 10s)
- For large Excel files, this may still be insufficient
- Increase in `src/main/java/.../api.js`:
```javascript
const api = axios.create({ timeout: 60000 }) // 60 seconds
```

### Excel Upload Fails
- Ensure file is **SimplifiedOfferLogicSampleConfig.xlsx**
- Check file has sheets: **MAIN** and **OFFER_CONFIG**
- Backend will fall back to hardcoded sample data if parsing fails
- Check browser console for detailed error logs

### Database Issues
```bash
# Reset H2 database
rm -rf ~/.h2/ruleenginedb*

# Access H2 console
# http://localhost:8080/h2-console
# JDBC URL: jdbc:h2:mem:ruleenginedb
```

---

## 📊 Database Setup (Production)

### Switch to PostgreSQL
Edit `application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/ruleenginedb
spring.datasource.driver-class-name=org.postgresql.Driver
spring.datasource.username=postgres
spring.datasource.password=your_password
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=update
```

### Switch to MySQL
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/ruleenginedb
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.username=root
spring.datasource.password=your_password
spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect
spring.jpa.hibernate.ddl-auto=update
```

---

## � Usage Guide

### 1. Create a Rule
1. Go to **Rules** page
2. Click **New Rule** button
3. Fill form:
   - Rule ID (e.g., `AE_CUSTOM_RULE`)
   - Description
   - Phase (Before Data Pull, TU Pull, Credit Grade, Offer Logic)
   - Applicable Segment
   - Cutoff Value
4. Click **Save** → Rule saved as DRAFT
5. Click **Submit for Review** → Sent to manager

### 2. Upload Offer Configuration
1. Go to **Offer Config Loader** page
2. Drag-and-drop or click to upload Excel file
3. System automatically parses:
   - External Bands (EB1-EB6)
   - Internal Bands (IB1-IB10)
   - Grade Lookup Matrix
   - Grade Offers (A1-F)
   - Tenor Options
4. View each tab to verify data
5. Batch ID and version shown in top-right

### 3. Review & Approve Changes
1. Go to **Review Queue** page
2. See all pending rules, states, channels
3. Click **Compare** to see field-level diff
4. Click **Approve** or **Reject** with comment
5. Approved items ready to promote

### 4. Promote to Production
1. Go to **Promote to Prod** page
2. See TEST vs PROD side-by-side
3. Items grouped: "Ready to Promote" vs "Not Ready"
4. Click **Promote** button to deploy to PROD

### 5. View Audit Trail
1. Go to **Audit Trail** page
2. See timeline of all changes
3. Filter by entity type or action
4. Click rule to see complete lineage

---

## 💡 Recent Improvements

### ✅ Completed
- [x] Offer Configuration Excel parser (5 tables)
- [x] Batch versioning for offer configs
- [x] Rule update timeout increased (10s → 30s)
- [x] Optimistic UI updates for rules
- [x] Change lineage with event timeline
- [x] Robust date handling in lineage
- [x] Backend field name fixes for offer config
- [x] Fallback data for tenor options

### 🚀 Roadmap
- [ ] AI-powered rule suggestion from description
- [ ] Rule conflict detection (overlapping cutoffs)
- [ ] Email notifications on pending reviews
- [ ] JWT-based role authentication (Analyst/Reviewer/Admin)
- [ ] Rule simulation / dry-run against test leads
- [ ] Export config snapshot as Excel/JSON
- [ ] Bulk import from Excel spec sheet
