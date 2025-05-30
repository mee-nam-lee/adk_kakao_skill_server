from google.adk.tools import ToolContext
from google.adk.tools.agent_tool import AgentTool
import google.auth
from google.cloud.retail import SearchRequest, SearchServiceClient, ProductServiceClient, GetProductRequest
import json
import os

project_id = google.auth.default()[1]
serving_config_name = os.environ.get('SERVING_CONFIG_NAME', 'default_search')

def get_search_request(query: str):
    default_search_placement = (
        "projects/"
        + project_id
        + "/locations/global/catalogs/default_catalog/placements/"
        + serving_config_name
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

    products = []
    if not search_response.results:
        print("The search operation returned no matching results.")
    else:
        product_client = ProductServiceClient()
        for product_result in search_response.results:
            request = GetProductRequest(name=product_result.product.name)
            product_response = product_client.get_product(request=request)
            #print(product_response)
            item = {
                    'id': product_response.id, 
                    'title': product_response.title, 
                    'categories': ','.join(product_response.categories) if product_response.categories else '',
                    'price': str(product_response.price_info.price) + ' ' + product_response.price_info.currency_code if product_response.price_info else '',
                    'availability': product_response.availability, 
                    'url': product_response.uri,
                    'image': product_response.images[0].uri if product_response.images else ''
                }
            products.append(item)
            
    print(json.dumps({ "items": products }))
    return json.dumps({ "items": products })