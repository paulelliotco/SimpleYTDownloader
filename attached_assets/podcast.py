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
    """A simple logger class with methods for logging messages at different severity levels.
    Attributes:
        None
    Methods:
        - debug(msg): Logs a debug message after checking its format.
        - info(msg): Logs an informational message.
        - warning(msg): Logs a warning message.
        - error(msg): Logs an error message.
    Processing Logic:
        - The debug method will first check if the message starts with '[debug] '. If not, it will treat the message as an informational message and call the info method.
        - The info method logs messages directly.
        - The warning and error methods add a prefix to the message to indicate the severity before printing."""
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
    """YoutubeDownloader is a class for managing and executing media download tasks from YouTube with options to handle retries and format conversion.
    Parameters:
        - None
    Processing Logic:
        - Utilizes a logger to manage download events and states.
        - Maintains a dictionary of active tasks with their current statuses.
        - Provides methods to check system resource availability, ensuring downloads occur within safe limits."""
    def __init__(self):
        self.logger = MyLogger()
        self.active_tasks: Dict[str, str] = {} # task_id: status

    @celery.task(bind=True)
    def download_media(self, task, config: DownloadConfig):
        """Download media files using specified configuration, handle retries, and convert formats if necessary.
        Parameters:
            - task (Task): Task object containing the details of the download request.
            - config (DownloadConfig): Configuration object dictating download options such as URL and file format.
        Returns:
            - None
        Processing Logic:
            - Checks system resources before attempting to download.
            - Utilizes a maximum of 5 retries upon facing download errors.
            - Converts downloaded files to specified formats if needed, removing originals if conversion occurs.
            - Updates the status of the download task based on its progress and outcome."""
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
        """Get the YouTube download options configured based on the provided download configuration.
        Parameters:
            - config (DownloadConfig): The download configuration containing file format and quality settings.
        Returns:
            - YDLOptions: The YouTube download options configured with format, playlist and logging settings, and a template for output file naming.
        Processing Logic:
            - Constructs a format string using file format and quality from the configuration.
            - Disables playlist downloading via noplaylist.
            - Sets a custom logger for download events.
            - Defines an output template for file naming in the download directory."""
        format_string = self.get_format_string(config.file_format, config.quality)
        
        ydl_opts = YDLOptions(
            format=format_string,
            noplaylist=True,
            logger=self.logger,
            outtmpl=os.path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s')
        )
        
        return ydl_opts

    def get_format_string(self, file_format: str, quality: str) -> str:
        """Return a format string based on file format and quality.
        Parameters:
            - file_format (str): The desired file format, options include 'mp4', 'webm', 'm4a', or 'mp3'.
            - quality (str): The desired quality level, which can be 'high', 'medium', or any other value indicating a lower quality.
        Returns:
            - str: A format string suitable for use in media file selection, according to the specified format and quality.
        Processing Logic:
            - Chooses audio or video-based format based on file_format.
            - Selects appropriate quality tier for video (mp4/webm) or audio (m4a/mp3) formats.
            - Defaults to either 'worst' or other descriptors when exact match with 'high' or 'medium' is not made."""
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
        """Convert an input media file to specified audio or video format.
        Parameters:
            - input_file (str): The path to the input media file to be converted.
            - output_file (str): The path where the converted file will be saved.
            - output_format (str): The desired format for the output file, e.g., 'mp3', 'm4a', 'mp4', 'webm'.
        Returns:
            - None: This function does not return a value but saves the converted file to disk.
        Processing Logic:
            - Checks if the output format is supported; if not, raises a ValueError.
            - Converts the file to audio formats ('mp3', 'm4a') using AudioFileClip.
            - Converts the file to video formats ('mp4', 'webm') using VideoFileClip.
            - Handles exceptions during video conversion by printing an error message."""
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
        """Checks system resource usage and determines if it is within acceptable limits for performing additional tasks.
        Parameters:
            - None
        Returns:
            - bool: Returns False if any of the resource usage metrics exceed set thresholds, otherwise returns True.
        Processing Logic:
            - Checks if CPU usage exceeds 80%.
            - Checks if memory usage exceeds 80%.
            - Checks if storage usage exceeds a predefined maximum percentage.
            - Checks if the number of concurrent downloads exceeds the allowed maximum."""
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
        """Resume an active task if it exists.
        Parameters:
            - task_id (str): The identifier of the task to be resumed.
        Returns:
            - bool: True if the task is successfully resumed, False if the task does not exist.
        Processing Logic:
            - Checks if the task_id exists in the active tasks.
            - Updates the status of the task to "Resumed" if it exists."""
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
    """Get the status of an asynchronous task by its ID.
    Parameters:
        - task_id (str): The unique identifier of the asynchronous task.
    Returns:
        - dict: A dictionary containing the state of the task and its status message.
    Processing Logic:
        - If the task state is 'PENDING', the status is set to 'Pending...'.
        - If the task state is not 'FAILURE', it retrieves the status from active tasks or defaults to 'Unknown'.
        - In case of 'FAILURE', the exception info from the task is included in the status."""
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