# Matakota AI Service

FastAPI service scaffold for PRD Module B: incident correlation, severity classification,
and summary generation.

The hackathon MVP should keep the heavy CV/BWC model stack mocked or offline. This service
is the integration boundary for:

- rule-based incident deduplication and correlation
- LLM-backed severity classification
- LLM-backed incident summaries with cited source IDs

## Local Development

```bash
cd apps/ai
python -m venv .venv
.venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

The Next.js/tRPC app reads this service URL from `AI_SERVICE_URL`.
