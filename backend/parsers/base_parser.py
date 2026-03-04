from abc import ABC, abstractmethod
from typing import Dict, Any, List


class BaseParser(ABC):
    """Base parser interface for all file types"""
    
    @abstractmethod
    async def parse(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """Parse file content and extract schema"""
        pass
    
    @abstractmethod
    def detect_schema(self, parsed_data: Dict[str, Any]) -> Dict[str, str]:
        """Detect schema from parsed data"""
        pass
    
    def infer_type(self, value: Any) -> str:
        """Infer data type from value"""
        if isinstance(value, bool):
            return "boolean"
        elif isinstance(value, int):
            return "integer"
        elif isinstance(value, float):
            return "float"
        elif isinstance(value, str):
            return "string"
        elif isinstance(value, (list, tuple)):
            return "array"
        elif isinstance(value, dict):
            return "object"
        else:
            return "string"
