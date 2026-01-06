# Frontend Integration Testing Guide

This guide outlines what to test for each API module when implementing the Campus Swap frontend.

---

## 🔐 Auth Module

### Critical Tests
- [ ] **Registration Flow**
  - Valid email format (must end with @unn.edu.ng)
  - Password strength validation (min 8 characters)
  - All required fields present
  - Duplicate email handling (should show error)
  - Success redirects to login/dashboard

- [ ] **Login Flow**
  - Successful login stores JWT token
  - Token persists across page refreshes
  - Invalid credentials show appropriate error
  - Redirect to dashboard on success

- [ ] **Profile Management**
  - GET profile loads user data correctly
  - Profile update persists changes
  - Avatar upload works (file size limits, formats)
  - Unauthorized access redirects to login

### Edge Cases
- Expired token handling
- Network errors during auth
- Concurrent login sessions

---

## 🛍️ Listings Module

### Critical Tests
- [ ] **Browse Listings**
  - Listings load on page load
  - Filter by category works
  - Filter by faculty works
  - Search functionality returns relevant results
  - Pagination/infinite scroll works

- [ ] **Create Listing**
  - Form validation (all required fields)
  - Image upload (multiple images, size limits)
  - Price validation (positive numbers)
  - Condition enum selection
  - Success creates listing and redirects

- [ ] **View Listing Details**
  - Single listing loads correctly
  - Images display properly
  - Seller information shown
  - Purchase button visible/hidden based on ownership

- [ ] **Update/Delete Listing**
  - Only owner can edit/delete
  - Updates persist correctly
  - Delete removes listing and redirects
  - Status changes (ACTIVE → RESERVED → SOLD)

- [ ] **Purchase Flow**
  - Purchase button disabled for own listings
  - Payment method selection
  - Escrow option toggle
  - Insufficient balance handling
  - Success updates listing status

### Edge Cases
- Listing already sold
- Concurrent purchase attempts
- Image upload failures
- Invalid listing ID (404 handling)

---

## 💰 Wallet Module

### Critical Tests
- [ ] **Balance Display**
  - Current balance shows correctly
  - Reserved balance displays
  - Real-time updates after transactions

- [ ] **Deposit**
  - Amount validation (positive, reasonable limits)
  - Paystack integration works
  - Success updates balance immediately
  - Failed payment handling

- [ ] **Withdrawal**
  - Bank details validation
  - Minimum withdrawal amount
  - Insufficient balance error
  - Pending withdrawal status tracking
  - Success confirmation

### Edge Cases
- Negative amounts
- Very large amounts
- Network timeout during payment
- Webhook delays

---

## 💳 Payment Module

### Critical Tests
- [ ] **Payment Initialization**
  - Paystack popup opens
  - Correct amount displayed
  - Reference tracking

- [ ] **Payment Verification**
  - Success callback updates UI
  - Failed payment shows error
  - Duplicate verification prevention

### Edge Cases
- User closes payment popup
- Payment timeout
- Webhook vs polling race conditions

---

## ✅ Verification Module

### Critical Tests
- [ ] **ID Upload**
  - File format validation (images only)
  - File size limits
  - Multiple file upload
  - Preview before submit
  - Success shows pending status

- [ ] **Verification Status**
  - Status badge displays correctly
  - Different levels (BASIC, VERIFIED, PREMIUM_VERIFIED)
  - Admin approval workflow

### Edge Cases
- Invalid file types
- Oversized files
- Verification rejection handling

---

## ⭐ Reviews Module

### Critical Tests
- [ ] **Submit Review**
  - Rating selection (1-5 stars)
  - Optional comment field
  - Can only review after transaction
  - Cannot review self
  - Success shows review immediately

- [ ] **View Reviews**
  - User's reviews display
  - Reviews received display
  - Average rating calculation
  - Pagination for many reviews

### Edge Cases
- Rating out of range
- Duplicate review prevention
- Review spam protection

---

## 💬 Conversations Module

### Critical Tests
- [ ] **Start Conversation**
  - Create conversation from listing
  - Duplicate conversation prevention
  - Redirect to conversation view

