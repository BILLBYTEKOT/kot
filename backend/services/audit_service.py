"""
Audit Service - Handles logging and compliance tracking
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import uuid
from enum import Enum


class AuditAction(str, Enum):
    """Audit action types"""
    PRICING_UPDATE = "PRICING_UPDATE"
    CAMPAIGN_CREATE = "CAMPAIGN_CREATE"
    CAMPAIGN_UPDATE = "CAMPAIGN_UPDATE"
    CAMPAIGN_DELETE = "CAMPAIGN_DELETE"
    EMAIL_SEND = "EMAIL_SEND"
    USER_SUSPENSION = "USER_SUSPENSION"
    USER_UNSUSPENSION = "USER_UNSUSPENSION"
    PRICING_RESET = "PRICING_RESET"
    EXPORT_DATA = "EXPORT_DATA"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"


class AuditService:
    """Service for audit logging and compliance"""
    
    def __init__(self, db, cache=None):
        self.db = db
        self.cache = cache
        self.collection_name = "audit_log"
    
    async def log_action(
        self,
        admin_id: str,
        action: AuditAction,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "success",
        error_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Log an audit action"""
        
        log_entry = {
            "id": str(uuid.uuid4()),
            "admin_id": admin_id,
            "action": action.value,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "changes": changes,
            "timestamp": datetime.now(timezone.utc),
            "ip_address": ip_address,
            "user_agent": user_agent,
            "status": status,
            "error_message": error_message
        }
        
        await self.db[self.collection_name].insert_one(log_entry)
        
        return log_entry
    
    async def get_admin_activity(
        self,
        admin_id: str,
        skip: int = 0,
        limit: int = 100,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get activity log for specific admin"""
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        logs = await self.db[self.collection_name].find({
            "admin_id": admin_id,
            "timestamp": {"$gte": start_date}
        }).sort("timestamp", -1)\
         .skip(skip)\
         .limit(limit)\
         .to_list(None)
        
        for log in logs:
            if "_id" in log:
                del log["_id"]
        
        return logs
    
    async def get_action_logs(
        self,
        action: AuditAction,
        skip: int = 0,
        limit: int = 100,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get logs for specific action type"""
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        logs = await self.db[self.collection_name].find({
            "action": action.value,
            "timestamp": {"$gte": start_date}
        }).sort("timestamp", -1)\
         .skip(skip)\
         .limit(limit)\
         .to_list(None)
        
        for log in logs:
            if "_id" in log:
                del log["_id"]
        
        return logs
    
    async def get_entity_history(
        self,
        entity_type: str,
        entity_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all changes to a specific entity"""
        
        logs = await self.db[self.collection_name].find({
            "entity_type": entity_type,
            "entity_id": entity_id
        }).sort("timestamp", -1)\
         .limit(limit)\
         .to_list(None)
        
        for log in logs:
            if "_id" in log:
                del log["_id"]
        
        return logs
    
    async def get_dashboard_activity(
        self,
        days: int = 7
    ) -> Dict[str, Any]:
        """Get dashboard activity summary"""
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get counts by action
        pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$group": {
                "_id": "$action",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        
        action_stats = await self.db[self.collection_name].aggregate(pipeline).to_list(None)
        
        # Get admin activity
        admin_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$group": {
                "_id": "$admin_id",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        
        admin_stats = await self.db[self.collection_name].aggregate(admin_pipeline).to_list(None)
        
        # Get failure rate
        total_logs = await self.db[self.collection_name].count_documents(
            {"timestamp": {"$gte": start_date}}
        )
        
        failed_logs = await self.db[self.collection_name].count_documents({
            "timestamp": {"$gte": start_date},
            "status": "failure"
        })
        
        return {
            "period_days": days,
            "total_actions": total_logs,
            "action_stats": action_stats,
            "admin_stats": admin_stats,
            "failure_count": failed_logs,
            "failure_rate": (failed_logs / total_logs * 100) if total_logs > 0 else 0
        }
    
    async def cleanup_old_logs(self, days_to_keep: int = 730) -> int:
        """Delete audit logs older than specified days (for cleanup/archival)"""
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        
        result = await self.db[self.collection_name].delete_many({
            "timestamp": {"$lt": cutoff_date}
        })
        
        return result.deleted_count
    
    async def export_logs(
        self,
        start_date: datetime,
        end_date: datetime,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Export audit logs for compliance/analysis"""
        
        query = {
            "timestamp": {
                "$gte": start_date,
                "$lte": end_date
            }
        }
        
        if filters:
            query.update(filters)
        
        logs = await self.db[self.collection_name].find(query)\
            .sort("timestamp", -1)\
            .to_list(None)
        
        for log in logs:
            if "_id" in log:
                del log["_id"]
        
        return logs
