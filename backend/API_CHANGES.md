# API Changes & New Features Documentation

## New Endpoints Added

### **Dues Management**

#### 1. Create Due
```
POST /expenses/dues
Body: {
  "title": "Loan to John",
  "amount": 5000,
  "creditor": "John Doe", 
  "due_date": "2026-04-30",
  "category": "personal",  // optional: "personal", "loan", "credit_card", "other"
  "notes": "Personal loan"  // optional
}

Response: {
  "id": 1,
  "title": "Loan to John",
  "amount": 5000,
  "creditor": "John Doe",
  "due_date": "2026-04-30",
  "category": "personal",
  "status": "pending",
  "created_at": "2026-03-25T10:00:00",
  "notes": "Personal loan"
}
```

#### 2. Get All Dues
```
GET /expenses/dues

Response: [
  {
    "id": 1,
    "title": "Loan to John",
    "amount": 5000,
    "creditor": "John Doe",
    "due_date": "2026-04-30",
    "category": "personal",
    "status": "pending",
    "created_at": "2026-03-25T10:00:00",
    "notes": "Personal loan"
  }
]
```

#### 3. Get Single Due
```
GET /expenses/dues/{due_id}

Response: { ...due object... }
```

#### 4. Delete Due
```
DELETE /expenses/dues/{due_id}

Response: {"message": "Due deleted"}
```

#### 5. Update Due Status
```
PATCH /expenses/dues/{due_id}/status
Query Params: status = "pending" | "paid" | "overdue"

Response: { ...updated due object... }
```

---

## Enhanced Chat Endpoint

The chat endpoint now intelligently handles:

### 1. **Adding Dues via Chat**
```
User: "I owe Sarah 10000 by next month"
→ Automatically detects and creates a due with:
  - amount: 10000
  - creditor: "Sarah"
  - due_date: 2026-04-30 (next month)
  - category: "personal"
```

### 2. **Asking Questions with Counter-Questions**
```
User: "I want to go on a trip"
→ Assistant response now includes clarifying questions:
  "To help you better:
  - How long are you planning to stay?
  - What's your preferred destination?
  - What's your budget?"
```

### 3. **Deleting Items via Chat**
```
User: "Delete my rent expense"
→ Automatically removes the expense

User: "Cancel my fitness goal"
→ Automatically removes the goal

User: "Remove my debt to bank"
→ Automatically removes the due
```

### 4. **Linking Expenses to Goals**
```
User: "Link this expense to my vacation goal"
→ Associates the current expense with the goal
```

---

## Updated Chat Response Example

```json
{
  "question": "I want to save for a trip to USA",
  "answer": "That's a great goal! Based on your current financial situation:
  
  - Your monthly savings capacity: ₹10,000
  - Current savings: ₹25,000
  - Pending dues: ₹15,000 (to creditors)
  
  **To help you better:**
  - How long are you planning this trip?
  - What's your estimated total budget?
  - When are you planning to go?
  
  My advice: First prioritize paying your dues (₹15,000), then you can save ₹10,000/month for your trip. With your current savings of ₹25,000, you have a good foundation to start with."
}
```

---

## Data Integration Points

### Financial Context Now Includes:
1. **Expenses** - What user spent on
2. **Goals** - What user wants to save for
3. **Dues** - What user owes to others ✨ NEW
4. **Income & Capacity** - How much user earns and can save

The LLM now considers all these factors when giving advice:
- Won't suggest buying gadgets if user has overdue payments
- Will mention dues first if they impact affordability
- Alerts user about overdue obligations in risk flags

---

## Backend Logic Flow

```
User Chat Message
    ↓
detect_user_intent() → Classifies as: action, advice, question, or impossible
    ↓
If ACTION:
  - add_expense, add_goal, add_due, update_profile
  - delete_expense, delete_goal, delete_due
  - add_expense_to_goal
    ↓
If ADVICE/QUESTION:
  - Fetch financial data (with dues)
  - Generate Smart Clarifying Questions
  - Generate realistic advice
    ↓
Return Response + Save to Memory
```

---

## Risk Flags Now Include

1. Monthly saving goal not met
2. Spending too high (>70% of income)
3. **Overdue payments exist** ✨
4. **High pending dues (>50% of income)** ✨
5. Goal deadline approaching with low progress

---

## Example Scenarios

### Scenario 1: Trip Planning with Dues
```
User: "Can I afford that USA trip next month?"

AI Analysis:
- Monthly Income: ₹50,000
- Current Savings: ₹50,000
- Pending Dues: ₹20,000 (to credit card)
- Trip Cost Estimate: ₹80,000

Response:
"You can technically afford the trip with your ₹50,000 savings + 
estimated ₹20,000 from next month's salary. However, you have ₹20,000 
in overdue credit card payments. I recommend:

1. First pay your dues immediately (₹20,000)
2. Plan the trip in 3 months instead
3. Save ₹10,000 x 3 months = ₹30,000 more

This way you'll be debt-free and have ₹80,000 for a great trip!"
```

### Scenario 2: Adding Expense to Goal
```
User: "I spent 2000 on flight tickets for my USA trip goal"

AI:
1. Creates expense: ₹2000, category: "travel"
2. Links to "USA trip" goal
3. Updates goal progress
4. Says: "Added ₹2000 to your USA trip goal! 
   Target: ₹80,000 | Current: ₹2000 | Progress: 2.5%"
```

---

## Database Schema Changes

### New Table: `dues`
```
id          INTEGER        PRIMARY KEY
title       VARCHAR        - Description of due
amount      FLOAT          - Amount owed
creditor    VARCHAR        - Person/entity owed to
due_date    DATETIME       - When payment is due
category    VARCHAR        - Type: personal, loan, credit_card, other
status      VARCHAR        - pending, paid, overdue
created_at  DATETIME       - When due was created
notes       VARCHAR        - Optional notes
```

---

## Testing Commands

```bash
# Add a due
curl -X POST http://localhost:8000/expenses/dues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Loan to John",
    "amount": 5000,
    "creditor": "John",
    "due_date": "2026-04-30",
    "category": "personal"
  }'

# Get all dues
curl http://localhost:8000/expenses/dues

# Update due status
curl -X PATCH http://localhost:8000/expenses/dues/1/status?status=paid

# Delete due
curl -X DELETE http://localhost:8000/expenses/dues/1

# Chat with due mention
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I owe my friend 2000 by next week"
  }'
```

---

## Key Improvements Summary

✅ **LLM Now Asks Counter-Questions** - Better understanding of user needs  
✅ **Dues Tracking** - Full financial obligation visibility  
✅ **Delete Operations** - Users can manage/remove items  
✅ **Goal-Expense Linking** - Expenses explicitly tied to goals  
✅ **Web Search Ready** - Can reference external financial data  
✅ **Multi-Agent Support** - Different AI agents for different tasks  
✅ **Risk Aware** - Alerts about overdue obligations  
✅ **Code Structure Preserved** - No breaking changes to existing code
