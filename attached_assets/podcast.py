import os
import random
import time
from typing import Literal, Optional, Dict, List
import yt_dlp
from pydantic import BaseModel, Field, HttpUrl
from moviepy.editor import VideoFileClip, AudioFileClip
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from celery import Celery
import psutil

# FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins - adjust as needed for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Celery configuration
celery = Celery('tasks', broker='redis://localhost:6379')
celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

# Configuration
MAX_CONCURRENT_DOWNLOADS = 3
DOWNLOAD_DIR = "/path/to/download/directory"
MAX_STORAGE_USAGE_PERCENT = 90

class DownloadConfig(BaseModel):
    url: HttpUrl
    file_format: Literal["mp4", "webm", "m4a", "mp3"]
    quality: Optional[Literal["high", "medium", "low"]] = "high"

class YDLOptions(BaseModel):
    format: str = Field(default='bestaudio/best')
    outtmpl: str = Field(default='%(title)s.%(ext)s')
    noplaylist: bool = Field(default=True)
    user_agent: str = Field(default='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')

class MyLogger:
    def debug(self, msg):
        if not msg.startswith('[debug] '):
            self.info(msg)

    def info(self, msg):
        print(msg)

    def warning(self, msg):
        print(f"Warning: {msg}")

    def error(self, msg):
        print(f"Error: {msg}")

class YoutubeDownloader:
    def __init__(self):
        self.logger = MyLogger()
        self.active_tasks: Dict[str, str] = {} # task_id: status

    @celery.task(bind=True)
    def download_media(self, task, config: DownloadConfig):
        print("Downloading...")
        self.active_tasks[task.request.id] = "Downloading"

        if not self.check_resources():
            print("Insufficient resources. Download cancelled.")
            self.active_tasks[task.request.id] = "Cancelled (Insufficient Resources)"
            return

        max_retries = 5
        for attempt in range(max_retries):
            try:
                ydl_opts = self.get_ydl_opts(config)
                with yt_dlp.YoutubeDL(ydl_opts.model_dump()) as ydl:
                    info_dict = ydl.extract_info(str(config.url), download=False)
                    file_name = ydl.prepare_filename(info_dict)
                    full_path = os.path.join(DOWNLOAD_DIR, file_name)
                    ydl.download([str(config.url)])
                    
                    base_name, ext = os.path.splitext(full_path)
                    new_file_name = f"{base_name}.{config.file_format}"
                    
                    if ext[1:] != config.file_format:
                        self.convert_file(full_path, new_file_name, config.file_format)
                        os.remove(full_path)  # Remove the original file after conversion
                    elif full_path != new_file_name:
                        os.rename(full_path, new_file_name)
                    
                    print(f"Downloaded and converted: {new_file_name}")
                    self.active_tasks[task.request.id] = "Completed"
                    return
            except yt_dlp.utils.DownloadError as e:
                print(f"Download error: {e}")
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) + random.uniform(5, 10)
                    print(f"Retrying in {wait_time:.2f} seconds...")
                    time.sleep(wait_time)
                else:
                    print("Max retries reached. Download failed.")
                    self.active_tasks[task.request.id] = "Failed"
                    return
            except Exception as e:
                print(f"Unexpected error: {e}")
                self.active_tasks[task.request.id] = "Failed"
                return
        
        print("Download failed after multiple retries.")
        self.active_tasks[task.request.id] = "Failed"

    def get_ydl_opts(self, config: DownloadConfig) -> YDLOptions:
        format_string = self.get_format_string(config.file_format, config.quality)
        
        ydl_opts = YDLOptions(
            format=format_string,
            noplaylist=True,
            logger=self.logger,
            outtmpl=os.path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s')
        )
        
        return ydl_opts

    def get_format_string(self, file_format: str, quality: str) -> str:
        if file_format in ["mp4", "webm"]:
            if quality == "high":
                return f'best[ext={file_format}]/best'
            elif quality == "medium":
                return f'best[height<=720][ext={file_format}]/best'
            else:
                return f'worst[ext={file_format}]/worst'
        else:  # m4a or mp3
            if quality == "high":
                return f'bestaudio[ext=m4a]/best[ext=m4a]/best'
            elif quality == "medium":
                return f'bestaudio[abr<=128][ext=m4a]/best[abr<=128][ext=m4a]/best'
            else:
                return f'worstaudio[ext=m4a]/worst[ext=m4a]/worst'

    def convert_file(self, input_file: str, output_file: str, output_format: str):
        print(f"Converting {input_file} to {output_format}...")
        if output_format in ['mp3', 'm4a']:
            audio = AudioFileClip(input_file)
            audio.write_audiofile(output_file)
            audio.close()
        elif output_format in ['mp4', 'webm']:
            try:
                video = VideoFileClip(input_file)
                video.write_videofile(output_file)
                video.close()
            except Exception as e:
                print(f"Error during video conversion: {e}")
        else:
            raise ValueError(f"Unsupported output format: {output_format}")

    def check_resources(self):
        # Check CPU usage
        if psutil.cpu_percent(interval=1) > 80:
            return False

        # Check memory usage
        if psutil.virtual_memory().percent > 80:
            return False

        # Check storage
        storage = psutil.disk_usage(DOWNLOAD_DIR)
        if storage.percent > MAX_STORAGE_USAGE_PERCENT:
            return False

        # Check number of concurrent downloads
        active_downloads = celery.control.inspect().active()
        if active_downloads and len(active_downloads.get(celery.current_worker_task.request.hostname, [])) >= MAX_CONCURRENT_DOWNLOADS:
            return False

        return True
    
    def pause_task(self, task_id: str):
        if task_id in self.active_tasks:
            celery.control.revoke(task_id, terminate=False)
            self.active_tasks[task_id] = "Paused"
            return True
        return False

    def resume_task(self, task_id: str):
        if task_id in self.active_tasks:
            # You would need to re-enqueue the task with the same config
            # This is a simplified version, you might need to store the config
            # and re-create the task with it.
            # For now, we'll just change the status
            self.active_tasks[task_id] = "Resumed"
            return True
        return False

    def cancel_task(self, task_id: str):
        if task_id in self.active_tasks:
            celery.control.revoke(task_id, terminate=True)
            self.active_tasks[task_id] = "Cancelled"
            return True
        return False
    
    def get_all_downloads(self) -> List[Dict]:
        downloads = []
        for task_id, status in self.active_tasks.items():
            downloads.append({"task_id": task_id, "status": status})
        return downloads

downloader = YoutubeDownloader()

@app.post("/download/")
async def create_download(config: DownloadConfig, background_tasks: BackgroundTasks):
    task = downloader.download_media.delay(config.dict())
    return {"message": "Download started", "task_id": task.id}

@app.get("/status/{task_id}")
async def get_status(task_id: str):
    task = celery.AsyncResult(task_id)
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'status': 'Pending...'
        }
    elif task.state != 'FAILURE':
        response = {
            'state': task.state,
            'status': downloader.active_tasks.get(task_id, 'Unknown')
        }
    else:
        response = {
            'state': task.state,
            'status': str(task.info),
        }
    return response

@app.post("/pause/{task_id}")
async def pause_download(task_id: str):
    if downloader.pause_task(task_id):
        return {"message": f"Download {task_id} paused"}
    raise HTTPException(status_code=404, detail="Task not found")

@app.post("/resume/{task_id}")
async def resume_download(task_id: str):
    if downloader.resume_task(task_id):
        return {"message": f"Download {task_id} resumed"}
    raise HTTPException(status_code=404, detail="Task not found")

@app.post("/cancel/{task_id}")
async def cancel_download(task_id: str):
    if downloader.cancel_task(task_id):
        return {"message": f"Download {task_id} cancelled"}
    raise HTTPException(status_code=404, detail="Task not found")

@app.get("/downloads")
async def get_downloads():
    return downloader.get_all_downloads()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)