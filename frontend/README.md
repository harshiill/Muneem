# AI Financial Assistant - Frontend

A modern, production-ready Next.js 14 frontend for the AI Financial Assistant application. Features a ChatGPT-like interface, expense tracking dashboard, and financial management tools.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components (integrated via Tailwind)
- **Axios** - HTTP client
- **Zustand** - State management
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## Features

### 1. Chat Interface
- Full-screen ChatGPT-like chat layout
- Real-time message bubbles (user right, AI left)
- Auto-scroll to latest messages
- Loading states with animations
- Send button + Enter key support
- Smooth animations
- Empty state with suggestions

### 2. Dashboard
- View total spending
- Top spending categories
- Savings insights
- Responsive cards
- Real-time data fetching

### 3. Add Expense
- Simple expense form
- Multiple categories
- Real-time validation
- Success/error notifications

### 4. Navigation
- Responsive sidebar (collapsible on mobile)
- Easy navigation between Chat, Dashboard, and Add Expense
- Clean, minimal design

### 5. Design
- Dark mode by default
- Minimal, modern UI
- Smooth animations
- Fully responsive (mobile, tablet, desktop)
- Custom color scheme optimized for dark mode

## Installation

### Prerequisites
- Node.js 18+ and npm/yarn
- Backend API running on `http://localhost:8000`

### Steps

1. **Clone/Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure API URL (optional)**
Edit `.env.local` if your backend is on a different URL:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. **Start development server**
```bash
npm run dev
```

5. **Open in browser**
Visit `http://localhost:3000`

## Running in Production

### Build
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Chat page (home)
│   ├── dashboard/
│   │   └── page.tsx            # Dashboard page
│   ├── add-expense/
│   │   └── page.tsx            # Add expense page
│   └── globals.css             # Global styles
├── components/
│   ├── ChatBox.tsx             # Main chat interface
│   ├── MessageBubble.tsx       # Individual message component
│   ├── AddExpenseForm.tsx      # Expense form
│   ├── Card.tsx                # Reusable card component
│   └── Sidebar.tsx             # Navigation sidebar
├── lib/
│   ├── api.ts                  # API client and methods
│   └── store.ts                # Zustand chat store
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
├── .env.local                  # Environment variables
└── .gitignore
```

## API Integration

### Chat Endpoint
```
POST http://localhost:8000/chat/

Request:
{
  "message": "user input"
}

Response:
{
  "answer": "AI response"
}
```

### Expenses Insights Endpoint
```
GET http://localhost:8000/expenses/insights

Response:
{
  "total_spending": 250.50,
  "top_category": "Food",
  "savings_insight": "You spend 30% more on food this month"
}
```

### Add Expense Endpoint
```
POST http://localhost:8000/expenses/

Request:
{
  "title": "Coffee",
  "amount": 5.50,
  "category": "Food"
}
```

## Component API

### ChatBox
Main chat interface component. Manages messages and API communication.
```tsx
import { ChatBox } from '@/components/ChatBox'

export default function Page() {
  return <ChatBox />
}
```

### MessageBubble
Individual message component.
```tsx
import { MessageBubble } from '@/components/MessageBubble'

<MessageBubble message={message} />
```

### Card
Reusable card component for displaying information.
```tsx
import { Card } from '@/components/Card'

<Card 
  title="Total Spending" 
  value="₹250.50" 
  icon="💰"
  description="Total amount spent"
/>
```

### AddExpenseForm
Form for adding expenses.
```tsx
import { AddExpenseForm } from '@/components/AddExpenseForm'

<AddExpenseForm />
```

### Sidebar
Navigation sidebar.
```tsx
import { Sidebar } from '@/components/Sidebar'

<Sidebar />
```

## State Management

Uses Zustand for chat state:
```tsx
import { useChatStore } from '@/lib/store'

const { messages, isLoading, addMessage, setLoading } = useChatStore()
```

## Error Handling

- API errors are caught and displayed via toast notifications
- Form validation on expense addition
- Graceful error messages for users
- Automatic error recovery

## Customization

### Colors
Edit dark mode colors in `app/globals.css`:
```css
:root {
  --background: 0 0% 3%;
  --primary: 217 91% 60%;
  /* ... more colors ... */
}
```

### Tailwind Theme
Customize in `tailwind.config.ts`

### API Base URL
Update in `.env.local` or `lib/api.ts`

## Performance

- Optimized with Next.js server components
- Code splitting with dynamic imports
- Image optimization ready
- Smooth animations with Tailwind CSS
- Efficient state management with Zustand

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Troubleshooting

### API Connection Issues
- Ensure backend is running on `http://localhost:8000`
- Check `.env.local` for correct API URL
- Check browser console for CORS errors

### Build Issues
- Delete `node_modules` and `.next`
- Run `npm install` again
- Ensure Node.js version is 18+

### Styling Issues
- Clear browser cache
- Restart dev server
- Check Tailwind CSS is configured correctly

## Scripts

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## Contributing

Keep code modular and components reusable. Follow the existing structure and naming conventions.

## License

MIT
