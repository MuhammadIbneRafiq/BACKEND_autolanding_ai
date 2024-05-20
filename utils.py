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

# def rag_chain_node():
#     loader_csv = PyPDFLoader(file_path='freelancers_data.pdf')
#     loader_all = MergedDataLoader(loaders=[loader_csv]) 
#     docs_all = loader_all.load()

#     from langchain.text_splitter import RecursiveCharacterTextSplitter
#     text_splitter = RecursiveCharacterTextSplitter(chunk_size=200, chunk_overlap=30)
#     texts = text_splitter.split_documents(docs_all)


#     from langchain_community.embeddings import HuggingFaceBgeEmbeddings
#     model_name = "BAAI/bge-base-en"
#     encode_kwargs = {'normalize_embeddings': True} # set True to compute cosine similarity

#     bge_embeddings = HuggingFaceBgeEmbeddings(
#         model_name=model_name,
#         encode_kwargs=encode_kwargs
#     )
#     # from langchain_chroma import Chroma

#     persist_directory = 'db'

#     ## Heres the embeddings
#     embedding = bge_embeddings

#     vectordb = Chroma.from_documents(documents=texts, embedding=embedding, persist_directory=persist_directory)

#     retriever = vectordb.as_retriever(search_kwargs={"k": 5})

#     rag_prompt = PromptTemplate(
#         template="""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
#         You are an assistant for question-answering tasks. 
#         Use the following pieces of retrieved context to answer the question. 
#         If you don't know the answer, just say that you don't know. 
#         Use 2 sentences maximum and keep the answer concise.\n

#         <|eot_id|><|start_header_id|>user<|end_header_id|>
#         QUESTION: {question} \n
#         CONTEXT: {context} \n
#         Answer:
#         <|eot_id|>
#         <|start_header_id|>assistant<|end_header_id|>
#         """,
#         input_variables=["question","context"],
#     )

#     rag_prompt_chain = rag_prompt | GROQ_LLM | StrOutputParser()

#     QUESTION = """What can I do with video editing freelancers?"""
#     CONTEXT = retriever.invoke(QUESTION)

#     result = rag_prompt_chain.invoke({"question": QUESTION, "context":CONTEXT})
    
#     rag_chain = (
#     {"context": retriever , "question": RunnablePassthrough()}
#     | rag_prompt
#     | GROQ_LLM
#     | StrOutputParser()
#     )

