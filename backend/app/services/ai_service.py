import os
from openai import OpenAI
from dotenv import load_dotenv
from app.schema.agent_schema import AgentAction

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_ai_advice(data):
    prompt = f"""
You are a smart and friendly financial assistant.


User Financial Summary:

- Total Spending (recent): {data.get('total_spending')}
- Top Spending Category: {data.get('top_category')}
- Monthly Income: {data.get('monthly_income')}
- Monthly Saving Capacity: {data.get('monthly_capacity')}

Savings Analysis:
- Current Savings: {data.get('savings_this_period')}
- Can Meet Saving Goal: {data.get('can_meet_saving_goal')}
- Total Accumulated Savings: {data.get('accumulated_savings')}

Risk Analysis:
- Risk Flags: {data.get('risk_flags')}

Goals:
{data.get('goal_insights')}

Dues:
{data.get('due_insights')}

Instructions:
- Give a short, human-like financial suggestion
- Mention overspending if present
- Mention if savings are insufficient
- Mention goal timelines if relevant
- Mention dues if present and urgent
- Keep response concise and practical
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful financial advisor."},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"[generate_ai_advice] AI call failed: {e}")
        return "AI advice is temporarily unavailable. Your core financial insights are still up to date."


# 🔹 NEW: Generate Clarifying Questions
def generate_clarifying_questions(user_question: str, data: dict):
    """Generate intelligent counter-questions to gather more context"""
    prompt = f"""
You are a smart financial advisor. The user asked:
"{user_question}"

Their current financial situation:
- Monthly Income: {data.get('monthly_income')}
- Monthly Savings Capacity: {data.get('monthly_capacity')}
- Total Spending: {data.get('total_spending')}
- Current Savings: {data.get('savings_this_period')}

Your job: Ask 2-3 SHORT, SPECIFIC clarifying questions to better understand their situation.

Format: Ask questions that help you give better advice.

Examples:
- User: "I want to go on a trip"
  Questions: "How long are you planning to stay? Which destination? What's your budget in mind?"
  
- User: "Can I afford a new phone?"
  Questions: "What's the phone price? Will you pay upfront or in installments? What brand are you considering?"

- User: "I'm overspending"
  Questions: "Which categories are you overspending on? Is this a temporary situation or ongoing problem?"

User Question: "{user_question}"

Generate 2-3 clarifying questions in a natural conversational way. Be concise.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful financial advisor who asks smart clarifying questions."},
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content


# 🔹 NEW: Web Search Integration
def search_financial_info(query: str):
    """Use OpenAI SDK to enhance answers with web context"""
    try:
        # Create completion with web search context
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a financial advisor. Provide practical, researched financial advice."
                },
                {
                    "role": "user",
                    "content": f"Provide reliable financial information about: {query}"
                }
            ],
            temperature=0.7,
            max_tokens=500
        )
        return completion.choices[0].message.content
    except Exception as e:
        return None


