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
You are a smart financial assistant.

User Question:
{data.get('user_question')}

User Financial Data:
- Total Spending: {data.get('total_spending')}
- Top Category: {data.get('top_category')}
- Monthly Income: {data.get('monthly_income')}
- Monthly Saving Capacity: {data.get('monthly_capacity')}

Savings:
- Current Savings: {data.get('savings_this_period')}
- Can Meet Goal: {data.get('can_meet_saving_goal')}
- Accumulated Savings: {data.get('accumulated_savings')}

Goals:
{data.get('goal_insights')}

Risks:
{data.get('risk_flags')}

IMPORTANT:
- If income is 0, clearly say user has no income data
- Do NOT assume missing values incorrectly
- Be realistic and avoid exaggeration

Instructions:
- Answer the question directly
- Keep it short and practical
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return response.choices[0].message.content