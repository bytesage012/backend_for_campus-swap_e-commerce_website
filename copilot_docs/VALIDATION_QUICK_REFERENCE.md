# Validation Constraints Quick Reference

## String Constraints

| Field | Min | Max | Format | Required |
|-------|-----|-----|--------|----------|
| email | - | - | RFC 5322 email format | ✓ |
| password | 8 | - | Any characters | ✓ |
| fullName | 2 | 100 | Letters, spaces, hyphens | ✓ |
| phoneNumber | 11 | 13 | +234XXXXXXXXXX or 0XXXXXXXXXX (Nigeria) | ✓ |
| title | 3 | 100 | Any characters | ✓ |
| description | 10 | 1000 | Any characters | ✓ |
| content/message | 1 | 1000 | Any characters | ✓ |
| reason (dispute) | 10 | 1000 | Any characters | ✓ |
| subject | 3 | 100 | Any characters | ✗ |
| reviewTitle | 3 | 100 | Any characters | ✓ |
| reviewContent | 10 | 500 | Any characters | ✓ |
| location | - | 100 | Any string | ✗ |
| residenceArea | - | 100 | Any string | ✗ |
| accountName | - | - | Valid account name | ✓ |
| faculty | 1 | - | Any string | ✗ |
| department | - | 100 | Any string | ✗ |

## Numeric Constraints

| Field | Min | Max | Type | Required |
|-------|-----|-----|------|----------|
| rating | 1 | 5 | Integer | ✓ |
| itemQuality rating | 1 | 5 | Integer | ✗ |
| communication rating | 1 | 5 | Integer | ✗ |
| shipping rating | 1 | 5 | Integer | ✗ |
| quantity | 1 | unlimited | Positive integer | ✓ |
| price | 0.01 | unlimited | Decimal number | ✓ |
| minPrice (filter) | 0 | unlimited | Positive number | ✗ |
| maxPrice (filter) | 0 | unlimited | Positive number | ✗ |
| amount (deposit) | 500 | unlimited | ₦ (Naira) | ✓ |
| amount (withdrawal) | 100 | 500,000 | ₦ (Naira) | ✓ |
| pin | 1000 | 9999 | Exactly 4 digits | ✓ |
| page | 1 | unlimited | Positive integer | ✗ |
| limit | 1 | 100 | Positive integer | ✗ |
| accountNumber | 1000000000 | 9999999999 | Exactly 10 digits | ✓ |

## Enum Constraints

### Category
- `BOOKS`
- `NOTES`
- `GOODS`
- `SERVICES`

### Condition
- `NEW`
- `USED`
- `FAIR`

### Payment Method
- `WALLET` - Pay from wallet balance
- `PAYSTACK_DIRECT` - Direct Paystack payment
- `BANK_TRANSFER` - Bank transfer

### Status (Listing)
- `ACTIVE`
- `SOLD`
- `ARCHIVED`

### Status (Withdrawal)
- `PENDING` - Awaiting bank processing
- `PROCESSING` - Bank is processing
- `COMPLETED` - Successfully transferred
- `FAILED` - Transaction failed
- `CANCELLED` - User cancelled

### Sort By (Listings)
- `NEWEST` - Most recently posted
- `PRICE_LOW` - Lowest price first
- `PRICE_HIGH` - Highest price first
- `RATING` - Highest rated sellers
- `TRENDING` - Most popular

### Transaction Type
- `DEPOSIT` - Money added to wallet
- `PURCHASE` - Money spent on listing
- `SALE` - Money received from sale
- `WITHDRAWAL` - Money withdrawn to bank
- `ESCROW_HOLD` - Money held in escrow
- `ESCROW_RELEASE` - Escrow funds released

### Document Type (Verification)
- `NATIONAL_ID`
- `INTERNATIONAL_PASSPORT`
- `DRIVERS_LICENSE`
- `STUDENT_ID`

## Format Constraints

| Format | Pattern | Example | Field |
|--------|---------|---------|-------|
| Email | RFC 5322 | user@example.com | email |
| Nigerian Phone | +234XXXXXXXXXX or 0XXXXXXXXXX | +2348123456789 | phoneNumber |
| UUID | 8-4-4-4-12 hex digits | 550e8400-e29b-41d4-a716-446655440000 | IDs, listingId |
| Hex Color | #RRGGBB | #FF5733 | color preference |
| ISO 8601 Date | YYYY-MM-DDTHH:mm:ssZ | 2025-01-07T12:00:00Z | timestamps |
| Bank Code | 3 digits | 058 | bankCode |
| PIN | 4 digits only | 1234 | pin |
| Account | 10 digits only | 1234567890 | accountNumber |

