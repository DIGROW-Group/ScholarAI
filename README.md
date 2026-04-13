# RMATSS MVP - Reinforced Multi-Agent Tutoring System for Schools

A comprehensive web-based AI tutoring platform integrating multi-agent reinforcement learning principles with Claude AI, designed for realistic school deployment.

## Overview

RMATSS provides:
- **AI-Powered Tutoring**: Subject-specific AI tutors (Math, Physics) using Claude API with RAG
- **Multi-Role Dashboards**: Dedicated interfaces for Students, Teachers, and Parents
- **Intelligent Agents**: Orientation Agent, Geofencing Agent, and Subject Tutors sharing pedagogical memory
- **Reinforcement Learning**: Built-in reward tracking and episodic logging for continuous improvement

## Tech Stack

- **Frontend**: React 18 with Material-UI
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Sequelize ORM
- **AI**: Anthropic Claude API (via @anthropic-ai/sdk)
- **Vector Store**: ChromaDB for RAG document retrieval
- **Embeddings**: OpenAI API for document vectorization

## Features

### Student Dashboard
- AI tutor Q&A interface with three modes (Recall, Diagnostic, Scaffold)
- Personalized feedback and session history
- Orientation suggestions for learning path guidance
- Attendance check-in/out
- Progress tracking and performance metrics

### Teacher Dashboard
- Upload and manage course materials (RAG content)
- Monitor AI-student interactions with full transcripts
- Performance analytics (individual and class-wide)
- Evaluate AI scaffolding quality
- Provide meta-feedback on AI pedagogy
- Override AI responses when necessary

### Parent Dashboard
- Attendance and geofencing logs with anomaly alerts
- Performance overview with trend visualization
- Session activity reports
- AI tutor effectiveness metrics
- Orientation agent updates and recommendations

### AI Agents

1. **Subject Tutors (Math & Physics)**
   - RAG-based answers with source citations
   - Three interaction modes: Recall, Diagnostic, Scaffold
   - Episodic learning with reward tracking

2. **Orientation Agent**
   - Longitudinal student analysis
   - Personalized learning path suggestions
   - Early warning system for academic issues
   - Study strategy recommendations

3. **Geofencing Agent**
   - Attendance monitoring and logging
   - Anomaly detection (late, early departure, absence)
   - Automated alerts to parents/teachers

### Pedagogical Flow Shared Memory (PFSM)
- Centralized learner state across all agents
- Knowledge tracing and mastery modeling
- Cross-subject collaboration
- Persistent student profiles

## Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- ChromaDB (optional, for full RAG functionality)

### Setup

1. **Clone and install dependencies**:
   ```bash
   npm run install-all
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and database credentials
   ```

3. **Set up database**:
   ```bash
   # Create PostgreSQL database
   createdb rmatss_db
   
   # Run migrations
   npm run db:migrate
   
   # Seed sample data (optional)
   npm run db:seed
   ```

4. **Start ChromaDB (optional)**:
   ```bash
   docker run -p 8000:8000 chromadb/chroma
   ```

5. **Run the application**:
   ```bash
   npm run dev
   ```

The backend runs on `http://localhost:5000` and the frontend on `http://localhost:3000`.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Students
- `POST /api/tutor/ask` - Ask AI tutor a question
- `GET /api/student/sessions` - Get tutoring session history
- `POST /api/student/feedback` - Submit session feedback
- `POST /api/attendance/checkin` - Clock in
- `POST /api/attendance/checkout` - Clock out
- `GET /api/student/progress` - Get progress metrics

### Teachers
- `POST /api/content/upload` - Upload course materials
- `GET /api/teacher/students` - Get student list with analytics
- `GET /api/teacher/sessions/:studentId` - View student-AI transcripts
- `POST /api/teacher/feedback/:sessionId` - Evaluate AI pedagogy
- `GET /api/teacher/analytics` - Class-wide analytics

### Parents
- `GET /api/parent/child/:studentId` - Get child's overview
- `GET /api/parent/attendance/:studentId` - Get attendance logs
- `GET /api/parent/alerts/:studentId` - Get anomaly alerts

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Student    │  │   Teacher    │  │    Parent    │      │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Node.js/Express)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Math Tutor  │  │ Physics Tutor│  │ Orientation  │      │
│  │    Agent     │  │    Agent     │  │    Agent     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────────────────────────┐    │
│  │ Geofencing   │  │  Pedagogical Flow Shared Memory  │    │
│  │    Agent     │  │         (PFSM)                   │    │
│  └──────────────┘  └──────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                    ↕                        ↕
        ┌───────────────────┐    ┌──────────────────┐
        │  Claude API       │    │   PostgreSQL     │
        │  (Anthropic)      │    │   + ChromaDB     │
        └───────────────────┘    └──────────────────┘
```

## Reinforcement Learning

RMATSS implements a multi-component reward system:

- **Rs (Student-Level)**: Learning success, mastery improvement, student satisfaction
- **Rt (Tutor-Level)**: Pedagogical quality, scaffolding effectiveness, hint optimality
- **Rg (General)**: Efficiency, engagement, solution quality

**Total Reward**: Re = λs·Rs + λt·Rt + λg·Rg

All interactions are logged episodically for offline RL training and continuous improvement.

## Development

### Project Structure
```
RMATSS/
├── server/
│   ├── index.js                 # Express server entry
│   ├── config/                  # Configuration files
│   ├── database/                # Models, migrations, seeds
│   ├── routes/                  # API route handlers
│   ├── controllers/             # Business logic
│   ├── agents/                  # AI agent implementations
│   ├── services/                # External services (Claude, RAG)
│   └── middleware/              # Auth, validation, etc.
├── client/
│   ├── public/
│   └── src/
│       ├── components/          # React components
│       ├── pages/               # Dashboard pages
│       ├── services/            # API client
│       ├── context/             # React context
│       └── theme/               # App theme
└── package.json
```

### Adding New Subjects
To add a new subject tutor (e.g., Chemistry):

1. Add subject to `server/agents/TutorAgent.js`
2. Create subject-specific prompts
3. Upload course materials via Teacher Dashboard
4. The RAG system will automatically integrate new content

## Deployment

### Production Considerations
- Use environment variables for all secrets
- Enable HTTPS with SSL certificates
- Set up PostgreSQL with connection pooling
- Configure rate limiting on AI endpoints
- Use Docker for consistent deployment
- Set up monitoring and logging (Winston configured)

### Docker Deployment (Future)
```bash
docker-compose up -d
```

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions, please contact the development team or open an issue on the project repository.

---

**Built with ❤️ for innovative schools worldwide**

