# API Validation Rules & Field Constraints

Complete reference of all input validation rules and field constraints for the Campus Swap API.

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Marketplace](#marketplace)
4. [Transactions & Escrow](#transactions--escrow)
5. [Wallet & Withdrawals](#wallet--withdrawals)
6. [Reviews & Ratings](#reviews--ratings)
7. [Messaging](#messaging)
8. [Verification](#verification)
9. [Reports](#reports)
10. [Preferences](#preferences)

---

## Authentication

### Register Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `email` | string | Valid email format | `john@example.com` |
| `password` | string | Min 8 characters | `SecurePass123!` |
| `fullName` | string | Min 2 characters | `John Doe` |
| `phoneNumber` | string | Nigerian format: `+234` or `0` followed by `7/8/9` + 10 digits | `+2348123456789` or `08123456789` |
| `faculty` | string | Min 1 character (required) | `Engineering` |
| `department` | string | Optional | `Computer Science` |
| `academicLevel` | string | Optional | `200` or `300` |
| `residenceArea` | string | Optional | `Lekki` |

**Validation Rules:**
```javascript
{
  email: "must be valid email",
  password: "min 8 chars",
  fullName: "min 2 chars",
  phoneNumber: "must match Nigerian pattern (+234 or 0)",
  faculty: "required, min 1 char"
}
```

---

### Login Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `email` | string | Valid email format | `john@example.com` |
| `password` | string | Min 1 character (required) | `SecurePass123!` |

**Error Responses:**
- Invalid email format → 400 Bad Request
- Email not found → 404 Not Found
- Wrong password → 401 Unauthorized

---

### Update Profile Schema

| Field | Type | Constraints | Optional | Example |
|-------|------|-----------|----------|---------|
| `fullName` | string | Min 2 characters | Yes | `John Doe` |
| `phoneNumber` | string | Nigerian format | Yes | `+2348123456789` |
| `academicLevel` | string | Any string | Yes | `200` |
| `residenceArea` | string | Any string | Yes | `Lekki` |
| `department` | string | Any string | Yes | `Computer Science` |

---

## User Management

### Avatar Upload

| Field | Type | Constraints |
|-------|------|-----------|
| `file` | File (multipart) | JPEG, PNG only; Max 5MB |

**Response includes:** `avatarUrl`, `fileSize`, `filename`

---

### Get User Profile

No input validation (GET request).

**Returns:** All user profile information with trust score and verification status.

---

## Marketplace

### Create Listing Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `title` | string | Min 3, Max 100 characters | `Advanced Calculus Textbook` |
| `description` | string | Min 10, Max 1000 characters | `Lightly used, excellent condition...` |
| `price` | number | Positive number, 2 decimal places | `8500.00` |
| `category` | string | Min 2 characters | `BOOKS` |
| `condition` | enum | `NEW`, `USED`, or `FAIR` | `GOOD` |
| `faculty` | string | Optional | `Engineering` |
| `department` | string | Optional | `Computer Science` |

**Price Format:** Must be numeric with up to 2 decimal places.

**Valid Categories:**
- `BOOKS`
- `NOTES`
- `GOODS`
- `SERVICES`

**Condition Values:**
- `NEW` - Never used
- `USED` - Used but in good condition
- `FAIR` - Some wear and tear

---

### Update Listing Schema

| Field | Type | Constraints | Optional |
|-------|------|-----------|----------|
| `title` | string | Min 3 characters | Yes |
| `description` | string | Min 10 characters | Yes |
| `price` | number | Positive number | Yes |
| `category` | string | Min 2 characters | Yes |
| `condition` | enum | `NEW`, `USED`, `FAIR` | Yes |
| `status` | enum | `DRAFT`, `ACTIVE`, `RESERVED`, `SOLD`, `ARCHIVED` | Yes |

**Listing Status Values:**
- `DRAFT` - Not published yet
- `ACTIVE` - Available for purchase
- `RESERVED` - Pending sale
- `SOLD` - Sold out
- `ARCHIVED` - Hidden from search

---

### Purchase Schema

| Field | Type | Constraints | Optional | Example |
|-------|------|-----------|----------|---------|
| `paymentMethod` | enum | `WALLET` or `PAYSTACK_DIRECT` | No | `WALLET` |
| `useEscrow` | boolean | true/false | Yes (default: true) | `true` |
| `meetupLocation` | string | Any string | Yes | `Lekki` |
| `meetupTime` | string | ISO 8601 format | Yes | `2025-01-15T10:30:00Z` |

**Payment Methods:**
- `WALLET` - Use wallet balance
- `PAYSTACK_DIRECT` - Direct Paystack payment

---

### Update Listing Status Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `status` | enum | `DRAFT`, `ACTIVE`, `RESERVED`, `SOLD`, `ARCHIVED` | `SOLD` |
| `soldToUserId` | string (UUID) | Optional, required if marking SOLD | `uuid-buyer-12345` |

---

## Transactions & Escrow

### Confirm Receipt Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `received` | boolean | true/false | `true` |
| `conditionMet` | boolean | true/false | `true` |
| `notes` | string | Optional | `Received in good condition` |

---

### Dispute Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `reason` | string | Min 10 characters | `Item received was damaged` |
| `evidence` | string | Optional | `Photo descriptions...` |

**Dispute Statuses:**
- `OPEN` - Recently created
- `UNDER_REVIEW` - Admin reviewing
- `RESOLVED` - Admin resolved
- `REFUNDED` - Refund issued

---

## Wallet & Withdrawals

### Setup PIN Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `newPin` | string | Exactly 4 digits | `1234` |
| `confirmPin` | string | Exactly 4 digits, must match newPin | `1234` |
| `currentPin` | string | Exactly 4 digits (optional for reset) | `5678` |

**Validation Rules:**
- Must contain only digits (0-9)
- Both PINs must match exactly
- Cannot reuse recent PINs (optional, if implemented)

---

### Verify PIN Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `pin` | string | Exactly 4 digits | `1234` |

---

### Withdrawal Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `amount` | number | Min ₦100, Max ₦500,000 | `50000` |
| `bankCode` | string | Min 3 characters | `058` |
| `accountNumber` | string | Exactly 10 digits | `1234567890` |
| `accountName` | string | Min 3 characters | `John Doe` |
| `pin` | string | Exactly 4 digits | `1234` |

**Withdrawal Rules:**
- Minimum amount: ₦100
- Maximum amount: ₦500,000
- Fee: 1.5% of amount
- Processing time: 24 hours

**Withdrawal Status Values:**
- `PENDING` - Processing
- `PROCESSING` - Being transferred
- `COMPLETED` - Successfully transferred
- `FAILED` - Transfer failed

---

## Reviews & Ratings

### Submit Review Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `rating` | number | Integer between 1-5 | `5` |
| `comment` | string | Max 500 characters | Optional | `Great seller!` |
| `title` | string | Optional | `Excellent condition` |
| `targetId` | string (UUID) | Valid UUID | `uuid-seller-12345` |

**Rating Scale:**
- `1` - Very Poor
- `2` - Poor
- `3` - Average
- `4` - Good
- `5` - Excellent

**Optional Category Ratings (if supported):**
- `itemQuality` (1-5)
- `communication` (1-5)
- `shipping` (1-5)
- `accuracy` (1-5)

---

## Messaging

### Start Conversation Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `listingId` | string (UUID) | Valid UUID | `listing-uuid-001` |
| `subject` | string | Optional | `Question about textbook` |
| `initialMessage` | string | Optional | `Hi, is this still available?` |

---

### Send Message Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `content` | string | Min 1, Max 1000 characters | `Yes, it's still available!` |

**Message Rules:**
- Cannot be empty
- Max 1000 characters per message
- Newlines allowed
- HTML tags are escaped

---

## Verification

### Upload ID Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `documentType` | enum | `STUDENT_ID`, `ADMISSION_LETTER`, `COURSE_REGISTRATION` | `STUDENT_ID` |
| `file` | File | JPEG/PNG, Max 5MB | `student_id.jpg` |

**Document Types:**
- `STUDENT_ID` - Campus student ID card
- `ADMISSION_LETTER` - Official admission document
- `COURSE_REGISTRATION` - Current semester registration

**Verification Levels:**
- `BASIC` - Registered user
- `VERIFIED` - ID verified
- `PREMIUM` - Additional verification (future)

---

## Reports

### Create Report Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `reportedUserId` | string (UUID) | Valid UUID, optional if listing specified | `uuid-user-12345` |
| `reportedListingId` | string (UUID) | Valid UUID, optional if user specified | `listing-uuid-001` |
| `reason` | enum | See valid reasons below | `SCAM` |
| `description` | string | Min 10, Max 1000 characters | `Seller sent damaged item...` |
| `evidenceUrls` | array | Array of valid URLs (optional) | `["https://example.com/image.jpg"]` |

**Valid Report Reasons:**
- `PROHIBITED_ITEM` - Illegal or prohibited item
- `MISLEADING` - Misleading listing information
- `SCAM` - Suspected scam
- `HARASSMENT` - Harassment or abuse
- `INAPPROPRIATE_BEHAVIOR` - Inappropriate conduct

**Rules:**
- Must report either a user OR a listing (not both, not neither)
- Description must be detailed (min 10 chars)
- URLs must be valid and accessible
- Reports are reviewed by admins

---

## Preferences

### Update Theme Schema

| Field | Type | Constraints | Optional | Example |
|-------|------|-----------|----------|---------|
| `themeMode` | enum | `LIGHT`, `DARK`, `AUTO` | Yes | `DARK` |
| `facultyThemeEnabled` | boolean | true/false | Yes | `true` |
| `accentColor` | string | Valid hex color (#RRGGBB) | Yes | `#FF5733` |
| `primaryColor` | string | Valid hex color (#RRGGBB) | Yes | `#0066FF` |

**Theme Values:**
- `LIGHT` - Light theme
- `DARK` - Dark theme
- `AUTO` - Follow system preference

**Color Format:**
- Must be valid hexadecimal color
- Format: `#RRGGBB` (case-insensitive)
- Examples: `#000000`, `#FFFFFF`, `#FF5733`

---

## Deposit Schema

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `amount` | number | Positive number, min ₦500 | `50000` |
| `paymentMethod` | enum | `PAYSTACK_DIRECT` | `PAYSTACK_DIRECT` |

**Deposit Rules:**
- Minimum: ₦500
- Maximum: ₦1,000,000 (per transaction)
- Processing: Instant (after payment)

---

## General Validation Rules

### UUIDs
- Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Used for: userId, listingId, transactionId, etc.
- Case-insensitive

### Enums
- Exact match required (case-sensitive)
- No partial matches
- Invalid value → 400 Bad Request

### Numbers
- Prices: Positive, up to 2 decimal places
- Ratings: Integers 1-5
- Amounts: Positive numbers
- Negative numbers rejected

### Strings
- Trim whitespace
- Max length enforced (reject if exceeded)
- Min length enforced (reject if below)
- HTML tags escaped or removed

### Dates
- ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`
- UTC timezone
- Future dates validation (for meetup times)

### URLs
- Must start with `http://` or `https://`
- Domain must be valid
- Path must be valid

### Phone Numbers (Nigeria)
- Format: `+234XXXXXXXXXX` or `0XXXXXXXXXX`
- Second digit must be 7, 8, or 9
- Total 11 or 13 digits
- Examples:
  - `+2348123456789` ✓
  - `08123456789` ✓
  - `+2347012345678` ✓
  - `09098765432` ✓

### Email Addresses
- Standard email validation
- Must contain @ symbol
- Must have valid domain
- Examples:
  - `user@example.com` ✓
  - `name.surname@company.co.uk` ✓
  - `invalid.email` ✗

---

## Error Handling by Field

### Common Validation Errors

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "fieldName": ["error message"]
  }
}
```

### Examples

**Invalid Email:**
```json
{
  "details": {
    "email": ["Invalid email format"]
  }
}
```

**Password Too Short:**
```json
{
  "details": {
    "password": ["Password must be at least 8 characters long"]
  }
}
```

**Invalid Phone Number:**
```json
{
  "details": {
    "phoneNumber": ["Invalid Nigerian phone number"]
  }
}
```

**Mismatched PINs:**
```json
{
  "details": {
    "confirmPin": ["PINs don't match"]
  }
}
```

**Multiple Field Errors:**
```json
{
  "details": {
    "title": ["Title must be at least 3 characters"],
    "price": ["Price must be a positive number"],
    "category": ["Invalid category"]
  }
}
```

---

## Validation Best Practices

### Client-Side Validation

Before sending requests, validate:

```javascript
// Example validation function
function validateListing(data) {
  const errors = {};
  
  if (!data.title || data.title.length < 3) {
    errors.title = "Title must be at least 3 characters";
  }
  
  if (!data.price || data.price <= 0) {
    errors.price = "Price must be positive";
  }
  
  if (!data.description || data.description.length < 10) {
    errors.description = "Description must be at least 10 characters";
  }
  
  return Object.keys(errors).length === 0 ? null : errors;
}
```

### Server-Side Validation

Always validate on server (never trust client):

```typescript
const validation = createListingSchema.safeParse(req.body);
if (!validation.success) {
  return res.status(400).json({
    error: "Validation failed",
    details: validation.error.flatten()
  });
}
```

### Display Errors to Users

```javascript
// Show validation errors
if (response.code === 'VALIDATION_ERROR') {
  Object.entries(response.details).forEach(([field, messages]) => {
    messages.forEach(message => {
      showError(`${field}: ${message}`);
    });
  });
}
```

---

## Summary Table

| Feature | Min | Max | Format | Required |
|---------|-----|-----|--------|----------|
| Email | - | - | RFC 5322 | Yes |
| Password | 8 | - | Any | Yes |
| Full Name | 2 | - | Any | Yes |
| Phone | - | - | Nigerian | Yes |
| Title | 3 | 100 | Any | Yes |
| Description | 10 | 1000 | Any | Yes |
| Price | >0 | - | Number | Yes |
| PIN | 4 | 4 | Digits only | Yes |
| Withdrawal | 100 | 500k | Number | Yes |
| Rating | 1 | 5 | Integer | Yes |
| Message | 1 | 1000 | Any | Yes |
| Dispute Reason | 10 | - | Any | Yes |
| Report Description | 10 | 1000 | Any | Yes |

---

**Last Updated**: January 7, 2025
**API Version**: 1.0
**Status**: Complete & Production-Ready
