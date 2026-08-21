#!/usr/bin/env python3
"""
WhatsApp Fix Verification Script

Run this after deployment to verify the emergency fix is working correctly.
"""

import os
import sys
sys.path.append(os.path.dirname(__file__))

def verify_fix():
    """Verify the WhatsApp emergency fix is working."""
    
    print("🔍 VERIFYING WHATSAPP EMERGENCY FIX")
    print("=" * 50)
    
    try:
        from whatsapp_cloud_api import WhatsAppCloudAPI
        
        # Test with minimal config
        os.environ.setdefault('WHATSAPP_PHONE_NUMBER_ID', 'test')
        os.environ.setdefault('WHATSAPP_ACCESS_TOKEN', 'test')
        
        api = WhatsAppCloudAPI()
        
        print("✅ WhatsApp API initialized successfully")
        
        # Check template configuration
        print("\n📋 Template Configuration:")
        
        bill_template = api.get_bill_template_name()
        print(f"  Bill template: {bill_template}")
        
        if bill_template == "payment_receipt_with_invoice_link":
            print("  ✅ Using approved payment_receipt_with_invoice_link UTILITY template")
        elif bill_template == "bill_confirmation":
            print("  ❌ Still using risky template - check deployment")
            return False
        else:
            print(f"  ⚠️ Using unknown template: {bill_template}")
        
        # Check template safety
        is_safe = api._is_utility_template(bill_template)
        print(f"  Template safety: {'✅ SAFE' if is_safe else '❌ RISKY'}")
        
        # Check status templates
        print("\n📱 Status Templates:")
        statuses = ['pending', 'preparing', 'ready', 'completed']
        all_safe = True
        
        for status in statuses:
            template = api.get_status_template_name(status)
            if template:
                safe = api._is_utility_template(template)
                status_icon = "✅" if safe else "⚠️"
                print(f"  {status}: {template} {status_icon}")
                if not safe:
                    all_safe = False
        
        # Test problematic phone number
        print("\n📞 Phone Number Processing:")
        test_phone = "8051616835"
        cleaned = api.clean_phone(test_phone)
        print(f"  {test_phone} → {cleaned}")
        
        if cleaned == "918051616835":
            print("  ✅ Phone normalization working correctly")
        else:
            print("  ❌ Phone normalization issue")
            return False
        
        # Overall assessment
        print("\n🎯 OVERALL ASSESSMENT:")
        
        if bill_template == "payment_receipt_with_invoice_link" and is_safe and all_safe:
            print("✅ EMERGENCY FIX IS WORKING CORRECTLY")
            print("   - Safe templates are being used")
            print("   - Phone normalization is correct")
            print("   - 24-hour window errors should be resolved")
            print()
            print("📱 Phone 8051616835 should now receive messages successfully!")
            return True
        else:
            print("❌ EMERGENCY FIX NEEDS ATTENTION")
            print("   - Check environment variables")
            print("   - Restart application")
            print("   - Verify template configuration")
            return False
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   - Check if whatsapp_cloud_api.py is available")
        return False
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

def check_environment():
    """Check environment variable configuration."""
    
    print("\n🔧 ENVIRONMENT VARIABLES:")
    
    whatsapp_vars = [
        'WHATSAPP_PHONE_NUMBER_ID',
        'WHATSAPP_ACCESS_TOKEN', 
        'WHATSAPP_TEMPLATE_BILL_CONFIRMATION',
        'WHATSAPP_TEMPLATE_STATUS_PENDING',
        'WHATSAPP_TEMPLATE_STATUS_PREPARING',
        'WHATSAPP_TEMPLATE_STATUS_READY',
        'WHATSAPP_TEMPLATE_STATUS_COMPLETED'
    ]
    
    for var in whatsapp_vars:
        value = os.getenv(var, 'NOT SET')
        if var == 'WHATSAPP_ACCESS_TOKEN' and value != 'NOT SET':
            value = value[:10] + "..." if len(value) > 10 else value
        print(f"  {var}: {value}")
    
    # Check for emergency overrides
    emergency_overrides = {
        'WHATSAPP_TEMPLATE_BILL_CONFIRMATION': 'payment_receipt_with_invoice_link',
        'WHATSAPP_TEMPLATE_STATUS_PENDING': 'order_preparing'
    }
    
    print("\n🚨 Emergency Override Status:")
    for var, expected in emergency_overrides.items():
        actual = os.getenv(var, 'NOT SET')
        if actual == expected:
            print(f"  ✅ {var}: {actual}")
        else:
            print(f"  ❌ {var}: {actual} (should be {expected})")

if __name__ == "__main__":
    check_environment()
    success = verify_fix()
    
    if success:
        print("\n🎉 VERIFICATION PASSED - WhatsApp fix is working!")
        sys.exit(0)
    else:
        print("\n❌ VERIFICATION FAILED - Fix needs attention")
        sys.exit(1)
