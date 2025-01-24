import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DownloadForm from "@/components/download-form";
import DownloadList from "@/components/download-list";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-xl mx-auto space-y-8 pt-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-white">
            YouTube Downloader
          </h1>
          <p className="text-lg font-medium text-gray-400">
            Download your favorite videos in seconds
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="outline" className="bg-glass text-white">Fast</Badge>
            <Badge variant="outline" className="bg-glass text-white">Simple</Badge>
            <Badge variant="outline" className="bg-glass text-white">Free</Badge>
          </div>
        </div>

        <div className="bg-glass rounded-lg p-6">
          <DownloadForm />
        </div>

        <div className="space-y-4">
          <DownloadList />
        </div>

        <footer className="text-center text-sm text-gray-500">
          <p>Please respect copyright laws and YouTube's terms of service.</p>
        </footer>
      </div>
    </div>
  );
}