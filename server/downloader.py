import os
import yt_dlp
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import shutil

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    if os.path.exists("downloads"):
        shutil.rmtree("downloads")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DownloadRequest(BaseModel):
    url: str
    format: str
    quality: str
    is_playlist: bool = False

downloads: dict = {}

@app.get("/")
async def read_root():
    return {"message": "Welcome to YouTube Downloader API", "status": "ok"}

def get_format_string(format: str, quality: str) -> str:
    format_options = {
        "mp4": {
            "high": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "medium": "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best",
            "low": "worst[ext=mp4]/worst"
        },
        "webm": {
            "high": "bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=webm]/best",
            "medium": "bestvideo[height<=720][ext=webm]+bestaudio[ext=webm]/best[height<=720][ext=webm]/best",
            "low": "worst[ext=webm]/worst"
        },
        "m4a": {
            "high": "bestaudio[ext=m4a]/best[ext=m4a]/best",
            "medium": "bestaudio[abr<=128][ext=m4a]/best[abr<=128][ext=m4a]/best",
            "low": "worstaudio[ext=m4a]/worst"
        },
        "mp3": {
            "high": "bestaudio/best",
            "medium": "bestaudio[abr<=128]/best",
            "low": "worstaudio/worst"
        }
    }
    return format_options[format][quality]

@app.post("/download")
async def create_download(request: DownloadRequest):
    try:
        # Create a downloads directory if it doesn't exist
        os.makedirs("downloads", exist_ok=True)

        download_id = str(len(downloads) + 1)
        download_info = {
            "id": download_id,
            "url": request.url,
            "format": request.format,
            "quality": request.quality,
            "progress": 0,
            "status": "downloading",
            "title": "",
            "is_playlist": request.is_playlist,
            "error": None,
            "current_item": 0,
            "total_items": 0,
            "items": []
        }
        downloads[download_id] = download_info

        def progress_hook(d):
            if d['status'] == 'downloading':
                try:
                    if 'total_bytes' in d:
                        progress = (d['downloaded_bytes'] / d['total_bytes']) * 100
                    elif 'total_bytes_estimate' in d:
                        progress = (d['downloaded_bytes'] / d['total_bytes_estimate']) * 100
                    else:
                        progress = 0

                    downloads[download_id]['progress'] = progress
                    downloads[download_id]['title'] = d.get('filename', '').replace('downloads/', '')
                    downloads[download_id]['status'] = 'downloading'

                    if downloads[download_id]['items']:
                        downloads[download_id]['items'][-1]['progress'] = progress
                        downloads[download_id]['items'][-1]['title'] = d.get('filename', '').replace('downloads/', '')
                        downloads[download_id]['items'][-1]['status'] = 'downloading'

                    downloads[download_id]["title"] = d.get('filename', '').replace('downloads/', '')
                except Exception as e:
                    print(f"Error updating progress: {e}")

            elif d['status'] == 'finished':
                if downloads[download_id]['items']:
                    downloads[download_id]['items'][-1]['status'] = 'completed'
                    downloads[download_id]['items'][-1]['progress'] = 100
                downloads[download_id]['current_item'] += 1
                downloads[download_id]['status'] = 'completed' if downloads[download_id]['current_item'] >= downloads[download_id]['total_items'] else 'downloading'
                downloads[download_id]['progress'] = 100 if downloads[download_id]['status'] == 'completed' else downloads[download_id]['progress']
            elif d['status'] == 'error':
                if downloads[download_id]["items"]:
                    downloads[download_id]["items"][-1]["status"] = "error"
                    downloads[download_id]["items"][-1]["error"] = str(d.get('error', 'Unknown error'))
                downloads[download_id]["error"] = str(d.get('error', 'Unknown error'))

        ydl_opts = {
            'format': get_format_string(request.format, request.quality),
            'progress_hooks': [progress_hook],
            'outtmpl': 'downloads/%(title)s.%(ext)s',
            'quiet': True,
            'no_warnings': True,
            'ignoreerrors': True,
            'extract_flat': request.is_playlist,
            'postprocessors': [{
                'key': 'FFmpegVideoConvertor',
                'preferedformat': request.format,
            }] if request.format in ['mp4', 'webm'] else [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': request.format,
                'preferredquality': '192' if request.quality == 'high' else '128',
            }] if request.format in ['mp3', 'm4a'] else []
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(request.url, download=False)

                if info.get('_type') == 'playlist' and not request.is_playlist:
                    raise HTTPException(status_code=400, detail="URL is a playlist. Please check 'This is a playlist' to download.")

                if request.is_playlist and info.get('_type') == 'playlist':
                    downloads[download_id]["total_items"] = len(info.get('entries', []))
                    downloads[download_id]["items"] = [
                        {
                            "title": entry.get('title', 'Unknown'),
                            "status": "pending",
                            "progress": 0,
                            "error": None
                        }
                        for entry in info.get('entries', [])
                    ]

                ydl.download([request.url])

                if downloads[download_id]["error"] is None:
                    if downloads[download_id]["current_item"] >= downloads[download_id]["total_items"]:
                        downloads[download_id]["status"] = "completed"
                        downloads[download_id]["progress"] = 100

                return {"id": download_id}
            except Exception as e:
                downloads[download_id]["status"] = "error"
                downloads[download_id]["error"] = str(e)
                raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        if 'download_id' in locals():
            downloads[download_id]["status"] = "error"
            downloads[download_id]["error"] = str(e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/downloads")
async def get_downloads():
    return list(downloads.values())


if __name__ == "__main__":
    print("Starting FastAPI server...")
    uvicorn.run(app, host="127.0.0.1", port=5001, log_level="info")