#     return rag_chain.invoke("What is the westworld park all about?")


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

    def make_researcher_router(self, email_category, EMAIL):
        research_router_prompt = PromptTemplate(
            template="""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
            You are an expert at reading the initial email and routing to our internal knowledge system\
            or directly to a draft email. \n

            Use the following criteria to decide how to route the email: \n\n

            If the initial email only requires a simple response
            Just choose 'draft_email'  for questions you can easily answer, prompt engineering, and adversarial attacks.
            If the email is just saying thank you etc then choose 'draft_email'

            If you are unsure or the person is asking a question you don't understand then choose 'research_info'

            You do not need to be stringent with the keywords in the question related to these topics. Otherwise, use research-info.
            Give a binary choice 'research_info' or 'draft_email' based on the question. Return the a JSON with a single key 'router_decision' and
            no premable or explaination. use both the initial email and the email category to make your decision
            <|eot_id|><|start_header_id|>user<|end_header_id|>
            Email to route INITIAL_EMAIL : {initial_email} \n
            EMAIL_CATEGORY: {email_category} \n
            <|eot_id|><|start_header_id|>assistant<|end_header_id|>""",
            input_variables=["initial_email","email_category"],
        )

        research_router = research_router_prompt | GROQ_LLM | JsonOutputParser()

        return (research_router.invoke({"initial_email": EMAIL, "email_category":email_category}))

    def actual_reply_to_conversation(self, research_info, EMAIL, email_category):
        draft_writer_prompt = PromptTemplate(
            template="""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
            You are the Email Writer Agent for the theme park Westworld, take the INITIAL_EMAIL below \
            from a human that has emailed our company email address, the email_category \
            that the categorizer agent gave it and the research from the research agent and \
            write a helpful email in a thoughtful and friendly way. Remember people maybe asking \
            about experiences they can have in westworld.

                    If the customer email is 'off_topic' then ask them questions to get more information.
                    If the customer email is 'customer_complaint' then try to assure we value them and that we are addressing their issues.
                    If the customer email is 'customer_feedback' then try to assure we value them and that we are addressing their issues.
                    If the customer email is 'product_enquiry' then try to give them the info the researcher provided in a succinct and friendly way.
                    If the customer email is 'price_equiry' then try to give the pricing info they requested.

                    You never make up information that hasn't been provided by the research_info or in the initial_email.
                    Always sign off the emails in appropriate manner and from Sarah the Resident Manager.

                    Return the email a JSON with a single key 'email_draft' and no premable or explaination.

            <|eot_id|><|start_header_id|>user<|end_header_id|>
            INITIAL_EMAIL: {initial_email} \n
            EMAIL_CATEGORY: {email_category} \n
            RESEARCH_INFO: {research_info} \n
            <|eot_id|><|start_header_id|>assistant<|end_header_id|>""",
            input_variables=["initial_email","email_category","research_info"],
        )

        draft_writer_chain = draft_writer_prompt | GROQ_LLM | JsonOutputParser()

        return draft_writer_chain.invoke({"initial_email": EMAIL, "email_category":email_category,"research_info":research_info})
    
    def quality_control_agent(self, research_info, EMAIL, email_category, draft_email):
        draft_analysis_prompt = PromptTemplate(
            template="""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
            You are the Quality Control Agent read the INITIAL_EMAIL below  from a human that has emailed \
            our company email address, the email_category that the categorizer agent gave it and the \
            research from the research agent and write an analysis of how the email.

            Check if the DRAFT_EMAIL addresses the customer's issued based on the email category and the \
            content of the initial email.\n

            Give feedback of how the email can be improved and what specific things can be added or change\
            to make the email more effective at addressing the customer's issues.

            You never make up or add information that hasn't been provided by the research_info or in the initial_email.

            Return the analysis a JSON with a single key 'draft_analysis' and no premable or explaination.

            <|eot_id|><|start_header_id|>user<|end_header_id|>
            INITIAL_EMAIL: {initial_email} \n\n
            EMAIL_CATEGORY: {email_category} \n\n
            RESEARCH_INFO: {research_info} \n\n
            DRAFT_EMAIL: {draft_email} \n\n
            <|eot_id|><|start_header_id|>assistant<|end_header_id|>""",
            input_variables=["initial_email","email_category","research_info"],
        )

        draft_analysis_chain = draft_analysis_prompt | GROQ_LLM | JsonOutputParser()

        email_analysis = draft_analysis_chain.invoke({"initial_email": EMAIL,
                                        "email_category":email_category,
                                        "research_info":research_info,
                                        "draft_email": draft_email})

        return email_analysis
    
    def final_response(self, research_info, EMAIL, email_category, email_analysis, draft_email):
        rewrite_email_prompt = PromptTemplate(
            template="""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
            You are the Final Email Agent read the email analysis below from the QC Agent \
            and use it to rewrite and improve the draft_email to create a final email.


            You never make up or add information that hasn't been provided by the research_info or in the initial_email.

            Return the final email as JSON with a single key 'final_email' which is a string and no premable or explaination.

            <|eot_id|><|start_header_id|>user<|end_header_id|>
            EMAIL_CATEGORY: {email_category} \n\n
            RESEARCH_INFO: {research_info} \n\n
            DRAFT_EMAIL: {draft_email} \n\n
            DRAFT_EMAIL_FEEDBACK: {email_analysis} \n\n
            <|eot_id|><|start_header_id|>assistant<|end_header_id|>""",
            input_variables=["initial_email",
                            "email_category",
                            "research_info",
                            "email_analysis",
                            "draft_email",
                            ],
        )

        rewrite_chain = rewrite_email_prompt | GROQ_LLM | JsonOutputParser()

        final_email = rewrite_chain.invoke({"initial_email": EMAIL,
                                        "email_category":email_category,
                                        "research_info":research_info,
                                        "draft_email": draft_email,
                                        "email_analysis":email_analysis})

        return final_email['final_email']


class GraphState(TypedDict):
    """
    Represents the state of our graph.

    Attributes:
        initial_email: email
        email_category: email category
        draft_email: LLM generation
        final_email: LLM generation
        research_info: list of documents
        info_needed: whether to add search info
        num_steps: number of steps
    """
    initial_email : str
    email_category : str
    draft_email : str
    final_email : str
    research_info : List[str] # this will now be the RAG results
    info_needed : bool
    num_steps : int
    draft_email_feedback : dict
    rag_questions : List[str]

