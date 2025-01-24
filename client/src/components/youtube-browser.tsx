import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { startDownload } from "@/lib/api";

export default function YoutubeBrowser() {
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const { toast } = useToast();

  const { mutate: fetchInfo, isPending: isLoading } = useMutation({
    mutationFn: async (url: string) => {
      const response = await fetch(`/api/video-info?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (data) => {
      setVideoInfo(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: download, isPending: isDownloading } = useMutation({
    mutationFn: startDownload,
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "Your download has been queued",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!url) return;
    fetchInfo(url);
  };

  const handleDownload = () => {
    if (!videoInfo) return;
    download({
      url,
      format: "mp4",
      quality: "high",
      is_playlist: false,
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-2">
          <Input
            placeholder="Enter YouTube URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {videoInfo && (
          <div className="mt-4">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${videoInfo.id}`}
                title={videoInfo.title}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
            <div className="mt-4 space-y-2">
              <h3 className="font-medium">{videoInfo.title}</h3>
              <p className="text-sm text-muted-foreground">
                Duration: {videoInfo.duration}
              </p>
              <Button onClick={handleDownload} disabled={isDownloading} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
