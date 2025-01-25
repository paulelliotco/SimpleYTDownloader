import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pause, Play, X, ChevronDown, ChevronUp } from "lucide-react";
import { getDownloads, cancelDownload, pauseDownload, resumeDownload } from "@/lib/api";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function DownloadList() {
  const { data: downloads = [], refetch } = useQuery({
    queryKey: ["/api/downloads"],
  });

  const [openPlaylists, setOpenPlaylists] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const source = new EventSource("/api/downloads/events");
    source.onmessage = () => {
      refetch();
    };
    return () => source.close();
  }, [refetch]);

  const togglePlaylist = (id: string) => {
    setOpenPlaylists(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (downloads.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active downloads
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {downloads.map((download: any) => (
        <div key={download.id} className="border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium truncate flex-1 pr-4">
              {download.title || (download.status === 'downloading' ? 'Downloading...' : 'Starting download...')}
            </h3>
            <div className="flex items-center gap-2">
              {download.status === "paused" ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => resumeDownload(download.id)}
                >
                  <Play className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => pauseDownload(download.id)}
                  disabled={download.status === "completed" || download.status === "error"}
                >
                  <Pause className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => cancelDownload(download.id)}
                disabled={download.status === "completed"}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {download.status === "error" ? (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>
                {download.error || "An error occurred during download"}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Progress value={download.progress || 0} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="capitalize">{download.status === 'downloading' ? 'Downloading' : download.status}</span>
                <span>{download.progress ? Math.round(download.progress) : 0}%</span>
              </div>
            </>
          )}

          {download.is_playlist && download.items && (
            <Collapsible
              open={openPlaylists[download.id]}
              onOpenChange={() => togglePlaylist(download.id)}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full flex justify-between items-center">
                  <span>Playlist items ({download.current_item}/{download.total_items})</span>
                  {openPlaylists[download.id] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 mt-2">
                  {download.items.map((item: any, index: number) => (
                    <div key={index} className="pl-4 border-l">
                      <div className="text-sm font-medium truncate">
                        {item.title || (item.status === 'downloading' ? 'Downloading...' : 'Waiting...')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={item.progress}
                          className="h-1 flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {Math.round(item.progress)}%
                        </span>
                      </div>
                      {item.error && (
                        <p className="text-xs text-destructive mt-1">
                          {item.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      ))}
    </div>
  );
}