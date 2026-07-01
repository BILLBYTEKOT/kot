#!/usr/bin/env python3
"""
BillByteKOT Backend Auth Flow Test Suite
Tests the fixed registration / OTP / auth flow
"""

import asyncio
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional

import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv("/app/backend/.env")

# Configuration
BACKEND_URL = "https://2ac719ef-a87b-4deb-a809-5f7d6fae8101.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "restrobill"

# Test data
TEST_EMAILS = [
    "qa_a@example.com",
    "qa_b@example.com",
    "qa_rl@example.com",
    "bypass_qa@example.com"
]

# ANSI color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"

class TestResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = False
        self.message = ""
        self.details = []
    
    def pass_test(self, message: str = ""):
        self.passed = True
        self.message = message
    
    def fail_test(self, message: str):
        self.passed = False
        self.message = message
    
    def add_detail(self, detail: str):
        self.details.append(detail)
    
    def print_result(self):
        status = f"{GREEN}✅ PASS{RESET}" if self.passed else f"{RED}❌ FAIL{RESET}"
        print(f"\n{BOLD}{self.name}{RESET}: {status}")
        if self.message:
            print(f"  {self.message}")
        for detail in self.details:
            print(f"  {detail}")


class AuthFlowTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.mongo_client = None
        self.db = None
        self.results = []
    
    async def setup(self):
        """Initialize MongoDB connection"""
        try:
            self.mongo_client = AsyncIOMotorClient(MONGO_URL)
            self.db = self.mongo_client[DB_NAME]
            # Test connection
            await self.db.command("ping")
            print(f"{GREEN}✓{RESET} MongoDB connected")
        except Exception as e:
            print(f"{RED}✗{RESET} MongoDB connection failed: {e}")
            raise
    
    async def cleanup(self):
        """Close connections"""
        await self.client.aclose()
        if self.mongo_client:
            self.mongo_client.close()
    
    async def cleanup_test_data(self):
        """Remove test users and OTPs from database"""
        try:
            # Delete test users
            result = await self.db.users.delete_many({
                "email": {"$in": TEST_EMAILS}
            })
            print(f"{BLUE}Cleanup:{RESET} Deleted {result.deleted_count} test users")
            
            # Delete test OTPs
            result = await self.db.registration_otps.delete_many({
                "_id": {"$in": TEST_EMAILS}
            })
            print(f"{BLUE}Cleanup:{RESET} Deleted {result.deleted_count} test OTPs")
        except Exception as e:
            print(f"{YELLOW}Warning:{RESET} Cleanup failed: {e}")
    
    async def get_otp_from_mongo(self, email: str) -> Optional[str]:
        """Fetch OTP from MongoDB"""
        try:
            doc = await self.db.registration_otps.find_one({"_id": email.lower()})
            if doc:
                return doc.get("otp")
            return None
        except Exception as e:
            print(f"{RED}Error fetching OTP:{RESET} {e}")
            return None
    
    async def wait_for_backend(self, max_attempts: int = 10):
        """Wait for backend to be ready"""
        for i in range(max_attempts):
            try:
                response = await self.client.get(f"{API_BASE}/health")
                if response.status_code == 200:
                    print(f"{GREEN}✓{RESET} Backend is ready")
                    return True
            except Exception:
                pass
            if i < max_attempts - 1:
                print(f"Waiting for backend... ({i+1}/{max_attempts})")
                await asyncio.sleep(1)
        print(f"{RED}✗{RESET} Backend not ready after {max_attempts} attempts")
        return False
    
    async def test_1_register_request(self) -> TestResult:
        """Test 1: POST /api/auth/register-request"""
        result = TestResult("Test 1: /api/auth/register-request")
        
        try:
            payload = {
                "username": "qauser_a",
                "email": "qa_a@example.com",
                "password": "QaPass123!",
                "role": "admin"
            }
            
            response = await self.client.post(
                f"{API_BASE}/auth/register-request",
                json=payload
            )
            
            result.add_detail(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                result.fail_test(f"Expected 200, got {response.status_code}")
                result.add_detail(f"Response: {response.text}")
                return result
            
            data = response.json()
            result.add_detail(f"Response: {data}")
            
            # Check required fields
            if not data.get("success"):
                result.fail_test("success field is not True")
                return result
            
            if "message" not in data:
                result.fail_test("Missing 'message' field")
                return result
            
            if data.get("email") != "qa_a@example.com":
                result.fail_test(f"Email mismatch: {data.get('email')}")
                return result
            
            if data.get("expires_in_minutes") != 10:
                result.fail_test(f"expires_in_minutes should be 10, got {data.get('expires_in_minutes')}")
                return result
            
            # SECURITY: Check that OTP is NOT leaked
            if "otp" in data:
                result.fail_test("🚨 SECURITY ISSUE: OTP leaked in response body!")
                return result
            
            if "debug_info" in data:
                result.fail_test("🚨 SECURITY ISSUE: debug_info leaked in response body!")
                return result
            
            # Check OTP is in MongoDB
            await asyncio.sleep(0.5)  # Give it a moment to persist
            otp = await self.get_otp_from_mongo("qa_a@example.com")
            if not otp:
                result.fail_test("OTP not found in MongoDB")
                return result
            
            result.add_detail(f"✓ OTP persisted in MongoDB (length: {len(otp)})")
            result.add_detail("✓ No OTP leak in response")
            result.add_detail("✓ No debug_info leak in response")
            result.pass_test("All checks passed")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def test_2_verify_registration(self) -> TestResult:
        """Test 2: POST /api/auth/verify-registration (auto-login)"""
        result = TestResult("Test 2: /api/auth/verify-registration (auto-login)")
        
        try:
            # Get OTP from MongoDB
            otp = await self.get_otp_from_mongo("qa_a@example.com")
            if not otp:
                result.fail_test("OTP not found in MongoDB (Test 1 must pass first)")
                return result
            
            result.add_detail(f"Retrieved OTP from MongoDB")
            
            payload = {
                "email": "qa_a@example.com",
                "otp": otp
            }
            
            response = await self.client.post(
                f"{API_BASE}/auth/verify-registration",
                json=payload
            )
            
            result.add_detail(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                result.fail_test(f"Expected 200, got {response.status_code}")
                result.add_detail(f"Response: {response.text}")
                return result
            
            data = response.json()
            
            # Check required fields
            if not data.get("success"):
                result.fail_test("success field is not True")
                return result
            
            if "token" not in data or not data["token"]:
                result.fail_test("Missing or empty 'token' field")
                return result
            
            if "user" not in data:
                result.fail_test("Missing 'user' field")
                return result
            
            user = data["user"]
            required_user_fields = ["id", "username", "email", "role", "organization_id"]
            for field in required_user_fields:
                if field not in user:
                    result.fail_test(f"Missing user field: {field}")
                    return result
            
            if user.get("setup_completed") != False:
                result.fail_test(f"setup_completed should be False, got {user.get('setup_completed')}")
                return result
            
            if user.get("onboarding_completed") != False:
                result.fail_test(f"onboarding_completed should be False, got {user.get('onboarding_completed')}")
                return result
            
            # Store token for next test
            self.token_qa_a = data["token"]
            result.add_detail(f"✓ Token received (length: {len(self.token_qa_a)})")
            result.add_detail(f"✓ User data complete: {user['username']} ({user['email']})")
            
            # Test token with /api/auth/me
            me_response = await self.client.get(
                f"{API_BASE}/auth/me",
                headers={"Authorization": f"Bearer {self.token_qa_a}"}
            )
            
            if me_response.status_code != 200:
                result.fail_test(f"/api/auth/me failed with status {me_response.status_code}")
                return result
            
            me_data = me_response.json()
            if me_data.get("id") != user["id"]:
                result.fail_test(f"User ID mismatch in /api/auth/me")
                return result
            
            result.add_detail(f"✓ Token works with /api/auth/me")
            
            # Check OTP was deleted from MongoDB
            await asyncio.sleep(0.5)
            otp_after = await self.get_otp_from_mongo("qa_a@example.com")
            if otp_after:
                result.fail_test("OTP was not deleted from MongoDB after verification")
                return result
            
            result.add_detail("✓ OTP deleted from MongoDB after verification")
            result.pass_test("Auto-login successful, token works")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def test_3_otp_persistence_across_restart(self) -> TestResult:
        """Test 3: OTP persistence across backend restart"""
        result = TestResult("Test 3: OTP persistence across backend restart")
        
        try:
            # Register new user
            payload = {
                "username": "qauser_b",
                "email": "qa_b@example.com",
                "password": "QaPass123!",
                "role": "admin"
            }
            
            response = await self.client.post(
                f"{API_BASE}/auth/register-request",
                json=payload
            )
            
            if response.status_code != 200:
                result.fail_test(f"Register request failed: {response.status_code}")
                return result
            
            # Get OTP from MongoDB BEFORE restart
            await asyncio.sleep(0.5)
            otp_before = await self.get_otp_from_mongo("qa_b@example.com")
            if not otp_before:
                result.fail_test("OTP not found in MongoDB before restart")
                return result
            
            result.add_detail(f"✓ OTP stored before restart")
            
            # Restart backend
            result.add_detail("Restarting backend...")
            import subprocess
            restart_result = subprocess.run(
                ["sudo", "supervisorctl", "restart", "backend"],
                capture_output=True,
                text=True
            )
            
            if restart_result.returncode != 0:
                result.fail_test(f"Backend restart failed: {restart_result.stderr}")
                return result
            
            result.add_detail("✓ Backend restarted")
            
            # Wait for backend to be ready
            await asyncio.sleep(6)
            if not await self.wait_for_backend():
                result.fail_test("Backend not ready after restart")
                return result
            
            # Verify OTP still works
            verify_payload = {
                "email": "qa_b@example.com",
                "otp": otp_before
            }
            
            verify_response = await self.client.post(
                f"{API_BASE}/auth/verify-registration",
                json=verify_payload
            )
            
            result.add_detail(f"Verify status after restart: {verify_response.status_code}")
            
            if verify_response.status_code != 200:
                result.fail_test(f"Verification failed after restart: {verify_response.status_code}")
                result.add_detail(f"Response: {verify_response.text}")
                return result
            
            verify_data = verify_response.json()
            if not verify_data.get("success") or not verify_data.get("token"):
                result.fail_test("Verification response invalid after restart")
                return result
            
            result.add_detail("✓ OTP survived restart and verification succeeded")
            result.pass_test("OTP persistence across restart works")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def test_4_direct_register_disabled(self) -> TestResult:
        """Test 4: /api/auth/register (direct/no-OTP) should be disabled"""
        result = TestResult("Test 4: Direct register endpoint disabled")
        
        try:
            payload = {
                "username": "bypass_qa",
                "email": "bypass_qa@example.com",
                "password": "X!",
                "role": "admin"
            }
            
            response = await self.client.post(
                f"{API_BASE}/auth/register",
                json=payload
            )
            
            result.add_detail(f"Status: {response.status_code}")
            
            if response.status_code != 403:
                result.fail_test(f"Expected 403, got {response.status_code}")
                result.add_detail(f"Response: {response.text}")
                return result
            
            data = response.json()
            detail = data.get("detail", "")
            
            if "Direct registration is disabled" not in detail:
                result.fail_test(f"Expected 'Direct registration is disabled' in detail, got: {detail}")
                return result
            
            result.add_detail(f"✓ Correct error message: {detail}")
            result.pass_test("Direct registration properly disabled")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def test_5_invalid_otp_paths(self) -> TestResult:
        """Test 5: Invalid / expired OTP paths"""
        result = TestResult("Test 5: Invalid / expired OTP handling")
        
        try:
            # Test 5a: Wrong OTP for valid email
            # First create a registration request
            payload = {
                "username": "qauser_invalid",
                "email": "qa_invalid@example.com",
                "password": "QaPass123!",
                "role": "admin"
            }
            
            reg_response = await self.client.post(
                f"{API_BASE}/auth/register-request",
                json=payload
            )
            
            if reg_response.status_code != 200:
                result.fail_test(f"Setup failed: {reg_response.status_code}")
                return result
            
            # Try with wrong OTP
            verify_payload = {
                "email": "qa_invalid@example.com",
                "otp": "999999"  # Wrong OTP
            }
            
            verify_response = await self.client.post(
                f"{API_BASE}/auth/verify-registration",
                json=verify_payload
            )
            
            result.add_detail(f"Wrong OTP status: {verify_response.status_code}")
            
            if verify_response.status_code != 400:
                result.fail_test(f"Expected 400 for wrong OTP, got {verify_response.status_code}")
                return result
            
            data = verify_response.json()
            if "Invalid OTP" not in data.get("detail", ""):
                result.fail_test(f"Expected 'Invalid OTP' in detail, got: {data.get('detail')}")
                return result
            
            result.add_detail("✓ Wrong OTP rejected with 400")
            
            # Test 5b: Email that never requested
            verify_payload2 = {
                "email": "never_requested@example.com",
                "otp": "123456"
            }
            
            verify_response2 = await self.client.post(
                f"{API_BASE}/auth/verify-registration",
                json=verify_payload2
            )
            
            result.add_detail(f"Never requested status: {verify_response2.status_code}")
            
            if verify_response2.status_code != 400:
                result.fail_test(f"Expected 400 for never requested, got {verify_response2.status_code}")
                return result
            
            data2 = verify_response2.json()
            if "No registration request found" not in data2.get("detail", ""):
                result.fail_test(f"Expected 'No registration request found' in detail, got: {data2.get('detail')}")
                return result
            
            result.add_detail("✓ Never requested email rejected with 400")
            
            # Cleanup
            await self.db.registration_otps.delete_one({"_id": "qa_invalid@example.com"})
            
            result.pass_test("Invalid OTP paths handled correctly")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def test_6_duplicate_email_username(self) -> TestResult:
        """Test 6: Duplicate email/username"""
        result = TestResult("Test 6: Duplicate email/username rejection")
        
        try:
            # Try to register with existing email (qa_a@example.com from Test 2)
            payload = {
                "username": "qauser_duplicate",
                "email": "qa_a@example.com",  # Already exists
                "password": "QaPass123!",
                "role": "admin"
            }
            
            response = await self.client.post(
                f"{API_BASE}/auth/register-request",
                json=payload
            )
            
            result.add_detail(f"Duplicate email status: {response.status_code}")
            
            if response.status_code != 400:
                result.fail_test(f"Expected 400 for duplicate email, got {response.status_code}")
                result.add_detail(f"Response: {response.text}")
                return result
            
            data = response.json()
            if "Email already registered" not in data.get("detail", ""):
                result.fail_test(f"Expected 'Email already registered' in detail, got: {data.get('detail')}")
                return result
            
            result.add_detail("✓ Duplicate email rejected with 400")
            result.pass_test("Duplicate email properly rejected")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def test_7_login(self) -> TestResult:
        """Test 7: /api/auth/login for account created in Test 2"""
        result = TestResult("Test 7: Login with created account")
        
        try:
            payload = {
                "username": "qauser_a",
                "password": "QaPass123!"
            }
            
            response = await self.client.post(
                f"{API_BASE}/auth/login",
                json=payload
            )
            
            result.add_detail(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                result.fail_test(f"Expected 200, got {response.status_code}")
                result.add_detail(f"Response: {response.text}")
                return result
            
            data = response.json()
            
            if "token" not in data or not data["token"]:
                result.fail_test("Missing or empty 'token' field")
                return result
            
            if "user" not in data:
                result.fail_test("Missing 'user' field")
                return result
            
            result.add_detail(f"✓ Token received")
            
            # Test token with /api/auth/me
            me_response = await self.client.get(
                f"{API_BASE}/auth/me",
                headers={"Authorization": f"Bearer {data['token']}"}
            )
            
            if me_response.status_code != 200:
                result.fail_test(f"/api/auth/me failed with status {me_response.status_code}")
                return result
            
            result.add_detail("✓ Token works with /api/auth/me")
            result.pass_test("Login successful")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def test_8_rate_limit(self) -> TestResult:
        """Test 8: Rate limit smoke test"""
        result = TestResult("Test 8: Rate limit smoke test")
        
        try:
            email = "qa_rl@example.com"
            payload = {
                "username": "qauser_rl",
                "email": email,
                "password": "QaPass123!",
                "role": "admin"
            }
            
            rate_limited = False
            responses = []
            
            # Fire 6 requests back-to-back
            for i in range(6):
                response = await self.client.post(
                    f"{API_BASE}/auth/register-request",
                    json=payload
                )
                responses.append(response.status_code)
                result.add_detail(f"Request {i+1}: {response.status_code}")
                
                if response.status_code == 429:
                    rate_limited = True
                    data = response.json()
                    if "Too many OTP requests" in data.get("detail", ""):
                        result.add_detail(f"✓ Rate limit message: {data.get('detail')}")
                    break
            
            if not rate_limited:
                result.fail_test(f"Expected at least one 429 response, got: {responses}")
                return result
            
            result.pass_test("Rate limiting works")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"\n{BOLD}{'='*70}{RESET}")
        print(f"{BOLD}BillByteKOT Backend Auth Flow Test Suite{RESET}")
        print(f"{BOLD}{'='*70}{RESET}\n")
        
        print(f"Backend URL: {BACKEND_URL}")
        print(f"MongoDB: {MONGO_URL}")
        print(f"Database: {DB_NAME}\n")
        
        # Setup
        await self.setup()
        
        # Initial cleanup
        print(f"\n{BLUE}Initial cleanup...{RESET}")
        await self.cleanup_test_data()
        
        # Wait for backend
        print(f"\n{BLUE}Checking backend health...{RESET}")
        if not await self.wait_for_backend():
            print(f"{RED}Backend not available, aborting tests{RESET}")
            return
        
        # Run tests
        print(f"\n{BOLD}Running tests...{RESET}")
        
        tests = [
            self.test_1_register_request,
            self.test_2_verify_registration,
            self.test_3_otp_persistence_across_restart,
            self.test_4_direct_register_disabled,
            self.test_5_invalid_otp_paths,
            self.test_6_duplicate_email_username,
            self.test_7_login,
            self.test_8_rate_limit,
        ]
        
        for test_func in tests:
            result = await test_func()
            self.results.append(result)
            result.print_result()
        
        # Final cleanup
        print(f"\n{BLUE}Final cleanup...{RESET}")
        await self.cleanup_test_data()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print(f"\n{BOLD}{'='*70}{RESET}")
        print(f"{BOLD}Test Summary{RESET}")
        print(f"{BOLD}{'='*70}{RESET}\n")
        
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        total = len(self.results)
        
        print(f"Total: {total}")
        print(f"{GREEN}Passed: {passed}{RESET}")
        print(f"{RED}Failed: {failed}{RESET}")
        
        if failed > 0:
            print(f"\n{RED}Failed tests:{RESET}")
            for r in self.results:
                if not r.passed:
                    print(f"  - {r.name}: {r.message}")
        
        print(f"\n{BOLD}{'='*70}{RESET}\n")
        
        return failed == 0


async def main():
    tester = AuthFlowTester()
    try:
        await tester.run_all_tests()
        success = all(r.passed for r in tester.results)
        sys.exit(0 if success else 1)
    finally:
        await tester.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
