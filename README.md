# Company Profile Agent

A sophisticated financial analyst tool that transforms French fiscal bundles (liasses fiscales) into comprehensive company profiles using advanced AI technology.

**Developed by:** Digrow

## 🚀 Features

### Frontend
- **Modern React Application** with TypeScript-style architecture
- **Responsive Design** optimized for desktop and tablet
- **Authentication System** with JWT-based security
- **Interactive Dashboard** with real-time statistics
- **Drag & Drop File Upload** with validation and progress indicators
- **Company Profiles Management** with pagination and search
- **Smooth Animations** using Framer Motion
- **Professional UI** with Tailwind CSS

### Backend
- **Flask API** with PostgreSQL database
- **JWT Authentication** for secure access
- **File Upload System** with validation (max 3 files, 16MB each)
- **Document Processing** with Claude AI OCR integration
- **Multi-Service Architecture** with specialized modules:
  - **Financial Reporting**: AI-powered SWOT analysis and recommendations
  - **Web Exploring**: Company data extraction from websites and business directories
  - **News Retrieval**: Real-time news analysis and sector monitoring
  - **Profile Verification**: Smart document validation and duplicate detection
  - **Benchmark Module**: Compare different LLM models (Anthropic Claude vs OpenAI ChatGPT)
- **Report Generation System** with HTML templates and PDF export
- **Automatic File Cleanup** to optimize server storage
- **RESTful API** endpoints for all operations
- **Database Schema** optimized for financial data

### Infrastructure
- **Docker Compose** setup for easy deployment
- **PostgreSQL Database** with optimized indexes
- **Production-ready** configuration
- **Cross-platform** compatibility (Windows dev, Debian deployment)

## 🛠 Tech Stack

### Frontend
- React 18
- React Router DOM
- Framer Motion (animations)
- Tailwind CSS (styling)
- Axios (HTTP client)
- React Hot Toast (notifications)
- React Dropzone (file upload)
- Lucide React (icons)

### Backend
- Python 3.11
- Flask 2.3
- PostgreSQL 15
- SQLAlchemy (ORM)
- Flask-JWT-Extended (authentication)
- Anthropic Claude (AI/OCR)
- Python-magic (file type detection)
- Playwright (web scraping)
- Tavily Search (news retrieval)
- SerpAPI (Google Search)
- BeautifulSoup4 (HTML parsing)
- LangChain (AI integration)

### DevOps
- Docker & Docker Compose
- PostgreSQL with persistent volumes
- Environment-based configuration

## 📋 Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)
- Node.js 18+ (for local frontend development)

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd company-profile-agent
   ```

2. **Start the application:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432

4. **Default Login Credentials:**
   - Email: `admin@finsightai.com`
   - Password: `admin123`

### Local Development

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/company_profile_db"
export JWT_SECRET_KEY="your-secret-key"

python app.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 📁 Project Structure

```
company-profile-agent/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── config.py              # Configuration management
│   ├── init.sql               # Database initialization
│   ├── requirements.txt       # Python dependencies
│   ├── services/              # Service modules
│   │   ├── doc_processing.py  # Document OCR and KPI extraction
│   │   ├── financial_reporting.py  # AI-powered financial analysis
│   │   ├── web_exploring.py   # Company data extraction
│   │   ├── news_retrieving.py # News analysis and monitoring
│   │   ├── profile_verification.py  # Smart validation
│   │   ├── send_email.py      # Email notifications
│   │   ├── bizafrix_web.py    # Bizafrix integration
│   │   └── charika_web.py     # Charika integration
│   ├── static/                # Static assets
│   ├── uploads/               # File upload directory
│   └── Dockerfile
├── benchmark/                 # Benchmark module for LLM comparison
│   ├── __init__.py           # Module initialization
│   ├── config.py             # Benchmark configuration
│   ├── llm_services.py       # LLM service implementations
│   ├── benchmark_analysis.py # Main analysis service
│   ├── routes.py             # API routes
│   ├── test_benchmark.py     # Test script
│   ├── setup_benchmark.py    # Setup script
│   └── README.md             # Benchmark documentation
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Auth/          # Authentication components
│   │   │   ├── Dashboard/     # Dashboard components
│   │   │   ├── Layout/        # Layout components
│   │   │   ├── Profiles/      # Profile management
│   │   │   └── UI/           # Reusable UI components
│   │   ├── contexts/          # React contexts
│   │   ├── report_template/   # HTML report templates
│   │   ├── js/               # JavaScript utilities
│   │   ├── css/              # Stylesheets
│   │   └── App.js            # Main React application
│   ├── tailwind.config.js     # Tailwind configuration
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml         # Docker Compose configuration
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create appropriate environment variables for production:

