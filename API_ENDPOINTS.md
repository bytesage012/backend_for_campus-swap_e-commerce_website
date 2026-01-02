
API_ENDPOINTS.md
## Analytics & Reporting

### GET `/api/analytics/listings/:id`
**Description:** Get performance analytics for a specific listing (Seller only)
**Authentication:** Required
**Success Response (200):**
```json
{
  "id": "analytics-uuid",
  "listingId": "listing-uuid",
  "totalViews": 150,
  "searchViews": 45,
  "facultyViews": 30,
  "directViews": 75,
  "saves": 12,
  "messages": 5,
  "lastViewedAt": "2026-01-02T10:30:00Z"
}
```

### GET `/api/analytics/seller`
**Description:** Get aggregated performance metrics for the seller
**Authentication:** Required
**Success Response (200):**
```json
{
  "overview": {
    "totalListings": 10,
    "activeListings": 8,
    "soldListings": 2,
    "totalViews": 1500,
    "totalSaves": 50,
    "totalMessages": 25
  },
  "performance": {
    "conversionRate": "1.50",
    "ctr": "2.50"
  },
  "viewSources": {
    "search": 500,
    "faculty": 300,
    "direct": 700
  },
  "topListings": [
    {
      "id": "listing-uuid",
      "title": "Textbook",
      "views": 300,
      "saves": 10
    }
  ]
}
```

### POST `/api/reports/listing/:id`
**Description:** Report a listing for policy violation
**Authentication:** Required
**Body:**
```json
{
  "reason": "SCAM", // PROHIBITED_ITEM, MISLEADING, SCAM, HARASSMENT, INAPPROPRIATE_BEHAVIOR
  "description": "Seller is asking for payment off-platform",
  "evidenceUrls": ["https://example.com/screenshot.jpg"]
}
```
**Success Response (201):**
```json
{
  "message": "Report submitted successfully",
  "reportId": "report-uuid"
}
```

### POST `/api/reports/user/:id`
**Description:** Report a user
**Authentication:** Required
**Body:**
```json
{
  "reason": "HARASSMENT",
  "description": "User is sending abusive messages",
}
```

## Admin User Management

### GET `/api/admin/users`
**Description:** List users with advanced filtering
**Authentication:** Required (Admin)
**Query Parameters:**
- `search`: Search in name/email
- `status`: Filter by verification status
- `faculty`: Filter by faculty
- `minTrustScore`: Filter by trust score
- `maxRiskScore`: Filter by risk score
- `page/limit`: Pagination

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "trustScore": 85,
      "riskScore": 10,
      "_count": { "listings": 5, "reportsReceived": 0 }
    }
  ],
  "pagination": { "total": 50, "page": 1, "limit": 20 }
}
```

### POST `/api/admin/users/bulk-action`
**Description:** Perform action on multiple users
**Authentication:** Required (Admin)
**Body:**
```json
{
  "userIds": ["uuid1", "uuid2"],
  "action": "UPDATE_STATUS", // or BAN
  "data": { "status": "APPROVED" }
}
```

### GET `/api/admin/users/export`
**Description:** Export filtered users to CSV
**Authentication:** Required (Admin)
**Response:** CSV file download

## Listing Moderation

### GET `/api/admin/listings/queue`
**Description:** Get priority moderation queue
**Authentication:** Required (Admin)
**Query Parameters:**
- `page/limit`: Pagination
- `minScore`: Filter by minimum priority score
**Success Response (200):**
```json
{
  "items": [
    {
      "listingId": "uuid",
      "priorityScore": 75,
      "flaggedBy": ["AI", "USER_REPORT"],
      "listing": { ... }
    }
  ],
  "total": 5
}
```

### POST `/api/admin/listings/:id/review`
**Description:** Submit review decision
**Authentication:** Required (Admin)
**Body:**
```json
{
  "action": "REJECT", // APPROVE, REJECT, FLAG, REQUEST_CHANGES
  "reason": "Scam detected",
  "notes": "Internal note"
}
```

### GET `/api/admin/listings/removed`
**Description:** Get removed/rejected listings
**Authentication:** Required (Admin)
