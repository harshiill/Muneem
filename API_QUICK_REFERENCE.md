# Quick API Reference Card

## Chat Endpoint

### Send Chat Message
```bash
POST /chat/
Content-Type: application/json

{
  "message": "I'd like to save for a trip",
  "refresh_context": false
}

Response:
{
  "question": "I'd like to save for a trip",
  "answer": "That's great! To help you better:
  1. Where are you planning to go?
  2. When are you planning this trip?
  3. What's your estimated budget?
  
  Your current situation:
  - Monthly savings: ₹10,000
  - Current savings: ₹25,000
  
  Let me know these details!"
}
```

## Expenses

### Add Expense
```bash
POST /expenses/
{
  "title": "Flight booking",
  "amount": 5000,
  "category": "Travel",
  "goal_id": 1  # optional
}
```

### Get All Expenses
```bash
GET /expenses/
```

### Delete Expense
```bash
DELETE /expenses/{expense_id}
```

## Goals

### Create Goal
```bash
POST /expenses/goals
{
  "title": "USA Trip",
  "target_amount": 50000,
  "deadline": "2026-12-31",
  "goal_type": "saving"  # or "expense"
}
```

### Get All Goals
```bash
GET /expenses/goals
```

### Delete Goal
```bash
DELETE /expenses/goals/{goal_id}
```

## Dues (NEW!)

### Add Due
```bash
POST /expenses/dues
{
  "title": "Loan from John",
  "amount": 15000,
  "creditor": "John Doe",
  "due_date": "2026-04-30",
  "category": "personal",  # "personal", "loan", "credit_card", "other"
  "notes": "Personal loan"
}

Response:
{
  "id": 1,
  "title": "Loan from John",
  "amount": 15000,
  "creditor": "John Doe",
  "due_date": "2026-04-30",
  "category": "personal",
  "status": "pending",
  "created_at": "2026-03-25T10:30:00",
  "notes": "Personal loan"
}
```

### Get All Dues
```bash
GET /expenses/dues
```

### Get Single Due
```bash
GET /expenses/dues/{due_id}
```

### Mark Due as Paid
```bash
PATCH /expenses/dues/{due_id}/status?status=paid

Possible status values:
- pending
- paid
- overdue
```

### Delete Due
```bash
DELETE /expenses/dues/{due_id}
```

## Profile

### Get Profile
```bash
GET /expenses/profile

Response:
{
  "id": 1,
  "monthly_income": 50000,
  "monthly_saving_capacity": 10000
}
```

### Update Profile
```bash
POST /expenses/profile
{
  "monthly_income": 50000,
  "monthly_saving_capacity": 10000
}
```

## Insights

### Get Weekly Insights
```bash
GET /expenses/insights/weekly

Response:
{
  "total_spending": 35000,
  "transactions": 12,
  "category_breakdown": {
    "Food": 10000,
    "Travel": 15000,
    "Entertainment": 10000
  },
  "top_category": "Travel",
  "goal_insights": [
    {
      "goal": "USA Trip",
      "type": "saving",
      "target_amount": 50000,
      "months_needed": 5,
      "months_left": 9
    }
  ],
  "due_insights": [
    {
      "due": "Loan from John",
      "status": "pending",
      "amount": 15000,
      "creditor": "John Doe",
      "days_until_due": 35
    }
  ],
  "risk_flags": [
    "You have ₹15,000 in pending payments",
    "Your spending is very high compared to income"
  ],
  "savings_this_period": 15000,
  "accumulated_savings": 25000,
  "total_pending_dues": 15000,
  "total_overdue": 0
}
```

## Chat Examples

### Example 1: Trip Planning
```
User: "I want to go to USA"

AI: "That sounds exciting! To give you better advice:
1. How long are you planning to stay?
2. What's your estimated total budget?
3. When do you want to go?

Your finances:
- Monthly savings: ₹10,000
- Current savings: ₹30,000
- Dues: ₹15,000 (to bank)

With your current savings and ₹10k/month, you can afford a ₹50k trip in 5 months after paying your dues. Let me know your timeline!"
```

