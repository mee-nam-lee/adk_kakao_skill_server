# genai-hackathon-adk
Generative AI Hackathon Task 6: ADK(Agent Development Kit)

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
1. install ADK
    ```bash
    pip install google-adk
    pip install google
    pip install google-cloud-retail
    ```
1. Set up a [Google Cloud project](https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal#setup-gcp)
1. Enable the [Vertex AI API](https://console.cloud.google.com/flows/enableapi?apiid=aiplatform.googleapis.com).

## Run and test 

1. Update .env file
    ```bash
    GOOGLE_GENAI_USE_VERTEXAI=TRUE
    GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
    GOOGLE_CLOUD_LOCATION=LOCATION
    ```
1. start with Dev UI(adk web)
    Run the following command to launch the developer Web UI.
    ```bash
    adk web
    ```

1. Open the URL provided (usually http://localhost:8000 or http://127.0.0.1:8000) directly in your browser.

1. In the top-left corner of the UI, you can select your agent in the dropdown. Select "catalog-agent".

1. Now you can chat with your agent using the textbox. 

