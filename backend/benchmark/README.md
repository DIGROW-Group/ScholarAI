# Benchmark Module

This module provides functionality to compare different LLM models (Anthropic Claude and OpenAI ChatGPT) for generating financial analysis reports.

## Features

- **Multi-Model Comparison**: Compare analysis results from different LLM providers
- **Same Prompts**: Uses identical system prompts and data context as the main application
- **SWOT Analysis**: Generates SWOT analysis for each model
- **Recommendations**: Produces strategic recommendations
- **Detailed Analysis**: Creates detailed financial analysis
- **Error Handling**: Graceful fallback when APIs are unavailable

## Configuration

### Environment Variables

Add these environment variables to your `.env` file:

```bash
# Required API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Optional Configuration
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
OPENAI_MODEL=gpt-4o
BENCHMARK_MAX_TOKENS=4000
BENCHMARK_TEMPERATURE=0.1
BENCHMARK_TIMEOUT=60
```

### API Keys Setup

1. **Anthropic Claude**:
   - Get your API key from [Anthropic Console](https://console.anthropic.com/)
   - Add `ANTHROPIC_API_KEY` to your environment variables

2. **OpenAI ChatGPT**:
   - Get your API key from [OpenAI Platform](https://platform.openai.com/)
   - Add `OPENAI_API_KEY` to your environment variables

## Usage

### Backend API Endpoints

- `GET /api/benchmark/profiles` - Get all completed profiles
- `POST /api/benchmark/profiles/{id}/analyze` - Generate benchmark analysis
- `GET /api/benchmark/services` - Get available LLM services
- `GET /api/benchmark/profiles/{id}` - Get profile details

### Frontend

Access the benchmark page at `/benchmark` in your application.

## File Structure

```
benchmark/
├── __init__.py              # Module initialization
├── config.py                # Configuration management
├── llm_services.py          # LLM service implementations
├── benchmark_analysis.py    # Main analysis service
├── routes.py                # API routes
└── README.md               # This file
```

## How It Works

1. **Profile Selection**: Choose a completed company profile from the database
2. **Data Preparation**: Extract and format the same data used in the main application
3. **Parallel Processing**: Send identical prompts to all configured LLM services
4. **Result Comparison**: Display side-by-side comparison of results
5. **Error Handling**: Show fallback responses for failed API calls

## Integration

The benchmark module is automatically integrated into the main application:

- Routes are registered in `backend/app.py`
- Frontend component is added to `frontend/src/App.js`
- Sidebar navigation includes benchmark link

## Dependencies

- `anthropic` - Anthropic Claude API
- `openai` - OpenAI ChatGPT API
- `flask` - Web framework
- `flask-jwt-extended` - Authentication

## Error Handling

- API failures are caught and logged
- Fallback responses are generated for failed services
- User-friendly error messages are displayed
- Partial results are shown when some services fail

## Performance

- Parallel API calls for faster processing
- Configurable timeouts and token limits
- Efficient data preparation and formatting
- Minimal memory footprint
