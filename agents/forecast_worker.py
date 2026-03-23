import json
import sys
import os

# Add parent directory to path so we can import agents
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.forecasting_agent import ForecastingAgent

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input provided"}))
            sys.exit(1)
            
        data = json.loads(input_data)
        agent = ForecastingAgent()

        # Execute forecasting model inside isolated process
        result = agent.forecast(
            drug_id=data["item_id"],
            branch_id=data.get("branch_id"),
            horizon_days=data.get("horizon_days", 30),
            model=data.get("model", "prophet"),
            sales_data=data.get("sales_data")
        )

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
