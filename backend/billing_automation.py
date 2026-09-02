"""
Billing Automation — WhatsApp Cloud API Integration
Auto-sends invoice/receipt to customer after payment via WhatsApp Cloud API.
No wa.me redirects. Cloud API only.
"""

import os
from typing import Dict, Any, Optional
from datetime import datetime

from whatsapp_cloud_api import whatsapp_api


def _build_receipt_url(order_data: Dict[str, Any]) -> Optional[str]:
    """Build the public receipt link required by the approved receipt template."""
    tracking_token = order_data.get("tracking_token")
    if not tracking_token:
        return None

    site_url = (
        os.getenv("PUBLIC_FRONTEND_URL")
        or os.getenv("FRONTEND_URL")
        or os.getenv("PUBLIC_SITE_URL")
        or "https://billbytekot.in"
    ).rstrip("/")
    return f"{site_url}/receipt/{tracking_token}"


async def send_bill_via_whatsapp(
    tenant_id: str,
    invoice_id: str,
    customer_phone: str,
    order_data: Dict[str, Any],
    business_data: Dict[str, Any],
    db: Any = None
) -> Dict[str, Any]:
    """
    Send invoice/receipt to customer via WhatsApp Cloud API after payment.
    Called automatically on payment completion.
    
    Non-blocking: WhatsApp failures don't block payment verification.
    """
    if not customer_phone:
        return {"success": False, "status": "skipped", "error": "no_phone"}

    if not whatsapp_api.is_configured():
        return {"success": False, "status": "not_configured", "error": "Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN"}

    # Validate and clean phone
    phone = "".join(c for c in customer_phone if c.isdigit())
    if len(phone) == 10:
        phone = "91" + phone
    elif len(phone) == 11 and phone.startswith("0"):
        phone = "91" + phone[1:]

    if len(phone) < 10:
        return {"success": False, "status": "invalid_phone", "error": f"Invalid phone: {customer_phone}"}

    try:
        receipt_url = _build_receipt_url(order_data)
        if not receipt_url:
            return {
                "success": False,
                "status": "missing_receipt_url",
                "error": "Order has no tracking token for the receipt template"
            }

        response = await whatsapp_api.send_receipt(
            phone,
            order_data,
            business_data,
            receipt_url=receipt_url
        )
        message_id = response.get("messages", [{}])[0].get("id", "")

        print(f"✅ WA bill sent | invoice={invoice_id} | to={phone} | msg_id={message_id}")

        # Optionally log to DB (non-blocking, best-effort)
        if db is not None:
            try:
                await db.whatsapp_messages.insert_one({
                    "message_id": message_id,
                    "tenant_id": tenant_id,
                    "invoice_id": invoice_id,
                    "customer_phone": phone,
                    "message_type": "bill_receipt",
                    "status": "sent",
                    "sent_at": datetime.utcnow().isoformat(),
                    "created_at": datetime.utcnow().isoformat()
                })
            except Exception as db_err:
                print(f"⚠️ WA log DB error (non-blocking): {db_err}")

        return {
            "success": True,
            "message_id": message_id,
            "status": "sent",
            "customer_phone": phone,
            "receipt_url": receipt_url
        }

    except Exception as e:
        error_msg = str(e)
        
        # Extract error code if present in error message
        error_code = None
        error_details = {}
        
        try:
            # Try to parse error response from exception message
            if "WhatsApp API error:" in error_msg:
                import json
                json_str = error_msg.replace("WhatsApp API error:", "").strip()
                error_response = json.loads(json_str)
                
                if "error" in error_response:
                    error_data = error_response["error"]
                    error_code = error_data.get("code")
                    error_details = {
                        "code": error_code,
                        "message": error_data.get("message", ""),
                        "type": error_data.get("type", ""),
                        "error_subcode": error_data.get("error_subcode")
                    }
        except:
            # If parsing fails, continue with basic error handling
            pass
        
        # Enhanced error logging with error code
        log_msg = f"❌ WA bill failed | invoice={invoice_id} | to={phone}"
        if error_code:
            log_msg += f" | error_code={error_code}"
        log_msg += f" | error={error_msg}"
        print(log_msg)

        # Log to database with error code (non-blocking, best-effort)
        if db is not None:
            try:
                db_log = {
                    "message_id": None,
                    "tenant_id": tenant_id,
                    "invoice_id": invoice_id,
                    "customer_phone": phone,
                    "message_type": "bill_receipt",
                    "status": "failed",
                    "error": error_msg,
                    "failed_at": datetime.utcnow().isoformat(),
                    "created_at": datetime.utcnow().isoformat()
                }
                
                # Add error code to database log if available
                if error_code:
                    db_log["error_code"] = error_code
                if error_details:
                    db_log["error_details"] = error_details
                
                await db.whatsapp_messages.insert_one(db_log)
            except Exception as db_err:
                print(f"⚠️ WA fail-log DB error (non-blocking): {db_err}")

        # Return detailed error information
        result = {
            "success": False,
            "status": "failed",
            "error": error_msg
        }
        
        # Include error code in response if available
        if error_code:
            result["error_code"] = error_code
        if error_details:
            result["error_details"] = error_details
        
        return result
