"""
WhatsApp Cloud API Client  BillByteKOT
Sends messages via Meta WhatsApp Business API (Cloud API).
No wa.me redirects. Cloud API only.
"""

import os
import httpx
import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from database_models import WhatsAppTemplate


class WhatsAppCloudAPI:
    """Lightweight async WhatsApp Cloud API client using httpx."""

    # Error codes for classification
    ERROR_CODE_WINDOW_RESTRICTION = {131047, 131026}  # 24-hour window restriction
    ERROR_CODE_INVALID_TEMPLATE = {131031, 132001}  # Invalid/missing template or translation
    ERROR_CODE_RATE_LIMIT = {131051}  # Rate limit exceeded
    ERROR_CODE_BUSINESS_ELIGIBILITY = {131042}  # Business eligibility payment issue

    # Retry configuration
    MAX_RETRY_ATTEMPTS = 3
    RETRY_DELAYS = [1.0, 2.0, 4.0]  # Exponential backoff: 1s, 2s, 4s
    
    # Template cache TTL (Time To Live) in hours
    TEMPLATE_CACHE_TTL_HOURS = 24
    
    # Meta Business Manager API endpoints
    META_TEMPLATES_ENDPOINT = "message_templates"

    def __init__(self):
        self.phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
        self.access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
        self.api_version = os.getenv("WHATSAPP_API_VERSION", "v18.0")
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        self.template_name = os.getenv("WHATSAPP_TEMPLATE_NAME", "order").strip()
        self.template_lang = os.getenv("WHATSAPP_TEMPLATE_LANG", "en_US").strip()
        # Use the actual Meta-approved utility templates from the business account.
        # This is the approved UTILITY template configured in Meta Business Manager.
        # Keep the name/language stable: a 200 response is not delivery confirmation.
        self.template_bill_confirmation = "payment_receipt_with_invoice_link"
        self.template_lang = "en_US"
        # Meta template configuration: the approved receipt template shown in
        # Business Manager has four BODY variables, including the receipt URL.
        # It does not have a dynamic URL button, so do not append a button
        # component to the Cloud API payload.
        self.template_bill_uses_receipt_url = True
        self.template_bill_use_url_button = False
        self.template_status_pending = os.getenv("WHATSAPP_TEMPLATE_STATUS_PENDING", "order").strip()
        self.template_status_preparing = os.getenv("WHATSAPP_TEMPLATE_STATUS_PREPARING", "order_preparing").strip()
        self.template_status_ready = os.getenv("WHATSAPP_TEMPLATE_STATUS_READY", "order_ready").strip()
        self.template_status_completed = os.getenv("WHATSAPP_TEMPLATE_STATUS_COMPLETED", "order_completed").strip()
        self.template_status_cancelled = os.getenv("WHATSAPP_TEMPLATE_STATUS_CANCELLED", "").strip()
        self._log_template_configuration()

    def _log_template_configuration(self) -> None:
        """Log the effective template mapping used by the running process."""
        logging.warning(
            "WhatsApp template config | lang=%s | bill=%s | pending=%s | preparing=%s | ready=%s | completed=%s | cancelled=%s",
            self.template_lang or "<empty>",
            self.template_bill_confirmation or "<empty>",
            self.template_status_pending or "<empty>",
            self.template_status_preparing or "<empty>",
            self.template_status_ready or "<empty>",
            self.template_status_completed or "<empty>",
            self.template_status_cancelled or "<empty>",
        )

    def is_configured(self) -> bool:
        return bool(self.phone_number_id and self.access_token)

    def is_template_configured(self) -> bool:
        return bool(self.template_name and self.template_lang)

    def get_status_template_name(self, status: str) -> str:
        """Get status template name with emergency safety check."""
        status = (status or "").lower()
        mapping = {
            "pending": self.template_status_pending,
            "preparing": self.template_status_preparing,
            "ready": self.template_status_ready,
            "completed": self.template_status_completed,
            "cancelled": self.template_status_cancelled,
        }
        configured_template = mapping.get(status, "")
        
        # EMERGENCY SAFETY CHECK: Warn if template is risky
        if configured_template and not self._is_utility_template(configured_template):
            print(f" EMERGENCY WARNING: Status template '{configured_template}' for '{status}' may be risky")
            print(f"   This may fail outside 24-hour customer service window")
            # Don't override status templates as they have specific meanings
            # But provide clear warning
        
        return configured_template

    def get_bill_template_name(self) -> str:
        """Get bill template name with emergency safety override (synchronous version for backward compatibility)."""
        configured_template = self.template_bill_confirmation
        
        # EMERGENCY OVERRIDE: Force safe template if configured template is risky
        if not self._is_utility_template(configured_template):
            print(f" EMERGENCY OVERRIDE: Bill template '{configured_template}' is risky")
            print(f"   Forcing use of 'payment_receipt' (verified UTILITY template)")
            return "payment_receipt"
        
        return configured_template

    async def get_bill_template_name_validated(self) -> str:
        """Get bill template name with Meta API validation and emergency safety override."""
        configured_template = self.template_bill_confirmation
        
        try:
            # Use Meta API validation instead of name patterns
            validation_result = await self.validate_template_category(configured_template, self.template_lang)
            is_utility = validation_result["is_utility"]
            template_category = validation_result["category"]
            validation_source = validation_result["source"]
            
            print(f" Bill template validation: {configured_template}")
            print(f"   Category: {template_category} | Source: {validation_source}")
            print(f"   Can send outside window: {is_utility}")
            
            # EMERGENCY OVERRIDE: Force safe template if configured template is risky
            if not is_utility:
                print(f" EMERGENCY OVERRIDE: Bill template '{configured_template}' is not UTILITY")
                print(f"   Category: {template_category} (Meta validation: {validation_source})")
                print(f"   Forcing use of 'payment_receipt' (fallback UTILITY template)")
                return "payment_receipt"
            
            return configured_template
            
        except Exception as e:
            print(f" Meta API validation failed for bill template '{configured_template}': {e}")
            print(f"   Falling back to name-pattern validation")
            
            # Fallback to original logic
            if not self._is_utility_template(configured_template):
                print(f" EMERGENCY OVERRIDE: Bill template '{configured_template}' is risky (name-pattern check)")
                print(f"   Forcing use of 'payment_receipt' (verified UTILITY template)")
                return "payment_receipt"
            
            return configured_template

    def _is_utility_template(self, template_name: str) -> bool:
        """Check if template is UTILITY category (required for outside 24h window).
        
        UTILITY templates: order updates, receipts, alerts
        MARKETING templates: promotions (require 24h window)
        
        EMERGENCY FIX: More conservative validation to prevent 24h window errors
        """
        # Meta-approved utility templates observed in the actual business account.
        # Keep this list aligned with the approved template names in Meta Business Manager.
        strict_utility_patterns = [
            "payment_receipt",
            "payment_receipt_with_in",
            "purchase_receipt_3",
            "order",
            "order_preparing",
            "order_ready",
            "order_completed",
            "hello_world",
        ]
        
        # Templates that are typically marketing or non-transactional.
        potentially_marketing = [
            "bill_confirmation",
            "promo",
            "offer",
            "discount",
            "sale",
            "campaign"
        ]
        
        template_lower = template_name.lower()
        
        # If template might be marketing, be conservative
        if any(pattern in template_lower for pattern in potentially_marketing):
            print(f" CONSERVATIVE: Template '{template_name}' may contain marketing content")
            print(f"   Treating as potentially MARKETING to avoid 24h window errors")
            return False
        
        # Only allow clearly transactional templates
        is_utility = any(pattern in template_lower for pattern in strict_utility_patterns)
        
        if not is_utility:
            print(f" Template '{template_name}' not in strict UTILITY list")
            print(f"   Strict UTILITY patterns: {strict_utility_patterns}")
        
        return is_utility

    def clean_phone(self, phone: str) -> str:
        """
        Enhanced phone number normalization for consistent formatting.
        
        Ensures phone number format matches storage format exactly to prevent
        lookup failures between storage and delivery.
        
        Args:
            phone: Raw phone number string (various formats supported)
            
        Returns:
            str: Normalized phone number in E.164 format without + prefix
            
        Raises:
            ValueError: If phone number is invalid or cannot be normalized
        """
        if not phone:
            raise ValueError("Phone number cannot be empty")
        
        # Remove all non-digit characters
        cleaned = "".join(c for c in str(phone) if c.isdigit())
        
        if not cleaned:
            raise ValueError(f"No digits found in phone number: {phone}")
        
        # Handle different input formats
        original_length = len(cleaned)
        
        # Case 1: 10-digit Indian number (add country code)
        if original_length == 10:
            # Validate it's a valid Indian mobile number (starts with 6-9)
            if not cleaned[0] in "6789":
                raise ValueError(f"Invalid Indian mobile number: {phone} (must start with 6, 7, 8, or 9)")
            cleaned = "91" + cleaned
            
        # Case 2: 11-digit number starting with 0 (remove leading 0, add country code)
        elif original_length == 11 and cleaned.startswith("0"):
            mobile_part = cleaned[1:]
            if not mobile_part[0] in "6789":
                raise ValueError(f"Invalid Indian mobile number: {phone} (after removing 0, must start with 6, 7, 8, or 9)")
            cleaned = "91" + mobile_part
            
        # Case 3: 12-digit number starting with 91 (already has country code)
        elif original_length == 12 and cleaned.startswith("91"):
            mobile_part = cleaned[2:]
            if len(mobile_part) != 10:
                raise ValueError(f"Invalid phone number length after country code: {phone}")
            if not mobile_part[0] in "6789":
                raise ValueError(f"Invalid Indian mobile number: {phone} (mobile part must start with 6, 7, 8, or 9)")
            # Already in correct format
            
        # Case 4: 13-digit number starting with +91 (remove + if present in original)
        elif original_length == 13 and cleaned.startswith("91"):
            # This handles cases where + was stripped but we have extra digits
            mobile_part = cleaned[2:]
            if len(mobile_part) != 10:
                raise ValueError(f"Invalid phone number length: {phone}")
            if not mobile_part[0] in "6789":
                raise ValueError(f"Invalid Indian mobile number: {phone} (mobile part must start with 6, 7, 8, or 9)")
            cleaned = cleaned[:12]  # Take first 12 digits (91 + 10 digit mobile)
            
        # Case 5: Other country codes or invalid formats
        else:
            # Check if it might be another country code format
            if original_length > 15:  # E.164 max is 15 digits
                raise ValueError(f"Phone number too long: {phone} (max 15 digits including country code)")
            elif original_length < 10:
                raise ValueError(f"Phone number too short: {phone} (min 10 digits)")
            else:
                # For other lengths, check common international formats
                if original_length == 11:
                    # Could be US (1 + 10 digits) or other country
                    if cleaned.startswith("1"):
                        # US number validation
                        area_code = cleaned[1:4]
                        if area_code[0] in "01":  # Invalid US area codes
                            raise ValueError(f"Invalid US area code: {area_code}")
                        # Accept as valid US number
                    else:
                        raise ValueError(f"Invalid phone number format: {phone} (11 digits must start with 1 for US or be Indian format)")
                        
                elif original_length == 12:
                    # Validate format: should be country code + mobile number
                    if cleaned.startswith("91"):
                        mobile_part = cleaned[2:]
                        if not mobile_part[0] in "6789":
                            raise ValueError(f"Invalid Indian mobile number: {phone} (mobile part must start with 6, 7, 8, or 9)")
                    elif cleaned.startswith(("44", "86", "33", "49", "81", "82", "65", "60", "66", "84", "62", "63")):
                        # Other common country codes - basic validation
                        pass  # Accept as valid
                    else:
                        # Check if it could be a valid country code
                        cc = cleaned[:2]
                        if not cc.isdigit() or int(cc) < 1 or int(cc) > 99:
                            raise ValueError(f"Invalid country code in phone number: {phone}")
                        
                elif original_length == 13:
                    # 3-digit country code + 10 digits
                    cc = cleaned[:3]
                    if cc in ["880", "977", "975"]:  # Bangladesh, Nepal, Bhutan
                        pass  # Accept as valid
                    else:
                        raise ValueError(f"Unsupported 3-digit country code: {cc} in phone number: {phone}")
                        
                else:
                    # Other lengths - basic validation
                    if original_length >= 10 and original_length <= 15:
                        # Reject obviously invalid lengths
                        if original_length == 14:
                            raise ValueError(f"Phone number too long: {phone} (14 digits is invalid for most countries)")
                        # Could be valid international format
                        pass  # Accept as potentially valid
                    else:
                        raise ValueError(f"Invalid phone number format: {phone} (length: {original_length})")
        
        # Final validation for Indian numbers only
        if cleaned.startswith("91") and len(cleaned) != 12:
            raise ValueError(f"Invalid normalized phone number length: {cleaned} (should be 12 digits for Indian numbers)")
        
        # Log normalization for debugging
        if phone != cleaned:
            print(f" Phone normalized: {phone}  {cleaned}")
        
        return cleaned

    def verify_phone_format(self, phone: str) -> Dict[str, Any]:
        """
        Verify phone number format and provide detailed validation results.
        
        This method should be called before sending messages to ensure
        phone number consistency and prevent delivery failures.
        
        Args:
            phone: Phone number to verify
            
        Returns:
            Dict containing verification results:
            {
                "is_valid": bool,
                "normalized": str,
                "country_code": str,
                "mobile_number": str,
                "format_source": str,
                "warnings": List[str],
                "errors": List[str]
            }
        """
        result = {
            "is_valid": False,
            "normalized": "",
            "country_code": "",
            "mobile_number": "",
            "format_source": "unknown",
            "warnings": [],
            "errors": []
        }
        
        try:
            # Attempt normalization
            normalized = self.clean_phone(phone)
            result["normalized"] = normalized
            result["is_valid"] = True
            
            # Extract country code and mobile number
            if normalized.startswith("91") and len(normalized) == 12:
                result["country_code"] = "91"
                result["mobile_number"] = normalized[2:]
                result["format_source"] = "indian_mobile"
                
                # Additional validation for Indian mobile numbers
                mobile_part = result["mobile_number"]
                if mobile_part[0] not in "6789":
                    result["warnings"].append(f"Unusual Indian mobile number prefix: {mobile_part[0]} (expected 6, 7, 8, or 9)")
                
                # Check for common invalid patterns
                if len(set(mobile_part)) == 1:  # All same digits
                    result["warnings"].append("Phone number contains all identical digits - may be invalid")
                elif mobile_part in ["1234567890", "0123456789", "9876543210"]:
                    result["warnings"].append("Phone number appears to be a test/dummy number")
                    
            else:
                # Other country codes
                if len(normalized) >= 10:
                    # Try to extract country code (1-3 digits)
                    for cc_length in [1, 2, 3]:
                        if len(normalized) >= 10 + cc_length:
                            potential_cc = normalized[:cc_length]
                            potential_mobile = normalized[cc_length:]
                            if len(potential_mobile) >= 10:
                                result["country_code"] = potential_cc
                                result["mobile_number"] = potential_mobile
                                result["format_source"] = "international"
                                break
                
                if not result["country_code"]:
                    result["warnings"].append("Could not determine country code")
                    
        except ValueError as e:
            result["is_valid"] = False
            result["errors"].append(str(e))
            
        return result

    def validate_phone_for_storage(self, phone: str) -> str:
        """
        Validate and normalize phone number for consistent storage.
        
        This ensures phone numbers are stored in the same format used
        for WhatsApp delivery to prevent lookup failures.
        
        Args:
            phone: Raw phone number
            
        Returns:
            str: Normalized phone number safe for storage
            
        Raises:
            ValueError: If phone number is invalid
        """
        verification = self.verify_phone_format(phone)
        
        if not verification["is_valid"]:
            error_msg = "Invalid phone number"
            if verification["errors"]:
                error_msg += f": {'; '.join(verification['errors'])}"
            raise ValueError(error_msg)
        
        # Log warnings but don't fail
        for warning in verification["warnings"]:
            print(f" Phone validation warning: {warning}")
        
        return verification["normalized"]

    async def validate_unique_phone_storage(self, phone: str, organization_id: str, customer_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Validate phone number uniqueness for storage to prevent duplicate entries.
        
        This ensures phone numbers are stored uniquely per organization to prevent
        incorrect recipient targeting and lookup failures.
        
        Args:
            phone: Phone number to validate
            organization_id: Organization ID for scoping
            customer_id: Optional existing customer ID (for updates)
            
        Returns:
            Dict containing validation results:
            {
                "is_unique": bool,
                "normalized_phone": str,
                "existing_customer": Optional[Dict],
                "can_store": bool,
                "warnings": List[str]
            }
        """
        result = {
            "is_unique": True,
            "normalized_phone": "",
            "existing_customer": None,
            "can_store": True,
            "warnings": []
        }
        
        try:
            # Normalize phone number first
            normalized = self.validate_phone_for_storage(phone)
            result["normalized_phone"] = normalized
            
            # TODO: Implement database check for uniqueness
            # This is a placeholder for actual database integration
            # In a real implementation, this would query the customers collection
            
            # Example implementation:
            # from database import get_database
            # db = get_database()
            # existing = await db.customers.find_one({
            #     "phone": normalized,
            #     "organization_id": organization_id,
            #     "_id": {"$ne": ObjectId(customer_id)} if customer_id else {}
            # })
            # 
            # if existing:
            #     result["is_unique"] = False
            #     result["existing_customer"] = existing
            #     result["can_store"] = False
            #     result["warnings"].append(f"Phone number {normalized} already exists for customer {existing.get('name', 'Unknown')}")
            
            print(f" Phone uniqueness check: {phone}  {normalized} (organization: {organization_id})")
            print(f"   Unique: {result['is_unique']} | Can store: {result['can_store']}")
            
        except ValueError as e:
            result["can_store"] = False
            result["warnings"].append(f"Phone validation failed: {e}")
            
        return result

    async def check_customer_service_window(self, phone: str) -> bool:
        """
        Check if customer service window is open for this phone number.
        
        EMERGENCY FIX: Basic implementation - in production this should
        check actual conversation history from database.
        """
        # TODO: Implement proper customer service window checking
       
        print(f" Customer service window check not implemented for {phone}")
        print(f"   Assuming window is CLOSED - only UTILITY templates will work")
        return False

    def _classify_error(self, error_response: dict) -> Dict[str, Any]:
        """Classify WhatsApp API error and determine if it's retryable."""
        error_data = error_response.get("error", {})
        error_code = error_data.get("code")
        error_message = error_data.get("message", "")

        classification = {
            "code": error_code,
            "message": error_message,
            "is_window_restriction": error_code in self.ERROR_CODE_WINDOW_RESTRICTION,
            "is_invalid_template": error_code in self.ERROR_CODE_INVALID_TEMPLATE,
            "is_rate_limit": error_code in self.ERROR_CODE_RATE_LIMIT,
            "is_business_eligibility": error_code in self.ERROR_CODE_BUSINESS_ELIGIBILITY,
            "is_retryable": False
        }

        # Determine if error is retryable
        # Retry on rate limits and transient failures, but NOT on permanent failures
        if error_code in self.ERROR_CODE_RATE_LIMIT:
            classification["is_retryable"] = True
        elif error_code in self.ERROR_CODE_WINDOW_RESTRICTION:
            classification["is_retryable"] = False  # Permanent failure
        elif error_code in self.ERROR_CODE_INVALID_TEMPLATE:
            classification["is_retryable"] = False  # Permanent failure
        elif error_code in self.ERROR_CODE_BUSINESS_ELIGIBILITY:
            classification["is_retryable"] = False  # Permanent failure - payment/billing issue

        return classification

    async def get_template_info(self, template_name: str, language_code: str = "en_US") -> Optional[Dict[str, Any]]:
        """
        Query Meta Business Manager API for actual template categories and approval status.
        
        This method replaces name-pattern based validation with real Meta API verification
        to fix the bug where templates are assumed UTILITY without Meta confirmation.
        
        Args:
            template_name: Name of the template to query
            language_code: Language code for the template (default: en_US)
            
        Returns:
            Dict containing template info from Meta API, or None if not found/error
            
        Raises:
            Exception: If Meta API call fails and no cached data available
        """
        try:
            # First check cache/database for recent verification
            cached_template = await self._get_cached_template_info(template_name, language_code)
            if cached_template and not cached_template.needs_verification(self.TEMPLATE_CACHE_TTL_HOURS):
                logging.info(f"Using cached template info for {template_name} (age: {cached_template.last_verified})")
                return self._template_model_to_dict(cached_template)
            
            # Query Meta Business Manager API
            meta_info = await self._query_meta_templates_api(template_name, language_code)
            
            if meta_info:
                # Store/update in database cache
                await self._cache_template_info(template_name, language_code, meta_info)
                logging.info(f"Retrieved and cached template info for {template_name} from Meta API")
                return meta_info
            else:
                # Template not found in Meta API
                logging.warning(f"Template {template_name} not found in Meta Business Manager")
                
                # Return cached data if available, even if stale
                if cached_template:
                    logging.info(f"Falling back to stale cached data for {template_name}")
                    return self._template_model_to_dict(cached_template)
                
                return None
                
        except Exception as e:
            logging.error(f"Error querying template info for {template_name}: {e}")
            
            # Fallback to cached data if Meta API fails
            try:
                cached_template = await self._get_cached_template_info(template_name, language_code)
                if cached_template:
                    logging.info(f"Meta API failed, using cached fallback for {template_name}")
                    return self._template_model_to_dict(cached_template)
            except Exception as cache_error:
                logging.error(f"Cache fallback also failed for {template_name}: {cache_error}")
            
            # If no cache available, re-raise the original error
            raise Exception(f"Failed to get template info for {template_name}: {e}")

    async def _query_meta_templates_api(self, template_name: str, language_code: str) -> Optional[Dict[str, Any]]:
        """
        Query Meta Graph API for template information.
        
        Args:
            template_name: Template name to query
            language_code: Language code for the template
            
        Returns:
            Dict with template info from Meta API, or None if not found
        """
        if not self.access_token:
            raise ValueError("WhatsApp access token not configured for Meta API queries")
        
        # Use WhatsApp Business Account ID (WABA ID) to query templates
        # The phone_number_id is typically in format: {WABA_ID}_{PHONE_NUMBER}
        # For template queries, we need the WABA ID
        waba_id = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
        if not waba_id:
            # Try to extract from phone_number_id if WABA ID not set
            if "_" in self.phone_number_id:
                waba_id = self.phone_number_id.split("_")[0]
            else:
                # Fallback: use phone_number_id directly (some setups use WABA ID as phone_number_id)
                waba_id = self.phone_number_id
        
        # FIXED: Use correct Meta Graph API endpoint for message templates
        url = f"{self.base_url}/{waba_id}/message_templates"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Query parameters to filter by template name and language
        params = {
            "name": template_name,
            "language": language_code,
            "fields": "name,status,category,components,language,quality_score,id"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                
                data = response.json()
                templates = data.get("data", [])
                
                # Find exact match for template name and language
                for template in templates:
                    if (template.get("name") == template_name and 
                        template.get("language") == language_code):
                        
                        # Normalize the response format
                        return {
                            "template_id": template.get("id"),
                            "template_name": template.get("name"),
                            "language_code": template.get("language"),
                            "status": template.get("status", "").lower(),
                            "category": template.get("category", "").upper(),
                            "quality_score": template.get("quality_score"),
                            "components": template.get("components", []),
                            "meta_category": template.get("category", "").upper(),
                            "approval_status": template.get("status", "").upper(),
                            "last_verified": datetime.now(timezone.utc)
                        }
                
                # Template not found in results
                return None
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    logging.warning(f"Template {template_name} not found in Meta Business Manager")
                    return None
                else:
                    error_detail = e.response.json() if e.response.content else {"error": {"message": str(e)}}
                    raise Exception(f"Meta API error: {json.dumps(error_detail)}")
            except Exception as e:
                raise Exception(f"Failed to query Meta templates API: {e}")

    @staticmethod
    def _normalize_template_record(template: Dict[str, Any], language_code: Optional[str] = None) -> Dict[str, Any]:
        """Normalize a Meta API template payload into a consistent internal format."""
        name = (template.get("name") or template.get("template_name") or "").strip()
        language = (template.get("language") or template.get("language_code") or language_code or "en_US").strip()
        category = (template.get("category") or template.get("meta_category") or "").upper()
        status = (template.get("status") or template.get("approval_status") or "").upper()
        is_approved = status == "APPROVED"
        return {
            "template_id": template.get("id") or template.get("template_id"),
            "template_name": name,
            "language_code": language,
            "status": status.lower() if status else "unknown",
            "category": category,
            "meta_category": category,
            "approval_status": status,
            "quality_score": template.get("quality_score"),
            "components": template.get("components", []),
            "last_verified": datetime.now(timezone.utc),
            "can_send_outside_window": is_approved and category == "UTILITY",
        }

    async def list_all_templates(self, approved_only: bool = False, language_code: Optional[str] = None) -> List[Dict[str, Any]]:
        """List templates from Meta Business Manager, optionally filtered to approved ones.

        This is useful when you need the full set of Meta-approved templates to compare with
        the templates configured in your app or to add the correct names into Meta/ENV config.
        """
        if not self.access_token:
            raise ValueError("WhatsApp access token not configured for Meta API queries")

        waba_id = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
        if not waba_id:
            if "_" in self.phone_number_id:
                waba_id = self.phone_number_id.split("_")[0]
            else:
                waba_id = self.phone_number_id

        if not waba_id:
            raise ValueError("WHATSAPP_BUSINESS_ACCOUNT_ID is required to query Meta template catalog")

        url = f"{self.base_url}/{waba_id}/message_templates"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        params = {"fields": "id,name,status,category,language,quality_score,components"}
        if language_code:
            params["language"] = language_code

        all_templates: List[Dict[str, Any]] = []
        request_url = url
        request_params = params

        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                response = await client.get(request_url, headers=headers, params=request_params)
                response.raise_for_status()
                payload = response.json()
                for template in payload.get("data", []):
                    normalized = self._normalize_template_record(template, language_code=language_code)
                    if approved_only and normalized["approval_status"] != "APPROVED":
                        continue
                    all_templates.append(normalized)

                paging = payload.get("paging", {})
                next_url = paging.get("next") if isinstance(paging, dict) else None
                if not next_url:
                    break
                request_url = next_url
                request_params = None

        all_templates.sort(key=lambda item: (item["template_name"], item["language_code"]))
        return all_templates

    async def get_all_templates(self, approved_only: bool = False, language_code: Optional[str] = None) -> List[Dict[str, Any]]:
        """Compatibility wrapper for template catalog queries."""
        return await self.list_all_templates(approved_only=approved_only, language_code=language_code)

    async def list_approved_templates(self, language_code: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return all approved Meta templates, with any marketing templates excluded."""
        return await self.list_all_templates(approved_only=True, language_code=language_code)

    async def get_all_template_names(self, approved_only: bool = False, language_code: Optional[str] = None) -> List[str]:
        """Return template names only."""
        templates = await self.list_all_templates(approved_only=approved_only, language_code=language_code)
        return [template["template_name"] for template in templates]

    async def _get_cached_template_info(self, template_name: str, language_code: str) -> Optional[WhatsAppTemplate]:
        """
        Get cached template information from database.
        
        Args:
            template_name: Template name to look up
            language_code: Language code for the template
             
        Returns:
            WhatsAppTemplate model if found, None otherwise
        """
        try:
            # This is a placeholder for database integration
            # In a real implementation, this would query MongoDB/database
            # For now, we'll return None to force Meta API queries
             
            # TODO: Implement actual database query
            # Example:
            # from database import get_database
            # db = get_database()
            # template_doc = await db.whatsapp_templates.find_one({
            #     "template_name": template_name,
            #     "language_code": language_code
            # })
            # if template_doc:
            #     return WhatsAppTemplate(**template_doc)
             
            logging.debug(f"Cache lookup for {template_name} (language: {language_code}) - not implemented")
            return None
            
        except Exception as e:
            logging.error(f"Error querying template cache for {template_name}: {e}")
            return None

    async def _cache_template_info(self, template_name: str, language_code: str, meta_info: Dict[str, Any]) -> None:
        """
        Store template information in database cache.
        
        Args:
            template_name: Template name
            language_code: Language code
            meta_info: Template info from Meta API to cache
        """
        try:
            # Create WhatsAppTemplate model from Meta API response
            template_data = {
                "template_name": template_name,
                "language_code": language_code,
                "status": meta_info.get("status", "unknown"),
                "category": meta_info.get("category"),
                "meta_category": meta_info.get("meta_category"),
                "approval_status": meta_info.get("approval_status"),
                "quality_score": meta_info.get("quality_score"),
                "components": meta_info.get("components", []),
                "template_id": meta_info.get("template_id", ""),
                "last_verified": meta_info.get("last_verified", datetime.now(timezone.utc)),
                "updated_at": datetime.now(timezone.utc)
            }
            
            template = WhatsAppTemplate(**template_data)
            
            # TODO: Implement actual database storage
            # Example:
            # from database import get_database
            # db = get_database()
            # await db.whatsapp_templates.replace_one(
            #     {"template_name": template_name, "language_code": language_code},
            #     template.model_dump(),
            #     upsert=True
            # )
            
            logging.info(f"Template info cached for {template_name} (category: {template.meta_category})")
            
        except Exception as e:
            logging.error(f"Error caching template info for {template_name}: {e}")
            # Don't raise - caching failure shouldn't break the main flow

    def _template_model_to_dict(self, template: WhatsAppTemplate) -> Dict[str, Any]:
        """
        Convert WhatsAppTemplate model to dictionary format.
        
        Args:
            template: WhatsAppTemplate model instance
            
        Returns:
            Dict representation of template info
        """
        return {
            "template_id": template.template_id,
            "template_name": template.template_name,
            "language_code": template.language_code,
            "status": template.status,
            "category": template.category,
            "meta_category": template.meta_category,
            "approval_status": template.approval_status,
            "quality_score": template.quality_score,
            "components": template.components,
            "last_verified": template.last_verified,
            "can_send_outside_window": template.can_send_outside_window()
        }

    async def validate_template_category(self, template_name: str, language_code: str = "en_US") -> Dict[str, Any]:
        """
        Validate template category using Meta API with fallback to cached data.
        
        This method replaces the _is_utility_template() name-pattern validation
        with actual Meta Business Manager API verification.
        
        Args:
            template_name: Template name to validate
            language_code: Language code for the template
            
        Returns:
            Dict with validation results:
            {
                "is_utility": bool,
                "can_send_outside_window": bool,
                "category": str,
                "status": str,
                "source": str  # "meta_api", "cache", or "fallback"
            }
        """
        try:
            # Get template info from Meta API or cache
            template_info = await self.get_template_info(template_name, language_code)
            
            if template_info:
                is_utility = (
                    template_info.get("meta_category") == "UTILITY" and
                    template_info.get("approval_status") == "APPROVED"
                )
                
                return {
                    "is_utility": is_utility,
                    "can_send_outside_window": is_utility,
                    "category": template_info.get("meta_category", "UNKNOWN"),
                    "status": template_info.get("approval_status", "UNKNOWN"),
                    "quality_score": template_info.get("quality_score"),
                    "source": "meta_api" if template_info.get("last_verified") else "cache",
                    "last_verified": template_info.get("last_verified")
                }
            else:
                # Fallback to name-pattern validation with warning
                logging.warning(f"No Meta API data for {template_name}, falling back to name patterns")
                is_utility_fallback = self._is_utility_template(template_name)
                
                return {
                    "is_utility": is_utility_fallback,
                    "can_send_outside_window": is_utility_fallback,
                    "category": "UTILITY" if is_utility_fallback else "UNKNOWN",
                    "status": "UNKNOWN",
                    "quality_score": None,
                    "source": "fallback",
                    "last_verified": None,
                    "warning": "Using name-pattern fallback - Meta API verification failed"
                }
                
        except Exception as e:
            logging.error(f"Template validation failed for {template_name}: {e}")
            
            # Emergency fallback to name patterns
            is_utility_fallback = self._is_utility_template(template_name)
            
            return {
                "is_utility": is_utility_fallback,
                "can_send_outside_window": is_utility_fallback,
                "category": "UTILITY" if is_utility_fallback else "UNKNOWN",
                "status": "ERROR",
                "quality_score": None,
                "source": "emergency_fallback",
                "last_verified": None,
                "error": str(e)
            }

    async def _post(self, payload: dict) -> dict:
        """Execute POST to WhatsApp Cloud API."""
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as e:
                detail = e.response.json() if e.response.content else {"error": {"message": str(e)}}
                raise Exception(f"WhatsApp API error: {json.dumps(detail)}")

    async def send_text_message(self, to_phone: str, message: str) -> Dict[str, Any]:
        """Send a plain text message with enhanced phone number validation."""
        if not self.is_configured():
            raise ValueError("WhatsApp Cloud API not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.")

        # Enhanced phone number validation
        verification = self.verify_phone_format(to_phone)
        if not verification["is_valid"]:
            error_msg = f"Invalid phone number format: {to_phone}"
            if verification["errors"]:
                error_msg += f" - {'; '.join(verification['errors'])}"
            raise ValueError(error_msg)
        
        phone = verification["normalized"]
        
        # Log validation results
        if verification["warnings"]:
            for warning in verification["warnings"]:
                print(f" Phone validation warning for {to_phone}: {warning}")
        
        print(f" Phone validation passed: {to_phone}  {phone} (source: {verification['format_source']})")

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "text",
            "text": {"preview_url": False, "body": message}
        }
        result = await self._post(payload)
        msg_id = result.get("messages", [{}])[0].get("id", "")
        print(f" WA sent | to={phone} | msg_id={msg_id}")
        return result

    async def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        params: list,
        language: str = "en_US",
        button_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send a template message with enhanced phone number validation (required for business-initiated messaging)."""
        if not self.is_configured():
            raise ValueError("WhatsApp Cloud API not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.")

        # Enhanced phone number validation
        verification = self.verify_phone_format(to_phone)
        if not verification["is_valid"]:
            error_msg = f"Invalid phone number format: {to_phone}"
            if verification["errors"]:
                error_msg += f" - {'; '.join(verification['errors'])}"
            raise ValueError(error_msg)
        
        phone = verification["normalized"]
        
        # Log validation results
        if verification["warnings"]:
            for warning in verification["warnings"]:
                print(f" Phone validation warning for {to_phone}: {warning}")
        
        print(f" Phone validation passed: {to_phone}  {phone} (source: {verification['format_source']})")

        # ENHANCED FIX: Use Meta API validation instead of name patterns
        validation_result = await self.validate_template_category(template_name, language)
        is_utility = validation_result["is_utility"]
        can_send_outside_window = validation_result["can_send_outside_window"]
        template_category = validation_result["category"]
        template_status = validation_result["status"]
        validation_source = validation_result["source"]

        # Check customer service window status
        window_open = await self.check_customer_service_window(phone)

        # Enhanced logging with Meta API validation results
        print(f" WA template prep | to={phone} | template={template_name} | params_count={len(params)} | params={params}")
        print(f" Customer service window open: {window_open}")
        print(f" Template category: {template_category} (status: {template_status})")
        print(f" Validation source: {validation_source}")
        print(f" Can send outside window: {can_send_outside_window}")
        
        # Enhanced validation with specific error messages
        if not window_open and not can_send_outside_window:
            error_msg = f"Template '{template_name}' cannot be sent outside 24-hour window"
            if validation_source == "meta_api":
                error_msg += f" (Meta category: {template_category}, status: {template_status})"
            elif validation_source == "fallback":
                error_msg += " (Meta API verification failed, using name-pattern fallback)"
            elif validation_source == "emergency_fallback":
                error_msg += f" (Emergency fallback due to error: {validation_result.get('error', 'unknown')})"
            
            print(f" CRITICAL: {error_msg}")
            print(f"   This will likely fail with 131047/131026 error")
            print(f"   Solutions:")
            print(f"   1. Wait for customer to message first (opens 24h window)")
            print(f"   2. Use a verified UTILITY template")
            print(f"   3. Check template category in Meta Business Manager")
        elif window_open:
            print(f" Customer service window is open - any approved template should work")
        elif can_send_outside_window:
            print(f" Template is verified UTILITY category - should work outside 24h window")
        
        # Warning for fallback validation
        if validation_source in ["fallback", "emergency_fallback"]:
            print(f" WARNING: Using {validation_source} validation for template '{template_name}'")
            print(f"   Meta API verification failed - results may be inaccurate")
            print(f"   Check Meta Business Manager for actual template category")
            if "warning" in validation_result:
                print(f"   {validation_result['warning']}")
            if "error" in validation_result:
                print(f"   Error: {validation_result['error']}")

        # Legacy warning (kept for backward compatibility)
        if not is_utility:
            print(f" WARNING: Template '{template_name}' is not UTILITY category!")
            print(f"   Category: {template_category} | Status: {template_status}")
            print(f"   Only UTILITY templates work outside 24h window. MARKETING templates require 24h.")
            print(f"   Check Meta Business Manager: Template must be category=UTILITY and status=APPROVED")
        else:
            print(f" Template '{template_name}' is verified UTILITY category - should work outside 24h window")

        components = [{
            "type": "body",
            "parameters": [{"type": "text", "text": str(p)} for p in params]
        }]
        if button_url:
            components.append({
                "type": "button",
                "sub_type": "url",
                "index": "0",
                "parameters": [{"type": "text", "text": str(button_url)}]
            })

        template_obj = {
            "name": template_name,
            "language": {"code": language},
            "components": components
        }

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "template",
            "template": template_obj
        }

        print(f" Payload: {json.dumps(payload, indent=2)}")

        last_error = None
        for attempt in range(self.MAX_RETRY_ATTEMPTS):
            try:
                result = await self._post(payload)
                msg_id = result.get("messages", [{}])[0].get("id", "")
                print(f" WA template sent | to={phone} | template={template_name} | params={len(params)} | msg_id={msg_id}")
                return result

            except Exception as e:
                error_msg = str(e)
                last_error = e

                error_response = {}
                try:
                    if "WhatsApp API error:" in error_msg:
                        json_str = error_msg.replace("WhatsApp API error:", "").strip()
                        error_response = json.loads(json_str)
                except Exception:
                    pass

                classification = self._classify_error(error_response)
                error_code = classification.get("code")
                is_retryable = classification.get("is_retryable")

                print(
                    f" WA template failed | to={phone} | template={template_name} | "
                    f"error_code={error_code} | attempt={attempt + 1}/{self.MAX_RETRY_ATTEMPTS} | "
                    f"retryable={is_retryable} | error={error_msg}"
                )

                if error_code in {131047, 131026}:
                    print("\n" + "=" * 60)
                    print(" 24-HOUR MESSAGING WINDOW RESTRICTION (Error 131047/131026)")
                    print("=" * 60)
                    print(f"Template: {template_name}")
                    print(f"Parameters Sent: {len(params)}  {params}")
                    print(f"Meta API Validation:")
                    print(f"  - Category: {template_category}")
                    print(f"  - Status: {template_status}")
                    print(f"  - Can send outside window: {can_send_outside_window}")
                    print(f"  - Validation source: {validation_source}")
                    if validation_source in ["fallback", "emergency_fallback"]:
                        print(f"  -  Meta API verification failed - using fallback validation")
                    print("\n ROOT CAUSE ANALYSIS:")
                    if template_category == "MARKETING":
                        print("- Template is classified as MARKETING by Meta (not UTILITY)")
                        print("- MARKETING templates require 24-hour customer service window")
                    elif template_category == "UNKNOWN":
                        print("- Template category could not be verified via Meta API")
                        print("- Template may not exist or may not be approved")
                    else:
                        print("- Template validation failed despite appearing to be UTILITY")
                        print("- Check Meta Business Manager for actual approval status")
                    print("- Customer must message you first to open the window")
                    print("\n IMMEDIATE SOLUTIONS:")
                    print("- Use only verified UTILITY templates (check Meta Business Manager)")
                    print("- Verify template is APPROVED status in Meta Business Manager")
                    print("- Wait for customer to message you first, then respond within 24 hours")
                    print("- Check template content - mixed utility+marketing content gets classified as MARKETING")
                    if validation_source in ["fallback", "emergency_fallback"]:
                        print("- Fix Meta API integration to get accurate template validation")
                    print("=" * 60 + "\n")
                    
                    # Don't retry 24-hour window errors - they won't succeed
                    break
                elif error_code in {131031, 132001}:
                    print("\n" + "=" * 60)
                    print(" INVALID TEMPLATE NAME / LANGUAGE (Error 131031/132001)")
                    print("=" * 60)
                    print(f"Template: '{template_name}' not found in the requested language or not approved")
                    print(" SOLUTIONS:")
                    print("1. Check exact template name in Meta Business Manager")
                    print("2. Ensure template is APPROVED and available in the requested language")
                    print("3. Check the language code matches the template translation exactly")
                    print("=" * 60 + "\n")
                elif error_code == 131042:
                    print("\n" + "=" * 60)
                    print(" BUSINESS ELIGIBILITY PAYMENT ISSUE (Error 131042)")
                    print("=" * 60)
                    print(f"WhatsApp Business Account has payment/billing issues")
                    print(" CRITICAL SOLUTIONS:")
                    print("1. Check Meta Business Manager for payment method issues")
                    print("2. Verify WhatsApp Business Account (WABA) is in good standing")
                    print("3. Check if there are outstanding payments or billing issues")
                    print("4. Contact Meta Business Support if payment method is valid")
                    print("5. Verify WABA has not been suspended or restricted")
                    print(" This is a Meta account-level issue, not a template or code issue")
                    print("=" * 60 + "\n")
                    
                    # Don't retry business eligibility errors - they won't succeed until account is fixed
                    break

                if not is_retryable:
                    print(f" Permanent failure detected (error_code={error_code}), not retrying")
                    raise

                if attempt < self.MAX_RETRY_ATTEMPTS - 1:
                    delay = self.RETRY_DELAYS[attempt]
                    print(f" Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                else:
                    print(f" Max retries ({self.MAX_RETRY_ATTEMPTS}) reached, giving up")
                    raise

        if last_error:
            raise last_error
        raise Exception("Unknown error in send_template_message")

    async def send_receipt(
        self,
        to_phone: str,
        order: Dict[str, Any],
        business: Dict[str, Any],
        receipt_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send receipt using Meta API validated template."""
        # ENHANCED FIX: Use Meta API validation instead of name patterns
        template_name = await self.get_bill_template_name_validated()
        
        if not template_name:
            raise ValueError("WhatsApp bill template not configured.")

        currency = business.get("currency", "INR")
        customer_name = (order.get("customer_name") or "Customer")
        invoice_number = order.get("invoice_number")
        order_id = str(invoice_number or order.get("id", ""))[:8].upper()
        total = order.get("total", 0)
        amount = f"{currency} {total:.2f}"
        body_params = [customer_name, order_id, amount]
        if receipt_url and self.template_bill_uses_receipt_url:
            body_params.append(receipt_url)

        print(f" ENHANCED FIX: Using Meta API validated template '{template_name}' for receipt to {to_phone}")
        
        return await self.send_template_message(
            to_phone,
            template_name,
            body_params,
            self.template_lang,
            button_url=receipt_url if receipt_url and self.template_bill_use_url_button else None
        )

    async def send_order_status(
        self,
        to_phone: str,
        order_id: str,
        status: str,
        restaurant_name: str,
        tracking_url: Optional[str] = None,
        amount: str = "",
        customer_name: str = ""
    ) -> Dict[str, Any]:
        """Send order status update via Meta API validated template."""
        template_name = self.get_status_template_name(status)
        if not template_name:
            raise ValueError(f"WhatsApp status template not configured for status '{status}'.")

        try:
            # ENHANCED FIX: Use Meta API validation for status templates
            validation_result = await self.validate_template_category(template_name, self.template_lang)
            is_utility = validation_result["is_utility"]
            template_category = validation_result["category"]
            validation_source = validation_result["source"]
            
            print(f" Status template validation: {template_name} (status: {status})")
            print(f"   Category: {template_category} | Source: {validation_source}")
            print(f"   Can send outside window: {is_utility}")
            
            if not is_utility:
                print(f" WARNING: Status template '{template_name}' for status '{status}' is not UTILITY")
                print(f"   Category: {template_category} (Meta validation: {validation_source})")
                print(f"   This may fail outside 24-hour customer service window")
                # Don't auto-replace status templates as they have specific meanings
                # Just warn and proceed - user should fix template configuration
                
        except Exception as e:
            print(f" Meta API validation failed for status template '{template_name}': {e}")
            print(f"   Falling back to name-pattern validation")
            
            # Fallback to original logic
            if not self._is_utility_template(template_name):
                print(f" WARNING: Status template '{template_name}' for status '{status}' is risky (name-pattern check)")
                print(f"   This may fail outside 24-hour customer service window")

        oid = str(order_id)[:8].upper()
        name = restaurant_name or "Restaurant"

        params = [name, oid]
        if amount:
            params.append(amount)

        print(f" Sending order status '{status}' using template '{template_name}' to {to_phone}")

        return await self.send_template_message(
            to_phone,
            template_name,
            params,
            self.template_lang
        )

    async def send_otp(self, to_phone: str, otp: str, restaurant_name: str = "BillByteKOT") -> Dict[str, Any]:
        """Send OTP verification message."""
        msg = f" *{restaurant_name}*\n\nYour verification code is:\n\n*{otp}*\n\nValid for 5 minutes. Do not share this code.\n\n_Powered by BillByteKOT_"
        return await self.send_text_message(to_phone, msg)


whatsapp_api = WhatsAppCloudAPI()


async def send_whatsapp_receipt(
    phone: str,
    order: Dict[str, Any],
    business: Dict[str, Any],
    receipt_url: Optional[str] = None
) -> Dict[str, Any]:
    """Send receipt via WhatsApp Cloud API."""
    print(f" EMERGENCY DEBUG: send_whatsapp_receipt called for phone {phone}")
    print(f"   Order ID: {order.get('id', 'unknown')}")
    print(f"   Receipt URL: {receipt_url}")
    
    try:
        result = await whatsapp_api.send_receipt(phone, order, business, receipt_url=receipt_url)
        print(f" EMERGENCY DEBUG: send_receipt succeeded for {phone}")
        return result
    except Exception as e:
        print(f" EMERGENCY DEBUG: send_receipt failed for {phone}: {e}")
        
        # Check if it's a 24-hour window error
        error_str = str(e)
        if "131047" in error_str or "131026" in error_str:
            print(f" EMERGENCY DEBUG: 24-hour window error detected for {phone}")
            print(f"   Error: {error_str}")
            print(f"   This confirms the template category issue")
        
        raise


async def send_whatsapp_status(
    phone: str,
    order_id: str,
    status: str,
    restaurant_name: str,
    tracking_url: Optional[str] = None,
    amount: str = ""
) -> Dict[str, Any]:
    """Send order status update via WhatsApp Cloud API."""
    return await whatsapp_api.send_order_status(
        phone,
        order_id,
        status,
        restaurant_name,
        tracking_url,
        amount=amount
    )


async def send_whatsapp_otp(phone: str, otp: str, restaurant_name: str = "BillByteKOT") -> Dict[str, Any]:
    """Send OTP via WhatsApp Cloud API."""
    return await whatsapp_api.send_otp(phone, otp, restaurant_name)


async def test_whatsapp_connection() -> Dict[str, Any]:
    """Test WhatsApp Cloud API connectivity."""
    if not whatsapp_api.is_configured():
        return {"success": False, "configured": False, "error": "Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN"}

    test_phone = os.getenv("WHATSAPP_TEST_PHONE", "").strip()
    if not test_phone:
        return {"success": False, "configured": True, "error": "Set WHATSAPP_TEST_PHONE to run connection test"}

    try:
        result = await whatsapp_api.send_text_message(test_phone, " WhatsApp Cloud API connection test successful!")
        return {
            "success": True,
            "configured": True,
            "message_id": result.get("messages", [{}])[0].get("id"),
            "phone_number_id": whatsapp_api.phone_number_id
        }
    except Exception as e:
        return {"success": False, "configured": True, "error": str(e)}

