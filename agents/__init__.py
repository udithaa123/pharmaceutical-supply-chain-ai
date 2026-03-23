"""
Agents module for Pharmaceutical Supply Chain Agentic AI

This module contains all the LangGraph agents that power the system.
Note: Explicitly avoid eager imports here to prevent massive C++ library memory collisions (like TensorFlow vs OR-Tools) when isolated workers import single agents.
"""
