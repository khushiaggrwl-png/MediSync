# MediSync — Full-Stack Clinical Care & Continuity Prototype

MediSync is a demonstration full-stack prototype for patient-centred clinical case-taking, case-specific record attachment, care discovery and continuity of care.

## Included
- Real Node.js backend (`server.js`)
- SQLite persistence using Node's built-in `node:sqlite`
- Login/session authentication
- Patient health-record uploads
- Multiple independent clinical cases per patient
- Adaptive, concern-specific history questions
- English + Hindi + Bengali + Tamil question flows
- Browser speech input where supported
- Case progress + draft persistence
- Case-specific record attachment
- Physician-ready draft report with missing/uncertain information flags
- Hospital/doctor discovery with relevance, distance, availability, fee and rating sorting
- Appointment booking with explicit **case selection**
- Recommended case highlighting when the clinician specialty matches the case
- Dashboard, My Cases, Records, Care Finder and Appointments
- Privacy/consent and clinician-verification language in the workflow

## Demo account
Email: `demo@medisync.local`
Password: `MediSync@123`

## Run locally
1. Install Node.js 22+.
2. Open a terminal in this folder.
3. Run:

```bash
npm install
npm start
```

4. Open `http://localhost:3000`.

## Suggested demo flow
1. Sign in with the demo account.
2. Open **My Cases** and create a **Skin / hair** case.
3. Switch language to Hindi, Bengali or Tamil and answer the detailed history questions.
4. Attach a relevant report from **Case Documents**.
5. Complete the case and open the **Doctor-ready report**.
6. Select **Find care for this case**.
7. In Care Finder, compare facilities by match, distance, availability, fee or rating.
8. Book a dermatologist and explicitly select the skin case to send.
9. Open **Appointments** to see which case was submitted.
10. Create a second case to demonstrate separate clinical stories being stored independently.

## Important prototype boundary
The hospital, doctor, appointment slots and facility information are demo data. The prototype does not perform autonomous diagnosis or live ABDM/HIS integration. Clinicians remain the final decision-makers and clinical information is presented as patient-reported/verification-required where appropriate.


## v4 fix
This build fixes the initial blank-screen issue by adding the missing frontend render/auth render bootstrap functions and cache-busting the frontend assets.