#### Backend Environment Variables
```bash
DATABASE_URL=postgresql://postgres:postgres@db:5432/company_profile_db
JWT_SECRET_KEY=your-super-secret-jwt-key
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
TAVILY_API_KEY=your-tavily-search-api-key
SERPAPI_API_KEY=your-serpapi-google-search-key
FLASK_ENV=production
SECRET_KEY=your-flask-secret-key
```

#### Frontend Environment Variables
```bash
REACT_APP_API_URL=http://your-backend-url
```

## 🔬 Benchmark Module

The benchmark module allows you to compare different LLM models (Anthropic Claude vs OpenAI ChatGPT) for generating financial analysis reports. This helps you evaluate which model performs best for your specific use case.

### Features

- **Multi-Model Comparison**: Compare analysis results from different LLM providers
- **Same Prompts**: Uses identical system prompts and data context as the main application
- **Side-by-Side Analysis**: View SWOT analysis, recommendations, and detailed analysis from each model
- **Error Handling**: Graceful fallback when APIs are unavailable
- **Real-time Testing**: Test with actual company profile data

### Setup

1. **Configure API Keys**:
   ```bash
   # Add to your .env file
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Install Dependencies**:
   ```bash
   # The openai package is already included in requirements.txt
   pip install -r backend/requirements.txt
   ```

3. **Run Setup Script** (optional):
   ```bash
   python benchmark/setup_benchmark.py
   ```

### Usage

1. **Access the Benchmark Page**: Navigate to `/benchmark` in your application
2. **Select a Profile**: Choose a completed company profile from the list
3. **Generate Analysis**: Click "Générer l'Analyse" to run both models
4. **Compare Results**: View side-by-side comparison of:
   - SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats)
   - Strategic Recommendations
   - Detailed Financial Analysis

### API Endpoints

- `GET /api/benchmark/profiles` - Get all completed profiles
- `POST /api/benchmark/profiles/{id}/analyze` - Generate benchmark analysis
- `GET /api/benchmark/services` - Get available LLM services
- `GET /api/benchmark/profiles/{id}` - Get profile details

### Configuration Options

You can customize the benchmark behavior by setting these environment variables:

```bash
# Model configurations
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
OPENAI_MODEL=gpt-4o

# Analysis settings
BENCHMARK_MAX_TOKENS=4000
BENCHMARK_TEMPERATURE=0.1
BENCHMARK_TIMEOUT=60
```

## 🔄 Processing Workflow

The application uses a sophisticated multi-threaded processing pipeline to generate comprehensive company profiles:

### 1. **News Retrieval** (Parallel)
- Searches Leconomiste and Tavily for company-related news
- Uses AI to filter and analyze relevant articles
- Provides sector monitoring and market intelligence

### 2. **Web Exploring** (Sequential after News)
- Extracts company data from official websites
- Integrates with Bizafrix and Charika business directories
- Gathers company overview, sectors, markets, and key people
- Uses Playwright for dynamic content scraping

### 3. **Document Processing** (Sequential after Web Exploring)
- Processes uploaded PDF documents with Claude AI OCR
- Extracts financial KPIs and metadata
- Computes financial ratios and metrics
- Generates comprehensive financial analysis

### 4. **Report Generation** (Final Step)
- Combines all collected data into structured analysis
- Generates SWOT analysis, recommendations, and conclusions
- Creates HTML and PDF reports with professional templates
- Automatically cleans up uploaded files to optimize storage

### 5. **File Management**
- **Automatic Cleanup**: PDFs and markdown files are deleted after processing
- **Data Preservation**: All important JSON data is stored in the database
- **Storage Optimization**: Reduces server storage requirements by ~90%

## 📖 API Documentation

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@finsightai.com",
  "password": "admin123"
}
```

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "analyst"
}
```

### Company Profiles Endpoints

#### Get Profiles
```http
GET /api/profiles?page=1&per_page=10&search=company
Authorization: Bearer <jwt-token>
```

#### Create Profile
```http
POST /api/profiles
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "company_name": "Example Corp"
}
```

#### Upload Documents
```http
POST /api/profiles/{profile_id}/upload
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

