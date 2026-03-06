#!/usr/bin/env python3
"""
Comprehensive backend testing for Duelo quiz app - Updated for Per-Category Level System.
Tests smart matchmaking, per-category levels, profile with category data, title system.
"""

import asyncio
import aiohttp
import json
import time
import random
from typing import Dict, Any, Optional

# Base URL from frontend/.env
BASE_URL = "https://rapid-quiz-42.preview.emergentagent.com/api"

class DueloAPITester:
    def __init__(self):
        self.session = None
        self.test_user_id = None
        self.test_user_pseudo = None
        self.results = {
            "guest_registration": {"status": "pending", "details": None},
            "smart_matchmaking": {"status": "pending", "details": None},
            "per_category_levels": {"status": "pending", "details": None},
            "profile_category_data": {"status": "pending", "details": None},
            "match_submit_title_detection": {"status": "pending", "details": None},
            "select_title": {"status": "pending", "details": None}
        }

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def log_result(self, test_name: str, success: bool, details: str, data: Any = None):
        """Log test result with detailed information."""
        self.results[test_name] = {
            "status": "passed" if success else "failed",
            "details": details,
            "data": data
        }
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {test_name}: {details}")
        if data and not success:
            print(f"   Response data: {json.dumps(data, indent=2)}")

    async def test_guest_registration(self):
        """Test guest user registration with unique pseudo."""
        print("\n=== Testing Guest Registration ===")
        
        # Generate unique pseudo
        timestamp = str(int(time.time()))[-6:]  # Last 6 digits of timestamp
        pseudo = f"TestPlayer_{timestamp}"
        
        try:
            async with self.session.post(f"{BASE_URL}/auth/register-guest", 
                                       json={"pseudo": pseudo}) as response:
                if response.status == 200:
                    data = await response.json()
                    self.test_user_id = data.get("id")
                    self.test_user_pseudo = data.get("pseudo")
                    
                    # Validate response structure
                    required_fields = ["id", "pseudo", "is_guest", "avatar_seed", "total_xp", "current_streak"]
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if missing_fields:
                        await self.log_result("guest_registration", False, 
                                            f"Missing fields: {missing_fields}", data)
                        return False
                    
                    if not data.get("is_guest"):
                        await self.log_result("guest_registration", False, 
                                            "User should be marked as guest", data)
                        return False
                    
                    await self.log_result("guest_registration", True, 
                                        f"Created guest user: {pseudo} (ID: {self.test_user_id})", data)
                    return True
                else:
                    error_data = await response.text()
                    await self.log_result("guest_registration", False, 
                                        f"HTTP {response.status}: {error_data}")
                    return False
                    
        except Exception as e:
            await self.log_result("guest_registration", False, f"Exception: {str(e)}")
            return False

    async def test_smart_matchmaking(self):
        """Test smart matchmaking with category and player_id."""
        print("\n=== Testing Smart Matchmaking with Category ===")
        
        if not self.test_user_id:
            await self.log_result("smart_matchmaking", False, "No test user available - registration failed")
            return False
        
        # Test with category and player_id
        matchmaking_data = {
            "category": "series_tv",
            "player_id": self.test_user_id
        }
        
        try:
            async with self.session.post(f"{BASE_URL}/game/matchmaking", json=matchmaking_data) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response has both player and opponent
                    if "player" not in data or "opponent" not in data:
                        await self.log_result("smart_matchmaking", False, 
                                            "Response must contain both 'player' and 'opponent' keys", data)
                        return False
                    
                    player = data.get("player", {})
                    opponent = data.get("opponent", {})
                    
                    # Validate player data
                    required_player_fields = ["level", "title"]
                    missing_player_fields = [field for field in required_player_fields if field not in player]
                    
                    if missing_player_fields:
                        await self.log_result("smart_matchmaking", False, 
                                            f"Missing player fields: {missing_player_fields}", data)
                        return False
                    
                    # Validate opponent data  
                    required_opponent_fields = ["pseudo", "avatar_seed", "is_bot", "level", "title", "streak", "streak_badge"]
                    missing_opponent_fields = [field for field in required_opponent_fields if field not in opponent]
                    
                    if missing_opponent_fields:
                        await self.log_result("smart_matchmaking", False, 
                                            f"Missing opponent fields: {missing_opponent_fields}", data)
                        return False
                    
                    if not opponent.get("is_bot"):
                        await self.log_result("smart_matchmaking", False, 
                                            "Opponent should be marked as bot", data)
                        return False
                    
                    # Validate level matching (bot should be within +/- 5 levels of player)
                    player_level = player.get("level", 1)
                    opponent_level = opponent.get("level", 1)
                    level_diff = abs(player_level - opponent_level)
                    
                    if level_diff > 5:
                        await self.log_result("smart_matchmaking", False, 
                                            f"Opponent level {opponent_level} too far from player level {player_level} (diff: {level_diff})", data)
                        return False
                    
                    await self.log_result("smart_matchmaking", True, 
                                        f"Smart matchmaking working - Player: Lv.{player_level} '{player['title']}', Opponent: '{opponent['pseudo']}' Lv.{opponent_level} '{opponent['title']}'", 
                                        data)
                    return True
                    
                else:
                    error_data = await response.text()
                    await self.log_result("smart_matchmaking", False, 
                                        f"HTTP {response.status}: {error_data}")
                    return False
                    
        except Exception as e:
            await self.log_result("smart_matchmaking", False, f"Exception: {str(e)}")
            return False

    async def test_per_category_levels(self):
        """Test per-category level calculation formula: 500 + (N-1)^2 * 10."""
        print("\n=== Testing Per-Category Level System ===")
        
        # Test level calculation by checking profile after earning XP
        # First, let's submit a match to earn some XP
        if not self.test_user_id:
            await self.log_result("per_category_levels", False, "No test user available - registration failed")
            return False
        
        # Submit a winning match to earn XP
        match_data = {
            "player_id": self.test_user_id,
            "category": "series_tv", 
            "player_score": 140,  # 7 questions * 20 points
            "opponent_score": 100,
            "opponent_pseudo": "TestBot_Level",
            "opponent_is_bot": True,
            "correct_count": 7,
            "opponent_level": 1
        }
        
        try:
            # Submit match first
            async with self.session.post(f"{BASE_URL}/game/submit", json=match_data) as response:
                if response.status != 200:
                    await self.log_result("per_category_levels", False, 
                                        f"Match submit failed: {response.status}")
                    return False
            
            # Now check profile to validate level calculation
            async with self.session.get(f"{BASE_URL}/profile/{self.test_user_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    user = data.get("user", {})
                    categories = user.get("categories", {})
                    
                    if "series_tv" not in categories:
                        await self.log_result("per_category_levels", False, 
                                            "No series_tv category data found", data)
                        return False
                    
                    series_tv_data = categories["series_tv"]
                    required_fields = ["xp", "level", "title", "xp_progress", "unlocked_titles"]
                    missing_fields = [field for field in required_fields if field not in series_tv_data]
                    
                    if missing_fields:
                        await self.log_result("per_category_levels", False, 
                                            f"Missing category fields: {missing_fields}", data)
                        return False
                    
                    # Validate XP progress structure
                    xp_progress = series_tv_data.get("xp_progress", {})
                    required_progress_fields = ["current", "needed", "progress"]
                    missing_progress_fields = [field for field in required_progress_fields if field not in xp_progress]
                    
                    if missing_progress_fields:
                        await self.log_result("per_category_levels", False, 
                                            f"Missing xp_progress fields: {missing_progress_fields}", data)
                        return False
                    
                    # Validate level calculation logic
                    xp = series_tv_data.get("xp", 0)
                    level = series_tv_data.get("level", 1)
                    
                    # Manually calculate expected level based on formula: 500 + (N-1)^2 * 10
                    def calculate_level_from_xp(xp):
                        level = 1
                        cumulative_xp = 0
                        while level < 50:  # Max level 50
                            xp_needed_for_next = 500 + (level - 1) ** 2 * 10
                            if cumulative_xp + xp_needed_for_next > xp:
                                break
                            cumulative_xp += xp_needed_for_next
                            level += 1
                        return level
                    
                    expected_level = calculate_level_from_xp(xp)
                    
                    if level != expected_level:
                        await self.log_result("per_category_levels", False, 
                                            f"Level calculation error: XP {xp} should be level {expected_level}, got {level}", data)
                        return False
                    
                    await self.log_result("per_category_levels", True, 
                                        f"Per-category level system working - XP: {xp}, Level: {level}, Title: '{series_tv_data['title']}', Progress: {xp_progress['progress']*100:.1f}%", 
                                        data)
                    return True
                    
                else:
                    error_data = await response.text()
                    await self.log_result("per_category_levels", False, 
                                        f"Profile request failed: HTTP {response.status}: {error_data}")
                    return False
                    
        except Exception as e:
            await self.log_result("per_category_levels", False, f"Exception: {str(e)}")
            return False

    async def test_profile_category_data(self):
        """Test profile API returns proper category data structure."""
        print("\n=== Testing Profile API with Category Data ===")
        
        if not self.test_user_id:
            await self.log_result("profile_category_data", False, "No test user available - registration failed")
            return False
        
        try:
            async with self.session.get(f"{BASE_URL}/profile/{self.test_user_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate user object structure
                    user = data.get("user", {})
                    if "categories" not in user:
                        await self.log_result("profile_category_data", False, 
                                            "Profile missing 'categories' field", data)
                        return False
                    
                    categories = user.get("categories", {})
                    expected_categories = ["series_tv", "geographie", "histoire"]
                    
                    for cat in expected_categories:
                        if cat not in categories:
                            await self.log_result("profile_category_data", False, 
                                                f"Missing category: {cat}", data)
                            return False
                        
                        cat_data = categories[cat]
                        required_cat_fields = ["xp", "level", "title", "xp_progress", "unlocked_titles"]
                        missing_cat_fields = [field for field in required_cat_fields if field not in cat_data]
                        
                        if missing_cat_fields:
                            await self.log_result("profile_category_data", False, 
                                                f"Category {cat} missing fields: {missing_cat_fields}", data)
                            return False
                    
                    # Validate additional profile fields
                    if "all_unlocked_titles" not in data:
                        await self.log_result("profile_category_data", False, 
                                            "Profile missing 'all_unlocked_titles' field", data)
                        return False
                    
                    if "selected_title" not in user:
                        await self.log_result("profile_category_data", False, 
                                            "User missing 'selected_title' field", data)
                        return False
                    
                    all_titles = data.get("all_unlocked_titles", [])
                    selected_title = user.get("selected_title")
                    
                    await self.log_result("profile_category_data", True, 
                                        f"Profile category data complete - 3 categories, {len(all_titles)} total unlocked titles, selected: '{selected_title}'", 
                                        data)
                    return True
                    
                else:
                    error_data = await response.text()
                    await self.log_result("profile_category_data", False, 
                                        f"HTTP {response.status}: {error_data}")
                    return False
                    
        except Exception as e:
            await self.log_result("profile_category_data", False, f"Exception: {str(e)}")
            return False

    async def test_match_submit_title_detection(self):
        """Test match submit detects new title unlocks and returns new_title, new_level."""
        print("\n=== Testing Match Submit with Title Detection ===")
        
        if not self.test_user_id:
            await self.log_result("match_submit_title_detection", False, "No test user available - registration failed")
            return False
        
        # Submit a match that should potentially unlock a title
        match_data = {
            "player_id": self.test_user_id,
            "category": "geographie", 
            "player_score": 140,  # High score to earn lots of XP
            "opponent_score": 80,
            "opponent_pseudo": "TitleBot",
            "opponent_is_bot": True,
            "correct_count": 7,
            "opponent_level": 1
        }
        
        try:
            async with self.session.post(f"{BASE_URL}/game/submit", json=match_data) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure includes title detection fields
                    if "new_title" not in data:
                        await self.log_result("match_submit_title_detection", False, 
                                            "Match submit response missing 'new_title' field", data)
                        return False
                    
                    if "new_level" not in data:
                        await self.log_result("match_submit_title_detection", False, 
                                            "Match submit response missing 'new_level' field", data)
                        return False
                    
                    new_title = data.get("new_title")
                    new_level = data.get("new_level")
                    
                    # Validate title structure if present
                    if new_title:
                        required_title_fields = ["level", "title", "category"]
                        missing_title_fields = [field for field in required_title_fields if field not in new_title]
                        
                        if missing_title_fields:
                            await self.log_result("match_submit_title_detection", False, 
                                                f"New title object missing fields: {missing_title_fields}", data)
                            return False
                        
                        await self.log_result("match_submit_title_detection", True, 
                                            f"Title detection working - New title unlocked: '{new_title['title']}' at level {new_title['level']} (Category: {new_title['category']})", 
                                            data)
                    else:
                        await self.log_result("match_submit_title_detection", True, 
                                            "Title detection working - No new title unlocked this match (expected behavior)", 
                                            data)
                    return True
                    
                else:
                    error_data = await response.text()
                    await self.log_result("match_submit_title_detection", False, 
                                        f"HTTP {response.status}: {error_data}")
                    return False
                    
        except Exception as e:
            await self.log_result("match_submit_title_detection", False, f"Exception: {str(e)}")
            return False

    async def test_select_title(self):
        """Test title selection API validates unlocked titles and updates selected_title."""
        print("\n=== Testing Select Title API ===")
        
        if not self.test_user_id:
            await self.log_result("select_title", False, "No test user available - registration failed")
            return False
        
        try:
            # First get user's unlocked titles
            async with self.session.get(f"{BASE_URL}/profile/{self.test_user_id}") as response:
                if response.status != 200:
                    await self.log_result("select_title", False, "Cannot fetch profile to get unlocked titles")
                    return False
                
                profile_data = await response.json()
                all_titles = profile_data.get("all_unlocked_titles", [])
                
                if not all_titles:
                    await self.log_result("select_title", False, "No unlocked titles available for testing")
                    return False
                
                # Use the first unlocked title for testing
                test_title = all_titles[0]["title"]
                
                # Test selecting a valid title
                select_data = {
                    "user_id": self.test_user_id,
                    "title": test_title
                }
                
                async with self.session.post(f"{BASE_URL}/user/select-title", json=select_data) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if not data.get("success"):
                            await self.log_result("select_title", False, 
                                                "Select title response should indicate success", data)
                            return False
                        
                        if data.get("selected_title") != test_title:
                            await self.log_result("select_title", False, 
                                                f"Selected title mismatch: expected '{test_title}', got '{data.get('selected_title')}'", data)
                            return False
                        
                        # Verify title appears in profile
                        async with self.session.get(f"{BASE_URL}/profile/{self.test_user_id}") as verify_response:
                            if verify_response.status == 200:
                                verify_data = await verify_response.json()
                                selected_in_profile = verify_data.get("user", {}).get("selected_title")
                                
                                if selected_in_profile != test_title:
                                    await self.log_result("select_title", False, 
                                                        f"Title not updated in profile: expected '{test_title}', got '{selected_in_profile}'")
                                    return False
                            else:
                                await self.log_result("select_title", False, "Cannot verify title in profile")
                                return False
                        
                        # Test selecting an invalid (locked) title - should fail
                        invalid_title = "Locked_Title_123"
                        select_invalid_data = {
                            "user_id": self.test_user_id,
                            "title": invalid_title
                        }
                        
                        async with self.session.post(f"{BASE_URL}/user/select-title", json=select_invalid_data) as invalid_response:
                            if invalid_response.status == 400:
                                # This is expected - should reject locked titles
                                await self.log_result("select_title", True, 
                                                    f"Title selection working - Valid title '{test_title}' selected, invalid title rejected", 
                                                    data)
                                return True
                            else:
                                await self.log_result("select_title", False, 
                                                    "API should reject selection of locked titles with 400 status")
                                return False
                        
                    else:
                        error_data = await response.text()
                        await self.log_result("select_title", False, 
                                            f"HTTP {response.status}: {error_data}")
                        return False
                        
        except Exception as e:
            await self.log_result("select_title", False, f"Exception: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all backend API tests in sequence."""
        print("🎯 Starting Duelo Backend API Testing - Per-Category Level System")
        print(f"📡 Base URL: {BASE_URL}")
        print("=" * 60)
        
        # Run tests in dependency order
        tests = [
            ("Guest Registration", self.test_guest_registration),
            ("Smart Matchmaking", self.test_smart_matchmaking),
            ("Per-Category Levels", self.test_per_category_levels),
            ("Profile Category Data", self.test_profile_category_data),
            ("Match Submit Title Detection", self.test_match_submit_title_detection),
            ("Select Title", self.test_select_title),
        ]
        
        passed_count = 0
        failed_count = 0
        
        for test_name, test_func in tests:
            try:
                success = await test_func()
                if success:
                    passed_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                print(f"❌ {test_name}: Unexpected error - {str(e)}")
                failed_count += 1
        
        # Print summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {passed_count}")
        print(f"❌ Failed: {failed_count}")
        print(f"📊 Total: {passed_count + failed_count}")
        
        if self.test_user_id:
            print(f"👤 Test User: {self.test_user_pseudo} (ID: {self.test_user_id})")
        
        # Return results for further processing
        return self.results

async def main():
    """Main test execution."""
    async with DueloAPITester() as tester:
        results = await tester.run_all_tests()
        return results

if __name__ == "__main__":
    asyncio.run(main())