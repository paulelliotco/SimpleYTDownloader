# main.py
import argparse
import yt_dlp
import signal
import sys

def download_video(url, format=None, quality=None, output_dir=".", start_time=None, end_time=None):
    ydl_opts = {
        'format': format if format else 'best',
        'outtmpl': f'{output_dir}/%(title)s.%(ext)s',
        'progress_hooks': [progress_hook],
    }
    if quality:
        ydl_opts['format'] = f'bestvideo[height<={quality}]+bestaudio/best[height<={quality}]'
    if start_time and end_time:
        ydl_opts['download_ranges'] = lambda _, info: [f"{start_time}-{end_time}"]
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except KeyboardInterrupt:
        print("\nDownload cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"An error occurred: {e}")

def download_playlist(url, format=None, quality=None, output_dir=".", start_time=None, end_time=None):
    ydl_opts = {
        'format': format if format else 'best',
        'outtmpl': f'{output_dir}/%(playlist)s/%(title)s.%(ext)s',
        'progress_hooks': [progress_hook],
    }
    if quality:
        ydl_opts['format'] = f'bestvideo[height<={quality}]+bestaudio/best[height<={quality}]'
    if start_time and end_time:
        ydl_opts['download_ranges'] = lambda _, info: [f"{start_time}-{end_time}"]
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except KeyboardInterrupt:
        print("\nDownload cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"An error occurred: {e}")

def download_subtitles(url, output_dir="."):
    ydl_opts = {
        'writesubtitles': True,
        'outtmpl': f'{output_dir}/%(title)s.%(ext)s',
        'progress_hooks': [progress_hook],
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except KeyboardInterrupt:
        print("\nDownload cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"An error occurred: {e}")

def progress_hook(d):
    if d['status'] == 'downloading':
        print(f"\r  {d['_percent_str']} of {d['_total_bytes_str']} at {d['_speed_str']} ETA {d['_eta_str']}", end="")
    if d['status'] == 'finished':
        print('\nDownload finished')

def batch_download(urls, format=None, quality=None, output_dir=".", start_time=None, end_time=None):
    for url in urls:
        print(f"Downloading: {url}")
        download_video(url, format, quality, output_dir, start_time, end_time)

def main():
    parser = argparse.ArgumentParser(description="YouTube Downloader CLI")
    subparsers = parser.add_subparsers(title="commands", dest="command")

    # Download video command
    video_parser = subparsers.add_parser("video", help="Download a single video")
    video_parser.add_argument("url", help="YouTube video URL")
    video_parser.add_argument("-f", "--format", help="Download format (e.g., mp4, mp3)")
    video_parser.add_argument("-q", "--quality", type=int, help="Video quality (e.g., 720 for 720p)")
    video_parser.add_argument("-o", "--output", default=".", help="Output directory")
    video_parser.add_argument("--start", type=str, help="Start time for download (e.g., 00:01:00)")
    video_parser.add_argument("--end", type=str, help="End time for download (e.g., 00:02:00)")

    # Download playlist command
    playlist_parser = subparsers.add_parser("playlist", help="Download a playlist")
    playlist_parser.add_argument("url", help="YouTube playlist URL")
    playlist_parser.add_argument("-f", "--format", help="Download format (e.g., mp4, mp3)")
    playlist_parser.add_argument("-q", "--quality", type=int, help="Video quality (e.g., 720 for 720p)")
    playlist_parser.add_argument("-o", "--output", default=".", help="Output directory")
    playlist_parser.add_argument("--start", type=str, help="Start time for download (e.g., 00:01:00)")
    playlist_parser.add_argument("--end", type=str, help="End time for download (e.g., 00:02:00)")


    # Download subtitles command
    subtitle_parser = subparsers.add_parser("subtitles", help="Download subtitles for a video")
    subtitle_parser.add_argument("url", help="YouTube video URL")
    subtitle_parser.add_argument("-o", "--output", default=".", help="Output directory")

    # Batch download command
    batch_parser = subparsers.add_parser("batch", help="Download multiple videos")
    batch_parser.add_argument("urls", nargs='+', help="YouTube video URLs")
    batch_parser.add_argument("-f", "--format", help="Download format (e.g., mp4, mp3)")
    batch_parser.add_argument("-q", "--quality", type=int, help="Video quality (e.g., 720 for 720p)")
    batch_parser.add_argument("-o", "--output", default=".", help="Output directory")
    batch_parser.add_argument("--start", type=str, help="Start time for download (e.g., 00:01:00)")
    batch_parser.add_argument("--end", type=str, help="End time for download (e.g., 00:02:00)")


    args = parser.parse_args()

    if args.command == "video":
        download_video(args.url, args.format, args.quality, args.output, args.start, args.end)
    elif args.command == "playlist":
        download_playlist(args.url, args.format, args.quality, args.output, args.start, args.end)
    elif args.command == "subtitles":
        download_subtitles(args.url, args.output)
    elif args.command == "batch":
        batch_download(args.urls, args.format, args.quality, args.output, args.start, args.end)
    else:
        parser.print_help()
    
    print("\nDisclaimer: Downloading copyrighted content without permission is illegal. Please respect copyright laws.")


if __name__ == "__main__":
    main()