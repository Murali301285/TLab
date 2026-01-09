# T-Lab Learning Platform - Antigravity Handover Context

## 1. Project Overview
**Name**: T-Lab Learning Platform
**Description**: A corporate LMS (Learning Management System) for assigning courses, tracking progress, and providing AI-based coaching.
**Current Phase**: Active Development / Refinement of User & Admin Dashboards.

## 2. Technology Stack
*   **Framework**: Next.js 14 (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Database**: PostgreSQL
*   **ORM**: Prisma
*   **Authentication**: Custom JWT (JOSE) + Cookies (HTTP-only)
*   **Icons**: Lucide React

## 3. Key Functionalities Implemented
### Authentication & RBAC
*   **Login**: `/api/auth/login` checks credentials against Prisma DB and issues an HTTP-only `auth-token` cookie.
*   **Session**: `/api/auth/me` verifies the token AND fetches fresh user data (Name, Role, Image) from the DB to ensure accuracy.
*   **Logout**: `/api/auth/logout` clears the cookie.
*   **Roles**:
    *   `admin`: Full access (Content, Users, Config, plus all Learner modules).
    *   `user` (student/employee): Restricted access (Learning, Mentors, Coaching only).

### Dashboard (`/dashboard`)
*   **Dynamic Rendering**:
    *   **Admin**: Sees "Content Management", "User Management", "Configuration", plus "Learning Centre", "Mentors Hub", "Coaching Section".
    *   **User**: Sees only "Learning Centre", "Mentors Hub", "Coaching Section".
*   **Stats**: Admin does *not* see individual learning stats on the dashboard. Users do.
*   **Header**: Displays "Good Morning/Afternoon, [User Name]" dynamically.

### User Management
*   **Profile**:
    *   View/Edit personal info.
    *   **Email is Read-Only**.
    *   **Profile Image Upload**: Clickable avatar allows uploading an image.
    *   **Logic**: Image is saved to `public/uploads/profiles/` and path stored in DB.
*   **Admin Panel**: Ability to manage users and view direct reports (Hierarchy).

### Learning
*   **Assignments**: Users see courses specifically explicitly assigned to them via the `Enrollment` table.

## 4. Environment Setup (Required .env)
The new instance needs a `.env` file with:
```env
DATABASE_URL="postgresql://user:password@host:port/dbname"
JWT_SECRET="your-secure-secret-key"
```

## 5. Critical Database Operations
*   **Schema**: Located at `prisma/schema.prisma`.
*   **Setup**:
    ```bash
    npm install
    npx prisma generate
    npx prisma db push  # or migrate dev
    ```

## 6. Recent Code Changes (for context)
*   **`app/api/auth/me/route.ts`**: Modified to fetch full user details from DB instead of relying on stale JWT payload.
*   **`components/ProfileDropdown.tsx`**: Updated to show dynamic user name and uploaded avatar image.
*   **`app/dashboard/page.tsx`**: Refactored to handle Admin/User view logic and unlock Learner modules for Admins.
*   **`app/profile/page.tsx`**: Implemented file upload logic and read-only email.
*   **`app/api/users/profile/image/route.ts`**: New endpoint for handling image file uploads.

## 7. Next Steps / Pending Items
*   **Verify Image Persistence**: Ensure `public/uploads` persists in the deployment environment (if moving to cloud, switch to S3/Blob storage).
*   **Profile Save**: The "Save Changes" button in Profile currently has a timeout simulation (`setTimeout`). Needs to be connected to a real `PATCH /api/users/profile` endpoint.
*   **Password Reset**: UI exists but backend logic needs verification/implementation.

## 8. Directory Structure Highlights
*   `/app`: Next.js App Router pages.
*   `/components`: Reusable UI components (ProfileDropdown, AuthProvider etc).
*   `/prisma`: Database schema.
*   `/public/uploads`: Stores user uploaded content (locally).

---
**Note to new Agent**: Start by verifying the `DATABASE_URL` connection and running `npx prisma generate`. The authentication flow is custom (not NextAuth.js library), handled in `app/api/auth`.
