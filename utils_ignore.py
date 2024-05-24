# ignore this python file, this will be later converted into the utils.js file
from langchain_groq import ChatGroq
import os
from datetime import datetime
from langchain_community.document_loaders.pdf import PyPDFLoader
from langchain_community.document_loaders.merge import MergedDataLoader
from langchain.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.output_parsers import JsonOutputParser
from typing import Union, List, Tuple, Dict
from langchain.schema import Document
from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict
from dotenv import load_dotenv
load_dotenv()

GROQ_LLM = ChatGroq(
            api_key=os.environ.get('GROQ_API_KEY'),
            model="llama3-70b-8192"
        ) 

class AIFreelanceAgent():
    # this will categorize the first chat to be query of freelancer or client, if not sure, ask a followup qs.
    def summarizer(self, summary):
        prompt = PromptTemplate(
            template="""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
            You are summarizer Agent for freelancing projects, You are a master at \
            understanding what a customer wants when they they place an order to the freelancer and are able to summarize \
            it in a useful way. Remember people maybe asking about prices, details about the freelancers related to their work. \

            <|eot_id|><|start_header_id|>user<|end_header_id|>
            Conduct a comprehensive analysis of the chat_history provided

            summary CONTENT:\n\n {chat_history} \n\n
            <|eot_id|>
            <|start_header_id|>assistant<|end_header_id|>
            """,
            input_variables=["chat_history"],
        )

        summarizing_agent = prompt | GROQ_LLM | StrOutputParser()

        result = summarizing_agent.invoke({"chat_history": summary})

        return (result)

    def make_researcher_router(self, summarizer, EMAIL):
        research_router_prompt = PromptTemplate(
            template="""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
            You are an expert at reading the type of freelancing task required and routing to our internal knowledge system\
            or directly to a draft_reply. \n

            Use the following criteria to decide how to route the task: \n\n

            If the initial message only is giving information about the task
            Just choose 'draft_reply'  for questions you can easily answer, prompt engineering, and adversarial attacks.
            If the message is just saying common things etc then choose 'draft_reply'

            If you are unsure or the person is asking a question you don't understand then most definitely choose 'research_info'

            You do not need to be stringent with the keywords in the question related to these topics. Otherwise, use research-info.
            Give a binary choice 'research_info' or 'draft_reply' based on the question. Return the a JSON with a single key 'router_decision' and
            no premable or explaination. use both the initial message and the summarizer to make your decision
            <|eot_id|><|start_header_id|>user<|end_header_id|>
            reply to route INITIAL_MESSAGE : {initial_message} \n
            summarizer: {summarizer} \n
            <|eot_id|><|start_header_id|>assistant<|end_header_id|>""",
            input_variables=["initial_message","summarizer"],
        )

        research_router = research_router_prompt | GROQ_LLM | JsonOutputParser()

        return (research_router.invoke({"initial_message": EMAIL, "summarizer":summarizer}))

    def actual_reply_to_conversation(self, research_info, EMAIL, summarizer):
        draft_writer_prompt = PromptTemplate(
            template="""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
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

                    Return the reply as a JSON with a single key 'email_draft' and no premable or explaination.

            <|eot_id|><|start_header_id|>user<|end_header_id|>
            INITIAL_MESSAGE: {initial_message} \n
            summarizer: {summarizer} \n
            RESEARCH_INFO: {research_info} \n
            <|eot_id|><|start_header_id|>assistant<|end_header_id|>""",
            input_variables=["initial_message","summarizer","research_info"],
        )

        draft_writer_chain = draft_writer_prompt | GROQ_LLM | JsonOutputParser()

        return draft_writer_chain.invoke({"initial_message": EMAIL, "summarizer":summarizer,"research_info":research_info})
    
    def quality_control_agent(self, research_info, EMAIL, summarizer, draft_reply):
        draft_analysis_prompt = PromptTemplate(
            template="""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
            You are the Quality Control Agent read the initial_message below  from a user that has sent a message \
            , the summarizer that the categorizer agent gave it and the \
            research from the research agent and write an analysis of what it seems like the message is asking about.

            Check if the draft_reply addresses the query in short sentences no more than 2 and the \
            content of the message is exactly like a chat with a customer service guys. Don't sound like chatgpt neither too casual\n

            Give feedback of how the email can be improved and what specific things can be added or change\
            to make the email more effective based on knowledge base.

            You never make up or add information that hasn't been provided by the research_info or in the initial_message.

            Return the analysis a JSON with a single key 'draft_analysis' and no premable or explaination.

            <|eot_id|><|start_header_id|>user<|end_header_id|>
            INITIAL_MESSAGE: {initial_message} \n\n
            summarizer: {summarizer} \n\n
            RESEARCH_INFO: {research_info} \n\n
            draft_reply: {draft_reply} \n\n
            <|eot_id|><|start_header_id|>assistant<|end_header_id|>""",
            input_variables=["initial_message","summarizer","research_info"],
        )

        draft_analysis_chain = draft_analysis_prompt | GROQ_LLM | JsonOutputParser()

        email_analysis = draft_analysis_chain.invoke({"initial_message": EMAIL,
                                        "summarizer":summarizer,
                                        "research_info":research_info,
                                        "draft_reply": draft_reply})

        return email_analysis
    
    def final_response(self, research_info, EMAIL, summarizer, email_analysis, draft_reply):
        rewrite_email_prompt = PromptTemplate(
            template="""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
            You are the Final Email Agent read the email analysis below from the QC Agent \
            and use it to rewrite and improve the draft_reply to create a final email. Final answer shouldn't be more than a sentence, speak like you are chatting so keep it short. but keep the context.


            You never make up or add information that hasn't been provided by the research_info or in the initial_message.

            Return the final email as JSON with a single key 'final_email' which is a string and no premable or explaination.

            <|eot_id|><|start_header_id|>user<|end_header_id|>
            summarizer: {summarizer} \n\n
            RESEARCH_INFO: {research_info} \n\n
            draft_reply: {draft_reply} \n\n
            draft_reply_FEEDBACK: {email_analysis} \n\n
            <|eot_id|><|start_header_id|>assistant<|end_header_id|>""",
            input_variables=["initial_message",
                            "summarizer",
                            "research_info",
                            "email_analysis",
                            "draft_reply",
                            ],
        )

        rewrite_chain = rewrite_email_prompt | GROQ_LLM | JsonOutputParser()

        final_email = rewrite_chain.invoke({"initial_message": EMAIL,
                                        "summarizer":summarizer,
                                        "research_info":research_info,
                                        "draft_reply": draft_reply,
                                        "email_analysis":email_analysis})

        return final_email['final_email']


