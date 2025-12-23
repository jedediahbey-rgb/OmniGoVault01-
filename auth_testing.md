# Auth Testing Playbook for Sovereign Vault

## Step 1: Create Test User & Session

```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API

```bash
# Get BACKEND_URL from frontend .env
BACKEND_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

# Test auth endpoint
curl -X GET "$BACKEND_URL/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test templates endpoint (public)
curl -X GET "$BACKEND_URL/api/templates"

# Test trusts endpoint (protected)
curl -X GET "$BACKEND_URL/api/trusts" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Create a trust document
curl -X POST "$BACKEND_URL/api/trusts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"document_type": "declaration_of_trust", "title": "Test Trust Document"}'
```

## Step 3: Browser Testing

```javascript
// Set cookie and navigate
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "your-app.com",
    "path": "/",
    "httpOnly": true,
    "secure": true,
    "sameSite": "None"
}]);
await page.goto("https://your-app.com/dashboard");
```

## Quick Debug

```bash
# Check data format
mongosh --eval "
use('test_database');
db.users.find().limit(2).pretty();
db.user_sessions.find().limit(2).pretty();
db.trust_documents.find().limit(2).pretty();
"

# Clean test data
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /test\.user\./});
db.user_sessions.deleteMany({session_token: /test_session/});
db.trust_documents.deleteMany({title: /Test/});
"
```

## Checklist

- [ ] User document has user_id field (custom UUID, MongoDB's _id is separate)
- [ ] Session user_id matches user's user_id exactly
- [ ] All queries use `{"_id": 0}` projection to exclude MongoDB's _id
- [ ] Backend queries use user_id (not _id or id)
- [ ] API returns user data with user_id field (not 401/404)
- [ ] Browser loads dashboard (not login page)

## Success Indicators

✅ /api/auth/me returns user data
✅ Dashboard loads without redirect
✅ CRUD operations on trusts work
✅ PDF download works

## Failure Indicators

❌ "User not found" errors
❌ 401 Unauthorized responses
❌ Redirect to login page
❌ ObjectId serialization errors