files: [file1.pdf, file2.pdf, file3.pdf]
```

#### Smart Upload (Enhanced)
```http
POST /api/profiles/{profile_id}/smart-upload
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

files: [file1.pdf, file2.pdf, file3.pdf]
```

#### View Report
```http
GET /api/profiles/{profile_id}/report
Authorization: Bearer <jwt-token>
```

#### Download PDF Report
```http
GET /api/profiles/{profile_id}/pdf
Authorization: Bearer <jwt-token>
```

#### Delete Profile
```http
DELETE /api/profiles/{profile_id}
Authorization: Bearer <jwt-token>
```

#### Reprocess Profile
```http
POST /api/profiles/{profile_id}/reprocess
Authorization: Bearer <jwt-token>
```

#### Verify Profile
```http
POST /api/profiles/verify
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "company_name": "Example Corp",
  "fiscal_year": "2023"
}
```

## 📊 Report Generation System

The application features a comprehensive report generation system that creates professional financial analysis reports:

### **HTML Report Template**
- **Dynamic Data Population**: Automatically fills financial data, KPIs, and company information
- **Professional Styling**: Clean, modern design with responsive layout
- **Interactive Elements**: JavaScript-powered data visualization and formatting
- **Multi-language Support**: French language interface with proper formatting

### **PDF Export Capability**
- **One-click PDF Generation**: Convert HTML reports to PDF format
- **Print-optimized Layout**: Professional formatting for physical distribution
- **Embedded Assets**: Includes all CSS and JavaScript inline for portability
- **High-quality Output**: Vector-based rendering for crisp text and graphics

### **Report Content Structure**
- **Executive Summary**: Company overview and key findings
- **Financial Analysis**: KPIs, ratios, and financial health indicators
- **SWOT Analysis**: AI-generated strengths, weaknesses, opportunities, threats
- **Strategic Recommendations**: Actionable insights and next steps
- **Market Intelligence**: News analysis and sector monitoring
- **Company Profile**: Business sectors, markets, and key personnel

### **Data Integration**
- **Multi-source Aggregation**: Combines financial documents, web data, and news
- **Real-time Processing**: Updates reports as new data becomes available
- **Template Customization**: Flexible HTML template system for easy modifications
- **Error Handling**: Graceful fallbacks for missing or incomplete data

## 🎨 UI/UX Features

### Design System
- **Primary Color:** Blue (`#0ea5e9`)
- **Secondary Color:** Purple (`#d946ef`)
- **Typography:** Inter font family
- **Animations:** Smooth transitions and micro-interactions
- **Layout:** Responsive grid system with Flexbox

### Key User Flows
1. **Authentication:** Animated login with form validation
2. **Dashboard:** Overview with statistics and quick actions
3. **Profile Creation:** Enhanced wizard with fiscal year selection and email preferences
4. **File Upload:** Drag-and-drop with real-time validation and smart processing
5. **Profile Management:** Sortable table with search, pagination, and status tracking
6. **Report Viewing:** Interactive HTML reports with financial data visualization
7. **PDF Export:** One-click PDF generation for professional distribution
8. **Profile Verification:** Smart duplicate detection and validation before creation

## 🗂️ File Management & Storage Optimization

The application implements an intelligent file management system to optimize server storage while preserving all critical data:

