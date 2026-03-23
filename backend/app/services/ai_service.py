import os
from openai import OpenAI
from dotenv import load_dotenv

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
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return response.choices[0].message.content