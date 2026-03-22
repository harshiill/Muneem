chat_memory = {}

def save_message(user_id , message , role) : 
    if user_id not in chat_memory : 
        chat_memory[user_id] = []
    
    chat_memory[user_id].append({
        "role" : role,
        "message" : message
    })

def get_memory(user_id) :
    return chat_memory.get(user_id, [])