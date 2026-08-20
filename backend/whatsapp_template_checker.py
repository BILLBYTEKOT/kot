#!/usr/bin/env python3
"""
WhatsApp Template Emergency Checker
 
Quick utility to check which templates are safe to use outside 24-hour window.
Run this to identify which templates will work for business-initiated messaging.
"""

import argparse
import asyncio
import os
import sys

sys.path.append(os.path.dirname(__file__))

from whatsapp_cloud_api import WhatsAppCloudAPI


async def list_meta_templates(approved_only: bool = False, language: str = None):
    """Fetch template catalog from Meta Business Manager for review and config setup."""
    api = WhatsAppCloudAPI()
    if not api.is_configured():
        raise SystemExit(
            "Set WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID and WHATSAPP_ACCESS_TOKEN before listing Meta templates."
        )

    templates = await api.list_all_templates(approved_only=approved_only, language_code=language)
    if not templates:
        print("No templates were returned by Meta for the current account.")
        return

    print(f"Found {len(templates)} templates {'(approved only)' if approved_only else ''}")
    print("=" * 80)
    for template in templates:
        print(
            f"{template['template_name']} | "
            f"lang={template['language_code']} | "
            f"status={template['approval_status']} | "
            f"category={template['meta_category']} | "
            f"can_send_outside_window={template['can_send_outside_window']}"
        )


def check_templates():
    """Check all configured templates for UTILITY category compatibility."""
    
    # Set dummy environment variables for testing
    os.environ.setdefault('WHATSAPP_PHONE_NUMBER_ID', 'test')
    os.environ.setdefault('WHATSAPP_ACCESS_TOKEN', 'test')
    
    api = WhatsAppCloudAPI()
    
    # Get all configured templates
    templates_to_check = [
        api.template_bill_confirmation,
        api.template_status_pending,
        api.template_status_preparing, 
        api.template_status_ready,
        api.template_status_completed,
        api.template_status_cancelled
    ]
    
    print("🔍 WHATSAPP TEMPLATE EMERGENCY ANALYSIS")
    print("=" * 50)
    print("Checking which templates are safe for business-initiated messaging...")
    print()
    
    safe_templates = []
    risky_templates = []
    
    for template in templates_to_check:
        if not template:  # Skip empty templates
            continue
            
        is_utility = api._is_utility_template(template)
        
        if is_utility:
            safe_templates.append(template)
            print(f"✅ SAFE: {template}")
            print(f"   Can be used outside 24-hour customer service window")
        else:
            risky_templates.append(template)
            print(f"❌ RISKY: {template}")
            print(f"   May fail outside 24-hour window (likely MARKETING category)")
        print()
    
    print("=" * 50)
    print("📋 SUMMARY:")
    print()
    
    if safe_templates:
        print("✅ SAFE TEMPLATES (use these for business-initiated messaging):")
        for template in safe_templates:
            print(f"   - {template}")
        print()
    
    if risky_templates:
        print("❌ RISKY TEMPLATES (may fail outside 24h window):")
        for template in risky_templates:
            print(f"   - {template}")
        print()
        print("💡 SOLUTIONS for risky templates:")
        print("   1. Wait for customer to message you first (opens 24h window)")
        print("   2. Check Meta Business Manager - template may be MARKETING category")
        print("   3. Use safe templates above for business-initiated messaging")
        print("   4. Remove promotional content from templates to get UTILITY approval")
    
    print("=" * 50)
    print("🚨 EMERGENCY RECOMMENDATIONS:")
    print()
    print("For phone 8051616835 (and similar issues):")
    if safe_templates:
        print(f"   - Use: {safe_templates[0]} (or other safe templates)")
    print("   - Avoid: bill_confirmation (contains marketing content)")
    print("   - Check: Meta Business Manager for actual template categories")
    print()
    print("For immediate fix:")
    print("   - Only use templates marked as SAFE above")
    print("   - Wait for customers to message you first when possible")
    print("   - Monitor logs for 131047/131026 errors")


def parse_args():
    parser = argparse.ArgumentParser(description="Inspect WhatsApp Meta templates and their 24h-window restrictions.")
    parser.add_argument("--all", action="store_true", help="List all Meta templates for the connected business account.")
    parser.add_argument("--approved-only", action="store_true", help="List only approved templates.")
    parser.add_argument("--language", default=None, help="Optional Meta template language (example: en_US).")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.all or args.approved_only:
        try:
            asyncio.run(list_meta_templates(approved_only=args.approved_only, language=args.language))
        except SystemExit as exc:
            print(exc)
            raise
    else:
        check_templates()