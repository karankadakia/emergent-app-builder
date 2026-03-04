from .base_parser import BaseParser
from typing import Dict, Any
import json
import logging

logger = logging.getLogger(__name__)


class JSONParser(BaseParser):
    """Parser for JSON files"""
    
    async def parse(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """Parse JSON content"""
        try:
            text_content = file_content.decode('utf-8')
            data = json.loads(text_content)
            
            return {
                "filename": filename,
                "data": data,
                "record_count": len(data) if isinstance(data, list) else 1
            }
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error for {filename}: {str(e)}")
            raise ValueError(f"Invalid JSON format: {str(e)}")
        except Exception as e:
            logger.error(f"Error parsing {filename}: {str(e)}")
            raise ValueError(f"Failed to parse JSON: {str(e)}")
    
    def detect_schema(self, parsed_data: Dict[str, Any]) -> Dict[str, str]:
        """Detect schema from parsed JSON data"""
        schema = {}
        data = parsed_data.get("data", {})
        
        if isinstance(data, list) and len(data) > 0:
            # Use first item as schema reference
            sample = data[0]
            if isinstance(sample, dict):
                for key, value in sample.items():
                    schema[key] = self.infer_type(value)
        elif isinstance(data, dict):
            for key, value in data.items():
                schema[key] = self.infer_type(value)
        
        return schema
