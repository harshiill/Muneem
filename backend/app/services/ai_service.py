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

Instructions:
- Give a short, human-like financial suggestion
- Mention overspending if present
- Mention if savings are insufficient
- Mention goal timelines if relevant
- Keep response concise and practical
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": prompt}  # FIXED ROLE
        ]
    )

    return response.choices[0].message.content


def generate_chat_response(data):
    prompt = f"""
You are a smart financial assistant helping users manage their money.

Previous Conversation (for context and tone):
{data.get('memory_context', [])}

User's Question:
{data.get('user_question')}

=============== FRESH LIVE DATA (USE THIS FOR ALL FACTS) ===============

CURRENT FINANCIAL STATUS (Updated Real-Time):
- Total Spending (This Period): {data.get('total_spending')}
- Top Spending Category: {data.get('top_category')}
- Monthly Income: {data.get('monthly_income')}
- Monthly Saving Capacity: {data.get('monthly_capacity')}
- Current Savings: {data.get('savings_this_period')}
- Accumulated Total Savings: {data.get('accumulated_savings')}

ACTIVE GOALS (CURRENT FROM DATABASE):
{data.get('goal_insights')}

Financial Warnings:
{data.get('risk_flags')}

=============== CRITICAL INSTRUCTIONS ===============

1. **USE FRESH DATA ABOVE** - This is the current, real-time state from the database
2. **If user has made changes** (added expenses, goals, updated income) - the data above is UPDATED
3. **Memory context is ONLY for tone** - don't use old numbers from memory
4. **Empty means no data** - If goal_insights is empty, say "You have no active goals"
5. **Income = 0 means not set** - Say "You haven't set up your income data yet"
6. **Answer the question directly** - Be concise and practical

Answer based ONLY on the fresh data provided. Ignore conflicting information from memory.

Instructions:

- Think realistically
- For travel questions:
    - consider approximate cost
    - compare with savings
- If missing info → ask user
- Do NOT give over-optimistic answers
- Be practical and logical
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
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
    prompt = f"""
You are a smart financial assistant.

Your job is to classify user intent and extract action if needed.

---

Classify intent_type:

- action → user wants to do something (add expense, goal, etc.)
- advice → user asking decision (trip, saving, etc.)
- question → general question
- impossible → unrealistic request

---

RULES:

1. DO NOT create actions for unrealistic things
   Example: "I want to go to Mars" → impossible

2. For advice:
   - DO NOT create action
   - let main system handle response

3. Only create action if it is clear and realistic

---

Examples:

"I spent 500 on food"
→
{{
  "intent_type": "action",
  "action": "add_expense",
  "amount": 500,
  "category": "food",
  "title": "food"
}}

"Can I go to USA?"
→
{{
  "intent_type": "advice",
  "action": "none"
}}

"I want to go to Mars"
→
{{
  "intent_type": "impossible",
  "action": "none"
}}

---

User Input:
{user_question}

Return ONLY JSON.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.choices[0].message.content

    try:
        return AgentAction(**json.loads(text))
    except:
        return AgentAction(action="none")