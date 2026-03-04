export const USER_ROLES = {
  ADMIN: 'admin',
  APPROVER: 'approver',
  UPLOADER: 'uploader',
  VIEWER: 'viewer'
};

export const FILE_STATUS = {
  UPLOADED: 'uploaded',
  PARSING: 'parsing',
  PARSED: 'parsed',
  MAPPING: 'mapping',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  LOADING: 'loading',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export const FILE_STATUS_LABELS = {
  uploaded: 'Uploaded',
  parsing: 'Parsing',
  parsed: 'Parsed',
  mapping: 'Mapping',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  loading: 'Loading',
  completed: 'Completed',
  failed: 'Failed'
};

export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const FILE_TYPES = {
  PDF: 'pdf',
  JSON: 'json',
  CSV: 'csv',
  XML: 'xml',
  API: 'api'
};
