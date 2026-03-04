from typing import Dict, Any
import re


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_file_type(filename: str, allowed_types: list) -> bool:
    """Validate file extension"""
    extension = filename.lower().split('.')[-1] if '.' in filename else ''
    return extension in allowed_types


def validate_mapping_rules(source_schema: Dict[str, Any], target_schema: Dict[str, Any], mapping_rules: list) -> tuple[bool, str]:
    """Validate mapping rules consistency"""
    source_fields = set(source_schema.keys())
    target_fields = set(target_schema.keys())
    
    for rule in mapping_rules:
        if rule.source_field not in source_fields:
            return False, f"Source field '{rule.source_field}' not found in source schema"
        if rule.target_field not in target_fields:
            return False, f"Target field '{rule.target_field}' not found in target schema"
    
    return True, "Validation passed"
