import json
import sys
import os

# Add parent directory to path so we can import agents
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.route_optimization_agent import RouteOptimizationAgent

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input provided"}))
            sys.exit(1)
            
        data = json.loads(input_data)
        agent = RouteOptimizationAgent()

        result = agent.optimize_route(
            depot_id=data["depot_id"],
            destinations=data["destinations"],
            vehicle_capacity=data.get("vehicle_capacity", 500),
            max_time_hours=data.get("max_time_hours", 8),
            objective=data.get("objective", "min_distance")
        )

        print(json.dumps(result))
        sys.stdout.flush()
        os._exit(0)  # Brutally kill process to prevent C++ SWIG destructors from segfaulting during garbage collection
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
