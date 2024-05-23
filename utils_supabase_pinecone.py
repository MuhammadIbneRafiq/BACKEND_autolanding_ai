# add supabase client to retrieve past conversation of specific id
# add pinecone but the function runs once and use the vector embeddings over and over again.
# from utils_ignore import GraphState, AIFreelanceAgent
from dotenv import load_dotenv
import os
load_dotenv()
from langchain_groq import ChatGroq
from langchain.memory import ConversationBufferMemory
from langchain.chains import LLMChain
from langchain_community.chat_message_histories.upstash_redis import (
    UpstashRedisChatMessageHistory,
)
from langchain.prompts import (
    ChatPromptTemplate,
    MessagesPlaceholder,
)
from supabase import create_client
SUPABASE_KEY= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ra2RsYmRuZmF5bGFrZmJ5Y3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM1MjIzNTIsImV4cCI6MjAyOTA5ODM1Mn0.Zf4DnOscUxz5LxbulHsMMmtyXT7Eoapg50WVgAW_Nig'
SUPABASE_URL= 'https://okkdlbdnfaylakfbycta.supabase.co'

supabase = create_client(supabase_key=SUPABASE_KEY, supabase_url=SUPABASE_URL)

# data = supabase_client.table("countries").insert({"name":"Germany"}).execute()
response = supabase.table('Messages').select("*").execute()
data = supabase.table("Messages").select("*").eq("user_id", "e00ad159-0e2b-449e-b6ec-fbd70541fecd").execute()

# for datas in data:
#     print(datas)


# URL = ""
# TOKEN =""
# history = UpstashRedisChatMessageHistory(
#     url=URL, token=TOKEN, ttl=500, session_id="chat1"
# )


# model = ChatGroq(
#             api_key=os.environ.get('GROQ_API_KEY'),
#             model="llama3-70b-8192"
#         ) 

# prompt = ChatPromptTemplate.from_messages([
#         ("system", "You are a friendly AI assistant."),
#         MessagesPlaceholder(variable_name="chat_history"),
#         ("human", "{input}")
#     ])


# memory = ConversationBufferMemory(
#     memory_key="chat_history",
#     return_messages=True,
#     chat_memory=history,
# )

# chain = prompt | model
# chain = LLMChain(
#     llm=model,
#     prompt=prompt,
#     verbose=True,
#     # memory=memory
# )


# Prompt 1
# q1 = { "input": "My name is Leon" }
# resp1 = chain.invoke(q1)
# print(resp1["text"])

# # Prompt 2
# q2 = { "input": "What is my name?" }
# resp2 = chain.invoke(q2)
# print(resp2["text"])