# Frontend Developer Integration Checklist

A comprehensive checklist for frontend developers integrating with the Campus Swap backend API.

## Setup & Configuration ✓

- [ ] **Read Documentation**
  - [ ] FRONTEND_DEVELOPER_GUIDE.md - API reference with examples
  - [ ] VALIDATION_RULES.md - Input validation requirements
  - [ ] VALIDATION_QUICK_REFERENCE.md - Quick lookup for constraints
  - [ ] API_ENDPOINTS.md - Complete endpoint listing

- [ ] **Environment Setup**
  - [ ] Node.js 18+ installed
  - [ ] API base URL configured (development/production)
  - [ ] CORS configured in frontend (if needed)
  - [ ] Development server running on correct port

- [ ] **Authentication Setup**
  - [ ] JWT token storage mechanism decided (localStorage/sessionStorage/cookie)
  - [ ] Token refresh logic implemented
  - [ ] Authorization header configured for all requests
  - [ ] Logout/token cleanup implemented

## Core Features Implementation

### 1. Authentication ✓
- [ ] **Registration**
  - [ ] Email field validation (RFC 5322 format)
  - [ ] Password validation (min 8 characters)
  - [ ] Full name validation (min 2 characters)
  - [ ] Nigerian phone number validation
  - [ ] Faculty field required
  - [ ] Form submission to `/api/auth/register`
  - [ ] Handle success response and store tokens
  - [ ] Handle validation errors and display to user
  - [ ] Redirect to login/dashboard on success

- [ ] **Login**
  - [ ] Email validation
  - [ ] Password field (masked input)
  - [ ] "Remember me" functionality (optional)
  - [ ] Form submission to `/api/auth/login`
  - [ ] Store access and refresh tokens
  - [ ] Redirect to dashboard on success
  - [ ] Display "Wrong credentials" error

- [ ] **Token Refresh**
  - [ ] Automatic token refresh before expiry (5 min buffer)
  - [ ] Refresh token rotation handling
  - [ ] Failed refresh redirect to login
  - [ ] Silent token refresh without user interruption

- [ ] **Logout**
  - [ ] Clear tokens from storage
  - [ ] Invalidate Authorization header
  - [ ] Clear user context/state
  - [ ] Redirect to login page

### 2. User Profile Management ✓
- [ ] **View Profile**
  - [ ] Fetch current user from `/api/users/me`
  - [ ] Display user information
  - [ ] Show verification level/status
  - [ ] Show trust score/rating

- [ ] **Edit Profile**
  - [ ] Allow edit for all optional fields
  - [ ] Validate full name (min 2 chars)
  - [ ] Validate phone number (Nigerian format)
  - [ ] Validate faculty/department fields
  - [ ] Submit to `PATCH /api/users/me`
  - [ ] Show success message
  - [ ] Handle validation errors

- [ ] **Upload Avatar**
  - [ ] File input for image selection
  - [ ] Validate file type (JPEG/PNG only)
  - [ ] Validate file size (max 5MB)
  - [ ] Show preview before upload
  - [ ] Submit to `POST /api/users/avatar`
  - [ ] Update avatar display after upload
  - [ ] Handle upload errors

### 3. Marketplace - Listings ✓
- [ ] **Browse Listings**
  - [ ] GET request to `/api/listings` with pagination
  - [ ] Display listing cards with images/price/seller
  - [ ] Implement pagination (limit: 20)
  - [ ] Show total listings and current page

- [ ] **Search & Filter**
  - [ ] Implement search box (max 100 chars)
  - [ ] Category filter (BOOKS, NOTES, GOODS, SERVICES)
  - [ ] Price range filter (min/max validation)
  - [ ] Condition filter (NEW, USED, FAIR)
  - [ ] Location filter
  - [ ] Sort options (NEWEST, PRICE_LOW, PRICE_HIGH, RATING, TRENDING)
  - [ ] Combined filtering and pagination
  - [ ] Show "No results" message when empty

