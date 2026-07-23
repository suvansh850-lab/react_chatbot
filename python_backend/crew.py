import os
import psycopg2
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process
from crewai.tools import tool
from langchain_groq import ChatGroq

# Load environment variables
load_dotenv()

# Initialize ChatGroq LLM
groq_api_key = os.getenv("GROQ_API_KEY")
model_name = os.getenv("GROQ_MODEL_NAME", "llama3-70b-8192")

llm = ChatGroq(
    groq_api_key=groq_api_key,
    model_name=model_name,
    temperature=0.2
)

# -------------------------------------------------------------
# DATABASE QUERY TOOL
# -------------------------------------------------------------
@tool("Query database")
def query_db(sql_query: str) -> str:
    """Executes a SQL query on the business database and returns the results. 
    Use this tool to query the 'sales_data' table which has fields:
    (id, date, region, product, revenue, units_sold, cost)"""
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            sslmode="require"
        )
        cur = conn.cursor()
        cur.execute(sql_query)
        rows = cur.fetchall()
        colnames = [desc[0] for desc in cur.description]
        cur.close()
        conn.close()
        
        # Format the query output as a simple table string
        res = [",".join(colnames)]
        for r in rows:
            res.append(",".join(str(val) for val in r))
        return "\n".join(res)
    except Exception as e:
        return f"Database query failed: {str(e)}"

# -------------------------------------------------------------
# DEFINING AGENTS
# -------------------------------------------------------------

# 1. SQL Agent
sql_agent = Agent(
    role="SQL Database Expert",
    goal="Translate natural language requests into efficient SQL queries and fetch the data.",
    backstory="You are an expert database administrator. You know how to query postgres databases cleanly and quickly.",
    tools=[query_db],
    llm=llm,
    verbose=True
)

# 2. Analytics Agent
analytics_agent = Agent(
    role="Data Analyst",
    goal="Analyze raw data, calculate percentage changes, growth rates, and perform basic aggregations.",
    backstory="You are a meticulous data cruncher. You verify the math, calculate trends, monthly comparisons, and compile KPI figures.",
    llm=llm,
    verbose=True
)

# 3. Pattern Detection Agent
pattern_agent = Agent(
    role="Business Intelligence Analyst",
    goal="Scan data patterns, identify anomalies, and figure out the exact root cause of drops or spikes.",
    backstory="You have a keen eye for business anomalies. You identify why a region's sales dropped, what products were responsible, and pinpoint anomalies.",
    llm=llm,
    verbose=True
)

# 4. Recommendation Agent
recommendation_agent = Agent(
    role="Strategic Consultant",
    goal="Generate actionable strategic business recommendations based on anomalies and data insights.",
    backstory="You are a senior business strategist. You take analytical findings and turn them into concrete strategic actions to recover sales.",
    llm=llm,
    verbose=True
)

# 5. Report Agent
report_agent = Agent(
    role="Operations Reporter",
    goal="Summarize all findings into a clean, markdown executive report and output structured KPI and chart JSON blocks.",
    backstory="You write clear, beautiful summaries for executives. You also output specific structured data blocks so the React UI can render charts and metrics.",
    llm=llm,
    verbose=True
)

# -------------------------------------------------------------
# DEFINING TASKS
# -------------------------------------------------------------

def run_business_crew(user_query: str) -> str:
    # 1. SQL Query Task
    sql_task = Task(
        description=f"Write and execute SQL query to retrieve data needed to answer this query: '{user_query}'. "
                    f"Read from 'sales_data' table containing fields: (date, region, product, revenue, units_sold, cost). "
                    f"Make sure to group or filter by region, date, or product as required by the query.",
        expected_output="A raw table string representing the data fetched from the database.",
        agent=sql_agent
    )

    # 2. Analytics Task
    analytics_task = Task(
        description="Take the database output from the SQL task. Calculate percentage changes, averages, totals, and compile "
                    "basic KPI stats (Total Revenue, Total Units Sold, Top Product, Top Region). Summarize calculations.",
        expected_output="Calculations, totals, and aggregated tables showing trends.",
        agent=analytics_agent
    )

    # 3. Pattern Detection Task
    pattern_task = Task(
        description="Review the calculations. Identify specific anomalies (e.g. which month saw a drop, which product division "
                    "led the decline, or what region experienced outliers). Highlight key problem areas.",
        expected_output="Anomalies detected and root-cause analysis of the decline or spike.",
        agent=pattern_agent
    )

    # 4. Recommendation Task
    recommendation_task = Task(
        description="Create 3-4 highly actionable business recommendations based on the root-cause analysis. Address the "
                    "specific drops, regions, or products affected.",
        expected_output="List of strategic recommendations.",
        agent=recommendation_agent
    )

    # 5. Reporting Task
    reporting_task = Task(
        description="Consolidate all findings into a comprehensive executive markdown report. "
                    "Also, you MUST include THREE structured blocks at the very end of your output for the frontend parser. "
                    "Use the exact formats below:\n\n"
                    "[KPI_DATA_START]\n"
                    "{\n"
                    '  "revenue": "Total revenue (numeric/float)",\n'
                    '  "units_sold": "Total units (integer)",\n'
                    '  "top_product": "Name of best product (string)",\n'
                    '  "top_region": "Name of best region (string)",\n'
                    '  "change_pct": "Percentage drop/gain compared to previous month/period (numeric/float)"\n'
                    "}\n"
                    "[KPI_DATA_END]\n\n"
                    "[CHART_DATA_START]\n"
                    "[\n"
                    '  {"name": "Jan", "revenue": 10000, "units": 500},\n'
                    '  {"name": "Feb", "revenue": 12000, "units": 600}\n'
                    "]\n"
                    "(Create a monthly timeline or region-wise breakdown of sales data for the chart)\n"
                    "[CHART_DATA_END]\n\n"
                    "[ANOMALIES_START]\n"
                    "[\n"
                    '  "Anomaly 1 description",\n'
                    '  "Anomaly 2 description"\n'
                    "]\n"
                    "[ANOMALIES_END]",
        expected_output="A markdown report containing executive summary, root cause, recommendations, followed by the exact structured data tags.",
        agent=report_agent
    )

    # Create the Crew
    crew = Crew(
        agents=[sql_agent, analytics_agent, pattern_agent, recommendation_agent, report_agent],
        tasks=[sql_task, analytics_task, pattern_task, recommendation_task, reporting_task],
        process=Process.sequential,
        verbose=2
    )

    # Kick off the crew
    return crew.kickoff()
