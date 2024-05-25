# add supabase client to retrieve past conversation of specific id
# add pinecone but the function runs once and use the vector embeddings over and over again.
# from utils_ignore import GraphState, AIFreelanceAgent

# RUN THIS EXACT FILE IN ONE FUNCTION THAT IS USED WHEN

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

from langchain_community.chat_message_histories import (
    PostgresChatMessageHistory,
)


#put this connection string in .env file pls


# print the session_id = 'chat1' to get all the initial prompt and response.
URL = "https://live-baboon-34450.upstash.io"
TOKEN ="AYaSAAIncDE1M2YwMzFlOTk5ODk0ZWZlYmI0MDc0YTlhYWE5MzFlNHAxMzQ0NTA"
history = UpstashRedisChatMessageHistory(
    url=URL, token=TOKEN, ttl=500, session_id="chat1"
)

# print(history, type(history))



model = ChatGroq(
            api_key=os.environ.get('GROQ_API_KEY'),
            model="llama3-70b-8192"
        ) 

prompt = ChatPromptTemplate.from_messages([
        ("system", 
         
         '''
         
         
            You are the Reply writer Agent for the freelancing platform which replies to clients looking from freelancers, take the INITIAL_MESSAGE below \
            from a human that has come to the platform looking for freelancers. The summarizer \
            that the categorizer agent gave it and the research from the research agent and \
            Ask helpful question to better understand the freelancing needs in a thoughtful and friendly way. Remember people maybe asking \
            about a lot of things at once, make sure that by the end of the conversation you have these questions asked.

                    If the customer message is 'off_topic' then ask them questions to get more information about freelancing orders
                    If the customer message is 'description of certain task' then try to get some designs or descriptions in the form of docs, or URLs or any other links depending on the task 
                    If the customer message is 'product_enquiry' then try to give them the info the researcher provided in a succinct and friendly way,\
                    If any part of the user’s description is vague or incomplete, request additional details. \
                    Facilitate a clear and precise exchange of information and confirm facts and summarize details to ensure accuracy
                    If the customer message is 'price_equiry' then try to ask for their budget and tell them about what they can possibly get in this budget

                    You never make up information that hasn't been provided by the research_info or in the initial_message.

                    Return the reply as either 1 question or one sentence no more than around 20ish words. Make sure to not ask everything mentioned in the prompt \
                    at once, but check in memory if the above question is answered but don't ask questions back to back.
                    Keep it naturally in a conversational tone as well as friendly.
                    
                    If they ask for further communications, ask them to contact whatsapp +316 45421019 for details, Linkedin: Muhammad Rafiq.
         '''
         
         ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}")
    ])


memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True,
    chat_memory=history,
)

chain = prompt | model
chain = LLMChain(
    llm=model,
    prompt=prompt,
    # verbose=True,
    memory=memory
)
# Prompt 1
# q1 = { "input": "I want a freelancer" }


for i in range(15):
    question = input('WHAT IS UR QS:') 
    resp1 = chain.invoke(question)
    print('ANSWER', resp1['text'])