class GraphState(TypedDict):
    """
    Represents the state of our graph.

    Attributes:
        initial_message: email
        summarizer: email category
        draft_reply: LLM generation
        final_email: LLM generation
        research_info: list of documents
        info_needed: whether to add search info
        num_steps: number of steps
    """
    initial_message : str
    summarizer : str
    draft_reply : str
    final_email : str
    research_info : List[str] # this will now be the RAG results
    info_needed : bool
    num_steps : int
    draft_reply_feedback : dict
    rag_questions : List[str]

def categorize_email(state):
    """take the initial email and categorize it"""
    print("---CATEGORIZING INITIAL EMAIL---")
    initial_message = state['initial_message']
    num_steps = int(state['num_steps'])
    num_steps += 1
    
    summarizer = AIFreelanceAgent().summarizer(initial_message)
    print(summarizer)

    return {"summarizer": summarizer, "num_steps":num_steps}


def research_info_search(state):
    print("---RESEARCH INFO RAG---")
    initial_message = state["initial_message"]
    summarizer = state["summarizer"]
    # research_info = state["research_info"]
    num_steps = state['num_steps']
    num_steps += 1

    # Web search
    questions = AIFreelanceAgent().make_researcher_router(initial_message, summarizer)
    questions = questions['questions']
    # print(questions)
    rag_results = []
    for question in questions:
        print(question)
        # temp_docs = rag_chain.invoke(question)  #conNect this with the RAG function but later
        # print(temp_docs)
        # question_results = question + '\n\n' + temp_docs + "\n\n\n"
        # if rag_results is not None:
        #     rag_results.append(question_results)
        # else:
        #     rag_results = [question_results]
    # print(rag_results)
    # print(type(rag_results))

    return {"research_info": rag_results,"rag_questions":questions, "num_steps":num_steps}

