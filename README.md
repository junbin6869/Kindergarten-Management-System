# Kindergarten Student and Fee Management

Monorepo for a Spring Boot backend, React admin dashboard, and React Native mobile app.

## Apps

- `backend`: Spring Boot REST API for auth, students, classes, attendance, invoices, and Stripe Checkout.
- `admin-web`: React web dashboard for admins.
- `mobile-app`: React Native Expo app for teachers and parents.

## MVP Roles

- Admin: manage students, classes, users, attendance, invoices, and payment status.
- Teacher: view assigned class, record attendance, and view fee status.
- Parent: view children, attendance history, invoices, and pay via Stripe Checkout.

## Notes

- The backend defaults to SQLite for local development. MySQL is kept as an optional profile for later.
- Stripe uses test mode keys. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` before testing real Checkout sessions.
- Java and Maven are required to run the backend.

## Demo Accounts

All SQL-seeded accounts use the password `password`.

- Admin: `admin@kindergarten.test`
- Teacher: `teacher@kindergarten.test`
- Teacher: `teacher2@kindergarten.test`
- Teacher: `teacher3@kindergarten.test`
- Parent: `parent@kindergarten.test`
- Parent: `parent2@kindergarten.test`
- Parent: `parent3@kindergarten.test`
- Parent: `parent4@kindergarten.test`
- Parent: `parent5@kindergarten.test`

The demo data includes 3 classes, 10 students, linked parent records, attendance history, June/May invoices, and paid/pending/failed payment states.

## Run Locally

Open three PowerShell terminals: one for the backend web server, one for the admin web dashboard, and one for the mobile app.

### 1. Backend / Web Server

cd C:\Users\junbi\Document\Kindergarten\backend
.\run-local.ps1

Use this command when `mvn` is already available in your PATH:

```powershell
cd C:\Users\junbi\Document\Kindergarten\backend
mvn spring-boot:run
```

If `mvn` is not available, use the Maven bundled in this repo:

```powershell
cd C:\Users\junbi\Document\Kindergarten\backend
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:Path="$env:JAVA_HOME\bin;C:\Users\junbi\Document\Kindergarten\tools\apache-maven-3.9.11\bin;$env:Path"
mvn spring-boot:run
```

Backend URL:

```text
http://localhost:8080
```

The backend creates a local SQLite file at `backend/kindergarten.db` and loads `backend/src/main/resources/data-sqlite.sql`.

### 2. Admin Web

```powershell
cd C:\Users\junbi\Document\Kindergarten\admin-web
npm install
npm run dev
```

Admin web URL:

```text
http://localhost:5173
```

### 3. Mobile App

```powershell
cd C:\Users\junbi\Document\Kindergarten\mobile-app
npm install
npm run start
```

Then scan the Expo QR code with Expo Go.

For Android emulator or Android device:

```powershell
cd C:\Users\junbi\Document\Kindergarten\mobile-app
npm run android
```

For iOS simulator:

```powershell
cd C:\Users\junbi\Document\Kindergarten\mobile-app
npm run ios
```

For mobile web:

```powershell
cd C:\Users\junbi\Document\Kindergarten\mobile-app
npm run web
```

For Android emulator/device testing, replace `API_URL` in `mobile-app/App.js` with your machine LAN IP, for example `http://192.168.1.10:8080/api`.

## Optional MySQL Profile

SQLite is the default local setup. Use MySQL only if you want to test the optional MySQL profile:

```powershell
cd C:\Users\junbi\Document\Kindergarten
docker compose up -d mysql

cd backend
$env:DB_USERNAME='root'
$env:DB_PASSWORD='root'
mvn spring-boot:run "-Dspring-boot.run.profiles=mysql"
```

## Stripe Payments

The app uses Stripe Checkout. No Stripe Product setup is required because each bill is sent to Stripe as a dynamic Checkout line item.

Required backend environment variables:

```text
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
FRONTEND_SUCCESS_URL=http://YOUR_LAN_IP:8080/api/payments/return/success
FRONTEND_CANCEL_URL=http://YOUR_LAN_IP:8080/api/payments/return/cancel
```

Local Stripe webhook forwarding:

```powershell
stripe listen --forward-to http://localhost:8080/api/payments/webhook
```

Start the backend with Stripe enabled:

```powershell
cd C:\Users\junbi\Document\Kindergarten\backend
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:Path="$env:JAVA_HOME\bin;C:\Users\junbi\Document\Kindergarten\tools\apache-maven-3.9.11\bin;$env:Path"
$env:STRIPE_SECRET_KEY='sk_test_xxx'
$env:STRIPE_WEBHOOK_SECRET='whsec_xxx'
$env:FRONTEND_SUCCESS_URL='http://192.168.1.2:8080/api/payments/return/success'
$env:FRONTEND_CANCEL_URL='http://192.168.1.2:8080/api/payments/return/cancel'
mvn spring-boot:run
```

Use this Stripe test card:

```text
4242 4242 4242 4242
Any future expiry
Any CVC
Any postal code
```

The webhook is the source of truth for marking bills as paid. The mobile app opens the Stripe Checkout URL and refreshes bills when the user returns to the app.
