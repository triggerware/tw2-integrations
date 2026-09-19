import os

from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters


root_agent = LlmAgent(
    model=os.environ.get("TRIGGERWARE_TEST_MODEL", "gemini-flash-latest"),
    name="triggerware_mcp_tester",
    description="Interactive test agent for the Triggerware MCP server.",
    instruction=(
        "Exercise the available Triggerware tools to answer the user's requests. "
        "Explain tool errors clearly and do not invent tool results."
    ),
    tools=[
        McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command="triggerware",
                    args=["mcp"],
                ),
            ),
        ),
    ],
)