def generate_chat_response(data):
    # Format memory context as readable text
    memory_text = "\n".join(data.get('memory_context', [])) if data.get('memory_context') else "[No prior context]"
    
    # Format goals as readable text
    goals_list = data.get('goal_insights', [])
    goals_text = ""
    if goals_list:
        for g in goals_list:
            if g.get('type') == 'saving':
                goals_text += f"- {g.get('goal')}: Target ₹{g.get('target_amount')}, Need {g.get('months_needed')} months, {g.get('months_left')} months left\n"
            else:
                goals_text += f"- {g.get('goal')}: Target ₹{g.get('target_amount')}, Spent ₹{g.get('spent')}, Progress {g.get('progress_percent')}%\n"
    else:
        goals_text = "[No active goals]"
    
    # Format dues as readable text  
    dues_list = data.get('due_insights', [])
    dues_text = ""
    if dues_list:
        for d in dues_list:
            days = f" ({d.get('days_until_due')} days left)" if d.get('days_until_due') is not None else ""
            dues_text += f"- {d.get('creditor')}: ₹{d.get('amount')} ({d.get('status')}){days}\n"
    else:
        dues_text = "[No pending dues]"
    
    # Format risk flags with proper formatting
    risk_list = data.get('risk_flags', [])
    risk_text = ""
    if risk_list:
        for flag in risk_list:
            risk_text += f"⚠️  {flag}\n"
    else:
        risk_text = "[No risk flags]"
    
    prompt = f"""
You are a smart financial assistant helping users manage their money.

Previous Conversation Memory:
{memory_text}

User's Question:
{data.get('user_question')}

=============== FRESH LIVE DATA (USE THIS FOR ALL FACTS) ===============

CURRENT FINANCIAL STATUS (Updated Real-Time):
- Total Spending (This Period): ₹{data.get('total_spending', 0)}
- Top Spending Category: {data.get('top_category') or 'Not determined'}
- Monthly Income: ₹{data.get('monthly_income') or 'Not set'}
- Monthly Saving Capacity: ₹{data.get('monthly_capacity') or 'Not set'}
- Current Savings This Period: ₹{data.get('savings_this_period') or 0}
- Accumulated Total Savings: ₹{data.get('accumulated_savings') or 0}

ACTIVE GOALS (CURRENT FROM DATABASE):
{goals_text}

PENDING DUES & OBLIGATIONS:
{dues_text}

Financial Warnings:
{risk_text}

=============== CRITICAL INSTRUCTIONS ===============

1. **USE FRESH DATA ABOVE** - This is the current, real-time state from the database
2. **If user has made changes** (added expenses, goals, updated income) - the data above is UPDATED
3. **Memory context is ONLY for tone** - don't use old numbers from memory
4. **Empty means no data** - If goal_insights is empty, say "You have no active goals"
5. **Income = 0 means not set** - Say "You haven't set up your income data yet"
6. **Answer the question directly** - Be concise and practical
7. **Consider Dues in Analysis** - Factor in pending dues when giving financial advice
8. **Ask for Clarification** - If user's request is vague, ask clarifying questions
9. **Be Realistic** - Don't promise unrealistic results

TRIP PLANNING SPECIAL RULES:
- If user asks about trips (Goa, hill station, vacation, etc.):
  - Suggest realistic costs:
    * Goa: ₹25,000-₹75,000 (3-7 days depending on comfort level)
    * Hill stations: ₹15,000-₹40,000
    * International: ₹100,000+
  - If their goal amount is < ₹5,000 for a trip, point out it's unrealistic
  - Ask "What's your actual budget for this trip?"
  - Then compare THAT budget with their savings, not the goal amount

GOAL VALIDATION:
- If saving goal's target is unrealistic for the goal type, mention it
- For travel: budgets < ₹10,000 are usually not enough
- For electronics: budgets < ₹5,000 are tight
- For vehicles: budgets < ₹100,000 are not realistic

Answer based ONLY on the fresh data provided. Ignore conflicting information from memory.

Instructions:

- Think realistically
- For travel questions:
    - consider approximate cost
    - compare with savings
- For any major decision:
    - Consider their dues and obligations
    - Check if it aligns with goals
- If missing info → ask user specific questions
- Do NOT give over-optimistic answers
- Be practical and logical
- Acknowledge dues if they impact the decision
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a highly intelligent financial advisor who gives practical, realistic advice considering all financial obligations."
            },
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content


import json
from openai import OpenAI
client = OpenAI()

def detect_action(user_input: str):
    prompt = f"""
You are an AI financial assistant.

Decide if the user wants to perform an action.

Actions:
1. add_expense → when user mentions spending
2. add_goal → when user wants to save money
3. update_profile → when user mentions salary/income

Return ONLY JSON:

{{
  "action": "add_expense" | "add_goal" | "update_profile" | "none",
  "data": {{...}}
}}

Examples:

User: I spent 500 on food
→ {{"action": "add_expense", "data": {{"amount": 500, "category": "food", "title": "food"}}}}

User: I want to save 10000 for trip
→ {{"action": "add_goal", "data": {{"title": "trip", "target_amount": 10000, "deadline": "2026-12-31", "goal_type": "saving"}}}}

User: My salary is 50000
→ {{"action": "update_profile", "data": {{"monthly_income": 50000, "monthly_saving_capacity": 10000}}}}

User: Hello
→ {{"action": "none", "data": {{}}}}

User Input:
{user_input}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return json.loads(response.choices[0].message.content)