- [ ] **Send Message**
  - Message appears immediately
  - Real-time updates via WebSocket
  - Message persistence
  - Timestamp display

- [ ] **View Conversations**
  - List all conversations
  - Unread message indicators
  - Last message preview
  - Sorting by recent activity

### Edge Cases
- WebSocket disconnection
- Message send failures
- Deleted conversation handling

---

## 🔔 Notifications Module

### Critical Tests
- [ ] **Notification List**
  - All notifications load
  - Unread count badge
  - Different notification types (MESSAGE, TRANSACTION, SYSTEM)
  - Mark as read functionality

- [ ] **Real-time Notifications**
  - WebSocket notifications appear instantly
  - Sound/visual alerts
  - Notification persistence

### Edge Cases
- Many notifications (performance)
- Notification spam
- WebSocket reconnection

---

## ⚙️ Preferences Module

### Critical Tests
- [ ] **Theme Settings**
  - Theme mode toggle (LIGHT/DARK/AUTO)
  - Accent color picker
  - Font size adjustment
  - Changes persist

- [ ] **Notification Settings**
  - Toggle notification types
  - Email preferences
  - Push notification permissions

### Edge Cases
- Invalid color values
- Preference sync across devices

---

## 📊 Transactions Module

### Critical Tests
- [ ] **Transaction History**
  - All transactions load
  - Filter by type (DEPOSIT, PURCHASE, SALE, WITHDRAWAL)
  - Date range filtering
  - Export functionality

- [ ] **Transaction Details**
  - Full transaction info displays
  - Related listing/user links
  - Status tracking

### Edge Cases
- Empty transaction history
- Very long transaction lists
- Export large datasets

---

## 👨‍💼 Admin Module

### Critical Tests
- [ ] **Dashboard Access**
  - Admin-only access (role check)
  - Analytics load correctly
  - Date range selection
  - Export reports

- [ ] **User Management**
  - User list pagination
  - Search users
  - Ban/unban users
  - View user details

- [ ] **Listing Moderation**
  - Flag inappropriate listings
  - Approve/reject listings
  - Bulk actions

### Edge Cases
- Non-admin access attempts
- Bulk action limits
- Concurrent admin actions

---

## 📈 Analytics Module

### Critical Tests
- [ ] **User Analytics**
  - Sales metrics display
  - Purchase history charts
  - Performance over time

- [ ] **Platform Analytics** (Admin)
  - Total users/listings/transactions
  - Revenue charts
  - Growth metrics
  - Export data

### Edge Cases
- No data scenarios
- Large datasets (performance)
- Chart rendering issues

---

## 🚩 Reports Module

### Critical Tests
- [ ] **Submit Report**
  - Reason selection (enum validation)
  - Description required (min length)
  - Evidence upload
  - Success confirmation

- [ ] **View Reports** (Admin)
  - All reports list
  - Filter by status/type
  - Report details
  - Take action (resolve/dismiss)

### Edge Cases
- Duplicate reports
- Report spam prevention
- Evidence file handling

---

## 🔒 Escrow Module

### Critical Tests
- [ ] **Escrow Dashboard**
  - Active contracts display
  - Contract status tracking
  - Filter by role (buyer/seller)

- [ ] **Contract Creation**
  - Auto-create on purchase with escrow
  - Terms display correctly
  - Both parties notified

- [ ] **Contract Actions**
  - Sign contract (both parties)
  - Release funds (buyer confirmation)
  - Dispute handling
  - Real-time status updates via WebSocket

### Edge Cases
- Contract timeout
- Dispute resolution
- Partial releases

---

## 📦 Bulk Operations Module

### Critical Tests
- [ ] **Bulk Create Listings**
  - CSV upload validation
  - Template download
  - Progress tracking
  - Error reporting per row

- [ ] **Bulk Updates**
  - Select multiple listings
  - Apply status changes
  - Confirmation dialog
  - Success/failure feedback

- [ ] **Export Data**
  - Select export format (CSV/Excel)
  - Date range selection
  - Download triggers
  - Large file handling

### Edge Cases
- Invalid CSV format
- Very large files
- Timeout handling
- Partial success scenarios

