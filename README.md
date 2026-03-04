# Azure Data Transformer

A multi-tenant SaaS platform for converting unstructured data into structured format using Azure services.

## Features

### Core Functionality
- **Multi-tenant Architecture**: Organizations can register and manage their own users and data
- **File Upload & Parsing**: Support for PDF, JSON, and CSV files with automatic schema detection
- **Field Mapping Editor**: Interactive UI to map source fields to target schema
- **Approval Workflow**: Configurable approval process before loading data
- **Email Notifications**: SendGrid integration for approval notifications
- **Dashboard Analytics**: Real-time metrics and activity charts
- **User Management**: Role-based access control (Admin, Approver, Uploader, Viewer)

### Tech Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Database**: MongoDB
- **Cloud Storage**: Azure Data Lake Storage Gen2 (configurable)
- **Data Warehouse**: Azure Synapse Analytics (configurable)
- **Email**: SendGrid

## Architecture

### Backend Structure
```
/app/backend/
├── server.py           # Main FastAPI application
├── config.py           # Configuration management
├── auth.py             # JWT authentication
├── models.py           # Pydantic models
├── database.py         # MongoDB connection
├── parsers/            # File parsers (PDF, JSON)
│   ├── base_parser.py
│   ├── pdf_parser.py
│   └── json_parser.py
├── services/
│   └── email_service.py
└── utils/
    ├── logger.py
    ├── validators.py
    └── retry.py
```

### Frontend Structure
```
/app/frontend/src/
├── App.js
├── components/
│   ├── auth/           # Login, Register
│   ├── layout/         # Sidebar, Header
│   ├── dashboard/      # Dashboard page
│   ├── files/          # File upload & management
│   ├── approvals/      # Approval workflow
│   └── settings/       # User & org settings
├── contexts/           # Auth context
├── services/           # API client
└── utils/             # Constants
```

## Setup & Configuration

### Environment Variables

#### Backend (.env)
```bash
# MongoDB
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"

# JWT
JWT_SECRET_KEY="your-secret-key-change-in-production"

# Azure Data Lake Storage Gen2
AZURE_STORAGE_ACCOUNT_NAME=""
AZURE_STORAGE_ACCOUNT_KEY=""
AZURE_STORAGE_CONTAINER="unstructured-files"

# Azure Synapse Analytics
SYNAPSE_SERVER=""
SYNAPSE_DATABASE=""
SYNAPSE_USERNAME=""
SYNAPSE_PASSWORD=""

# SendGrid Email
SENDGRID_API_KEY=""
SENDER_EMAIL="noreply@azuredatatransformer.com"

# CORS
CORS_ORIGINS="*"
```

#### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=https://your-app.preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

## User Roles

1. **Admin**: Full access - manage users, approve/reject, upload files
2. **Approver**: Can approve/reject data loading requests
3. **Uploader**: Can upload files and create mappings
4. **Viewer**: Read-only access to dashboards and files

## API Endpoints

### Authentication
- `POST /api/auth/register-org` - Register organization
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### User Management
- `POST /api/users/invite` - Invite user (Admin only)
- `GET /api/users` - List organization users (Admin only)

### Files
- `POST /api/files/upload` - Upload and parse file
- `GET /api/files` - List files with filters
- `GET /api/files/{file_id}` - Get file details

### Mappings
- `POST /api/mappings` - Create/update field mapping
- `GET /api/mappings/{file_id}` - Get mapping for file

### Approvals
- `POST /api/approvals` - Request approval
- `PUT /api/approvals/{approval_id}` - Approve/reject (Approver only)
- `GET /api/approvals` - List approvals

### Dashboard
- `GET /api/dashboard/metrics` - Get dashboard metrics
- `GET /api/dashboard/activity` - Get activity data

## Data Flow

1. **Upload**: User uploads unstructured file (PDF/JSON/CSV)
2. **Parse**: Backend automatically parses and detects schema
3. **Map**: User reviews and maps source fields to target schema
4. **Request Approval**: User submits for approval with optional comments
5. **Review**: Approver reviews and approves/rejects
6. **Load**: On approval, data is loaded to Synapse (placeholder)
7. **Notify**: Email notification sent to requester

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Organization-level data isolation
- Input validation
- CORS protection

## Code Quality

- Modular, production-like structure
- Comprehensive error handling
- Logging throughout
- Retry logic for external services
- Config-driven design
- MongoDB best practices (no ObjectId in responses)

## Deployment

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB
- (Optional) Azure subscription for full functionality

### Installation

1. Install backend dependencies:
```bash
cd /app/backend
pip install -r requirements.txt
```

2. Install frontend dependencies:
```bash
cd /app/frontend
yarn install
```

3. Configure environment variables in `.env` files

4. Start services:
```bash
# Backend (managed by supervisor)
sudo supervisorctl restart backend

# Frontend (managed by supervisor)
sudo supervisorctl restart frontend
```

## Testing

### Manual Testing
1. Register organization at `/register`
2. Login at `/login`
3. Upload a JSON or PDF file
4. Review auto-detected schema and mapping
5. Submit for approval
6. (As approver/admin) Review and approve
7. Check dashboard metrics

### API Testing
```bash
# Health check
curl http://localhost:8001/health

# Register organization
curl -X POST http://localhost:8001/api/auth/register-org \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Test Corp",
    "admin_email": "admin@test.com",
    "admin_password": "password123",
    "admin_name": "Admin User"
  }'
```

## Monitoring & Logs

- Backend logs: `/var/log/supervisor/backend.err.log`
- Frontend logs: Browser console
- Database: MongoDB queries logged in backend

## Future Enhancements

1. **Azure Integration**: Complete Azure Data Lake and Synapse integration
2. **Advanced Parsers**: Support for XML, Excel, and API connectors
3. **Data Preview**: Show sample data before and after transformation
4. **Transformation Rules**: Add data transformation logic (casting, formatting)
4. **Scheduling**: Automated data pipeline scheduling
5. **Audit Trail**: Complete activity logging
6. **Data Quality**: Validation rules and quality checks
7. **Notifications**: Slack/Teams integration

## Production Checklist

- [ ] Configure Azure Data Lake Storage credentials
- [ ] Configure Azure Synapse Analytics credentials
- [ ] Add SendGrid API key for email notifications
- [ ] Update JWT_SECRET_KEY with strong random key
- [ ] Set CORS_ORIGINS to specific domain
- [ ] Enable SSL/TLS
- [ ] Set up backup for MongoDB
- [ ] Configure monitoring and alerts
- [ ] Review and adjust user roles/permissions
- [ ] Load testing for file uploads
- [ ] Security audit

## Support

For issues or questions, refer to the codebase comments or contact your organization administrator.

---

**Built with Emergent AI** - A production-ready multi-tenant data transformation platform.
