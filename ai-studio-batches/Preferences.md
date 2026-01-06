# Preferences & Theming - Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Types & Interfaces](#types--interfaces)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)

---

## Overview

Users can customize their experience, primarily through **Theming**.
- **Mode**: Light, Dark, or System Sync.
- **Faculty Themes**: Dynamic colors based on user's faculty (e.g., Engineering = Maroon, Science = Blue).

---

## Types & Interfaces

```typescript
export type ThemeMode = 'LIGHT' | 'DARK' | 'AUTO';

export interface UserPreferences {
  themeMode: ThemeMode;
  facultyThemeEnabled: boolean;
  accentColor?: string; // Hex code
  primaryColor?: string; // Hex code
}

export interface FacultyColorMap {
  [facultyName: string]: {
    primary: string;
    accent: string;
  };
}
```

---

## API Endpoints

### 1. Get Preferences

**Endpoint:** `GET /api/preferences/theme`

**Response:**
```json
{
  "themeMode": "AUTO",
  "facultyThemeEnabled": true,
  "accentColor": null
}
```

### 2. Update Preferences

**Endpoint:** `PATCH /api/preferences/theme`

**Body:**
```json
{
  "themeMode": "DARK",
  "facultyThemeEnabled": false
}
```

### 3. Get Faculty Colors

**Endpoint:** `GET /api/preferences/faculties/colors`

**Response:**
```json
{
  "Engineering": { "primary": "#800000", "accent": "#FFD700" },
  "Science": { "primary": "#0000FF", "accent": "#FFFFFF" }
}
```

---

## Frontend Implementation

### Theme Context Provider

This handles applying the CSS variables to the document root.

```tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';

const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('AUTO');
  
  // 1. Fetch Preferences
  const { data: prefs } = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const { data } = await api.get('/preferences/theme');
      return data;
    }
  });

  // 2. Apply Theme Logic
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = 
      mode === 'DARK' || 
      (mode === 'AUTO' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Apply Faculty Colors if enabled
    if (prefs?.facultyThemeEnabled && prefs?.primaryColor) {
      root.style.setProperty('--primary', prefs.primaryColor);
    }
  }, [mode, prefs]);

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Theme Switcher Component

```tsx
export function ThemeToggle() {
  const { mode, updateTheme } = useTheme(); // Custom hook wrapper
  
  return (
    <div className="flex gap-2 bg-slate-100 p-1 rounded-full">
      {['LIGHT', 'AUTO', 'DARK'].map((m) => (
        <button
          key={m}
          onClick={() => updateTheme(m as ThemeMode)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            mode === m ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
```
