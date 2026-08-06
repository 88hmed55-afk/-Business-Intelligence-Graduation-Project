import math
from typing import Any, Dict, List


def success(data: Any = None, message: str = "Success") -> Dict[str, Any]:
    """Standard success envelope."""
    return {"success": True, "data": data, "message": message}


def paginate(items: List[Any], total: int, page: int, page_size: int) -> Dict[str, Any]:
    """Build the standard paginated payload."""
    pages = math.ceil(total / page_size) if total > 0 else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }
