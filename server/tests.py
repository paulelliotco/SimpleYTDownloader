import unittest
import aiohttp
import asyncio
import os
import time
import subprocess
from typing import Optional, Tuple

# Using a shorter video for testing
TEST_VIDEO_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw"  # "Me at the zoo" - First YouTube video
API_BASE_URL = "http://localhost:5001"

class YouTubeDownloaderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Start the FastAPI server before running tests"""
        print("Starting FastAPI server...")
        cls.server_process = subprocess.Popen(
            ["python3", "server/downloader.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        # Wait for server to start
        time.sleep(5)
        print("Server started")

    @classmethod
    def tearDownClass(cls):
        """Shutdown the server after tests"""
        print("Shutting down server...")
        if hasattr(cls, 'server_process'):
            cls.server_process.terminate()
            cls.server_process.wait()
        print("Server stopped")

    async def download_and_verify(self, format: str, quality: str) -> Optional[str]:
        """Helper function to start a download and verify its completion"""
        print(f"\nTesting download with format={format}, quality={quality}")
        async with aiohttp.ClientSession() as session:
            # Start download
            payload = {
                "url": TEST_VIDEO_URL,
                "format": format,
                "quality": quality,
                "is_playlist": False
            }

            try:
                async with session.post(f"{API_BASE_URL}/download", json=payload, timeout=30) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        self.fail(f"Failed to start download: {error_text}")

                    data = await response.json()
                    download_id = data["id"]
                    print(f"Download started with ID: {download_id}")

                    # Poll download status
                    max_attempts = 30  # 2.5 minutes timeout (30 * 5 seconds)
                    attempt = 0
                    while attempt < max_attempts:
                        async with session.get(f"{API_BASE_URL}/downloads", timeout=10) as status_response:
                            downloads = await status_response.json()
                            download = next((d for d in downloads if d["id"] == download_id), None)

                            if not download:
                                self.fail(f"Download {download_id} not found")

                            print(f"Download status: {download['status']}, progress: {download.get('progress', 0)}%")

                            if download["status"] == "completed":
                                return download["title"]
                            elif download["status"] == "error":
                                self.fail(f"Download failed: {download.get('error', 'Unknown error')}")

                            await asyncio.sleep(5)
                            attempt += 1

                    self.fail("Download timeout")
                    return None
            except aiohttp.ClientError as e:
                self.fail(f"Connection error: {str(e)}")
            except asyncio.TimeoutError:
                self.fail("Operation timed out")
            except Exception as e:
                self.fail(f"Unexpected error: {str(e)}")

    def setUp(self):
        """Set up each test"""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        # Clean up any existing downloads
        for file in os.listdir("."):
            if file.endswith((".mp4", ".webm", ".mp3", ".m4a")):
                try:
                    os.remove(file)
                    print(f"Cleaned up: {file}")
                except Exception as e:
                    print(f"Failed to clean up {file}: {e}")

    def tearDown(self):
        """Clean up after each test"""
        self.loop.close()

    def test_mp4_download_high_quality(self):
        """Test downloading video in MP4 format with high quality"""
        output_file = self.loop.run_until_complete(
            self.download_and_verify("mp4", "high")
        )
        self.assertTrue(any(f.endswith(".mp4") for f in os.listdir(".")))
        print(f"✅ Successfully downloaded MP4 (High Quality): {output_file}")

    def test_mp3_extraction(self):
        """Test extracting audio in MP3 format"""
        output_file = self.loop.run_until_complete(
            self.download_and_verify("mp3", "high")
        )
        self.assertTrue(any(f.endswith(".mp3") for f in os.listdir(".")))
        print(f"✅ Successfully extracted MP3: {output_file}")

if __name__ == "__main__":
    # Run the tests
    unittest.main(verbosity=2)