- [ ] **Create Listing**
  - [ ] Form with all required fields
  - [ ] Title validation (3-100 chars)
  - [ ] Description validation (10-1000 chars)
  - [ ] Price validation (positive decimal)
  - [ ] Category selection (enum)
  - [ ] Condition selection (NEW/USED/FAIR)
  - [ ] Image upload (multiple files allowed)
  - [ ] Location input
  - [ ] Quantity field (positive integer)
  - [ ] Tags input (optional)
  - [ ] Submit to `POST /api/listings`
  - [ ] Handle validation errors
  - [ ] Show success and redirect to listing

- [ ] **View Listing Details**
  - [ ] Display full listing information
  - [ ] Show all images in gallery
  - [ ] Display seller information with rating
  - [ ] Show condition, category, price clearly
  - [ ] Show view count and save count
  - [ ] Display timestamps clearly

- [ ] **Edit Listing**
  - [ ] Pre-populate form with listing data
  - [ ] Allow edit of all fields (or restricted set)
  - [ ] Validate all fields per constraints
  - [ ] Submit to `PATCH /api/listings/{id}`
  - [ ] Show success message

- [ ] **Delete Listing**
  - [ ] Confirmation dialog before deletion
  - [ ] Submit to `DELETE /api/listings/{id}`
  - [ ] Remove from listings view

### 4. Wallet & Payments ✓
- [ ] **Check Wallet Balance**
  - [ ] GET request to `/api/wallet`
  - [ ] Display balance prominently
  - [ ] Show recent transactions list
  - [ ] Show reserved balance (if any)
  - [ ] Show transaction history with types

- [ ] **Setup Transaction PIN**
  - [ ] PIN input field (masked)
  - [ ] Confirm PIN field
  - [ ] Validate PIN (exactly 4 digits)
  - [ ] Validate PIN confirmation matches
  - [ ] Submit to `POST /api/wallet/setup-pin`
  - [ ] Show success message
  - [ ] Handle "PIN already exists" error

- [ ] **Deposit Funds**
  - [ ] Amount input field
  - [ ] Validate amount (min ₦500)
  - [ ] Payment method selector (PAYSTACK_DIRECT, BANK_TRANSFER)
  - [ ] Submit to `POST /api/transactions/deposit`
  - [ ] If PAYSTACK_DIRECT: redirect to Paystack checkout URL
  - [ ] Handle payment status callback
  - [ ] Show receipt/confirmation

- [ ] **Request Withdrawal**
  - [ ] Amount input (₦100 - ₦500,000)
  - [ ] Bank code input (3 digits)
  - [ ] Account number (10 digits)
  - [ ] Account name
  - [ ] PIN input (4 digits)
  - [ ] Validate all fields
  - [ ] Submit to `POST /api/withdrawals`
  - [ ] Show confirmation with processing fee
  - [ ] Show withdrawal reference number

- [ ] **Track Withdrawal Status**
  - [ ] GET `/api/withdrawals/{withdrawalId}`
  - [ ] Display status (PENDING/PROCESSING/COMPLETED/FAILED)
  - [ ] Show estimated completion time
  - [ ] Show reference numbers
  - [ ] Allow resend receipt

### 5. Transactions ✓
- [ ] **Purchase Listing**
  - [ ] "Buy Now" button on listing detail
  - [ ] Show payment method options (WALLET/PAYSTACK_DIRECT)
  - [ ] Show option to use escrow
  - [ ] Optional meetup location/time
  - [ ] Validate all inputs
  - [ ] Submit to `POST /api/transactions/purchase`
  - [ ] Show transaction created
  - [ ] If PAYSTACK_DIRECT: redirect to payment
  - [ ] Show order confirmation

- [ ] **Confirm Receipt**
  - [ ] Mark as "received" checkbox
  - [ ] Optional condition assessment (conditionMet boolean)
  - [ ] Optional notes field
  - [ ] Submit to `POST /api/transactions/{id}/confirm-receipt`
  - [ ] Show confirmation message
  - [ ] Trigger review prompt

- [ ] **Dispute Transaction**
  - [ ] If issues arise: "Report Issue" button
  - [ ] Reason field (min 10 chars)
  - [ ] Optional evidence upload
  - [ ] Submit to `POST /api/transactions/{id}/dispute`
  - [ ] Show dispute reference
  - [ ] Display expected resolution time

