"""
Database Models for BillByteKOT
Contains Pydantic models for database collections.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class WhatsAppTemplate(BaseModel):
    """
    WhatsApp Template model for tracking Meta Business Manager approval status.
    
    This model stores actual Meta template categories and approval status
    to replace name-pattern based validation with real Meta API verification.
    
    Bug Fix: Templates were assumed UTILITY based on name patterns without
    Meta API verification, causing 24-hour window restriction errors.
    
    Schema matches existing MongoDB validation rules.
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    template_name: str = Field(..., description="Template name as registered in Meta Business Manager")
    template_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="WhatsApp template ID from Meta")
    language_code: str = Field("en", description="Template language (en, hi, etc.) - required")
    status: str = Field(..., description="Template approval status: approved, pending, rejected")
    category: Optional[str] = Field(None, description="Template category (utility, marketing)")
    components: List[Dict[str, Any]] = Field(default_factory=list, description="Template structure components")
    tenant_id: Optional[str] = Field(None, description="Tenant-specific template (optional)")
    is_global: bool = Field(False, description="Available to all tenants")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Additional fields for our bug fix (not in schema validation, so optional)
    organization_id: Optional[str] = Field(None, description="Organization ID for multi-tenant support")
    meta_category: Optional[str] = Field(None, description="Actual Meta category: UTILITY, MARKETING, or AUTHENTICATION")
    approval_status: Optional[str] = Field(None, description="Meta approval status: APPROVED, PENDING, REJECTED, or DISABLED")
    last_verified: Optional[datetime] = Field(None, description="Last verification timestamp from Meta API")
    quality_score: Optional[Any] = Field(
        None,
        description="Meta quality score returned by Meta (string or score metadata object)",
    )
    
    def is_utility_template(self) -> bool:
        """
        Check if template is UTILITY category based on actual Meta approval status.
        
        Returns:
            bool: True if template is approved UTILITY category, False otherwise
        """
        # Check both the schema field and our Meta field
        if self.meta_category:
            return (
                self.status == "approved" and 
                self.meta_category == "UTILITY"
            )
        elif self.category:
            return (
                self.status == "approved" and 
                self.category.upper() == "UTILITY"
            )
        return False
    
    def can_send_outside_window(self) -> bool:
        """
        Check if template can be sent outside 24-hour customer service window.
        
        Returns:
            bool: True if template can be sent outside window, False otherwise
        """
        return self.is_utility_template()
    
    def needs_verification(self, ttl_hours: int = 24) -> bool:
        """
        Check if template needs re-verification from Meta API.
        
        Args:
            ttl_hours: Time-to-live in hours for cached verification
            
        Returns:
            bool: True if verification is stale and needs refresh
        """
        if not self.last_verified:
            return True
        
        age = datetime.now(timezone.utc) - self.last_verified
        return age.total_seconds() > (ttl_hours * 3600)
