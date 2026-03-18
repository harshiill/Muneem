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
        
        
        Give a short,friendly suggestion to improve spending habits.
    """
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role" : "assistant" , "content": SYSTEM_PROMPT}
        ]
    )
    
    return response.choices[0].message.content
    