### **Automatic File Cleanup**
- **Post-Processing Cleanup**: PDFs and markdown files are automatically deleted after successful processing
- **Data Preservation**: All important JSON data is permanently stored in the database
- **Storage Reduction**: Achieves ~90% reduction in server storage requirements
- **Selective Cleanup**: Only removes files after successful data extraction and storage

### **Cleanup Process**
1. **Document Processing**: PDFs are processed and data extracted
2. **Data Storage**: All financial data, KPIs, and metadata saved to database
3. **File Verification**: Confirms successful data storage before cleanup
4. **Automatic Deletion**: Removes original PDFs and generated markdown files
5. **Database Retention**: Preserves all structured data for future access

### **Manual Cleanup Tools**
- **One-time Cleanup Script**: `cleanup_existing_files.py` for existing uploads
- **Profile Deletion**: Automatically cleans up files when profiles are deleted
- **Storage Monitoring**: Built-in logging for cleanup operations

### **Benefits**
- **Cost Optimization**: Reduces cloud storage costs significantly
- **Performance**: Faster database queries with less file I/O
- **Reliability**: Data is safely stored in the database, not dependent on file system
- **Scalability**: System can handle more profiles without storage concerns

## 🔒 Security Features

- **JWT Authentication** with configurable expiration
- **Password Hashing** using Werkzeug's secure methods
- **File Validation** for type, size, and quantity limits
- **CORS Protection** with configurable origins
- **SQL Injection Prevention** through SQLAlchemy ORM
- **XSS Protection** through React's built-in sanitization

## 🚀 Deployment

### Production with Traefik (HTTPS at a domain)

1. Create a Docker network for the reverse proxy (once per host):
   ```bash
   docker network create proxy
   ```

2. Create a `.env` file at the project root with production secrets:
   ```env
   TRAEFIK_ACME_EMAIL=you@example.com
   TRAEFIK_DASHBOARD_HOST=traefik.yourdomain.com
   POSTGRES_PASSWORD=change-this-strong-password
   JWT_SECRET_KEY=change-this-strong-secret
   # Generate with: docker run --rm httpd:2.4-alpine htpasswd -nbB admin 'StrongPass' | sed -e s/\$/\$\$/g
   TRAEFIK_DASHBOARD_USERS=admin:$2y$05$examplehash...
   ```

3. Deploy:
   ```bash
   docker compose pull --ignore-buildable | cat
   docker compose up -d --build
   ```

Traefik will request and renew Let’s Encrypt certificates automatically. The frontend is served by Nginx, and the backend runs with Gunicorn. The database is not exposed publicly.

## 📊 Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (Unique, Not Null)
- `password_hash` (Not Null)
- `first_name`, `last_name`
- `role` (analyst, admin)
- `is_active` (Boolean)
- `created_at`, `updated_at`

### Company Profiles Table
- `id` (UUID, Primary Key)
- `company_name` (Not Null)
- `fiscal_years` (String) - Fiscal year for analysis (e.g., "2023", "2022-2023")
- `profile_data` (JSONB) - Comprehensive profile data including:
  - `extracted_kpis` - Financial KPIs from documents
  - `computed_ratios` - Calculated financial ratios
  - `web_data` - Company information from web sources
  - `news_data` - News analysis and sector intelligence
  - `swot_analysis` - AI-generated SWOT analysis
  - `recommendation` - Strategic recommendations
  - `detailed_analysis` - In-depth financial analysis
  - `conclusion` - Executive summary and conclusions
  - `email_report` - Email delivery preference
  - `processing_log` - Real-time processing status updates
- `status` (processing, completed, failed)
- `created_by` (Foreign Key to Users)
- `created_at`, `updated_at`

### Liasse Documents Table
- `id` (UUID, Primary Key)
- `profile_id` (Foreign Key to Company Profiles)
- `document_type`, `file_name`, `file_path`
- `file_size`
- `upload_status`, `ocr_status`
- `extracted_data` (JSONB)
- `created_at`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary software developed by Digrow

## 🆘 Support

For technical support or questions:
- Email: contact@digrowgroup.com
- Documentation: [Internal Wiki]
- Issues: [GitHub Issues]

---

**Company Profile Agent** - Transforming financial analysis with AI-powered document processing.