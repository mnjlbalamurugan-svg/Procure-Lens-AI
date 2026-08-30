# ProcureLens AI

> From vendor proposals to confident procurement decisions.

ProcureLens AI is a B2B SaaS web application designed to help organizations analyze vendor proposals, map compliance matrices, evaluate procurement requirements, flag hidden risks, and generate explainable selection decisions.

---

## Demo Login (Hackathon Judges)

To evaluate the application, please use the following credentials on the login page:

*   **URL**: [http://localhost:5173](http://localhost:5173) (Local) or the deployed frontend URL.
*   **Username**: `judge`
*   **Password**: `ProcureAI@2026`

**To Log Out**: Click the **Logout** button at the bottom of the left sidebar on the project dashboard, or in the top-right header on the landing page.

---


## Technical Architecture & Core Principles

The platform follows a transparent **hybrid architecture**:

1. **AI Services**: Used for extracting structured parameters from raw document streams (PDF, DOCX, XLSX, TXT) and generating natural-language summaries, chat answers, and emails.
2. **Deterministic Evaluation**: Re-ranking and calculations are managed by a deterministic Python scoring module, preventing AI score hallucinations.

For full architecture details, review the [Architecture Document](file:///docs/architecture.md).

---

## Key Features

- **Requirements Builder**: Dynamic line-item parameters setting weight significances, compliance margins, and mandatory conditions.
- **Visual Compliance Matrix**: Color-coded check grid showing exactly which vendor matches or fails requirements. Clicking any cell shows supporting grounding quotes from the proposal.
- **Risk registry & Action Center**: Automatically lists contract gaps, delivery delays, and payment flags (e.g. advance payments) with mitigation recommendations.
- **Decision Simulator**: Live slider weights adjustments trigger real-time, mathematical vendor re-ranking in 100ms.
- **AI Assistant Chat**: Context-bound assistant answering queries regarding proposals (restricted strictly to database records).
- **Negotiation Email Composer**: Creates draft emails detailing payment and delivery modifications tailored to each vendor's risk profile.
- **Printable HTML Reports**: Generates print-ready comparative summaries using `@media print` style wrappers.
- **Sandbox Demo Mode**: A 1-click database seed loading the standard Laptop Procurement project with Vendor A, B, and C PDF proposals fully configured.

---

## Installation & Local Startup

### 1. Requirements

- Python 3.10+
- Node.js 18+

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows PowerShell
.\venv\Scripts\Activate.ps1
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```
Copy `.env.example` to `.env` and configure:
```env
DATABASE_URL=sqlite:///./procurelens.db
DEMO_MODE=true
GEMINI_API_KEY=
CORS_ORIGINS=["http://localhost:5173"]
```
Start development backend:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running with Docker

Start both services containerized using Docker Compose:
```bash
docker-compose up --build
```
The client serves on [http://localhost:5173](http://localhost:5173) and the API endpoint listens on [http://localhost:8000](http://localhost:8000).
