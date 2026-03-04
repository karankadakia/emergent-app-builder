from .base_parser import BaseParser
from typing import Dict, Any
import PyPDF2
import io
import logging

logger = logging.getLogger(__name__)


class PDFParser(BaseParser):
    """Parser for PDF files"""
    
    async def parse(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """Parse PDF and extract text content"""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            pages = []
            for page_num, page in enumerate(pdf_reader.pages, 1):
                text = page.extract_text()
                pages.append({
                    "page_number": page_num,
                    "text": text.strip()
                })
            
            metadata = pdf_reader.metadata or {}
            
            return {
                "filename": filename,
                "total_pages": len(pdf_reader.pages),
                "pages": pages,
                "metadata": {
                    "title": str(metadata.get('/Title', '')),
                    "author": str(metadata.get('/Author', '')),
                    "subject": str(metadata.get('/Subject', '')),
                },
                "full_text": " ".join([p["text"] for p in pages])
            }
        except Exception as e:
            logger.error(f"PDF parsing error for {filename}: {str(e)}")
            raise ValueError(f"Failed to parse PDF: {str(e)}")
    
    def detect_schema(self, parsed_data: Dict[str, Any]) -> Dict[str, str]:
        """Detect schema from parsed PDF data"""
        schema = {
            "filename": "string",
            "total_pages": "integer",
            "full_text": "string",
        }
        
        if parsed_data.get("metadata"):
            schema["title"] = "string"
            schema["author"] = "string"
            schema["subject"] = "string"
        
        return schema
