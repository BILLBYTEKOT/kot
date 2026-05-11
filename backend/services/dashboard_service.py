"""
Dashboard Service - Handles analytics and metrics aggregation
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
import uuid


class DashboardService:
    """Service for dashboard metrics and analytics"""
    
    def __init__(self, db, cache=None):
        self.db = db
        self.cache = cache
        self.metrics_collection = "dashboard_metrics"
        self.users_collection = "users"
        self.subscriptions_collection = "subscriptions"
    
    async def get_dashboard_summary(self) -> Dict[str, Any]:
        """Get overall dashboard summary"""
        
        cache_key = "dashboard:summary"
        if self.cache:
            cached = await self.cache.get(cache_key)
            if cached:
                return cached
        
        summary = {
            "total_users": await self._count_collection(self.users_collection),
            "active_users": await self._count_active_users(),
            "trial_users": await self._count_trial_users(),
            "subscription_revenue": await self._calculate_revenue(),
            "support_tickets": await self._count_open_tickets(),
            "churn_rate": await self._calculate_churn_rate(),
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.cache:
            await self.cache.set(cache_key, summary, ex=600)  # 10 min cache
        
        return summary
    
    async def get_time_series_metrics(
        self,
        metric_type: str,
        days: int = 30,
        period: str = "daily"
    ) -> List[Dict[str, Any]]:
        """Get time series metrics for charting"""
        
        metrics = await self.db[self.metrics_collection].find({
            "metric_type": metric_type,
            "period": period,
            "metric_date": {
                "$gte": datetime.now(timezone.utc) - timedelta(days=days)
            }
        }).sort("metric_date", 1).to_list(None)
        
        for metric in metrics:
            if "_id" in metric:
                del metric["_id"]
            metric["metric_date"] = metric["metric_date"].isoformat()
        
        return metrics
    
    async def record_metric(
        self,
        metric_type: str,
        value: float,
        period: str = "daily",
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Record a metric value"""
        
        metric = {
            "id": str(uuid.uuid4()),
            "metric_type": metric_type,
            "metric_date": datetime.now(timezone.utc),
            "value": value,
            "period": period,
            "metadata": metadata or {}
        }
        
        await self.db[self.metrics_collection].insert_one(metric)
        
        # Invalidate summary cache
        if self.cache:
            await self.cache.delete("dashboard:summary")
        
        return metric
    
    async def get_user_growth(self, days: int = 90) -> Dict[str, Any]:
        """Get user growth metrics"""
        
        pipeline = [
            {
                "$match": {
                    "created_at": {
                        "$gte": datetime.now(timezone.utc) - timedelta(days=days)
                    }
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$created_at"
                        }
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        growth = await self.db[self.users_collection].aggregate(pipeline).to_list(None)
        
        return {
            "period_days": days,
            "daily_signups": growth
        }
    
    async def get_subscription_analytics(self) -> Dict[str, Any]:
        """Get subscription analytics"""
        
        pipeline = [
            {
                "$group": {
                    "_id": "$subscription_status",
                    "count": {"$sum": 1},
                    "revenue": {"$sum": "$subscription_amount"}
                }
            }
        ]
        
        stats = await self.db[self.subscriptions_collection].aggregate(pipeline).to_list(None)
        
        return {
            "subscription_status": stats,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def get_feature_usage(self) -> Dict[str, Any]:
        """Get feature usage statistics"""
        
        pipeline = [
            {
                "$match": {
                    "action": {"$in": [
                        "BILL_CREATED", "KOT_GENERATED", "REPORT_GENERATED",
                        "WHATSAPP_SENT", "EMAIL_SENT"
                    ]}
                }
            },
            {
                "$group": {
                    "_id": "$action",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}}
        ]
        
        usage = await self.db["event_log"].aggregate(pipeline).to_list(None)
        
        return {
            "feature_usage": usage,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def _count_collection(self, collection_name: str) -> int:
        """Count documents in collection"""
        return await self.db[collection_name].count_documents({})
    
    async def _count_active_users(self) -> int:
        """Count users active in last 7 days"""
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        return await self.db[self.users_collection].count_documents({
            "last_login": {"$gte": cutoff}
        })
    
    async def _count_trial_users(self) -> int:
        """Count users on trial"""
        return await self.db[self.users_collection].count_documents({
            "subscription_status": "trial",
            "trial_end_date": {"$gte": datetime.now(timezone.utc)}
        })
    
    async def _calculate_revenue(self) -> float:
        """Calculate total subscription revenue"""
        pipeline = [
            {"$match": {"subscription_status": "active"}},
            {"$group": {"_id": None, "total": {"$sum": "$subscription_amount"}}}
        ]
        
        result = await self.db[self.subscriptions_collection].aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0.0
    
    async def _count_open_tickets(self) -> int:
        """Count open support tickets"""
        return await self.db["support_tickets"].count_documents({
            "status": {"$in": ["open", "in_progress"]}
        })
    
    async def _calculate_churn_rate(self) -> float:
        """Calculate subscription churn rate"""
        pipeline = [
            {"$match": {"subscription_status": "cancelled"}},
            {"$count": "total"}
        ]
        
        cancelled = await self.db[self.subscriptions_collection].aggregate(pipeline).to_list(1)
        total = await self._count_collection(self.subscriptions_collection)
        
        if total == 0:
            return 0.0
        
        return (cancelled[0]["total"] / total * 100) if cancelled else 0.0
