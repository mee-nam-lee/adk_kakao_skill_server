from google.adk.tools import ToolContext
from google.adk.tools.agent_tool import AgentTool
import google.auth
from google.cloud.retail import SearchRequest, SearchServiceClient

project_id = google.auth.default()[1]

def get_search_request(query: str):
    default_search_placement = (
        "projects/"
        + project_id
        + "/locations/global/catalogs/default_catalog/placements/default_search"
    )

    search_request = SearchRequest()
    search_request.placement = default_search_placement  # Placement is used to identify the Serving Config name.
    search_request.branch = f"projects/{project_id}/locations/global/catalogs/default_catalog/branches/0"
    search_request.query = query
    search_request.visitor_id = "123456"  # A unique identifier to track visitors
    search_request.page_size = 10

    print("---search request:---")
    print(search_request)

    return search_request

def call_catalog_search(query: str,) -> str:
    """Searches the product catalog using the Google Cloud Retail API.

    Args:
        query: The search query string.

    Returns:
        A list of search results from the catalog.
        Returns an empty list if no results are found.
    """
    search_request = get_search_request(query)
    search_response = SearchServiceClient().search(search_request)

    if not search_response.results:
        print("The search operation returned no matching results.")
        print(search_response.results)
    else:
        print(search_response.results)
    
    return search_response.results

# call_catalog_search("Hoodie1231231")