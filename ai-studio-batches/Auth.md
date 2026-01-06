# Authentication & Profile - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)
5. [Validation Schemas](#validation-schemas)

---

## Overview

The Authentication system uses **JWT (JSON Web Tokens)**. The token must be included in the `Authorization` header as `Bearer <token>` for all protected endpoints.

**Roles:**
- `USER`: Standard student/staff.
- `ADMIN`: Moderators and operational staff.
- `SUPER_ADMIN`: Full system access.

---

## Types & Interfaces

```typescript
// Core User Type (matches Prisma Schema)
export interface User {
  id: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  faculty: string | null;
  department: string | null;
  academicLevel: string | null;
  residenceArea: string | null;
  
  // Verification & Status
  isVerified: boolean;
  verificationLevel: 'BASIC' | 'VERIFIED' | 'PREMIUM_VERIFIED';
  verificationStatus: 'NOT_VERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  badge: string | null;
  
  // Profile
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  
  // Stats
  trustScore: number;
  riskScore: number;
  
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  faculty: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
```

---

## API Endpoints

### 1. Register User

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "student@unn.edu.ng",
  "password": "SecurePassword123!",
  "fullName": "Chinedu Okeke",
  "phoneNumber": "08012345678",
  "faculty": "Engineering"
}
```

**Response (201 Created):**
```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUz...",
  "user": {
    "id": "uuid-string",
    "email": "student@unn.edu.ng",
    "role": "USER",
    "isVerified": false,
    ...
  }
}
```

### 2. Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "student@unn.edu.ng",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUz...",
  "user": { ... }
}
```

### 3. Get Current User Profile

**Endpoint:** `GET /api/auth/profile`  
**Headers:** `Authorization: Bearer <TOKEN>`

**Response (200 OK):**
```json
{
  "id": "uuid-string",
  "email": "student@unn.edu.ng",
  "fullName": "Chinedu Okeke",
  ...
}
```

### 4. Update Profile

**Endpoint:** `PATCH /api/auth/profile`  
**Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: multipart/form-data`

**FormData Fields:**
- `fullName`: string
- `phoneNumber`: string
- `department`: string
- `residenceArea`: string
- `avatar`: File (image/jpeg, image/png)

**Response (200 OK):**
```json
{
  "message": "Profile updated",
  "user": { ...updatedUser }
}
```

---

## Frontend Implementation

### Auth Context (Zustand/Context)

We recommend using a global store for auth state.

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (token, user) => {
        localStorage.setItem('token', token); // For Axios interceptor
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null });
      },
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### React Query Hooks

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

// --- Login Mutation ---
export const useLogin = () => {
  const login = useAuthStore((state) => state.login);
  
  return useMutation({
    mutationFn: async (creds: LoginCredentials) => {
      const { data } = await api.post<AuthResponse>('/auth/login', creds);
      return data;
    },
    onSuccess: (data) => {
      login(data.token, data.user);
    },
  });
};

// --- Update Profile Mutation ---
export const useUpdateProfile = () => {
  const updateUser = useAuthStore((state) => state.updateUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      // Must allow multipart/form-data
      const { data } = await api.patch<{ message: string; user: User }>(
        '/auth/profile', 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data;
    },
    onSuccess: (data) => {
      updateUser(data.user);
      queryClient.setQueryData(['auth', 'profile'], data.user);
    },
  });
};
```

---

## Validation Schemas (Zod)

Use these schemas with `react-hook-form`.

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid UNN email').endsWith('@unn.edu.ng', 'Must be a UNN email'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email().endsWith('@unn.edu.ng', 'Must be a UNN email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  phoneNumber: z.string().regex(/^0[789][01]\d{8}$/, 'Invalid Nigerian phone number'),
  faculty: z.string().min(1, 'Faculty is required'),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phoneNumber: z.string().regex(/^0[789][01]\d{8}$/).optional(),
  department: z.string().optional(),
  residenceArea: z.string().optional(),
});
```