### Example 2: Recording a Due
```
User: "I borrowed 20000 from my friend for 2 months"

AI: "Recorded! I've added a ₹20,000 due to your friend with a 2-month deadline.

This is important for your planning:
- Due Date: ~2 months from now
- Amount: ₹20,000
- Status: Pending

This will impact your savings goal. You currently can save ₹10,000/month, but after this payment, you'll have ₹10,000 left for other goals. Want to adjust your savings plan?"
```

### Example 3: Goal and Expense Linking
```
User: "I spent 3000 on my trip fund"

AI: "Perfect! Added ₹3,000 to your Trip goal.

Progress Update:
- Goal: USA Trip
- Target: ₹50,000
- Spent: ₹3,000
- Remaining: ₹47,000
- Progress: 6%

At your current pace of saving ₹10,000/month plus this expense, you'll reach your goal in approximately 4-5 months!"
```

### Example 4: Smart Recommendation
```
User: "Can I buy a new laptop for 80000?"

AI: "Before I answer, let me ask:
1. Do you need it immediately or can wait a few months?
2. Is your current laptop broken or just outdated?
3. What's the monthly EMI if you buy now?

Important context:
- Your monthly savings: ₹10,000
- Current savings: ₹25,000
- Pending dues: ₹15,000 (due next month)

My recommendation: First clear your ₹15k debt (next month), then save for 6-8 months to have ₹65,000. This way you'll be debt-free AND afford the laptop with your own money instead of EMI. What do you think?"
```

## Frontend Endpoints (NextJS Routes)

```
/              → Chat interface
/dashboard     → Financial overview
/expenses      → View expenses
/goals         → View and manage goals
/dues          → NEW: View and manage dues
/add-expense   → Add expense form
/profile       → Manage profile
```

## Frontend API Methods

```javascript
// Chat
chatApi.sendMessage(message, refreshContext)

// Expenses
expenseApi.getExpenses()
expenseApi.addExpense(title, amount, category, goalId)
expenseApi.deleteExpense(id)

// Goals
goalsApi.getGoals()
goalsApi.createGoal(title, targetAmount, deadline, goalType)
goalsApi.deleteGoal(id)

// Dues (NEW)
expenseApi.getDues()
expenseApi.addDue(data)
expenseApi.deleteDue(id)
expenseApi.updateDueStatus(id, status)

// Profile
profileApi.getProfile()
profileApi.updateProfile(income, capacity)

// Insights
expenseApi.getInsights()
```

## Status Codes

```
200 → Success
201 → Created
400 → Bad Request
401 → Unauthorized
404 → Not Found
500 → Server Error
```

## Common Due Categories

- "Personal Loan" - Loan from a friend/family
- "Credit Card" - Credit card debt
- "Bank Loan" - Loan from a bank
- "Friend/Family" - Money owed to someone close
- "Other" - Miscellaneous

## Tips

1. **Always set a monthly income** - This helps AI give better advice
2. **Set a saving capacity** - AI considers this in recommendations
3. **Link expenses to goals** - Easier to track progress
4. **Record dues immediately** - Don't let obligations pile up
5. **Mark dues as paid** - Keep status updated
6. **Ask clarifying questions** - AI will ask you back

## Debugging

Check API documentation:
```
http://localhost:8000/docs
```

This interactive docs show:
- All endpoints
- Request/response models
- Try it out feature
- Status codes

## Database Sync

Run migrations if needed:
```bash
# In backend
alembic upgrade head
```

## Quick Test Script

```bash
#!/bin/bash

# Test Chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Can I afford a trip?"}'

# Test Add Due
curl -X POST http://localhost:8000/expenses/dues \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Due",
    "amount":5000,
    "creditor":"Test",
    "due_date":"2026-12-31"
  }'

# Test Get Dues
curl http://localhost:8000/expenses/dues

# Test Get Insights
curl http://localhost:8000/expenses/insights/weekly
```
