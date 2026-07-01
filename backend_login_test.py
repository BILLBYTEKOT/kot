#!/usr/bin/env python3
"""
BillByteKOT Login Endpoint Hardening Test Suite
Tests the hardened /api/auth/login endpoint with regex-safety and timing defense
"""

import asyncio
import sys
import time
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

# Test credentials
TEST_EMAIL = "qa_login@example.com"
TEST_USERNAME = "qalogin"
TEST_PASSWORD = "LoginPass123!"

# ANSI color codes
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


class LoginHardeningTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.mongo_client = None
        self.db = None
        self.results = []
        self.test_token = None
    
    async def setup(self):
        """Initialize MongoDB connection"""
        try:
            self.mongo_client = AsyncIOMotorClient(MONGO_URL)
            self.db = self.mongo_client[DB_NAME]
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
    
    async def cleanup_test_user(self):
        """Remove test user from database"""
        try:
            result = await self.db.users.delete_many({"email": TEST_EMAIL})
            print(f"{BLUE}Cleanup:{RESET} Deleted {result.deleted_count} test users")
            
            result = await self.db.registration_otps.delete_many({"_id": TEST_EMAIL})
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
    
    async def test_1_create_user_via_otp(self) -> TestResult:
        """Test 1: Create fresh test user via OTP flow"""
        result = TestResult("Test 1: Create user via OTP flow")
        
        try:
            # Step 1: Register request
            payload = {
                "username": TEST_USERNAME,
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "role": "admin"
            }
            
            response = await self.client.post(
                f"{API_BASE}/auth/register-request",
                json=payload
            )
            
            result.add_detail(f"Register request status: {response.status_code}")
            
            if response.status_code != 200:
                result.fail_test(f"Register request failed: {response.status_code}")
                result.add_detail(f"Response: {response.text}")
                return result
            
            # Step 2: Get OTP from MongoDB
            await asyncio.sleep(0.5)
            otp = await self.get_otp_from_mongo(TEST_EMAIL)
            if not otp:
                result.fail_test("OTP not found in MongoDB")
                return result
            
            result.add_detail(f"✓ OTP retrieved from MongoDB")
            
            # Step 3: Verify registration
            verify_payload = {
                "email": TEST_EMAIL,
                "otp": otp
            }
            
            verify_response = await self.client.post(
                f"{API_BASE}/auth/verify-registration",
                json=verify_payload
            )
            
            result.add_detail(f"Verify registration status: {verify_response.status_code}")
            
            if verify_response.status_code != 200:
                result.fail_test(f"Verification failed: {verify_response.status_code}")
                result.add_detail(f"Response: {verify_response.text}")
                return result
            
            verify_data = verify_response.json()
            if not verify_data.get("token") or not verify_data.get("user"):
                result.fail_test("Missing token or user in verification response")
                return result
            
            result.add_detail(f"✓ User created: {TEST_USERNAME} ({TEST_EMAIL})")
            result.pass_test("User created successfully via OTP flow")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def test_2_login_correct_credentials(self) -> TestResult:
        """Test 2: Login with correct credentials"""
        result = TestResult("Test 2: Login with correct credentials")
        
        try:
            payload = {
                "username": TEST_USERNAME,
                "password": TEST_PASSWORD
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
            
            user = data["user"]
            if user.get("username") != TEST_USERNAME:
                result.fail_test(f"Username mismatch: expected {TEST_USERNAME}, got {user.get('username')}")
                return result
            
            # Store token for later test
            self.test_token = data["token"]
            
            result.add_detail(f"✓ Token received (length: {len(self.test_token)})")
            result.add_detail(f"✓ User data: {user.get('username')} ({user.get('email')})")
            result.pass_test("Login successful with correct credentials")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def test_3_login_wrong_password(self) -> TestResult:
        """Test 3: Login with wrong password for same username"""
        result = TestResult("Test 3: Login with wrong password")
        
        try:
            payload = {
                "username": TEST_USERNAME,
                "password": "WrongPassword123!"
            }
            
            response = await self.client.post(
                f"{API_BASE}/auth/login",
                json=payload
            )
            
            result.add_detail(f"Status: {response.status_code}")
            
            if response.status_code != 401:
                result.fail_test(f"Expected 401, got {response.status_code}")
                result.add_detail(f"Response: {response.text}")
                return result
            
            data = response.json()
            detail = data.get("detail", "")
            
            if detail != "Invalid credentials":
                result.fail_test(f"Expected 'Invalid credentials', got: {detail}")
                return result
            
            result.add_detail(f"✓ Correct error message: {detail}")
            result.pass_test("Wrong password rejected with 401")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def test_4_login_nonexistent_user_timing(self) -> TestResult:
        """Test 4: Login with non-existent username + timing defense check"""
        result = TestResult("Test 4: Non-existent user + timing defense")
        
        try:
            # First, measure timing for wrong password (valid user)
            payload_valid_user = {
                "username": TEST_USERNAME,
                "password": "WrongPassword123!"
            }
            
            start_valid = time.time()
            response_valid = await self.client.post(
                f"{API_BASE}/auth/login",
                json=payload_valid_user
            )
            time_valid = time.time() - start_valid
            
            result.add_detail(f"Valid user wrong password: {response_valid.status_code} in {time_valid:.3f}s")
            
            # Now test non-existent user
            payload_invalid = {
                "username": "nobody_qa_xyz",
                "password": "SomePassword123!"
            }
            
            start_invalid = time.time()
            response_invalid = await self.client.post(
                f"{API_BASE}/auth/login",
                json=payload_invalid
            )
            time_invalid = time.time() - start_invalid
            
            result.add_detail(f"Non-existent user: {response_invalid.status_code} in {time_invalid:.3f}s")
            
            # Check status code
            if response_invalid.status_code != 401:
                result.fail_test(f"Expected 401, got {response_invalid.status_code}")
                result.add_detail(f"Response: {response_invalid.text}")
                return result
            
            # Check error message
            data = response_invalid.json()
            detail = data.get("detail", "")
            
            if detail != "Invalid credentials":
                result.fail_test(f"Expected 'Invalid credentials', got: {detail}")
                return result
            
            result.add_detail(f"✓ Correct error message: {detail}")
            
            # Check timing defense (should be within ±30%)
            time_diff_pct = abs(time_valid - time_invalid) / time_valid * 100
            result.add_detail(f"Timing difference: {time_diff_pct:.1f}%")
            
            if time_diff_pct > 30:
                result.add_detail(f"⚠️ Timing difference exceeds 30% (may indicate timing leak)")
            else:
                result.add_detail(f"✓ Timing defense working (within 30%)")
            
            result.pass_test("Non-existent user handled correctly")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def test_5_login_regex_metacharacters(self) -> TestResult:
        """Test 5: Login with regex metacharacters (no 500 error)"""
        result = TestResult("Test 5: Regex metacharacter safety")
        
        try:
            test_cases = [
                f"{TEST_USERNAME}.*",
                ".*",
                "^.*$",
                "[a-z]+",
                "(test|user)",
            ]
            
            all_passed = True
            
            for username in test_cases:
                payload = {
                    "username": username,
                    "password": "SomePassword123!"
                }
                
                response = await self.client.post(
                    f"{API_BASE}/auth/login",
                    json=payload
                )
                
                result.add_detail(f"Username '{username}': {response.status_code}")
                
                if response.status_code == 500:
                    result.fail_test(f"🚨 500 error for username '{username}' - regex not escaped!")
                    result.add_detail(f"Response: {response.text}")
                    all_passed = False
                    break
                
                if response.status_code != 401:
                    result.fail_test(f"Expected 401 for '{username}', got {response.status_code}")
                    result.add_detail(f"Response: {response.text}")
                    all_passed = False
                    break
                
                data = response.json()
                if data.get("detail") != "Invalid credentials":
                    result.fail_test(f"Wrong error message for '{username}': {data.get('detail')}")
                    all_passed = False
                    break
            
            if all_passed:
                result.add_detail("✓ All regex metacharacters handled safely")
                result.pass_test("Regex escaping works correctly")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def test_6_token_with_auth_me(self) -> TestResult:
        """Test 6: Use returned token with /api/auth/me"""
        result = TestResult("Test 6: Token validation with /api/auth/me")
        
        try:
            if not self.test_token:
                result.fail_test("No token available (Test 2 must pass first)")
                return result
            
            response = await self.client.get(
                f"{API_BASE}/auth/me",
                headers={"Authorization": f"Bearer {self.test_token}"}
            )
            
            result.add_detail(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                result.fail_test(f"Expected 200, got {response.status_code}")
                result.add_detail(f"Response: {response.text}")
                return result
            
            data = response.json()
            
            if data.get("username") != TEST_USERNAME:
                result.fail_test(f"Username mismatch: expected {TEST_USERNAME}, got {data.get('username')}")
                return result
            
            if data.get("email") != TEST_EMAIL:
                result.fail_test(f"Email mismatch: expected {TEST_EMAIL}, got {data.get('email')}")
                return result
            
            result.add_detail(f"✓ User data: {data.get('username')} ({data.get('email')})")
            result.pass_test("Token works correctly with /api/auth/me")
            
        except Exception as e:
            result.fail_test(f"Exception: {str(e)}")
        
        return result
    
    async def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"\n{BOLD}{'='*70}{RESET}")
        print(f"{BOLD}Login Endpoint Hardening Test Suite{RESET}")
        print(f"{BOLD}{'='*70}{RESET}\n")
        
        print(f"Backend URL: {BACKEND_URL}")
        print(f"MongoDB: {MONGO_URL}")
        print(f"Test user: {TEST_USERNAME} ({TEST_EMAIL})\n")
        
        # Setup
        await self.setup()
        
        # Initial cleanup
        print(f"\n{BLUE}Initial cleanup...{RESET}")
        await self.cleanup_test_user()
        
        # Run tests
        print(f"\n{BOLD}Running tests...{RESET}")
        
        tests = [
            self.test_1_create_user_via_otp,
            self.test_2_login_correct_credentials,
            self.test_3_login_wrong_password,
            self.test_4_login_nonexistent_user_timing,
            self.test_5_login_regex_metacharacters,
            self.test_6_token_with_auth_me,
        ]
        
        for test_func in tests:
            result = await test_func()
            self.results.append(result)
            result.print_result()
        
        # Final cleanup
        print(f"\n{BLUE}Final cleanup...{RESET}")
        await self.cleanup_test_user()
        
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
    tester = LoginHardeningTester()
    try:
        await tester.run_all_tests()
        success = all(r.passed for r in tester.results)
        sys.exit(0 if success else 1)
    finally:
        await tester.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
