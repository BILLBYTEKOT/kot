"""
Campaign Service - Handles all campaign management operations
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import uuid


class CampaignService:
    """Service for managing promotional campaigns"""
    
    def __init__(self, db, cache=None):
        self.db = db
        self.cache = cache
        self.collection_name = "campaigns"
    
    async def create_campaign(
        self,
        title: str,
        start_date: datetime,
        end_date: datetime,
        admin_id: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Create a new campaign"""
        
        if end_date <= start_date:
            raise ValueError("End date must be after start date")
        
        campaign = {
            "id": str(uuid.uuid4()),
            "title": title,
            "start_date": start_date,
            "end_date": end_date,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "created_by": admin_id,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": admin_id,
            **self._validate_optional_fields(kwargs)
        }
        
        result = await self.db[self.collection_name].insert_one(campaign)
        
        if self.cache:
            await self.cache.delete("campaigns:all")
        
        return campaign
    
    async def get_all_campaigns(
        self,
        active_only: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all campaigns with optional filtering"""
        
        cache_key = f"campaigns:all:active={active_only}"
        if self.cache:
            cached = await self.cache.get(cache_key)
            if cached:
                return cached
        
        query = {}
        if active_only:
            query["is_active"] = True
        
        campaigns = await self.db[self.collection_name].find(query)\
            .sort("created_at", -1)\
            .skip(skip)\
            .limit(limit)\
            .to_list(None)
        
        for campaign in campaigns:
            if "_id" in campaign:
                del campaign["_id"]
        
        if self.cache:
            await self.cache.set(cache_key, campaigns, ex=300)
        
        return campaigns
    
    async def get_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Get a specific campaign"""
        
        campaign = await self.db[self.collection_name].find_one({"id": campaign_id})
        
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")
        
        if "_id" in campaign:
            del campaign["_id"]
        
        return campaign
    
    async def update_campaign(
        self,
        campaign_id: str,
        updates: Dict[str, Any],
        admin_id: str
    ) -> Dict[str, Any]:
        """Update campaign with validation"""
        
        # Get existing campaign
        campaign = await self.get_campaign(campaign_id)
        
        # Validate date updates if provided
        if "start_date" in updates or "end_date" in updates:
            start = updates.get("start_date", campaign.get("start_date"))
            end = updates.get("end_date", campaign.get("end_date"))
            if end <= start:
                raise ValueError("End date must be after start date")
        
        # Prepare update
        updates["updated_at"] = datetime.now(timezone.utc)
        updates["updated_by"] = admin_id
        
        await self.db[self.collection_name].update_one(
            {"id": campaign_id},
            {"$set": updates}
        )
        
        # Invalidate cache
        if self.cache:
            await self.cache.delete("campaigns:all")
        
        return {**campaign, **updates}
    
    async def deactivate_campaign(
        self,
        campaign_id: str,
        admin_id: str
    ) -> Dict[str, Any]:
        """Deactivate a campaign"""
        
        return await self.update_campaign(
            campaign_id,
            {"is_active": False},
            admin_id
        )
    
    async def get_active_campaign(self) -> Optional[Dict[str, Any]]:
        """Get currently active campaign"""
        
        now = datetime.now(timezone.utc)
        campaign = await self.db[self.collection_name].find_one({
            "is_active": True,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        })
        
        if campaign and "_id" in campaign:
            del campaign["_id"]
        
        return campaign
    
    def _validate_optional_fields(self, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Validate optional campaign fields"""
        
        validated = {}
        
        allowed_fields = {
            "description", "discount_percentage", "discount_amount",
            "theme", "banner_text", "banner_color"
        }
        
        for field, value in fields.items():
            if field not in allowed_fields:
                continue
            
            if field == "discount_percentage":
                if not (0 <= value <= 100):
                    raise ValueError("Discount percentage must be 0-100")
                validated[field] = float(value)
            elif field == "discount_amount":
                if value < 0:
                    raise ValueError("Discount amount must be non-negative")
                validated[field] = float(value) if value else None
            else:
                validated[field] = str(value) if value else None
        
        return validated