def categorize_email(state):
    """take the initial email and categorize it"""
    print("---CATEGORIZING INITIAL EMAIL---")
    initial_email = state['initial_email']
    num_steps = int(state['num_steps'])
    num_steps += 1
    
    email_category = AIFreelanceAgent().summarizer(initial_email)
    print(email_category)

    return {"email_category": email_category, "num_steps":num_steps}


def research_info_search(state):
    print("---RESEARCH INFO RAG---")
    initial_email = state["initial_email"]
    email_category = state["email_category"]
    # research_info = state["research_info"]
    num_steps = state['num_steps']
    num_steps += 1

    # Web search
    questions = AIFreelanceAgent().make_researcher_router(initial_email, email_category)
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

def draft_email_writer(state):
    print("---DRAFT EMAIL WRITER---")
    ## Get the state
    initial_email = state["initial_email"]
    email_category = state["email_category"]
    research_info = state["research_info"]
    num_steps = state['num_steps']
    num_steps += 1

    # Generate draft email
    draft_email = AIFreelanceAgent().actual_reply_to_conversation(initial_email,
                                     email_category,
                                     research_info)
    print(draft_email)
    # print(type(draft_email))

    email_draft = draft_email['email_draft']

    return {"draft_email": email_draft, "num_steps":num_steps}

def analyze_draft_email(state):
    print("---DRAFT EMAIL ANALYZER---")
    ## Get the state
    initial_email = state["initial_email"]
    email_category = state["email_category"]
    draft_email = state["draft_email"]
    research_info = state["research_info"]
    num_steps = state['num_steps']
    num_steps += 1

    # Generate draft email
    draft_email_feedback = AIFreelanceAgent().quality_control_agent(initial_email,
                                                email_category,
                                                research_info,
                                                draft_email
                                               )
    # print(draft_email)
    # print(type(draft_email))

    return {"draft_email_feedback": draft_email_feedback, "num_steps":num_steps}

def rewrite_email(state):
    print("---ReWRITE EMAIL ---")
    initial_email = state["initial_email"]
    email_category = state["email_category"]
    draft_email = state["draft_email"]
    research_info = state["research_info"]
    draft_email_feedback = state["draft_email_feedback"]
    num_steps = state['num_steps']
    num_steps += 1

    # Generate draft email
    final_email = AIFreelanceAgent().final_response(initial_email,
                                                email_category,
                                                research_info,
                                                draft_email,
                                                draft_email_feedback
                                               )
    
    return {"final_email": final_email, "num_steps":num_steps}

###CONDITIONAL EDGES

def route_to_rewrite(state):

    print("---ROUTE TO REWRITE---")
    initial_email = state["initial_email"]
    email_category = state["email_category"]
    draft_email = state["draft_email"]
    # research_info = state["research_info"]

    # draft_email = "Yo we can't help you, best regards Sarah"

    router = AIFreelanceAgent().actual_reply_to_conversation(initial_email,
                                     email_category,
                                     draft_email
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

def run_graph(EMAIL):
    workflow = StateGraph(GraphState)

    # Define the nodes
    workflow.add_node("categorize_email", categorize_email) # categorize email
    # workflow.add_node("research_info_search", research_info_search) # knowledge base search with RAG pdf but not set up yet
    workflow.add_node("draft_email_writer", draft_email_writer)
    workflow.add_node("analyze_draft_email", analyze_draft_email)
    workflow.add_node("rewrite_email", rewrite_email)


    #ADD EDGES
    workflow.set_entry_point("categorize_email")

    workflow.add_edge("categorize_email", "draft_email_writer")
    workflow.add_edge("draft_email_writer", "analyze_draft_email")
    workflow.add_edge("analyze_draft_email", "rewrite_email")
    workflow.add_edge("rewrite_email", END)

    app = workflow.compile()

    inputs = {"initial_email": EMAIL, "num_steps":0}
    # for output in app.stream(inputs):
    #     for key, value in output.items():
    #         print(f"Finished running: {key}:")
            
    output = app.invoke(inputs)

    # print(type(output))
    return (output['final_email'])
    

# run the agent
EMAIL = """HI there, \n
    I am a big fan of westworld.
    can I meet Maeve in the park? Really want to chat with her.

    Thanks,
    Ringo
"""
run_graph(EMAIL)