def detect_user_intent(user_question: str):
    # Using triple quotes and not as f-string to avoid escaping issues with JSON
    prompt = """
You are a smart financial assistant that detects user intents with high accuracy.
Return ONLY valid JSON with no markdown, code blocks, or extra text.

---

Classify intent_type:
- action → user wants to do something
- advice → user asking for help or decision
- question → general question
- impossible → unrealistic request

---

ACTIONS YOU CAN DETECT:

1. add_expense → "I spent X on Y"
   - ALSO DETECT: goal mention for linking (goal_name)
   - ALSO DETECT: people names for splitting (splits array)
   - SPLITS: When user mentions splitting with others, extract each person's share

2. add_goal → "I want to save/spend X for Y"
3. add_due → "I owe X to Y" or "Need to pay by DATE"
4. delete_expense, delete_goal, delete_due
5. update_profile → "My salary is X"

---

SPLITS EXAMPLES - IMPORTANT:
When user says: "Lunch 600 with Ayush and Tanmay"
  Each person pays: 600/3 = 200 each
  Extract: splits=[{"person_name":"Ayush","amount_owed":200},{"person_name":"Tanmay","amount_owed":200}]
  Note: Don't include yourself in splits, only the others

When user says: "Movie tickets 400, Ayush pays for John's"
  Extract: splits=[{"person_name":"Ayush","amount_owed":200},{"person_name":"John","amount_owed":200}]
  Ayush owes you 200, John owes you 200

When user says: "Dinner 1000 split 3 ways"
  Extract: splits=[{"person_name":"Friend1","amount_owed":333},{"person_name":"Friend2","amount_owed":333}]
  If exact names not given, use generic names

---

DUE DETECTION - IMPORTANT:
When user says: "I owe 5000 to John"
  Extract: creditor="John", amount=5000, title="Loan from John"
When user says: "Pay 2000 to credit card by March 31"
  Extract: creditor="Credit Card", amount=2000, due_date="2026-03-31"

TODAY'S DATE: 2026-03-26

---

EXAMPLES (return ONLY JSON, no extra text):

Input: "I spent 100 for birthday"
Output: {"intent_type":"action","action":"add_expense","amount":100,"category":"Entertainment","title":"birthday party","goal_name":"birthday"}

Input: "Lunch 600 with Ayush and Tanmay"
Output: {"intent_type":"action","action":"add_expense","amount":600,"category":"Food","title":"Lunch","splits":[{"person_name":"Ayush","amount_owed":300},{"person_name":"Tanmay","amount_owed":300}]}

Input: "Coffee 200 paid by Raj"
Output: {"intent_type":"action","action":"add_expense","amount":200,"category":"Food","title":"Coffee","splits":[{"person_name":"Raj","amount_owed":200}]}

Input: "I owe 5000 to John"
Output: {"intent_type":"action","action":"add_due","amount":5000,"creditor":"John","title":"Loan from John","due_date":"2026-04-26","due_category":"personal"}

Input: "Delete the goal trip"
Output: {"intent_type":"action","action":"delete_goal","goal_name":"trip"}

Input: "Remove my savings goal"
Output: {"intent_type":"action","action":"delete_goal","goal_name":"savings"}

Input: "Delete the expense"
Output: {"intent_type":"action","action":"delete_expense","title":"recent expense"}

Input: "Remove the due to John"
Output: {"intent_type":"action","action":"delete_due","creditor":"John"}

Input: "Can I afford a trip?"
Output: {"intent_type":"advice","action":"none"}

Input: "Can I go to Jaipur?"
Output: {"intent_type":"advice","action":"none"}

---

User Input: """ + user_question + """
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a financial assistant. Return ONLY valid JSON, no markdown or code blocks."},
            {"role": "user", "content": prompt}
        ]
    )

    text = response.choices[0].message.content.strip()
    
    # Clean up markdown code blocks if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    try:
        data = json.loads(text)
        return AgentAction(**data)
    except json.JSONDecodeError as e:
        print(f"JSON Error: {e}, texto: {text[:100]}")
        return AgentAction(intent_type="advice", action="none")
    except Exception as e:
        print(f"AgentAction Error: {e}")
        return AgentAction(intent_type="advice", action="none")