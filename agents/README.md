# genai-hackathon-adk
Generative AI Hackathon Task 6: ADK(Agent Development Kit)

This agent is using a Google Cloud Search for Commerce API. So you need to setup it first. [Interactive tutorials](https://cloud.google.com/retail/docs/retail-api-tutorials)

## Set up and install 

1. [Install and initialize](https://cloud.google.com/sdk/docs/install) the Google Cloud CLI.
1. Update gcloud 
    ```bash
    gcloud components update
    ```
1. Run the following command to generate a local Application Default Credentials (ADC) file. 
    ```bash
    gcloud auth application-default login
    ```
1. Set up a virtual environment
    ```bash
    python -m venv .venv
    source .venv/bin/activate
    # Windows CMD: .venv\Scripts\activate.bat
    ```
1. Run the following command to install the required packages.(ex. google-adk, google-cloud-retail)
    ```bash
    pip install -r requirements.txt
    ```
1. Set up a [Google Cloud project](https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal#setup-gcp)
1. Enable the [Vertex AI API](https://console.cloud.google.com/flows/enableapi?apiid=aiplatform.googleapis.com).

## Run and test 

1. Update .env file
    ```bash
    GOOGLE_GENAI_USE_VERTEXAI=TRUE
    GOOGLE_CLOUD_PROJECT=<YOUR_PROJECT_ID>
    GOOGLE_CLOUD_LOCATION=us-central
    SEARCH_SERVING_CONFIG_ID=test-search-config
    MODEL=gemini-2.0-flash-001
    ```
1. start with Dev UI(adk web)
    Run the following command to launch the developer Web UI.
    ```bash
    adk web
    ```
    output: 
    ```
    INFO:     Started server process [2434]
    INFO:     Waiting for application startup.
    +-------------------------------------------------------+
    | ADK Web Server started                                |
    |                                                       |
    | For local testing, access at http://localhost:8000.   |
    +-------------------------------------------------------+

    INFO:     Application startup complete.
    INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
    ```

1. Open the URL provided (usually http://localhost:8000 or http://127.0.0.1:8000) directly in your browser.

1. In the top-left corner of the UI, you can select your agent in the dropdown. Select "catalog-agent".

1. Now you can chat with your agent using the textbox. 

## deployment 

### Environment variables for the agent

```bash
export GOOGLE_CLOUD_LOCATION=us-central1
export GOOGLE_GENAI_USE_VERTEXAI=TRUE
export GOOGLE_CLOUD_PROJECT=<YOUR PROJECT ID>
```

### IAM policy

Cloud Run application will run with Compute Engine Default Service Account. It needs a Retail Viewer role to call the Retail API.

```bash
export PROJECT_NUMBER=$(gcloud projects describe $GOOGLE_CLOUD_PROJECT --format="value(projectNumber)")
export COMPUTE_SA=$PROJECT_NUMBER-compute@developer.gserviceaccount.com
gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} --member serviceAccount:${COMPUTE_SA} --role=roles/retail.viewer
```

### Build client application 

```bash
cd search-app
yarn build
```
### Deploy agent to Cloud Run

```bash
cd ../agents
gcloud run deploy catalog-agent \
--source . \
--region $GOOGLE_CLOUD_LOCATION \
--project $GOOGLE_CLOUD_PROJECT \
--allow-unauthenticated \
--set-env-vars="GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT,GOOGLE_CLOUD_LOCATION=$GOOGLE_CLOUD_LOCATION,GOOGLE_GENAI_USE_VERTEXAI=$GOOGLE_GENAI_USE_VERTEXAI"
```

Thre result look like this: 
Check the Cloud Run URL. 
```
 (...)
  ✓ Creating Revision...                                                                                                                                            
  ✓ Routing traffic...                                                                                                                                             
  ✓ Setting IAM Policy...                                                                                                                                                              
Done.                                                                                                                                                                                  
Service [catalog-agent] revision [catalog-agent-00001-bsq] has been deployed and is serving 100 percent of traffic.
Service URL: https://catalog-agent-790012362778.us-central1.run.app
```

### Client application



### Test the API with curl

Use the Service URL. 

#### create session

```
export APP_URL="<Cloud Run Service URL>"
curl -X POST $APP_URL/apps/catalog_agent/users/user_123/sessions/session_abc \
    -H "Content-Type: application/json" 
```

#### call agent
```
curl -X POST $APP_URL/run \
    -H "Content-Type: application/json" \
    -d '{                                                              
    "app_name": "catalog_agent",
    "user_id": "user_123",
    "session_id": "session_abc",
    "new_message": {
        "role": "user",
        "parts": [{
        "text": "I want to have a hoodie?"
        }]
    },
    "streaming": false
    }'
```

#### call agent
```
curl -X POST http://0.0.0.0:8080/call_agent \
    -H "Content-Type: application/json" \
    -d '{"input_input": "hello", "msg":""}'
```