### 6. Reviews & Ratings ✓
- [ ] **Submit Review**
  - [ ] Only available after transaction completed
  - [ ] Star rating widget (1-5)
  - [ ] Review title field (3-100 chars)
  - [ ] Review content field (10-500 chars)
  - [ ] Category ratings (optional: itemQuality, communication, shipping)
  - [ ] Submit to `POST /api/reviews`
  - [ ] Show success message
  - [ ] Display review immediately (optimistic update)

- [ ] **View User Reviews**
  - [ ] GET `/api/reviews/user/{userId}`
  - [ ] Show paginated reviews
  - [ ] Display average rating and distribution
  - [ ] Filter by rating (if needed)
  - [ ] Show review date and reviewer info

### 7. Messaging & Conversations ✓
- [ ] **Start Conversation**
  - [ ] "Message Seller" button on listing
  - [ ] Recipient ID pre-filled
  - [ ] Optional subject line (3-100 chars)
  - [ ] Optional initial message
  - [ ] Submit to `POST /api/conversations`
  - [ ] Redirect to conversation

- [ ] **Send Message**
  - [ ] Message input field (1-1000 chars)
  - [ ] Real-time message validation
  - [ ] Submit on enter (with shift for newline)
  - [ ] Submit to `POST /api/conversations/{id}/messages`
  - [ ] Show sent message immediately (optimistic update)
  - [ ] Show "typing..." indicator if available
  - [ ] Auto-scroll to latest message

- [ ] **View Conversation**
  - [ ] GET `/api/conversations/{id}/messages`
  - [ ] Display message thread
  - [ ] Show participant info
  - [ ] Implement pagination for messages (load more)
  - [ ] Mark messages as read
  - [ ] Unread message indicator in conversation list