def draft_reply_writer(state):
    print("---DRAFT EMAIL WRITER---")
    ## Get the state
    initial_message = state["initial_message"]
    summarizer = state["summarizer"]
    research_info = state["research_info"]
    num_steps = state['num_steps']
    num_steps += 1

    # Generate draft email
    draft_reply = AIFreelanceAgent().actual_reply_to_conversation(initial_message,
                                     summarizer,
                                     research_info)
    # print(draft_reply)
    # print(type(draft_reply))

    email_draft = draft_reply['email_draft']
    print(email_draft)
    return {"draft_reply": email_draft, "num_steps":num_steps}

def analyze_draft_reply(state):
    print("---DRAFT EMAIL ANALYZER---")
    ## Get the state
    initial_message = state["initial_message"]
    summarizer = state["summarizer"]
    draft_reply = state["draft_reply"]
    research_info = state["research_info"]
    num_steps = state['num_steps']
    num_steps += 1

    # Generate draft email
    draft_reply_feedback = AIFreelanceAgent().quality_control_agent(initial_message,
                                                summarizer,
                                                research_info,
                                                draft_reply
                                               )
    # print(draft_reply)
    print(type(draft_reply))

    return {"draft_reply_feedback": draft_reply_feedback, "num_steps":num_steps}

def rewrite_email(state):
    print("---ReWRITE EMAIL ---")
    initial_message = state["initial_message"]
    summarizer = state["summarizer"]
    draft_reply = state["draft_reply"]
    research_info = state["research_info"]
    draft_reply_feedback = state["draft_reply_feedback"]
    num_steps = state['num_steps']
    num_steps += 1

    # Generate draft email
    final_email = AIFreelanceAgent().final_response(initial_message,
                                                summarizer,
                                                research_info,
                                                draft_reply,
                                                draft_reply_feedback
                                               )
    
    print(final_email)
    return {"final_email": final_email, "num_steps":num_steps}

###CONDITIONAL EDGES

def route_to_rewrite(state):

    print("---ROUTE TO REWRITE---")
    initial_message = state["initial_message"]
    summarizer = state["summarizer"]
    draft_reply = state["draft_reply"]
    # research_info = state["research_info"]

    # draft_reply = "Yo we can't help you, best regards Sarah"

    router = AIFreelanceAgent().actual_reply_to_conversation(initial_message,
                                     summarizer,
                                     draft_reply
                                   )
    print(router)
    print(router['router_decision'])
    if router['router_decision'] == 'rewrite':
        print("---ROUTE TO ANALYSIS - REWRITE---")
        return "rewrite"
    elif router['router_decision'] == 'no_rewrite':
        print("---ROUTE EMAIL TO FINAL EMAIL---")
        return "no_rewrite"
    
    
    
#BUILD THE GRAPH

def run_graph(input_message):
    workflow = StateGraph(GraphState)

    # Define the nodes
    workflow.add_node("categorize_email", categorize_email) # categorize email
    # workflow.add_node("research_info_search", research_info_search) # knowledge base search with RAG pdf but not set up yet
    workflow.add_node("draft_reply_writer", draft_reply_writer)
    workflow.add_node("analyze_draft_reply", analyze_draft_reply)
    workflow.add_node("rewrite_email", rewrite_email)


    #ADD EDGES
    workflow.set_entry_point("categorize_email")

    workflow.add_edge("categorize_email", "draft_reply_writer")
    workflow.add_edge("draft_reply_writer", "analyze_draft_reply")
    workflow.add_edge("analyze_draft_reply", "rewrite_email")
    workflow.add_edge("rewrite_email", END)

    app = workflow.compile()

    inputs = {"initial_message": input_message, "num_steps":0}
    # for output in app.stream(inputs):
    #     for key, value in output.items():
    #         print(f"Finished running: {key}:")
            
    output = app.invoke(inputs)

    # print(type(output))
    return ('this is output', output['final_email'])
    

# run the agent

user_input_message = 'hi i need someone to make me a short form video'
run_graph(user_input_message)