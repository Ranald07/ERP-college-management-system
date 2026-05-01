# APR College ERP

A full-stack college ERP system for APR College of Engineering.

## Tech Stack
- **Frontend**: React 18, React Router v6, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: MySQL (WAMP)
- **Auth**: JWT + bcryptjs

## Roles
| Role | Access |
|---|---|
| Admin | Full system access |
| Teacher | Marks entry, leave review, query replies |
| Student | View marks, apply leave, raise queries |

## Setup

### Prerequisites
- Node.js 18+
- WAMP Server (MySQL on localhost:3306)

### 1. Database
Open phpMyAdmin → `college_erp` database → SQL tab → paste and run `server/schema.sql`

### 2. Server
```bash
cd server
cp .env.example .env
# Edit .env with your MySQL password and a strong JWT_SECRET
npm install
node migrate.js   # adds new columns
node seed.js      # sample data
npm run dev
```

### 3. Client
```bash
cd client
cp .env.example .env
npm install
npm start
```

### 4. LAN Access
Update `client/.env`:
```
REACT_APP_API_URL=http://YOUR_IP:5000/api
```

## Default Credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@apr.edu | admin123 |
| Student | arun@apr.edu | student123 |
| Teacher | ramesh@apr.edu | teacher123 |

## Features
- Student & Teacher management
- Marks entry (3 internals /50 + external /60 = total /100)
- Marks lock/unlock per subject
- Staff advisor system
- Leave application & review
- Subject Q&A with threaded replies
- Announcements with notification bell
- Subject analysis & teacher performance charts
- Student rank & CGPA
- Excel export & CSV bulk import
- Fully offline — no internet required
