"""
Route Optimization Agent for Pharmaceutical Supply Chain Agentic AI

This agent optimizes delivery routes using Google OR-Tools VRP solver.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import random

logger = logging.getLogger(__name__)

try:
    from ortools.constraint_solver import routing_enums_pb2
    from ortools.constraint_solver import pywrapcp
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False
    logger.warning("OR-Tools not available. Install with: pip install ortools")

class RouteOptimizationAgent:
    def __init__(self):
        if not ORTOOLS_AVAILABLE:
            raise ImportError("OR-Tools is required for route optimization")

    def optimize_route(self, depot_id: str, destinations: List[str],
                      vehicle_capacity: int = 500, max_time_hours: int = 8,
                      objective: str = "min_distance") -> Dict[str, Any]:
        try:
            logger.info(f"Optimizing route from {depot_id} to {len(destinations)} destinations")

            if len(destinations) > 100:
                raise ValueError("Too many destinations for solver")

            self._callbacks = []

            if not destinations:
                return self._fallback_solution(depot_id, destinations)

            distance_matrix = self._create_distance_matrix(depot_id, destinations)

            # ---- Vehicle calculation ----
            demand_per_stop = 50
            total_demand = len(destinations) * demand_per_stop
            needed_vehicles = max(1, (total_demand + vehicle_capacity - 1) // vehicle_capacity)
            num_vehicles = min(needed_vehicles, 10)

            manager = pywrapcp.RoutingIndexManager(
                len(distance_matrix), num_vehicles, 0
            )
            routing = pywrapcp.RoutingModel(manager)

            def distance_callback(from_index, to_index):
                try:
                    from_node = manager.IndexToNode(from_index)
                    to_node = manager.IndexToNode(to_index)
                    return distance_matrix[from_node][to_node]
                except Exception as e:
                    print("Error in distance_callback:", e)
                    return 0

            self._callbacks.append(distance_callback)
            distance_cb = routing.RegisterTransitCallback(distance_callback)

            def time_callback(from_index, to_index):
                try:
                    from_node = manager.IndexToNode(from_index)
                    to_node = manager.IndexToNode(to_index)
                    if from_node == to_node:
                        return 0
                    delivery_time = 0 if to_node == 0 else 15
                    return int(distance_matrix[from_node][to_node] * 2 + delivery_time)
                except Exception as e:
                    print("Error in time_callback:", e)
                    return 0

            self._callbacks.append(time_callback)
            time_cb = routing.RegisterTransitCallback(time_callback)

            # ---- Objective selection ----
            if objective == "min_time":
                routing.SetArcCostEvaluatorOfAllVehicles(time_cb)
            else:
                routing.SetArcCostEvaluatorOfAllVehicles(distance_cb)

            def demand_callback(from_index):
                try:
                    node = manager.IndexToNode(from_index)
                    return 0 if node == 0 else demand_per_stop
                except Exception as e:
                    print("Error in demand_callback:", e)
                    return 0

            self._callbacks.append(demand_callback)
            demand_cb = routing.RegisterUnaryTransitCallback(demand_callback)

            routing.AddDimensionWithVehicleCapacity(
                demand_cb,
                0,
                [vehicle_capacity] * num_vehicles,
                True,
                "Capacity"
            )

            # ---- Time constraint ----
            routing.AddDimension(
                time_cb,
                0,
                int(max_time_hours * 60),
                True,
                "Time"
            )

            # ---- Solver settings ----
            search_parameters = pywrapcp.DefaultRoutingSearchParameters()
            search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
            search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
            search_parameters.time_limit.FromSeconds(5)

            try:
                solution = routing.SolveWithParameters(search_parameters)
            except Exception as e:
                logger.error(f"Solver execution failed: {e}")
                return self._fallback_solution(depot_id, destinations)

            if not solution:
                logger.warning("No solution found")
                return self._fallback_solution(depot_id, destinations)

            return self._extract_solution(
                manager, routing, solution,
                depot_id, destinations, distance_matrix
            )

        except Exception as e:
            logger.error(f"Error in route optimization: {e}")
            return self._error_response(str(e))

    def _create_distance_matrix(self, depot_id: str, destinations: List[str]) -> List[List[int]]:
        """
        Create distance matrix between locations

        In a real implementation, this would use:
        - Google Maps API
        - OpenStreetMap data
        - Historical delivery data
        """
        import math
        import hashlib
        
        all_locations = [depot_id] + destinations
        n = len(all_locations)

        # Generate deterministic pseudo-coordinates for each location
        def get_coord(name_str, salt):
            h = int(hashlib.md5((name_str + salt).encode()).hexdigest(), 16)
            return (h % 100)
            
        coords = [(get_coord(loc, "x"), get_coord(loc, "y")) for loc in all_locations]
        
        # Calculate Euclidean distance matrix guaranteed to satisfy the triangle inequality
        distances = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i != j:
                    dx = coords[i][0] - coords[j][0]
                    dy = coords[i][1] - coords[j][1]
                    distances[i][j] = int(math.sqrt(dx*dx + dy*dy)) + 5  # Realistic minimum spacing
                    
        return distances

    def _extract_solution(self, manager, routing, solution,
                         depot_id: str, destinations: List[str],
                         distance_matrix: List[List[int]]) -> Dict[str, Any]:
        try:
            vehicle_routes = []
            total_distance = 0
            total_time = 0
            vehicles_used = 0

            for vehicle_id in range(routing.vehicles()):
                index = routing.Start(vehicle_id)

                if routing.IsEnd(solution.Value(routing.NextVar(index))):
                    continue  # vehicle unused

                vehicles_used += 1
                route_sequence = [depot_id]
                route_distance = 0
                route_time = 0

                while not routing.IsEnd(index):
                    prev_index = index
                    index = solution.Value(routing.NextVar(index))

                    from_node = manager.IndexToNode(prev_index)
                    to_node = manager.IndexToNode(index)

                    route_distance += distance_matrix[from_node][to_node]

                    if to_node != 0:
                        route_time += int(distance_matrix[from_node][to_node] * 2 + 15)
                        route_sequence.append(destinations[to_node - 1])
                    else:
                        route_time += int(distance_matrix[from_node][to_node] * 2)

                route_sequence.append(depot_id)

                total_distance += route_distance
                total_time = max(total_time, route_time)

                vehicle_routes.append({
                    "vehicle_id": vehicle_id,
                    "sequence": route_sequence,
                    "distance_km": float(route_distance),
                    "time_hours": route_time / 60.0
                })

            if not vehicle_routes:
                return self._fallback_solution(depot_id, destinations)

            # ---- Baseline (naive separate trips) ----
            baseline_distance = sum(distance_matrix[0][i] * 2 for i in range(1, len(distance_matrix)))
            savings_pct = 0
            if baseline_distance > 0:
                savings_pct = max(0, (baseline_distance - total_distance) / baseline_distance * 100)

            # ---- Flat merged sequence (for backward compatibility) ----
            merged_sequence = []
            for vr in vehicle_routes:
                if not merged_sequence:
                    merged_sequence.extend(vr["sequence"])
                else:
                    merged_sequence.extend(vr["sequence"][1:])

            return {
                "routes": vehicle_routes,
                "sequence": merged_sequence,  # keep your old field
                "total_distance_km": float(total_distance),
                "total_time_hours": float(total_time) / 60.0,
                "total_cost_usd": float(total_distance) * 2.5,
                "savings_vs_baseline": f"{savings_pct:.1f}%",
                "vehicle_used": vehicles_used,
                "status": "success",
                "optimization_method": "OR-Tools VRP"
            }

        except Exception as e:
            logger.error(f"Error extracting solution: {e}")
            return self._fallback_solution(depot_id, destinations)

    def _fallback_solution(self, depot_id: str, destinations: List[str]) -> Dict[str, Any]:
        """Fallback solution when optimization fails"""
        route = [depot_id] + destinations + [depot_id]

        # Calculate approximate distance
        total_distance = len(destinations) * 25  # Rough estimate
        total_time = len(destinations) * 1.5  # Rough estimate in hours

        return {
            "sequence": route,
            "total_distance_km": total_distance,
            "total_time_hours": total_time,
            "total_cost_usd": total_distance * 2.5,
            "savings_vs_baseline": "0%",
            "vehicle_used": 1,
            "status": "fallback",
            "message": "Optimization failed, using simple route",
            "optimization_method": "Simple sequencing"
        }

    def _error_response(self, error_msg: str) -> Dict[str, Any]:
        """Return error response"""
        return {
            "sequence": [],
            "total_distance_km": 0,
            "total_time_hours": 0,
            "total_cost_usd": 0,
            "savings_vs_baseline": "0%",
            "status": "error",
            "message": error_msg
        }