## Boolean Constraints

| Field | Default | Values | Usage |
|-------|---------|--------|-------|
| useEscrow | true | true/false | Purchase payment option |
| isRead | false | true/false | Message/notification status |
| isPrimary | false | true/false | Primary image flag |
| received | false | true/false | Item receipt confirmation |
| conditionMet | false | true/false | Item condition assessment |

## File Upload Constraints

| Type | Allowed Extensions | Max Size | Purpose |
|------|-------------------|----------|---------|
| Avatar | JPEG, PNG | 5MB | User profile image |
| Listing Image | JPEG, PNG, WebP | 10MB | Product photo |
| ID Document | JPEG, PNG, PDF | 15MB | Verification document |
| Bulk Upload | CSV, XLSX | 50MB | Bulk listing import |

## Common Validation Error Patterns

### Length Violations
- "Must be at least X characters"
- "Cannot exceed X characters"
- "Must be exactly X characters"

### Format Violations
- "Invalid email format"
- "Invalid Nigerian phone number format"
- "Invalid UUID format"
- "Invalid JSON"

### Range Violations
- "Must be between X and Y"
- "Cannot be less than X"
- "Cannot be greater than X"

### Enum Violations
- "Must be one of: [enum values]"
- "Invalid category"
- "Invalid status"

### Type Violations
- "Must be a string"
- "Must be a number"
- "Must be an integer"
- "Must be a boolean"

### Uniqueness Violations
- "Email already exists"
- "Username already taken"
- "Duplicate review for this transaction"

### Dependency Violations
- "minPrice cannot be greater than maxPrice"
- "PIN confirmation must match PIN"
- "You cannot message yourself"

## Request/Response Validation Checklist

### Before Sending Request
- [ ] All required fields are present
- [ ] String length is within min/max
- [ ] Numbers are within valid range
- [ ] Enums use exact values from spec
- [ ] Email format is valid
- [ ] Phone number is Nigerian format
- [ ] UUIDs are valid format
- [ ] File uploads are correct type and size

### After Receiving Response
- [ ] Check `response.success` boolean
- [ ] Validate `response.code` if error
- [ ] Check `response.message` for user display
- [ ] Parse `response.data` for application data
- [ ] Validate timestamp formats (ISO 8601)
- [ ] Check pagination info if list response
- [ ] Handle rate limit headers

## Frontend Validation Implementation Example

### JavaScript/TypeScript
```javascript
// Validate email
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate Nigerian phone
const isValidNigerianPhone = (phone) => {
  const re = /^(\+234|0)[0-9]{10}$/;
  return re.test(phone);
};

// Validate PIN
const isValidPIN = (pin) => {
  return /^\d{4}$/.test(pin);
};

// Validate string length
const isValidLength = (str, min, max) => {
  return str && str.length >= min && str.length <= max;
};

// Validate number range
const isInRange = (num, min, max) => {
  return num >= min && num <= max;
};

// Validate enum
const isValidEnum = (value, enumValues) => {
  return enumValues.includes(value);
};
```

### React Example with Form Validation
```jsx
const [errors, setErrors] = useState({});

const validateForm = (formData) => {
  const newErrors = {};
  
  // Email validation
  if (!isValidEmail(formData.email)) {
    newErrors.email = "Invalid email format";
  }
  
  // Password validation
  if (formData.password.length < 8) {
    newErrors.password = "Password must be at least 8 characters";
  }
  
  // Phone validation
  if (!isValidNigerianPhone(formData.phoneNumber)) {
    newErrors.phoneNumber = "Invalid Nigerian phone number";
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

## Server-Side Validation Response Format

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "data": {
    "errors": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters",
      "phoneNumber": "Invalid Nigerian phone number"
    }
  }
}
```

## Related Documentation

- **FRONTEND_DEVELOPER_GUIDE.md** - Full API reference with examples
- **VALIDATION_RULES.md** - Comprehensive validation reference
- **src/validations/*.ts** - Actual Zod validation schemas
- **API_ENDPOINTS.md** - Complete endpoint listing
- **VALIDATION_UPDATES_PROGRESS.md** - Documentation progress tracking
