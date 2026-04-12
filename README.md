# AE Rule Engine — Config Management System
### Applied Data Finance | AI Hackathon Project

A full-stack configuration management platform for the Affiliate Engine (AE) decision rules, cutoffs, and constraints — replacing manual Excel-based workflows with a governed, auditable, Bitbucket-style change management UI.

---

## 🏗 Architecture

```
ae-rule-engine/
├── backend/          ← Spring Boot 3.2 (Java 17)
│   ├── pom.xml
│   └── src/main/java/com/adf/ruleengine/
│       ├── model/          Rule, StateConstraint, ChannelConstraint, AuditLog
│       ├── repository/     JPA repositories
│       ├── service/        RuleService, ConstraintService, DataSeedService
│       ├── controller/     RuleController, ConstraintController, DashboardController
│       ├── dto/            RuleDto, ConstraintDto
│       └── config/         SecurityConfig (CORS, CSRF)
└── frontend/         ← React 18 + Vite
    └── src/
        ├── pages/          Dashboard, Rules, StateConfig, ChannelConfig,
        │                   ReviewQueue, PromoteToProd, AuditTrail
        ├── components/     Sidebar, DiffViewer, RuleModal, StateModal,
        │                   ChannelModal, RuleDetailModal
        └── services/       api.js (Axios)
```

---

## 🚀 Running Locally

### Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run
# Starts on http://localhost:8080
# H2 console: http://localhost:8080/h2-console (JDBC: jdbc:h2:mem:ruleenginedb)
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
# Starts on http://localhost:5173
# Proxies /api → http://localhost:8080
```

---

## 🔑 Key Features

### 1. Rule Management (`/rules`)
- View all AE rules organized by phase (Before Data Pull, TU Pull, Credit Grade, Offer Logic)
- Create / edit rules with full form validation
- Seeded with **20 real rules** from the AE spec Excel (AE_INVALID_STATE, AE_PTSMI, AE_LTI, AE_DEDUPE_DAYS, AE_TUSOFT_VANTAGE_SCORE, etc.)
- Phase filters, search by rule ID / description

### 2. State Configuration (`/states`)
- Card + table view for all 35 FEB states
- ON/OFF toggle per state (CO, NC, NE, NV, PA, SD, WA, CA, NM are pre-seeded as OFF)
- Loan amount / APR / term / origination fee constraints per state
- WI special logic: `minimum($175, 5% of disbursal amount)`

### 3. Channel Configuration (`/channels`)
- Color-coded cards for 7 channels: CMPQ, CKPQ, CMACT, QS, LT, ML, MO
- Per-channel loan amount, APR, term, origination fee constraints

### 4. Change Workflow
```
Analyst edits → Submit for Review → Manager reviews with DIFF → Approve/Reject → Promote to PROD
```

### 5. Review Queue (`/reviews`) — Bitbucket-style
- All pending items (Rules + States + Channels) in one queue
- **Field-level diff viewer**: red (before) / green (after) per field — NOT raw JSON
- Approve with one click
- Reject with mandatory comment box
- Diff expanded inline with "Compare" toggle

### 6. Promote to Production (`/promote`)
- TEST vs PROD side-by-side comparison
- Items grouped: "Ready to Promote" (APPROVED) vs "Not Ready"
- Shows diff between what's in TEST vs what's currently in PROD
- One-click promote button with spinner

### 7. Audit Trail (`/audit`)
- Timeline view of all changes
- Filter by entity type (Rule / State / Channel) and action
- Who, what, when — with relative timestamps
- Stats sidebar by action type

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

### Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rules?env=TEST` | Get all rules |
| POST | `/api/rules` | Create rule |
| PUT | `/api/rules/{id}` | Update rule |
| POST | `/api/rules/{id}/submit` | Submit for review |
| POST | `/api/rules/{id}/review` | Approve / Reject |
| POST | `/api/rules/{id}/promote` | Promote to PROD |
| GET | `/api/rules/{id}/audit` | Audit history |

### State Constraints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/constraints/states?env=TEST` | Get all states |
| POST | `/api/constraints/states` | Upsert state |
| POST | `/api/constraints/states/{id}/submit` | Submit for review |
| POST | `/api/constraints/states/{id}/review` | Approve / Reject |
| POST | `/api/constraints/states/{id}/promote` | Promote to PROD |

### Channel Constraints
Similar pattern at `/api/constraints/channels`

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Summary counts |
| GET | `/api/dashboard/activity` | Recent audit log |

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

## 🗄 Switching to PostgreSQL (Production)

Replace in `application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/ruleenginedb
spring.datasource.driver-class-name=org.postgresql.Driver
spring.datasource.username=postgres
spring.datasource.password=your_password
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=update
```

---

## 💡 Future Enhancements (Hackathon Roadmap)

- [ ] AI-powered rule suggestion from natural language description
- [ ] Bulk import from Excel (parse spec sheet directly)
- [ ] Rule conflict detection (overlapping cutoffs)
- [ ] Email notifications on pending reviews
- [ ] JWT-based role authentication (Analyst / Reviewer / Admin)
- [ ] Camunda BPMN workflow integration
- [ ] Rule simulation / dry-run against test leads
- [ ] Export config snapshot as Excel / JSON