---

## 🏥 System Module

### Critical Tests
- [ ] **Health Check**
  - API availability indicator
  - Database connection status
  - Display in footer/header

### Edge Cases
- API downtime handling
- Graceful degradation

---

## 🔌 WebSocket Integration

### Critical Tests
- [ ] **Connection Management**
  - Auto-connect on login
  - Reconnect on disconnect
  - Connection status indicator

- [ ] **Event Handling**
  - `new_message` updates conversations
  - `new_notification` shows alerts
  - `contract_updated` refreshes escrow
  - `users_updated` (admin only)

- [ ] **Room Management**
  - Join user-specific room
  - Join conversation rooms
  - Join admin room (if admin)

### Edge Cases
- Network instability
- Multiple tabs/devices
- Event ordering

---

## 🧪 General Frontend Testing Checklist

### Authentication & Authorization
- [ ] Token storage (localStorage/sessionStorage)
- [ ] Token refresh mechanism
- [ ] Automatic logout on token expiry
- [ ] Protected route guards
- [ ] Role-based access control

### Error Handling
- [ ] Network errors display user-friendly messages
- [ ] 400 errors show validation feedback
- [ ] 401 errors redirect to login
- [ ] 403 errors show access denied
- [ ] 404 errors show not found page
- [ ] 500 errors show generic error

### Loading States
- [ ] Skeleton loaders during data fetch
- [ ] Disabled buttons during submission
- [ ] Progress indicators for uploads
- [ ] Optimistic UI updates

### Responsive Design
- [ ] Mobile layout (< 768px)
- [ ] Tablet layout (768px - 1024px)
- [ ] Desktop layout (> 1024px)
- [ ] Touch-friendly buttons
- [ ] Accessible navigation

### Performance
- [ ] Image lazy loading
- [ ] Pagination/infinite scroll
- [ ] Debounced search inputs
- [ ] Cached API responses
- [ ] Code splitting

### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] ARIA labels
- [ ] Focus management
- [ ] Color contrast

### Security
- [ ] XSS prevention (sanitize inputs)
- [ ] CSRF protection
- [ ] Secure token storage
- [ ] HTTPS only
- [ ] Content Security Policy

---

## 📝 Testing Tools Recommendations

### Manual Testing
- Use the cURL commands in each .md file
- Test with Postman/Insomnia first
- Browser DevTools Network tab

### Automated Testing
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Cypress/Playwright
- **E2E Tests**: Full user flows
- **API Tests**: Supertest (already in backend)

### Monitoring
- Error tracking (Sentry)
- Analytics (Google Analytics/Mixpanel)
- Performance monitoring (Lighthouse)
- User session recording (Hotjar/LogRocket)

---

## 🎯 Priority Testing Order

1. **Phase 1 - Core Functionality**
   - Auth (login/register)
   - Listings (browse/view/create)
   - Wallet (balance/deposit)

2. **Phase 2 - Transactions**
   - Purchase flow
   - Payment integration
   - Transaction history

3. **Phase 3 - Communication**
   - Conversations
   - Notifications
   - WebSocket events

4. **Phase 4 - Advanced Features**
   - Escrow
   - Reviews
   - Preferences

5. **Phase 5 - Admin & Bulk**
   - Admin dashboard
   - Bulk operations
   - Analytics

---

## 🐛 Common Issues to Watch For

1. **Token Management**
   - Expired tokens not handled
   - Token not sent in headers
   - Token not persisted

2. **Form Validation**
   - Client-side validation missing
   - Mismatch with backend validation
   - Poor error messages

3. **State Management**
   - Stale data after updates
   - Race conditions
   - Optimistic updates not reverted on error

4. **WebSocket**
   - Connection not established
   - Events not handled
   - Memory leaks from listeners

5. **File Uploads**
   - Size limits not enforced
   - Format validation missing
   - Progress not shown

6. **Responsive Design**
   - Mobile navigation broken
   - Forms unusable on small screens
   - Images not optimized

---

**Remember**: Test each endpoint with both valid and invalid data. Always check error handling and edge cases!
