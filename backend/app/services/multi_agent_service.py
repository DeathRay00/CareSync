import os
from crewai import Agent, Task, Crew, Process
from langchain_groq import ChatGroq
from langchain_mistralai.chat_models import ChatMistralAI

# 1. Initialize the LLMs
def get_groq_llm():
    return ChatGroq(
        temperature=0, 
        api_key=os.getenv("GROQ_API_KEY"), 
        model_name="meta-llama/llama-4-scout-17b-16e-instruct" # Fast model hosted on Groq
    )

def get_mistral_llm():
    return ChatMistralAI(
        temperature=0.2, 
        api_key=os.getenv("MISTRAL_API_KEY"), 
        model="mistral-large-latest" # Powerful reasoning model
    )

def analyze_report_with_agents(patient_report: str) -> str:
    """Runs a multi-agent pipeline on a patient report."""
    
    groq_llm = get_groq_llm()
    mistral_llm = get_mistral_llm()

    # -------------------------------------------------------------
    # Agent 1 (Powered by GROQ): Fast Data Extractor
    # -------------------------------------------------------------
    data_extractor = Agent(
        role='Medical Data Extractor',
        goal='Extract key vital signs, symptoms, and medical history from unstructured text efficiently.',
        backstory='You are a highly efficient medical data entry specialist who structures raw text into clear datasets.',
        llm=groq_llm,
        verbose=True
    )

    # -------------------------------------------------------------
    # Agent 2 (Powered by MISTRAL): Clinical Analyst
    # -------------------------------------------------------------
    clinical_analyst = Agent(
        role='Clinical Triage Analyst',
        goal='Analyze the structured medical data and identify potential anomalies, health risks, or required immediate actions.',
        backstory='You are an experienced diagnostic assistant that identifies risk factors based on extracted medical data.',
        llm=mistral_llm,
        verbose=True
    )

    # -------------------------------------------------------------
    # Define the Tasks
    # -------------------------------------------------------------
    extraction_task = Task(
        description=f'Read the following patient report and list all symptoms, conditions, and test results: {patient_report}',
        expected_output='A clear, bulleted list of extracted medical data.',
        agent=data_extractor
    )

    analysis_task = Task(
        description='Review the extracted medical data. Flag any severe conditions and provide a brief assessment for the doctor.',
        expected_output='A concise triage assessment of the patient.',
        agent=clinical_analyst
    )

    # -------------------------------------------------------------
    # Orchestrate the Crew
    # -------------------------------------------------------------
    medical_crew = Crew(
        agents=[data_extractor, clinical_analyst],
        tasks=[extraction_task, analysis_task],
        process=Process.sequential # The analyst waits for the extractor to finish
    )

    result = medical_crew.kickoff()
    return result
