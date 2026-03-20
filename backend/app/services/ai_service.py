from openai import OpenAI
from dotenv import load_dotenv


load_dotenv()
client = OpenAI()

def generate_ai_advice(data):
    SYSTEM_PROMPT = f"""
        You are a Financial Assistant.
        
        User Spending Data : 
        Total Spending: {data['total_spending']}
        Top Category : {data['top_category']}
        Monthly Saving Capacity : {data['monthly_capacity']}
        Monthly Income : {data['monthly_income']}
        
        
        
        
        Give a short helpful suggestion.
        Mention if spending is high compared to income or affected saving.
    """
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role" : "assistant" , "content": SYSTEM_PROMPT}
        ]
    )
    
    return response.choices[0].message.content
    

