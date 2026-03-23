# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- Backend API running: `http://localhost:8000`

## Quick Start (5 minutes)

### 1. Navigate to frontend
```bash
cd frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```

### 4. Open browser
Visit: **http://localhost:3000**

Done! You should see the AI Financial Assistant interface.

---

## What You'll See

1. **Chat Interface** (Home page)
   - Full-screen chat like ChatGPT
   - Type a message and press Enter or click Send
   - AI will respond with financial advice

2. **Dashboard** (Left sidebar)
   - View total spending
   - See top categories
   - Get savings insights

3. **Add Expense** (Left sidebar)
   - Quick form to add expenses
   - Choose category
   - Track your spending

---

## API Requirements

Make sure your backend is running with these endpoints:

- `POST /chat/` - Chat endpoint
- `GET /expenses/insights` - Get spending insights
- `POST /expenses/` - Add new expense

If backend is not on `http://localhost:8000`, update `.env.local`:
```
NEXT_PUBLIC_API_URL=http://your-backend-url
```

Then restart dev server.

---

## Production Build

```bash
npm run build
npm start
```

Visit: **http://localhost:3000**

---

## Directory Structure

```
frontend/
├── app/                    # Pages & layout
│   ├── page.tsx           # Chat (home)
│   ├── dashboard/page.tsx # Dashboard
│   ├── add-expense/page.tsx
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── ChatBox.tsx
│   ├── MessageBubble.tsx
│   ├── Card.tsx
│   ├── Sidebar.tsx
│   └── AddExpenseForm.tsx
└── lib/                   # Utilities
    ├── api.ts             # API calls
    └── store.ts           # State management
```

---

## Features

✅ **ChatGPT-like Chat Interface**
- Real-time messaging
- Smooth animations
- Loading states

✅ **Financial Dashboard**
- Spending summary
- Category breakdown
- Insights

✅ **Expense Tracking**
- Simple form
- Multiple categories
- Quick add

✅ **Responsive Design**
- Mobile friendly
- Tablet optimized
- Dark mode default

✅ **Production Ready**
- TypeScript
- Error handling
- Loading states
- Toast notifications

---

## Troubleshooting

**Can't connect to API?**
- Ensure backend is running on `http://localhost:8000`
- Check `.env.local` has correct API URL
- Restart dev server

**Port 3000 already in use?**
```bash
npm run dev -- -p 3001
```
Then visit: `http://localhost:3001`

**Styling issues?**
- Clear `.next` folder
- Restart dev server

---

## Next Steps

1. Customize colors in `app/globals.css`
2. Add more AI capabilities via chat
3. Extend dashboard with more insights
4. Deploy to Vercel or your hosting

---

Questions? Check `README.md` for detailed documentation.
