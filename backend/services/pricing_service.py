"""
Pricing Service - Handles all pricing configuration operations
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid
from pydantic import BaseModel, Field, validator


class PricingService:
    """Service for managing pricing configurations"""
    
    def __init__(self, db, cache=None):
        self.db = db
        self.cache = cache
        self.collection_name = "pricing_config"
        self.history_collection_name = "pricing_history"
    
    async def get_current_pricing(self) -> Dict[str, Any]:
        """Get current active pricing configuration"""
        if self.cache:
            cached = await self.cache.get("pricing:current")
            if cached:
                return cached
        
        config = await self.db[self.collection_name].find_one({"id": "default_pricing"})
        
        if not config:
            config = self._get_default_config()
            await self.db[self.collection_name].insert_one(config)
        
        if "_id" in config:
            del config["_id"]
        
        if self.cache:
            await self.cache.set("pricing:current", config, ex=300)  # 5 min cache
        
        return config
    
    async def update_pricing(
        self,
        updates: Dict[str, Any],
        admin_id: str,
        change_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update pricing configuration with audit trail"""
        
        # Get current config
        current = await self.get_current_pricing()
        
        # Validate updates
        validated_updates = self._validate_updates(updates)
        
        # Create updated config
        updated_config = {**current, **validated_updates}
        updated_config["updated_at"] = datetime.now(timezone.utc)
        updated_config["updated_by"] = admin_id
        
        # Update in database
        await self.db[self.collection_name].update_one(
            {"id": "default_pricing"},
            {"$set": updated_config}
        )
        
        # Save to audit trail
        await self._save_history(current, updated_config, admin_id, change_reason)
        
        # Invalidate cache
        if self.cache:
            await self.cache.delete("pricing:current")
        
        return updated_config
    
    async def get_pricing_history(
        self,
        skip: int = 0,
        limit: int = 50
    ) -> list:
        """Get pricing change history"""
        history = await self.db[self.history_collection_name].find()\
            .sort("changed_at", -1)\
            .skip(skip)\
            .limit(limit)\
            .to_list(None)
        
        # Remove _id field
        for entry in history:
            if "_id" in entry:
                del entry["_id"]
        
        return history
    
    async def revert_to_date(
        self,
        revert_date: datetime,
        admin_id: str
    ) -> Dict[str, Any]:
        """Revert pricing to what it was on a specific date"""
        
        history_entry = await self.db[self.history_collection_name].find_one({
            "changed_at": {"$lte": revert_date}
        }).sort("changed_at", -1)
        
        if not history_entry:
            raise ValueError(f"No pricing history found before {revert_date}")
        
        # Extract pricing config from history
        reverted_config = {k: v for k, v in history_entry.items() 
                          if k not in ["id", "changed_at", "changed_by", "change_reason"]}
        reverted_config["id"] = "default_pricing"
        
        return await self.update_pricing(
            reverted_config,
            admin_id,
            f"Reverted to {revert_date.isoformat()}"
        )
    
    def _validate_updates(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Validate pricing updates"""
        validated = {}
        
        # Validate numeric fields
        for field in ["regular_price", "campaign_price", "referral_discount", "referral_reward"]:
            if field in updates:
                value = updates[field]
                if not isinstance(value, (int, float)) or value < 0:
                    raise ValueError(f"{field} must be a non-negative number")
                validated[field] = float(value)
        
        # Validate integer fields
        for field in ["trial_days", "subscription_months"]:
            if field in updates:
                value = updates[field]
                if not isinstance(value, int) or value < 0:
                    raise ValueError(f"{field} must be a non-negative integer")
                validated[field] = value
        
        # Validate boolean
        if "campaign_active" in updates:
            validated["campaign_active"] = bool(updates["campaign_active"])
        
        # Validate string fields
        if "campaign_name" in updates:
            validated["campaign_name"] = str(updates["campaign_name"]) if updates["campaign_name"] else None
        
        return validated
    
    async def _save_history(
        self,
        old_config: Dict[str, Any],
        new_config: Dict[str, Any],
        admin_id: str,
        change_reason: Optional[str] = None
    ) -> None:
        """Save pricing change to history"""
        
        changes = {}
        for key in new_config:
            if key not in ["id", "updated_at", "updated_by"] and old_config.get(key) != new_config.get(key):
                changes[key] = {
                    "old": old_config.get(key),
                    "new": new_config.get(key)
                }
        
        history_entry = {
            "id": str(uuid.uuid4()),
            "pricing_config_id": "default_pricing",
            "regular_price": new_config.get("regular_price"),
            "campaign_price": new_config.get("campaign_price"),
            "referral_discount": new_config.get("referral_discount"),
            "referral_reward": new_config.get("referral_reward"),
            "trial_days": new_config.get("trial_days"),
            "subscription_months": new_config.get("subscription_months"),
            "campaign_active": new_config.get("campaign_active"),
            "campaign_name": new_config.get("campaign_name"),
            "campaign_start_date": new_config.get("campaign_start_date"),
            "campaign_end_date": new_config.get("campaign_end_date"),
            "changed_at": datetime.now(timezone.utc),
            "changed_by": admin_id,
            "change_reason": change_reason,
            "changes": changes
        }
        
        await self.db[self.history_collection_name].insert_one(history_entry)
    
    @staticmethod
    def _get_default_config() -> Dict[str, Any]:
        """Get default pricing configuration"""
        return {
            "id": "default_pricing",
            "regular_price": 1999.0,
            "campaign_price": 1799.0,
            "referral_discount": 200.0,
            "referral_reward": 300.0,
            "trial_days": 7,
            "subscription_months": 12,
            "campaign_active": False,
            "campaign_name": None,
            "campaign_start_date": None,
            "campaign_end_date": None,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": "system"
        }
