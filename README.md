# 🚀 MERN Stack Hackathon Authentication Foundation

A robust, production-ready, modular authentication foundation built with **Node.js, Express, MongoDB (Mongoose), JWT, Brevo Transactional Email (OTP Verification), React 19, and Vite**.

Designed specifically as a reliable, drop-in authentication module for fast-paced hackathons and full-stack projects.

---

## 📑 Table of Contents
- [Architecture Overview](#-architecture-overview)
- [Key Features](#-key-features)
- [Authentication & OTP Flow](#-authentication--otp-flow)
- [API Endpoints Specification](#-api-endpoints-specification)
- [Environment Variables](#-environment-variables)
- [Getting Started](#-getting-started)
- [Verification & Testing Checklist](#-verification--testing-checklist)
- [Hackathon Integration Guide](#-hackathon-integration-guide)

---

## 📂 Architecture Overview

```text
login-register-signup/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # MongoDB Mongoose connection utility
│   │   ├── controllers/
│   │   │   └── authController.js  # Register, Verify-OTP, Resend-OTP, Login, Logout, & GetMe
│   │   ├── middleware/
│   │   │   └── authMiddleware.js  # JWT Bearer guard with email verification check
│   │   ├── models/
│   │   │   └── User.js            # Mongoose User schema with bcrypt & hashed OTP methods
│   │   ├── routes/
│   │   │   └── authRoutes.js      # Express auth routes
│   │   ├── services/
│   │   │   └── emailService.js    # Brevo Transactional Email REST API service
│   │   ├── utils/
│   │   │   └── generateToken.js   # JWT signing helper
│   │   └── server.js              # Express app entry point
│   ├── .env.example               # Backend environment variables template
│   ├── .env                       # Local backend environment configuration
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js           # Axios instance with auth interceptors
    │   ├── components/
    │   │   ├── Alert.jsx          # Reusable error & success notification banners
    │   │   ├── Button.jsx         # Accessible button with spinner loading state
    │   │   └── InputField.jsx     # Reusable input with validation & show/hide toggle
    │   ├── context/
    │   │   └── AuthContext.jsx    # React Context with user state & auth methods
    │   ├── pages/
    │   │   ├── Dashboard.jsx      # Protected dashboard displaying verified credentials
    │   │   ├── Login.jsx          # Login page with unverified email recovery link
    │   │   ├── Register.jsx       # Register page redirecting to OTP verification
    │   │   └── VerifyOtp.jsx      # Interactive 6-digit OTP verification screen
    │   ├── routes/
    │   │   └── ProtectedRoute.jsx # Route guard for private pages
    │   ├── App.jsx                # React Router setup
    │   ├── index.css              # Responsive CSS design system with OTP styling
    │   └── main.jsx
    ├── .env.example               # Frontend environment variables template
    ├── .env                       # Local frontend configuration
    ├── index.html
    └── package.json
```

---

## ✨ Key Features

1. **MongoDB Atlas Integration**: Auto-connects on startup with sanitized connection logging.
2. **Brevo Email OTP Verification**: Sends clean branded HTML/plain-text transactional verification emails with 6-digit OTPs.
3. **Secure OTP Lifecycle**:
   - OTP is hashed using SHA-256 before storage in MongoDB.
   - Configurable expiration (default 10 minutes via `OTP_EXPIRY_MINUTES`).
   - 30-second rate-limiting cooldown preventing excessive resend requests.
   - OTP is invalidated and erased upon successful verification.
4. **Guarded Login & Protected Routes**:
   - Accounts require verified email before login.
   - Attempts to log in with unverified emails return informative alerts with a 1-click link to verify.
   - Protected API routes verify both JWT signature and `isEmailVerified === true`.
5. **Interactive UI**:
   - Auto-advancing 6-digit numeric input boxes with backspace and clipboard paste support.
   - Real-time countdown timer for OTP resend cooldown.
   - Verified user badge and account metadata on the Dashboard.

---

## 🔄 Authentication & OTP Flow

```text
Registration Flow:
User enters Name, Email, Password
            ↓
Client-side form validation
            ↓
POST /api/auth/register
            ↓
Backend checks if email exists:
  - If verified → 400 'Email already registered'
  - If unverified → Updates user, resets OTP & cooldown, dispatches email
  - If new user → Creates user (isEmailVerified: false), dispatches email
            ↓
Brevo sends 6-digit OTP email
            ↓
User redirected to /verify-otp

Verification Flow:
User enters 6 digits on /verify-otp
            ↓
POST /api/auth/verify-otp { email, otp }
            ↓
Backend checks:
  - User exists?
  - OTP not expired?
  - Hashed OTP matches?
  - isEmailVerified not already true?
            ↓
Sets isEmailVerified = true, clears OTP
            ↓
Issues JWT token & logs user in → Redirects to Dashboard /
```

---

## 🔌 API Endpoints Specification

### 1. Register User
- **Method & Path:** `POST /api/auth/register`
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Account created! Please enter the verification code sent to your email.",
    "email": "jane@example.com"
  }
  ```

### 2. Verify OTP
- **Method & Path:** `POST /api/auth/verify-otp`
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "otp": "123456"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Email verified successfully!",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "664b4c73...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "isEmailVerified": true,
      "createdAt": "2026-09-18T12:00:00.000Z"
    }
  }
  ```

### 3. Resend OTP
- **Method & Path:** `POST /api/auth/resend-otp`
- **Request Body:**
  ```json
  {
    "email": "jane@example.com"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "A new verification code has been sent to your email."
  }
  ```
- **Rate Limit Response (429 Too Many Requests):**
  ```json
  {
    "success": false,
    "message": "Resend available in 25 seconds",
    "remainingSeconds": 25
  }
  ```

### 4. Login User
- **Method & Path:** `POST /api/auth/login`
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Unverified Account Response (403 Forbidden):**
  ```json
  {
    "success": false,
    "message": "Please verify your email before logging in.",
    "isEmailVerified": false,
    "email": "jane@example.com"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged in successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "664b4c73...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "isEmailVerified": true,
      "createdAt": "2026-09-18T12:00:00.000Z"
    }
  }
  ```

### 5. Logout User
- **Method & Path:** `POST /api/auth/logout`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### 6. Get Current User Profile
- **Method & Path:** `GET /api/auth/me`
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "664b4c73...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "isEmailVerified": true,
      "createdAt": "2026-09-18T12:00:00.000Z"
    }
  }
  ```

### 7. Health Check
- **Method & Path:** `GET /api/health`
- **Response (200 OK):**
  ```json
  {
    "status": "online",
    "timestamp": "2026-09-18T12:00:00.000Z",
    "databaseConnected": true,
    "message": "MERN Auth API is running smoothly"
  }
  ```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173

MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.net/dbname

JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Brevo Email Configuration
BREVO_API_KEY=xkeysib-your_brevo_api_key_here
BREVO_SENDER_EMAIL=your-verified-sender@example.com
BREVO_SENDER_NAME=MERN Auth

OTP_EXPIRY_MINUTES=10
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🚀 Getting Started

### 1. Start Backend Server
```bash
cd backend
npm install
npm run dev
```
Backend will start on: **`http://localhost:5000`**

### 2. Start Frontend App
```bash
cd frontend
npm install
npm run dev
```
Frontend will be available at: **`http://localhost:5173`**

---

## 🛡️ Security Best Practices
- Passwords are encrypted with `bcryptjs` (salt rounds: 10).
- OTPs are cryptographically hashed using SHA-256 before persistence.
- Raw OTPs and passwords are removed from JSON serialization (`select: false`).
- Resend operations enforce a strict 30-second cooldown window.
- All secrets and keys are strictly restricted to backend environment variables.
