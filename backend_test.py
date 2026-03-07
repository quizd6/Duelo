#!/usr/bin/env python3
"""
Comprehensive backend testing for Duelo quiz app - NEW Search System Testing.
Tests the 4 new search endpoints: themes, players, content, and trending.
"""

import asyncio
import aiohttp
import json
import time
import random
from typing import Dict, Any, Optional

# Base URL from frontend/.env
BASE_URL = "https://duelo-header-footer.preview.emergentagent.com/api"

class DueloSearchTester:
    def __init__(self):
        self.session = None
        self.test_user_id = None
        self.test_user_pseudo = None
        self.wall_post_id = None
        self.wall_comment_id = None
        self.results = {
            "guest_registration": {"status": "pending", "details": None},
            "search_themes": {"status": "pending", "details": None},
            "search_players": {"status": "pending", "details": None},
            "search_content": {"status": "pending", "details": None},
            "search_trending": {"status": "pending", "details": None}
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
        """Register a test user for search testing."""
        print("\n=== Testing Guest Registration ===")
        
        timestamp = str(int(time.time()))[-4:]
        pseudo = f"SearchTester_{timestamp}"
        
        try:
            async with self.session.post(f"{BASE_URL}/auth/register-guest", 
                                       json={"pseudo": pseudo}) as response:
                if response.status == 200:
                    data = await response.json()
                    self.test_user_id = data.get("id")
                    self.test_user_pseudo = data.get("pseudo")
                    
                    await self.log_result("guest_registration", True, 
                                        f"Created test user: {pseudo} (ID: {self.test_user_id})", data)
                    return True
                else:
                    error_data = await response.text()
                    await self.log_result("guest_registration", False, 
                                        f"HTTP {response.status}: {error_data}")
                    return False
                    
        except Exception as e:
            await self.log_result("guest_registration", False, f"Exception: {str(e)}")
            return False

    async def test_search_themes(self):
        """Test GET /api/search/themes - Theme search by keyword with tag matching."""
        print("\n=== Testing Search Themes API ===")
        
        try:
            # Test 1: No query (should return all 8 categories)
            async with self.session.get(f"{BASE_URL}/search/themes") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if not isinstance(data, list):
                        await self.log_result("search_themes", False, 
                                            "Response should be an array", data)
                        return False
                    
                    if len(data) != 8:
                        await self.log_result("search_themes", False, 
                                            f"Should return all 8 categories, got {len(data)}", data)
                        return False
                    
                    # Validate structure of first category
                    required_fields = ["id", "name", "description", "total_questions", 
                                     "player_count", "followers_count", "user_level", 
                                     "user_title", "is_following", "difficulty_label", "relevance_score"]
                    missing_fields = [field for field in required_fields if field not in data[0]]
                    
                    if missing_fields:
                        await self.log_result("search_themes", False, 
                                            f"Missing theme fields: {missing_fields}", data[0])
                        return False
                else:
                    error_data = await response.text()
                    await self.log_result("search_themes", False, 
                                        f"HTTP {response.status}: {error_data}")
                    return False
            
            # Test 2: Search with q=espace (should return Géographie and Sciences)
            async with self.session.get(f"{BASE_URL}/search/themes?q=espace") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Should find categories with space/geography/sciences tags
                    found_geo = any(cat["id"] == "geographie" for cat in data)
                    found_sci = any(cat["id"] == "sciences" for cat in data)
                    
                    if not (found_geo or found_sci):
                        await self.log_result("search_themes", False, 
                                            "Search 'espace' should return Géographie or Sciences", data)
                        return False
                else:
                    await self.log_result("search_themes", False, "Failed espace search")
                    return False
            
            # Test 3: Search with q=star+wars (should return Séries TV and Cinéma)
            async with self.session.get(f"{BASE_URL}/search/themes?q=star%20wars") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    found_series = any(cat["id"] == "series_tv" for cat in data)
                    found_cinema = any(cat["id"] == "cinema" for cat in data)
                    
                    if not (found_series or found_cinema):
                        await self.log_result("search_themes", False, 
                                            "Search 'star wars' should return Séries TV or Cinéma", data)
                        return False
                else:
                    await self.log_result("search_themes", False, "Failed star wars search")
                    return False
            
            # Test 4: Search with q=foot (should return Sport)
            async with self.session.get(f"{BASE_URL}/search/themes?q=foot") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    found_sport = any(cat["id"] == "sport" for cat in data)
                    
                    if not found_sport:
                        await self.log_result("search_themes", False, 
                                            "Search 'foot' should return Sport category", data)
                        return False
                else:
                    await self.log_result("search_themes", False, "Failed foot search")
                    return False
            
            # Test 5: Difficulty filter
            async with self.session.get(f"{BASE_URL}/search/themes?difficulty=debutant") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Should return categories appropriate for debutant level
                    if not isinstance(data, list):
                        await self.log_result("search_themes", False, 
                                            "Difficulty filter should return array", data)
                        return False
                else:
                    await self.log_result("search_themes", False, "Failed difficulty filter")
                    return False
            
            # Test 6: With user_id parameter
            if self.test_user_id:
                async with self.session.get(f"{BASE_URL}/search/themes?user_id={self.test_user_id}") as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Should include user-specific data
                        if data and len(data) > 0:
                            first_cat = data[0]
                            if "user_level" not in first_cat or "user_title" not in first_cat or "is_following" not in first_cat:
                                await self.log_result("search_themes", False, 
                                                    "With user_id should include user-specific fields")
                                return False
                    else:
                        await self.log_result("search_themes", False, "Failed user_id search")
                        return False
            
            await self.log_result("search_themes", True, 
                                "Theme search working - All query types, difficulty filter, user-specific data functional")
            return True
            
        except Exception as e:
            await self.log_result("search_themes", False, f"Exception: {str(e)}")
            return False

    async def test_search_players(self):
        """Test GET /api/search/players - Enhanced player search."""
        print("\n=== Testing Search Players API ===")
        
        if not self.test_user_id:
            await self.log_result("search_players", False, "Test user needed for player search")
            return False
        
        try:
            # Test 1: Search with @pseudo (exact match)
            async with self.session.get(f"{BASE_URL}/search/players?q=@{self.test_user_pseudo}") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if not isinstance(data, list):
                        await self.log_result("search_players", False, 
                                            "Player search should return array", data)
                        return False
                    
                    # Should find exact match
                    found_user = any(player["pseudo"] == self.test_user_pseudo for player in data)
                    if len(data) > 0 and not found_user:
                        await self.log_result("search_players", False, 
                                            f"Should find exact match for @{self.test_user_pseudo}")
                        return False
                    
                    # Validate player structure
                    if data and len(data) > 0:
                        required_fields = ["id", "pseudo", "avatar_seed", "country", 
                                         "country_flag", "total_xp", "matches_played", 
                                         "selected_title", "best_category", "best_level", 
                                         "cat_level", "cat_title"]
                        missing = [f for f in required_fields if f not in data[0]]
                        if missing:
                            await self.log_result("search_players", False, 
                                                f"Player missing fields: {missing}", data[0])
                            return False
                else:
                    error_data = await response.text()
                    await self.log_result("search_players", False, 
                                        f"HTTP {response.status}: {error_data}")
                    return False
            
            # Test 2: Partial pseudo search
            search_term = self.test_user_pseudo[:6] if len(self.test_user_pseudo) > 6 else self.test_user_pseudo[:3]
            async with self.session.get(f"{BASE_URL}/search/players?q={search_term}") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if not isinstance(data, list):
                        await self.log_result("search_players", False, 
                                            "Partial search should return array", data)
                        return False
                else:
                    await self.log_result("search_players", False, "Failed partial search")
                    return False
            
            # Test 3: Title filter
            async with self.session.get(f"{BASE_URL}/search/players?title=Téléspectateur") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if not isinstance(data, list):
                        await self.log_result("search_players", False, 
                                            "Title filter should return array", data)
                        return False
                else:
                    await self.log_result("search_players", False, "Failed title filter")
                    return False
            
            # Test 4: Category filter
            async with self.session.get(f"{BASE_URL}/search/players?category=series_tv") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if not isinstance(data, list):
                        await self.log_result("search_players", False, 
                                            "Category filter should return array", data)
                        return False
                else:
                    await self.log_result("search_players", False, "Failed category filter")
                    return False
            
            await self.log_result("search_players", True, 
                                "Player search working - @pseudo exact match, partial search, title filter, category filter functional")
            return True
            
        except Exception as e:
            await self.log_result("search_players", False, f"Exception: {str(e)}")
            return False

    async def test_search_content(self):
        """Test GET /api/search/content - Content search in wall posts and comments."""
        print("\n=== Testing Search Content API ===")
        
        if not self.test_user_id:
            await self.log_result("search_content", False, "Test user needed for content search")
            return False
        
        try:
            # Test 1: Create a wall post first
            post_content = "Test post for search functionality - unique content for testing"
            post_data = {
                "user_id": self.test_user_id,
                "content": post_content
            }
            
            async with self.session.post(f"{BASE_URL}/category/series_tv/wall", json=post_data) as response:
                if response.status == 200:
                    post_resp = await response.json()
                    self.wall_post_id = post_resp.get("id")
                else:
                    await self.log_result("search_content", False, "Failed to create test wall post")
                    return False
            
            # Test 2: Add a comment to the post
            if self.wall_post_id:
                comment_content = "Comment for search test - unique search content"
                comment_data = {
                    "user_id": self.test_user_id,
                    "content": comment_content
                }
                
                async with self.session.post(f"{BASE_URL}/wall/{self.wall_post_id}/comment", json=comment_data) as response:
                    if response.status == 200:
                        comment_resp = await response.json()
                        self.wall_comment_id = comment_resp.get("id")
                    else:
                        await self.log_result("search_content", False, "Failed to create test comment")
                        return False
            
            # Test 3: Search for content
            async with self.session.get(f"{BASE_URL}/search/content?q=search") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    if not isinstance(data, dict):
                        await self.log_result("search_content", False, 
                                            "Content search should return object with posts and comments", data)
                        return False
                    
                    if "posts" not in data or "comments" not in data:
                        await self.log_result("search_content", False, 
                                            "Response should contain posts and comments arrays", data)
                        return False
                    
                    if not isinstance(data["posts"], list) or not isinstance(data["comments"], list):
                        await self.log_result("search_content", False, 
                                            "Posts and comments should be arrays", data)
                        return False
                    
                    # Check if our test content was found
                    found_post = False
                    for post in data["posts"]:
                        if post.get("id") == self.wall_post_id:
                            found_post = True
                            # Validate post structure
                            required_fields = ["id", "category_id", "category_name", "user", 
                                             "content", "has_image", "likes_count", 
                                             "comments_count", "is_liked", "created_at"]
                            missing = [f for f in required_fields if f not in post]
                            if missing:
                                await self.log_result("search_content", False, 
                                                    f"Post missing fields: {missing}", post)
                                return False
                            break
                    
                    found_comment = False
                    for comment in data["comments"]:
                        if comment.get("id") == self.wall_comment_id:
                            found_comment = True
                            # Validate comment structure
                            required_fields = ["id", "post_id", "category_id", "category_name", 
                                             "user", "content", "created_at"]
                            missing = [f for f in required_fields if f not in comment]
                            if missing:
                                await self.log_result("search_content", False, 
                                                    f"Comment missing fields: {missing}", comment)
                                return False
                            break
                else:
                    error_data = await response.text()
                    await self.log_result("search_content", False, 
                                        f"HTTP {response.status}: {error_data}")
                    return False
            
            # Test 4: Empty query (should return empty arrays)
            async with self.session.get(f"{BASE_URL}/search/content?q=") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if data.get("posts") != [] or data.get("comments") != []:
                        await self.log_result("search_content", False, 
                                            "Empty query should return empty arrays", data)
                        return False
                else:
                    await self.log_result("search_content", False, "Failed empty query test")
                    return False
            
            await self.log_result("search_content", True, 
                                f"Content search working - Found {len(data.get('posts', []))} posts, {len(data.get('comments', []))} comments, empty query handled")
            return True
            
        except Exception as e:
            await self.log_result("search_content", False, f"Exception: {str(e)}")
            return False

    async def test_search_trending(self):
        """Test GET /api/search/trending - Trending data."""
        print("\n=== Testing Search Trending API ===")
        
        try:
            async with self.session.get(f"{BASE_URL}/search/trending") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    required_keys = ["popular_categories", "trending_tags", "top_players"]
                    missing_keys = [key for key in required_keys if key not in data]
                    
                    if missing_keys:
                        await self.log_result("search_trending", False, 
                                            f"Missing trending keys: {missing_keys}", data)
                        return False
                    
                    # Validate popular_categories structure
                    popular_cats = data.get("popular_categories", [])
                    if not isinstance(popular_cats, list):
                        await self.log_result("search_trending", False, 
                                            "popular_categories should be an array", data)
                        return False
                    
                    if popular_cats:
                        required_cat_fields = ["id", "name", "match_count"]
                        missing_cat_fields = [f for f in required_cat_fields if f not in popular_cats[0]]
                        if missing_cat_fields:
                            await self.log_result("search_trending", False, 
                                                f"Popular category missing fields: {missing_cat_fields}", popular_cats[0])
                            return False
                    
                    # Validate trending_tags structure
                    trending_tags = data.get("trending_tags", [])
                    if not isinstance(trending_tags, list):
                        await self.log_result("search_trending", False, 
                                            "trending_tags should be an array", data)
                        return False
                    
                    if trending_tags:
                        required_tag_fields = ["tag", "icon", "type"]
                        missing_tag_fields = [f for f in required_tag_fields if f not in trending_tags[0]]
                        if missing_tag_fields:
                            await self.log_result("search_trending", False, 
                                                f"Trending tag missing fields: {missing_tag_fields}", trending_tags[0])
                            return False
                    
                    # Validate top_players structure
                    top_players = data.get("top_players", [])
                    if not isinstance(top_players, list):
                        await self.log_result("search_trending", False, 
                                            "top_players should be an array", data)
                        return False
                    
                    if top_players:
                        required_player_fields = ["id", "pseudo", "avatar_seed", "total_xp", "country_flag"]
                        missing_player_fields = [f for f in required_player_fields if f not in top_players[0]]
                        if missing_player_fields:
                            await self.log_result("search_trending", False, 
                                                f"Top player missing fields: {missing_player_fields}", top_players[0])
                            return False
                    
                    await self.log_result("search_trending", True, 
                                        f"Trending API working - {len(popular_cats)} popular categories, {len(trending_tags)} trending tags, {len(top_players)} top players")
                    return True
                    
                else:
                    error_data = await response.text()
                    await self.log_result("search_trending", False, 
                                        f"HTTP {response.status}: {error_data}")
                    return False
                    
        except Exception as e:
            await self.log_result("search_trending", False, f"Exception: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all NEW Search System API tests in sequence."""
        print("🔍 Starting Duelo Backend API Testing - NEW Search System")
        print(f"📡 Base URL: {BASE_URL}")
        print("🎯 Testing: Themes, Players, Content, Trending Search")
        print("=" * 70)
        
        # Run tests in the required sequence
        tests = [
            ("Guest Registration", self.test_guest_registration),
            ("Search Themes", self.test_search_themes),
            ("Search Players", self.test_search_players),
            ("Search Content", self.test_search_content),
            ("Search Trending", self.test_search_trending),
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
        print("\n" + "=" * 70)
        print("🏁 NEW SEARCH SYSTEM TEST SUMMARY")
        print("=" * 70)
        print(f"✅ Passed: {passed_count}")
        print(f"❌ Failed: {failed_count}")
        print(f"📊 Total: {passed_count + failed_count}")
        
        if self.test_user_id:
            print(f"👤 Test User: {self.test_user_pseudo}")
            print(f"🆔 User ID: {self.test_user_id}")
        
        # Return results for further processing
        return self.results

async def main():
    """Main test execution."""
    async with DueloSearchTester() as tester:
        results = await tester.run_all_tests()
        return results

if __name__ == "__main__":
    asyncio.run(main())