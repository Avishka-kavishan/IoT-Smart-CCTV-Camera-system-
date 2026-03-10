# Frontend Configuration

## Installation

```bash
cd frontend
npm install
```

## Configure Backend URL

**IMPORTANT:** Edit one file to set your backend server IP address.

Open: `src/config/env.ts`

Change this line:
```typescript
BACKEND_URL: "http://localhost:5001",  // 👈 Change this
```

### Examples:

**Backend on same PC:**
```typescript
BACKEND_URL: "http://localhost:5001",
```

**Backend on different PC:**
```typescript
BACKEND_URL: "http://192.168.1.50:5001",  // Use ipconfig to find IP
```

## Run Frontend

```bash
npm run dev
```

Opens at: http://localhost:3000

## That's It!

- **Only 1 file to edit:** `src/config/env.ts` ✅
- Firebase is already configured ✅
- ESP32 cameras are added through the dashboard UI ✅
