# Admin Dashboard & Management - Frontend Implementation Guide

Complete guide for implementing the admin dashboard and management features in your frontend application.

---

## Table of Contents
1. [Overview](#overview)
2. [Admin Endpoints](#admin-endpoints)
3. [Dashboard Implementation](#dashboard-implementation)
4. [User Management](#user-management)
5. [Verification Management](#verification-management)
6. [Listing Moderation](#listing-moderation)
7. [Security & Authentication](#security--authentication)
8. [Complete Examples](#complete-examples)

---

## Overview

The admin system provides comprehensive tools for managing users, verifications, and listings. This guide covers frontend implementation for all admin features.

### Admin Roles

```typescript
type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

// Role permissions:
// USER - Regular user, no admin access
// ADMIN - Can manage verifications, moderate listings, view dashboard
// SUPER_ADMIN - Full access including user management
```

### Required Dependencies

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.90.16",
    "axios": "^1.13.2",
    "react-router-dom": "6.22.3"
  }
}
```

---

## Admin Endpoints

### 1. Dashboard Statistics

**Endpoint:** `GET /api/admin/dashboard`

**Purpose:** Get overview statistics for the admin dashboard

**Headers:**
```typescript
{
  'Authorization': 'Bearer <ADMIN_TOKEN>',
  'Content-Type': 'application/json'
}
```

**Response (200):**
```json
{
  "stats": {
    "totalUsers": 1250,
    "verifiedUsers": 890,
    "pendingVerifications": 12,
    "activeListings": 340,
    "flaggedListings": 8,
    "totalTransactions": 2560,
    "revenue": 125000.50
  },
  "recentActivity": [
    {
      "id": "act-001",
      "type": "USER_REGISTERED",
      "user": "student@unn.edu.ng",
      "timestamp": "2026-01-04T10:30:00.000Z"
    },
    {
      "id": "act-002",
      "type": "VERIFICATION_SUBMITTED",
      "user": "john@unn.edu.ng",
      "timestamp": "2026-01-04T10:25:00.000Z"
    }
  ],
  "growthMetrics": {
    "usersThisWeek": 45,
    "usersLastWeek": 38,
    "listingsThisWeek": 120,
    "listingsLastWeek": 105
  }
}
```

**Frontend Implementation:**

```typescript
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface DashboardStats {
  stats: {
    totalUsers: number;
    verifiedUsers: number;
    pendingVerifications: number;
    activeListings: number;
    flaggedListings: number;
    totalTransactions: number;
    revenue: number;
  };
  recentActivity: Activity[];
  growthMetrics: {
    usersThisWeek: number;
    usersLastWeek: number;
    listingsThisWeek: number;
    listingsLastWeek: number;
  };
}

const fetchDashboard = async (): Promise<DashboardStats> => {
  const { data } = await api.get<DashboardStats>('/admin/dashboard');
  return data;
};

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  const growthRate = ((data.growthMetrics.usersThisWeek - data.growthMetrics.usersLastWeek) / 
                      data.growthMetrics.usersLastWeek * 100).toFixed(1);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={data.stats.totalUsers.toLocaleString()}
          trend={`+${growthRate}%`}
          icon={<Users />}
          color="blue"
        />
        <StatCard
          title="Verified Users"
          value={data.stats.verifiedUsers.toLocaleString()}
          subtitle={`${((data.stats.verifiedUsers / data.stats.totalUsers) * 100).toFixed(1)}% verified`}
          icon={<ShieldCheck />}
          color="green"
        />
        <StatCard
          title="Pending Verifications"
          value={data.stats.pendingVerifications}
          priority={data.stats.pendingVerifications > 10 ? 'high' : 'normal'}
          icon={<Clock />}
          color="yellow"
        />
        <StatCard
          title="Flagged Listings"
          value={data.stats.flaggedListings}
          priority={data.stats.flaggedListings > 5 ? 'high' : 'normal'}
          icon={<AlertTriangle />}
          color="red"
        />
      </div>

      {/* Recent Activity */}
      <RecentActivityFeed activities={data.recentActivity} />
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, trend, icon, color, priority }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    red: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className={`glass-panel p-6 rounded-2xl ${priority === 'high' ? 'ring-2 ring-red-400' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center`}>
          {icon}
        </div>
        {trend && (
          <span className="text-sm font-medium text-green-600">
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold">{value}</h3>
        <p className="text-slate-500 text-sm mt-1">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
```

---

### 2. User Management

**Endpoint:** `GET /api/admin/users`

**Purpose:** List and search all users with filtering

**Query Parameters:**
```typescript
interface UserFilters {
  search?: string;        // Search by email, name
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isVerified?: boolean;
  faculty?: string;
  page?: number;
  limit?: number;
}
```

**Response (200):**
```json
{
  "users": [
    {
      "id": "user-001",
      "email": "student@unn.edu.ng",
      "fullName": "John Doe",
      "faculty": "Engineering",
      "department": "Computer Science",
      "isVerified": true,
      "verificationLevel": "VERIFIED",
      "role": "USER",
      "trustScore": 85.5,
      "createdAt": "2025-12-01T10:00:00.000Z",
      "lastLoginAt": "2026-01-04T08:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1250,
    "page": 1,
    "limit": 20,
    "totalPages": 63
  }
}
```

**Frontend Implementation:**

```typescript
const fetchUsers = async (filters: UserFilters) => {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.role) params.append('role', filters.role);
  if (filters.isVerified !== undefined) params.append('isVerified', String(filters.isVerified));
  if (filters.faculty) params.append('faculty', filters.faculty);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  const { data } = await api.get(`/admin/users?${params.toString()}`);
  return data;
};

function UserManagementPage() {
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 20,
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 500);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { ...filters, search: debouncedSearch }],
    queryFn: () => fetchUsers({ ...filters, search: debouncedSearch }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <button className="btn-primary">
          <Download className="w-4 h-4" />
          Export Users
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filters.role || ''}
            onChange={(e) => setFilters({ ...filters, role: e.target.value as any, page: 1 })}
            className="input"
          >
            <option value="">All Roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>

          {/* Verification Filter */}
          <select
            value={filters.isVerified === undefined ? '' : String(filters.isVerified)}
            onChange={(e) => setFilters({ 
              ...filters, 
              isVerified: e.target.value === '' ? undefined : e.target.value === 'true',
              page: 1 
            })}
            className="input"
          >
            <option value="">All Users</option>
            <option value="true">Verified Only</option>
            <option value="false">Unverified Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold">User</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Faculty</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Trust Score</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Joined</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.users.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={filters.page}
        totalPages={data?.pagination.totalPages}
        onPageChange={(page) => setFilters({ ...filters, page })}
      />
    </div>
  );
}

function UserRow({ user }: { user: User }) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar src={user.avatarUrl} name={user.fullName} />
          <div>
            <div className="font-medium">{user.fullName || 'No name'}</div>
            <div className="text-sm text-slate-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm">{user.faculty || '—'}</div>
        <div className="text-xs text-slate-500">{user.department || ''}</div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <VerificationBadge status={user.verificationLevel} />
          <RoleBadge role={user.role} />
        </div>
      </td>
      <td className="px-6 py-4">
        <TrustScoreBadge score={user.trustScore} />
      </td>
      <td className="px-6 py-4">
        <div className="text-sm">{formatDate(user.createdAt)}</div>
        {user.lastLoginAt && (
          <div className="text-xs text-slate-500">
            Active {formatDistanceToNow(new Date(user.lastLoginAt))} ago
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        <UserActionsMenu user={user} />
      </td>
    </tr>
  );
}
```

---

### 3. User Export

**Endpoint:** `GET /api/admin/users/export`

**Purpose:** Export all users to CSV format

**Response (200):** CSV file download

**Frontend Implementation:**

```typescript
const exportUsers = async () => {
  const response = await api.get('/admin/users/export', {
    responseType: 'blob', // Important for file download
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `users-export-${new Date().toISOString()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportUsers();
      showToast('success', 'Export Complete', 'Users exported to CSV');
    } catch (error) {
      showToast('error', 'Export Failed', 'Could not export users');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button onClick={handleExport} disabled={isExporting} className="btn-outline">
      <Download className="w-4 h-4" />
      {isExporting ? 'Exporting...' : 'Export Users'}
    </button>
  );
}
```

---

### 4. Bulk User Actions

**Endpoint:** `POST /api/admin/users/bulk-action`

**Purpose:** Perform bulk actions on multiple users

**Request Body:**
```json
{
  "action": "SUSPEND" | "ACTIVATE" | "VERIFY" | "DELETE",
  "userIds": ["user-001", "user-002", "user-003"],
  "reason": "Optional reason for audit log"
}
```

**Response (200):**
```json
{
  "message": "Bulk action completed",
  "affected": 3,
  "failed": 0,
  "details": [
    {
      "userId": "user-001",
      "status": "success"
    }
  ]
}
```

**Frontend Implementation:**

```typescript
interface BulkActionRequest {
  action: 'SUSPEND' | 'ACTIVATE' | 'VERIFY' | 'DELETE';
  userIds: string[];
  reason?: string;
}

const performBulkAction = async (data: BulkActionRequest) => {
  const { data: response } = await api.post('/admin/users/bulk-action', data);
  return response;
};

function BulkActionDialog({ selectedUsers, onClose }: BulkActionDialogProps) {
  const [action, setAction] = useState<BulkActionRequest['action']>('SUSPEND');
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const bulkMutation = useMutation({
    mutationFn: performBulkAction,
    onSuccess: (data) => {
      showToast('success', 'Bulk Action Complete', `${data.affected} users updated`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      onClose();
    },
    onError: (error: any) => {
      showToast('error', 'Bulk Action Failed', error.response?.data?.message);
    },
  });

  const handleSubmit = () => {
    if (action === 'DELETE' && !confirm(`Are you sure you want to DELETE ${selectedUsers.length} users? This cannot be undone.`)) {
      return;
    }

    bulkMutation.mutate({
      action,
      userIds: selectedUsers.map(u => u.id),
      reason: reason || undefined,
    });
  };

  return (
    <Dialog open onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">Bulk Action</h2>
      <p className="text-slate-600 mb-6">
        Perform action on {selectedUsers.length} selected users
      </p>

      {/* Action Selection */}
      <div className="space-y-4 mb-6">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as any)}
          className="input w-full"
        >
          <option value="SUSPEND">Suspend Users</option>
          <option value="ACTIVATE">Activate Users</option>
          <option value="VERIFY">Verify Users</option>
          <option value="DELETE">Delete Users</option>
        </select>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional reason for audit log..."
          rows={3}
          className="input w-full"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-outline flex-1">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={bulkMutation.isPending}
          className={`btn flex-1 ${action === 'DELETE' ? 'btn-danger' : 'btn-primary'}`}
        >
          {bulkMutation.isPending ? 'Processing...' : `${action} ${selectedUsers.length} Users`}
        </button>
      </div>
    </Dialog>
  );
}
```

---

### 5. Listing Moderation Queue

**Endpoint:** `GET /api/admin/listings/queue`

**Purpose:** Get listings that need moderation

**Response (200):**
```json
{
  "queue": [
    {
      "id": "listing-001",
      "title": "MacBook Pro 2021",
      "price": 450000,
      "seller": {
        "id": "user-001",
        "email": "seller@unn.edu.ng",
        "fullName": "Jane Seller",
        "trustScore": 75.0
      },
      "moderation": {
        "priorityScore": 85.5,
        "status": "PENDING",
        "flaggedBy": ["AI", "PRICE_ANOMALY"],
        "autoFlagReason": "Price significantly below market average"
      },
      "createdAt": "2026-01-04T10:00:00.000Z"
    }
  ],
  "total": 8
}
```

**Frontend Implementation:**

```typescript
function ModerationQueue() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'moderation', 'queue'],
    queryFn: () => api.get('/admin/listings/queue').then(res => res.data),
    refetchInterval: 30000,
  });

  // Sort by priority
  const sortedQueue = data?.queue.sort((a, b) => 
    b.moderation.priorityScore - a.moderation.priorityScore
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Moderation Queue</h1>
        <span className="text-lg font-semibold text-slate-600">
          {data?.total || 0} items pending
        </span>
      </div>

      {sortedQueue?.map((item) => (
        <ModerationCard key={item.id} listing={item} />
      ))}
    </div>
  );
}

function ModerationCard({ listing }: { listing: any }) {
  const priority = listing.moderation.priorityScore;
  const priorityColor = priority > 80 ? 'red' : priority > 50 ? 'yellow' : 'blue';

  return (
    <div className={`glass-panel p-6 rounded-2xl border-l-4 border-l-${priorityColor}-500`}>
      {/* Priority Badge */}
      <div className="flex items-center justify-between mb-4">
        <PriorityBadge score={priority} />
        <span className="text-sm text-slate-500">
          Flagged {formatDistanceToNow(new Date(listing.createdAt))} ago
        </span>
      </div>

      {/* Listing Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-bold text-lg mb-2">{listing.title}</h3>
          <p className="text-2xl font-bold text-accent mb-2">
            ₦{listing.price.toLocaleString()}
          </p>
          <div className="flex flex-wrap gap-2">
            {listing.moderation.flaggedBy.map((flag: string) => (
              <span key={flag} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                {flag}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm text-slate-600 mb-2">Seller:</div>
          <div className="font-medium">{listing.seller.fullName}</div>
          <div className="text-sm text-slate-500">{listing.seller.email}</div>
          <TrustScoreBadge score={listing.seller.trustScore} className="mt-2" />
        </div>
      </div>

      {/* Flag Reason */}
      {listing.moderation.autoFlagReason && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-900 mb-1">Flagged Reason</div>
              <div className="text-sm text-yellow-800">{listing.moderation.autoFlagReason}</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button className="btn-success flex-1">
          <CheckCircle className="w-4 h-4" />
          Approve
        </button>
        <button className="btn-danger flex-1">
          <XCircle className="w-4 h-4" />
          Reject
        </button>
        <button className="btn-outline">
          <Eye className="w-4 h-4" />
          View Details
        </button>
      </div>
    </div>
  );
}
```

---

## Security & Authentication

### 1. Admin Route Protection

```typescript
// ProtectedRoute component
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    // Redirect to login, but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    // User is logged in but not an admin
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-slate-600">You need admin privileges to access this page.</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Usage in routes
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="verifications" element={<VerificationManagement />} />
        <Route path="moderation" element={<ModerationQueue />} />
      </Route>
    </Routes>
  );
}
```

### 2. API Interceptor for Admin Requests

```typescript
// api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Not authorized (not an admin)
      console.error('Admin access required');
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Complete Examples

### Full Admin Layout with Sidebar

```typescript
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  Flag, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/verifications', label: 'Verifications', icon: ShieldCheck },
    { path: '/admin/moderation', label: 'Moderation', icon: Flag },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-accent">Admin Portal</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <Avatar src={user?.avatarUrl} name={user?.fullName} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{user?.fullName}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

---

## Best Practices

1. **Always check admin role** before rendering admin components
2. **Use React Query** for caching and auto-refresh
3. **Implement optimistic updates** for better UX
4. **Show loading states** during API calls
5. **Handle errors gracefully** with user-friendly messages
6. **Log all admin actions** for audit trail
7. **Use confirmation dialogs** for destructive actions
8. **Implement pagination** for large datasets
9. **Add search and filters** for better navigation
10. **Auto-refresh critical data** (pending items, flagged listings)

---

## Testing Checklist

- [ ] Admin routes are protected from non-admin users
- [ ] Dashboard loads correctly with all stats
- [ ] User list displays with pagination
- [ ] Search and filters work correctly
- [ ] User export downloads CSV file
- [ ] Bulk actions execute successfully
- [ ] Moderation queue shows flagged listings
- [ ] All API errors are handled gracefully
- [ ] Loading states display during async operations
- [ ] Logoutredirects to login page
- [ ] Non-admin users see access denied message
- [ ] Token expiration redirects to login

---

**Need More Examples?** Check out the detailed [Admin_Verification.md](./Admin_Verification.md) guide for verification-specific implementations.