- [ ] **Conversation List**
  - [ ] GET `/api/conversations` (user's conversations)
  - [ ] Show list of conversations
  - [ ] Display last message and timestamp
  - [ ] Unread count or indicator
  - [ ] Sort by most recent

### 8. Notifications ✓
- [ ] **Real-time Notifications**
  - [ ] WebSocket connection to `/socket`
  - [ ] Listen for notification events
  - [ ] Display toast/banner notifications
  - [ ] Notification types: MESSAGE, TRANSACTION, SYSTEM, PRICE_ALERT, DISPUTE
  - [ ] Unread notification count
  - [ ] Mark as read functionality

- [ ] **Notification Center**
  - [ ] GET `/api/notifications`
  - [ ] Display notification history
  - [ ] Filter by type (optional)
  - [ ] Pagination for notifications
  - [ ] Clear/archive notifications

## Error Handling

- [ ] **Network Error Handling**
  - [ ] Detect offline state
  - [ ] Queue requests when offline
  - [ ] Show "offline mode" indicator
  - [ ] Retry on reconnection
  - [ ] Show network error message

- [ ] **API Error Responses**
  - [ ] Check `response.success` field
  - [ ] Handle `response.code` values:
    - [ ] `VALIDATION_ERROR` - Show field errors
    - [ ] `AUTHENTICATION_ERROR` - Redirect to login
    - [ ] `AUTHORIZATION_ERROR` - Show permission denied
    - [ ] `NOT_FOUND` - Show 404 message
    - [ ] `CONFLICT` - Show duplicate/conflict message
    - [ ] `INTERNAL_ERROR` - Show generic error
  - [ ] Display user-friendly error messages
  - [ ] Log errors for debugging

- [ ] **Rate Limiting**
  - [ ] Monitor `X-RateLimit-*` headers
  - [ ] Show "Too many requests" message
  - [ ] Retry after `Retry-After` header
  - [ ] Implement exponential backoff

- [ ] **Form Validation Errors**
  - [ ] Display field-level errors
  - [ ] Highlight invalid fields
  - [ ] Clear errors when field is corrected
  - [ ] Focus first invalid field
  - [ ] Show error summary

## Performance & Optimization

- [ ] **Pagination Implementation**
  - [ ] Implement infinite scroll OR pagination controls
  - [ ] Load more: `page=1&limit=20`
  - [ ] Cache previous pages
  - [ ] Show loading indicator

- [ ] **Image Optimization**
  - [ ] Lazy load images
  - [ ] Show image placeholders
  - [ ] Compress images before upload
  - [ ] Use CDN URLs if available

- [ ] **Caching Strategy**
  - [ ] Cache user profile
  - [ ] Cache wallet balance (with refresh)
  - [ ] Cache listing details
  - [ ] Cache user reviews
  - [ ] Implement cache invalidation

- [ ] **Request Optimization**
  - [ ] Debounce search input (300-500ms)
  - [ ] Debounce profile updates
  - [ ] Batch API requests where possible
  - [ ] Cancel previous requests on new search

## Security

- [ ] **Token Security**
  - [ ] Never store tokens in localStorage (use httpOnly cookies if possible)
  - [ ] Clear tokens on logout
  - [ ] Implement token expiry handling
  - [ ] Use refresh tokens securely

- [ ] **Input Validation**
  - [ ] Client-side validation before submission
  - [ ] Do NOT trust client validation only
  - [ ] Sanitize user input for display
  - [ ] Prevent XSS attacks

- [ ] **HTTPS**
  - [ ] All API calls use HTTPS (except localhost)
  - [ ] Verify SSL certificates
  - [ ] No sensitive data in URLs/query params

- [ ] **CORS**
  - [ ] Verify CORS headers from API
  - [ ] Credentials included if needed
  - [ ] Preflight requests handled

## Testing

- [ ] **Unit Tests**
  - [ ] Test validation functions
  - [ ] Test API request formatting
  - [ ] Test error handling logic
  - [ ] Test localStorage/state management

- [ ] **Integration Tests**
  - [ ] Test complete user flows
  - [ ] Test error scenarios
  - [ ] Test pagination
  - [ ] Test real-time updates

- [ ] **Manual Testing**
  - [ ] Test all happy path scenarios
  - [ ] Test error edge cases
  - [ ] Test on mobile devices
  - [ ] Test offline functionality
  - [ ] Test with different network speeds

## Browser Compatibility

- [ ] **Modern Browsers**
  - [ ] Chrome 90+
  - [ ] Firefox 88+
  - [ ] Safari 14+
  - [ ] Edge 90+

- [ ] **Mobile**
  - [ ] iOS Safari 12+
  - [ ] Android Chrome 90+

## Deployment Checklist

- [ ] **Pre-deployment**
  - [ ] API endpoints verified for production URL
  - [ ] Remove console.log statements
  - [ ] Remove debug code
  - [ ] Update environment variables
  - [ ] Test all features once more

- [ ] **Post-deployment**
  - [ ] Monitor API error rates
  - [ ] Check network request logs
  - [ ] Verify analytics tracking
  - [ ] Test from production environment
  - [ ] Monitor user feedback

## Debugging & Support

### Common Issues & Solutions

**Token Expired Issue**
- Implement token refresh on 401 response
- See: Token Management in FRONTEND_DEVELOPER_GUIDE.md

**CORS Errors**
- Verify API CORS configuration
- Check request origin matches allowed origins
- Use credentials: include if needed

**Form Validation Mismatch**
- Compare client-side validation with VALIDATION_RULES.md
- Test with exact edge cases from documentation
- Use validation examples from guide

**File Upload Issues**
- Verify file type and size before upload
- Use FormData for multipart requests
- Check Content-Type headers

**Real-time Updates Lag**
- Verify WebSocket connection is active
- Check for console errors
- Implement reconnection logic

### Resources

- **FRONTEND_DEVELOPER_GUIDE.md** - Full API documentation
- **VALIDATION_RULES.md** - Complete validation reference
- **VALIDATION_QUICK_REFERENCE.md** - Quick lookup guide
- **API_ENDPOINTS.md** - All endpoints listed
- **GitHub Issues** - Report bugs and request features

## Sign-off

- [ ] All features implemented and tested
- [ ] Error handling in place
- [ ] Performance optimization complete
- [ ] Security review passed
- [ ] Documentation read and understood
- [ ] Ready for production deployment

**Completed By:** ___________________  
**Date:** ___________________  
**Notes:** ___________________________________________________________

