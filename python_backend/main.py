import os
import json
import re
import pandas as pd
import psycopg2
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from crew import run_business_crew  # Local import of our crew execution

load_dotenv()

app = FastAPI(title="Business Operations AI Backend")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    query: str

# Helper to get database connection
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        sslmode="require"
    )

# -------------------------------------------------------------
# HELPER TO PARSE STRUCTURED BLOCKS FROM CREWAI OUTPUT
# -------------------------------------------------------------
def parse_crew_response(response_text: str):
    kpis = {}
    charts = []
    anomalies = []
    
    # Regular expressions to extract data between tags
    kpi_match = re.search(r"\[KPI_DATA_START\](.*?)\[KPI_DATA_END\]", response_text, re.DOTALL)
    chart_match = re.search(r"\[CHART_DATA_START\](.*?)\[CHART_DATA_END\]", response_text, re.DOTALL)
    anomalies_match = re.search(r"\[ANOMALIES_START\](.*?)\[ANOMALIES_END\]", response_text, re.DOTALL)
    
    if kpi_match:
        try:
            kpis = json.loads(kpi_match.group(1).strip())
        except Exception as e:
            print("Failed to parse KPIs:", e)
            
    if chart_match:
        try:
            charts = json.loads(chart_match.group(1).strip())
        except Exception as e:
            print("Failed to parse Chart Data:", e)
            
    if anomalies_match:
        try:
            anomalies = json.loads(anomalies_match.group(1).strip())
        except Exception as e:
            print("Failed to parse Anomalies:", e)

    # Clean the markdown report by removing the tags
    cleaned_report = response_text
    cleaned_report = re.sub(r"\[KPI_DATA_START\].*?\[KPI_DATA_END\]", "", cleaned_report, flags=re.DOTALL)
    cleaned_report = re.sub(r"\[CHART_DATA_START\].*?\[CHART_DATA_END\]", "", cleaned_report, flags=re.DOTALL)
    cleaned_report = re.sub(r"\[ANOMALIES_START\].*?\[ANOMALIES_END\]", "", cleaned_report, flags=re.DOTALL)
    
    return {
        "report": cleaned_report.strip(),
        "kpis": kpis,
        "charts": charts,
        "anomalies": anomalies
    }

# -------------------------------------------------------------
# API ROUTES
# -------------------------------------------------------------

@app.get("/api/crew/health")
def health_check():
    return {"status": "ok", "service": "CrewAI Business Operations Agent"}

@app.post("/api/crew/analyze")
async def analyze_business(req: AnalyzeRequest):
    try:
        raw_result = run_business_crew(req.query)
        parsed = parse_crew_response(str(raw_result))
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/crew/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    try:
        # Read CSV with pandas
        df = pd.read_csv(file.file)
        
        # Clean column names (lowercase, replace spaces with underscores)
        df.columns = [c.lower().strip().replace(" ", "_") for c in df.columns]
        
        required_cols = {"date", "region", "product", "revenue", "units_sold"}
        missing = required_cols - set(df.columns)
        if missing:
            raise HTTPException(
                status_code=400, 
                detail=f"CSV is missing required columns: {', '.join(missing)}. "
                       f"Provided columns: {', '.join(df.columns)}"
            )
            
        # Parse dates and numeric fields
        df['date'] = pd.to_datetime(df['date']).dt.date
        df['revenue'] = pd.to_numeric(df['revenue'], errors='coerce').fillna(0)
        df['units_sold'] = pd.to_numeric(df['units_sold'], errors='coerce').fillna(0).astype(int)
        if 'cost' in df.columns:
            df['cost'] = pd.to_numeric(df['cost'], errors='coerce').fillna(0)
        else:
            df['cost'] = 0
            
        # Insert into database
        conn = get_db_connection()
        cur = conn.cursor()
        
        inserted_rows = 0
        for _, row in df.iterrows():
            cur.execute(
                """
                INSERT INTO sales_data (date, region, product, revenue, units_sold, cost) 
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (row['date'], row['region'], row['product'], row['revenue'], row['units_sold'], row['cost'])
            )
            inserted_rows += 1
            
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            "success": True, 
            "message": f"Successfully imported {inserted_rows} sales records.",
            "inserted_rows": inserted_rows
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")

@app.get("/api/crew/dashboard-summary")
def get_dashboard_summary():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Total Metrics
        cur.execute("SELECT SUM(revenue), SUM(units_sold) FROM sales_data")
        total_rev, total_units = cur.fetchone()
        total_rev = float(total_rev or 0)
        total_units = int(total_units or 0)
        
        # 2. Top Product
        cur.execute("SELECT product, SUM(revenue) FROM sales_data GROUP BY product ORDER BY SUM(revenue) DESC LIMIT 1")
        top_prod_row = cur.fetchone()
        top_product = top_prod_row[0] if top_prod_row else "N/A"
        
        # 3. Top Region
        cur.execute("SELECT region, SUM(revenue) FROM sales_data GROUP BY region ORDER BY SUM(revenue) DESC LIMIT 1")
        top_reg_row = cur.fetchone()
        top_region = top_reg_row[0] if top_reg_row else "N/A"
        
        # 4. Monthly Timeline Data
        cur.execute(
            """
            SELECT TO_CHAR(date, 'Mon-YYYY') as month_name, SUM(revenue) as rev, SUM(units_sold) as units, MIN(date) as min_date
            FROM sales_data 
            GROUP BY month_name
            ORDER BY min_date ASC
            """
        )
        timeline = []
        for r in cur.fetchall():
            timeline.append({
                "name": r[0],
                "revenue": float(r[1] or 0),
                "units": int(r[2] or 0)
            })
            
        # 5. Region Breakdown Data
        cur.execute(
            """
            SELECT region, SUM(revenue) as rev, SUM(units_sold) as units 
            FROM sales_data 
            GROUP BY region 
            ORDER BY rev DESC
            """
        )
        regions = []
        for r in cur.fetchall():
            regions.append({
                "name": r[0],
                "revenue": float(r[1] or 0),
                "units": int(r[2] or 0)
            })
            
        # 6. Product Pie Data
        cur.execute(
            """
            SELECT product, SUM(revenue) as rev 
            FROM sales_data 
            GROUP BY product 
            ORDER BY rev DESC
            """
        )
        products = []
        for r in cur.fetchall():
            products.append({
                "name": r[0],
                "value": float(r[1] or 0)
            })
            
        cur.close()
        conn.close()
        
        return {
            "success": True,
            "kpis": {
                "revenue": total_rev,
                "units_sold": total_units,
                "top_product": top_product,
                "top_region": top_region,
                "change_pct": 0.0  # Placeholder, dynamically calculated from UI/Agent query
            },
            "charts": {
                "timeline": timeline,
                "regions": regions,
                "products": products
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database aggregation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
