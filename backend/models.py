from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class UserRole(str, Enum):
    ADMIN = 'admin'
    APPROVER = 'approver'
    VIEWER = 'viewer'
    UPLOADER = 'uploader'


class FileStatus(str, Enum):
    UPLOADED = 'uploaded'
    PARSING = 'parsing'
    PARSED = 'parsed'
    MAPPING = 'mapping'
    PENDING_APPROVAL = 'pending_approval'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    LOADING = 'loading'
    COMPLETED = 'completed'
    FAILED = 'failed'


class FileType(str, Enum):
    PDF = 'pdf'
    JSON = 'json'
    CSV = 'csv'
    XML = 'xml'
    API = 'api'


class ApprovalStatus(str, Enum):
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'


# Organization Models
class OrganizationCreate(BaseModel):
    name: str
    admin_email: EmailStr
    admin_password: str
    admin_name: str


class Organization(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    settings: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.VIEWER


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    org_id: str
    role: UserRole
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserInDB(User):
    password_hash: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: User


# File Models
class FileUploadResponse(BaseModel):
    file_id: str
    message: str


class FileRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_name: str
    file_type: FileType
    storage_path: Optional[str] = None
    org_id: str
    uploaded_by: str
    status: FileStatus = FileStatus.UPLOADED
    parsed_data: Optional[Dict[str, Any]] = None
    size_bytes: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Field Mapping Models
class MappingRule(BaseModel):
    source_field: str
    target_field: str
    transformation: Optional[str] = None


class FieldMapping(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    file_id: str
    org_id: str
    source_schema: Dict[str, str]
    target_schema: Dict[str, str]
    mapping_rules: List[MappingRule]
    created_by: str
    modified_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    modified_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FieldMappingCreate(BaseModel):
    file_id: str
    source_schema: Dict[str, str]
    target_schema: Dict[str, str]
    mapping_rules: List[MappingRule]


# Approval Models
class Approval(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    file_id: str
    mapping_id: str
    org_id: str
    status: ApprovalStatus = ApprovalStatus.PENDING
    requested_by: str
    reviewed_by: Optional[str] = None
    comments: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = None


class ApprovalCreate(BaseModel):
    file_id: str
    mapping_id: str
    comments: Optional[str] = None


class ApprovalReview(BaseModel):
    status: ApprovalStatus
    comments: Optional[str] = None


# Conversion Job Models
class ConversionJob(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    file_id: str
    mapping_id: str
    org_id: str
    status: str = 'pending'
    output_path: Optional[str] = None
    error_log: Optional[str] = None
    records_processed: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None


# Dashboard Models
class DashboardMetrics(BaseModel):
    total_files: int
    files_completed: int
    files_pending_approval: int
    files_failed: int
    total_records_processed: int
    storage_used_mb: float
