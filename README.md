# Shopify Chat Widget

Minimal chat widget for Shopify stores. Calls a local Python backend exposed via ngrok.

## Setup

### 1. Backend — enable CORS

Your Python backend at `localhost:8080` must allow cross-origin requests. Example with FastAPI:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Expose with ngrok

```bash
ngrok http 8080
```

Copy the `https://xxxx.ngrok-free.app` URL.

### 3. Host on GitHub Pages

1. Push this repo to GitHub
2. Settings > Pages > Source: Deploy from branch `main`
3. Widget URL: `https://<username>.github.io/shopify-chat-widget/widget.js`

### 4. Add to Shopify

Online Store > Themes > Edit code > `theme.liquid` — add before `</body>`:

```html
<script
  src="https://<username>.github.io/shopify-chat-widget/widget.js"
  data-api-url="https://xxxx.ngrok-free.app"
  data-api-key="shopify_agent_api_key"
  defer>
</script>
```

## Local testing

Open `index.html` in a browser with your backend running on port 8080.

## API format

**POST** `{api-url}/chat/completions`

Request:
```json
{
  "messages": [
    {"role": "user", "content": "chat_id:abc123 Hello!"},
    {"role": "assistant", "content": "Hi there!"},
    {"role": "user", "content": "What products do you have?"}
  ]
}
```

Response:
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "We have..."
      }
    }
  ]
}
```
