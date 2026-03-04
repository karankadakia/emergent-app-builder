from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from typing import List, Optional
import logging

from config import settings
from database import connect_to_mongo, close_mongo_connection, get_database
from models import *
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_active_admin, get_current_approver
)
from parsers import PDFParser, JSONParser
from services.email_service import email_service
from utils.logger import setup_logger
from utils.validators import validate_file_type, validate_mapping_rules

# Setup logging
logger = setup_logger(__name__)

# Create FastAPI app
app = FastAPI(title="Azure Data Transformer API")

# Create API router
api_router = APIRouter(prefix="/api")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins.split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# Startup/Shutdown events
@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    logger.info("Application started")


@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()
    logger.info("Application shutdown")


# ============= AUTH ROUTES =============

@api_router.post("/auth/register-org", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_organization(org_data: OrganizationCreate):
    """Register new organization with admin user"""
    db = get_database()
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": org_data.admin_email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create organization
    org = Organization(name=org_data.name)
    org_dict = org.model_dump()
    org_dict['created_at'] = org_dict['created_at'].isoformat()
    await db.organizations.insert_one(org_dict)
    
    # Create admin user
    user = UserInDB(
        email=org_data.admin_email,
        name=org_data.admin_name,
        org_id=org.id,
        role=UserRole.ADMIN,
        password_hash=get_password_hash(org_data.admin_password)
    )
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(data={"sub": user.id, "org_id": user.org_id})
    
    logger.info(f"New organization registered: {org.name}")
    
    return TokenResponse(
        access_token=access_token,
        user=User(**{k: v for k, v in user_dict.items() if k != 'password_hash'})
    )


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user"""
    db = get_database()
    
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Convert datetime strings
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    access_token = create_access_token(data={"sub": user_doc['id'], "org_id": user_doc['org_id']})
    
    return TokenResponse(
        access_token=access_token,
        user=User(**{k: v for k, v in user_doc.items() if k != 'password_hash'})
    )


@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user


@api_router.post("/users/invite", response_model=dict)
async def invite_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_admin)
):
    """Invite new user to organization (admin only)"""
    db = get_database()
    
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user
    user = UserInDB(
        email=user_data.email,
        name=user_data.name,
        org_id=current_user.org_id,
        role=user_data.role,
        password_hash=get_password_hash(user_data.password)
    )
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    # Get organization name
    org_doc = await db.organizations.find_one({"id": current_user.org_id}, {"_id": 0})
    org_name = org_doc.get('name', 'Organization') if org_doc else 'Organization'
    
    # Send invitation email in background
    background_tasks.add_task(
        email_service.send_user_invitation,
        user_data.email,
        org_name,
        current_user.name,
        user_data.password
    )
    
    logger.info(f"User invited: {user_data.email} to org {current_user.org_id}")
    
    return {"message": "User invited successfully", "user_id": user.id}


@api_router.get("/users", response_model=List[User])
async def list_users(current_user: User = Depends(get_current_active_admin)):
    """List all users in organization (admin only)"""
    db = get_database()
    
    users = await db.users.find({"org_id": current_user.org_id}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return [User(**user) for user in users]


# ============= FILE ROUTES =============

@api_router.post("/files/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload and parse file"""
    db = get_database()
    
    # Validate file type
    allowed_types = ['pdf', 'json', 'csv']
    if not validate_file_type(file.filename, allowed_types):
        raise HTTPException(status_code=400, detail=f"File type not supported. Allowed: {allowed_types}")
    
    file_type = file.filename.split('.')[-1].lower()
    
    try:
        # Read file content
        content = await file.read()
        
        # Parse file
        parsed_data = None
        if file_type == 'pdf':
            parser = PDFParser()
            parsed_data = await parser.parse(content, file.filename)
        elif file_type == 'json':
            parser = JSONParser()
            parsed_data = await parser.parse(content, file.filename)
        
        # Create file record
        file_record = FileRecord(
            original_name=file.filename,
            file_type=FileType(file_type),
            org_id=current_user.org_id,
            uploaded_by=current_user.id,
            status=FileStatus.PARSED,
            parsed_data=parsed_data,
            size_bytes=len(content),
            storage_path=f"/uploads/{current_user.org_id}/{file_record.id}/{file.filename}"
        )
        
        file_dict = file_record.model_dump()
        file_dict['created_at'] = file_dict['created_at'].isoformat()
        file_dict['updated_at'] = file_dict['updated_at'].isoformat()
        
        await db.files.insert_one(file_dict)
        
        logger.info(f"File uploaded: {file.filename} by user {current_user.email}")
        
        return FileUploadResponse(
            file_id=file_record.id,
            message=f"File {file.filename} uploaded and parsed successfully"
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process file")


@api_router.get("/files", response_model=List[FileRecord])
async def list_files(
    status_filter: Optional[FileStatus] = None,
    file_type: Optional[FileType] = None,
    current_user: User = Depends(get_current_user)
):
    """List files with optional filters"""
    db = get_database()
    
    query = {"org_id": current_user.org_id}
    if status_filter:
        query["status"] = status_filter.value
    if file_type:
        query["file_type"] = file_type.value
    
    files = await db.files.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for f in files:
        if isinstance(f.get('created_at'), str):
            f['created_at'] = datetime.fromisoformat(f['created_at'])
        if isinstance(f.get('updated_at'), str):
            f['updated_at'] = datetime.fromisoformat(f['updated_at'])
    
    return [FileRecord(**f) for f in files]


@api_router.get("/files/{file_id}", response_model=FileRecord)
async def get_file(file_id: str, current_user: User = Depends(get_current_user)):
    """Get file details"""
    db = get_database()
    
    file_doc = await db.files.find_one({"id": file_id, "org_id": current_user.org_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    if isinstance(file_doc.get('created_at'), str):
        file_doc['created_at'] = datetime.fromisoformat(file_doc['created_at'])
    if isinstance(file_doc.get('updated_at'), str):
        file_doc['updated_at'] = datetime.fromisoformat(file_doc['updated_at'])
    
    return FileRecord(**file_doc)


# ============= MAPPING ROUTES =============

@api_router.post("/mappings", response_model=FieldMapping, status_code=status.HTTP_201_CREATED)
async def create_mapping(
    mapping_data: FieldMappingCreate,
    current_user: User = Depends(get_current_user)
):
    """Create or update field mapping"""
    db = get_database()
    
    # Verify file exists and belongs to user's org
    file_doc = await db.files.find_one({"id": mapping_data.file_id, "org_id": current_user.org_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Validate mapping rules
    is_valid, message = validate_mapping_rules(
        mapping_data.source_schema,
        mapping_data.target_schema,
        mapping_data.mapping_rules
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # Check if mapping exists
    existing = await db.field_mappings.find_one({"file_id": mapping_data.file_id}, {"_id": 0})
    
    if existing:
        # Update existing
        update_data = {
            "source_schema": mapping_data.source_schema,
            "target_schema": mapping_data.target_schema,
            "mapping_rules": [r.model_dump() for r in mapping_data.mapping_rules],
            "modified_by": current_user.id,
            "modified_at": datetime.now(timezone.utc).isoformat()
        }
        await db.field_mappings.update_one({"id": existing['id']}, {"$set": update_data})
        
        updated = await db.field_mappings.find_one({"id": existing['id']}, {"_id": 0})
        if isinstance(updated.get('created_at'), str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        if isinstance(updated.get('modified_at'), str):
            updated['modified_at'] = datetime.fromisoformat(updated['modified_at'])
        
        return FieldMapping(**updated)
    else:
        # Create new
        mapping = FieldMapping(
            file_id=mapping_data.file_id,
            org_id=current_user.org_id,
            source_schema=mapping_data.source_schema,
            target_schema=mapping_data.target_schema,
            mapping_rules=mapping_data.mapping_rules,
            created_by=current_user.id,
            modified_by=current_user.id
        )
        
        mapping_dict = mapping.model_dump()
        mapping_dict['created_at'] = mapping_dict['created_at'].isoformat()
        mapping_dict['modified_at'] = mapping_dict['modified_at'].isoformat()
        
        await db.field_mappings.insert_one(mapping_dict)
        
        # Update file status
        await db.files.update_one(
            {"id": mapping_data.file_id},
            {"$set": {"status": FileStatus.MAPPING.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        logger.info(f"Mapping created for file {mapping_data.file_id}")
        
        return mapping


@api_router.get("/mappings/{file_id}", response_model=FieldMapping)
async def get_mapping(file_id: str, current_user: User = Depends(get_current_user)):
    """Get mapping for a file"""
    db = get_database()
    
    mapping_doc = await db.field_mappings.find_one({"file_id": file_id, "org_id": current_user.org_id}, {"_id": 0})
    if not mapping_doc:
        raise HTTPException(status_code=404, detail="Mapping not found")
    
    if isinstance(mapping_doc.get('created_at'), str):
        mapping_doc['created_at'] = datetime.fromisoformat(mapping_doc['created_at'])
    if isinstance(mapping_doc.get('modified_at'), str):
        mapping_doc['modified_at'] = datetime.fromisoformat(mapping_doc['modified_at'])
    
    return FieldMapping(**mapping_doc)


# ============= APPROVAL ROUTES =============

@api_router.post("/approvals", response_model=Approval, status_code=status.HTTP_201_CREATED)
async def request_approval(
    approval_data: ApprovalCreate,
    current_user: User = Depends(get_current_user)
):
    """Request approval for data loading"""
    db = get_database()
    
    # Verify file and mapping exist
    file_doc = await db.files.find_one({"id": approval_data.file_id, "org_id": current_user.org_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    mapping_doc = await db.field_mappings.find_one({"id": approval_data.mapping_id, "org_id": current_user.org_id}, {"_id": 0})
    if not mapping_doc:
        raise HTTPException(status_code=404, detail="Mapping not found")
    
    # Check if approval already exists
    existing = await db.approvals.find_one({"file_id": approval_data.file_id, "mapping_id": approval_data.mapping_id}, {"_id": 0})
    if existing and existing.get('status') == ApprovalStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Approval already pending for this file")
    
    # Create approval
    approval = Approval(
        file_id=approval_data.file_id,
        mapping_id=approval_data.mapping_id,
        org_id=current_user.org_id,
        requested_by=current_user.id,
        comments=approval_data.comments
    )
    
    approval_dict = approval.model_dump()
    approval_dict['created_at'] = approval_dict['created_at'].isoformat()
    
    await db.approvals.insert_one(approval_dict)
    
    # Update file status
    await db.files.update_one(
        {"id": approval_data.file_id},
        {"$set": {"status": FileStatus.PENDING_APPROVAL.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    logger.info(f"Approval requested for file {approval_data.file_id}")
    
    return approval


@api_router.put("/approvals/{approval_id}", response_model=Approval)
async def review_approval(
    approval_id: str,
    review: ApprovalReview,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_approver)
):
    """Approve or reject data loading (approver/admin only)"""
    db = get_database()
    
    approval_doc = await db.approvals.find_one({"id": approval_id, "org_id": current_user.org_id}, {"_id": 0})
    if not approval_doc:
        raise HTTPException(status_code=404, detail="Approval not found")
    
    if approval_doc.get('status') != ApprovalStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Approval already processed")
    
    # Update approval
    update_data = {
        "status": review.status.value,
        "reviewed_by": current_user.id,
        "comments": review.comments,
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.approvals.update_one({"id": approval_id}, {"$set": update_data})
    
    # Update file status
    file_status = FileStatus.APPROVED if review.status == ApprovalStatus.APPROVED else FileStatus.REJECTED
    await db.files.update_one(
        {"id": approval_doc['file_id']},
        {"$set": {"status": file_status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # If approved, create conversion job (placeholder for Synapse load)
    if review.status == ApprovalStatus.APPROVED:
        job = ConversionJob(
            file_id=approval_doc['file_id'],
            mapping_id=approval_doc['mapping_id'],
            org_id=current_user.org_id,
            status='completed',
            output_path=f"/synapse/output/{approval_doc['file_id']}.parquet"
        )
        job_dict = job.model_dump()
        job_dict['created_at'] = job_dict['created_at'].isoformat()
        await db.conversion_jobs.insert_one(job_dict)
        
        await db.files.update_one(
            {"id": approval_doc['file_id']},
            {"$set": {"status": FileStatus.COMPLETED.value}}
        )
    
    # Get requester email for notification
    requester = await db.users.find_one({"id": approval_doc['requested_by']}, {"_id": 0})
    file_doc = await db.files.find_one({"id": approval_doc['file_id']}, {"_id": 0})
    org_doc = await db.organizations.find_one({"id": current_user.org_id}, {"_id": 0})
    
    if requester and file_doc:
        background_tasks.add_task(
            email_service.send_approval_notification,
            requester['email'],
            file_doc['original_name'],
            org_doc.get('name', 'Organization') if org_doc else 'Organization',
            current_user.name,
            review.status.value
        )
    
    logger.info(f"Approval {approval_id} {review.status.value} by {current_user.email}")
    
    # Get updated approval
    updated = await db.approvals.find_one({"id": approval_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('reviewed_at'), str):
        updated['reviewed_at'] = datetime.fromisoformat(updated['reviewed_at'])
    
    return Approval(**updated)


@api_router.get("/approvals", response_model=List[Approval])
async def list_approvals(
    status_filter: Optional[ApprovalStatus] = None,
    current_user: User = Depends(get_current_user)
):
    """List approvals"""
    db = get_database()
    
    query = {"org_id": current_user.org_id}
    if status_filter:
        query["status"] = status_filter.value
    
    approvals = await db.approvals.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for a in approvals:
        if isinstance(a.get('created_at'), str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
        if a.get('reviewed_at') and isinstance(a['reviewed_at'], str):
            a['reviewed_at'] = datetime.fromisoformat(a['reviewed_at'])
    
    return [Approval(**a) for a in approvals]


# ============= DASHBOARD ROUTES =============

@api_router.get("/dashboard/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(current_user: User = Depends(get_current_user)):
    """Get dashboard metrics"""
    db = get_database()
    
    total_files = await db.files.count_documents({"org_id": current_user.org_id})
    files_completed = await db.files.count_documents({"org_id": current_user.org_id, "status": FileStatus.COMPLETED.value})
    files_pending = await db.files.count_documents({"org_id": current_user.org_id, "status": FileStatus.PENDING_APPROVAL.value})
    files_failed = await db.files.count_documents({"org_id": current_user.org_id, "status": FileStatus.FAILED.value})
    
    # Calculate total records processed
    jobs = await db.conversion_jobs.find({"org_id": current_user.org_id}, {"_id": 0}).to_list(1000)
    total_records = sum(job.get('records_processed', 0) for job in jobs)
    
    # Calculate storage used
    files = await db.files.find({"org_id": current_user.org_id}, {"_id": 0, "size_bytes": 1}).to_list(1000)
    storage_bytes = sum(f.get('size_bytes', 0) for f in files)
    storage_mb = storage_bytes / (1024 * 1024)
    
    return DashboardMetrics(
        total_files=total_files,
        files_completed=files_completed,
        files_pending_approval=files_pending,
        files_failed=files_failed,
        total_records_processed=total_records,
        storage_used_mb=round(storage_mb, 2)
    )


@api_router.get("/dashboard/activity")
async def get_dashboard_activity(current_user: User = Depends(get_current_user)):
    """Get recent activity for charts"""
    db = get_database()
    
    # Get files by date (last 7 days)
    files = await db.files.find(
        {"org_id": current_user.org_id},
        {"_id": 0, "created_at": 1, "status": 1}
    ).sort("created_at", -1).limit(100).to_list(100)
    
    # Group by date
    from collections import defaultdict
    daily_counts = defaultdict(lambda: {"uploaded": 0, "completed": 0, "failed": 0})
    
    for f in files:
        created_at = f.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        date_key = created_at.strftime('%Y-%m-%d')
        daily_counts[date_key]["uploaded"] += 1
        if f.get('status') == FileStatus.COMPLETED.value:
            daily_counts[date_key]["completed"] += 1
        elif f.get('status') == FileStatus.FAILED.value:
            daily_counts[date_key]["failed"] += 1
    
    # Convert to list
    activity_data = [
        {"date": date, **counts}
        for date, counts in sorted(daily_counts.items(), reverse=True)[:7]
    ]
    
    return {"activity": activity_data[::-1]}  # Reverse to show oldest first


# Include router
app.include_router(api_router)


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "azure-data-transformer"}
