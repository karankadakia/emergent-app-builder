import asyncio
from functools import wraps
from typing import Callable, Type
import logging

logger = logging.getLogger(__name__)


def retry_async(max_attempts: int = 3, delay: float = 1.0, backoff: float = 2.0, exceptions: tuple = (Exception,)):
    """Retry decorator for async functions with exponential backoff"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            attempt = 1
            current_delay = delay
            
            while attempt <= max_attempts:
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        logger.error(f"{func.__name__} failed after {max_attempts} attempts: {str(e)}")
                        raise
                    
                    logger.warning(
                        f"{func.__name__} attempt {attempt}/{max_attempts} failed: {str(e)}. "
                        f"Retrying in {current_delay}s..."
                    )
                    await asyncio.sleep(current_delay)
                    current_delay *= backoff
                    attempt += 1
        
        return wrapper
    return decorator
