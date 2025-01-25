import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { startDownload } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  url: z.string().url("Please enter a valid YouTube URL"),
  format: z.enum(["mp4", "webm", "m4a", "mp3"], {
    required_error: "Please select a format",
  }),
  quality: z.enum(["high", "medium", "low"], {
    required_error: "Please select quality",
  }),
  is_playlist: z.boolean().default(false),
});

/**
* Renders a form component for initiating and configuring downloads.
* @example
* DownloadForm()
* <JSX.Element> // Rendered form for download.
* @returns {JSX.Element} Rendered form component for initiating video downloads.
* @description
*   - Utilizes a form to collect inputs like URL, format, and quality from the user.
*   - Triggers a mutation function to start the download and shows a toast notification upon success or error.
*   - Default values for the form are set to an empty URL, 'mp4' format, and 'high' quality.
*   - Resets the form fields after a successful download initiation.
*/
export default function DownloadForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      format: "mp4",
      quality: "high",
      is_playlist: false,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: startDownload,
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "Your download has been queued",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input 
                  placeholder="Enter YouTube URL" 
                  {...field}
                  className="bg-black/20 border-gray-800 text-white placeholder:text-gray-500"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="format"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-black/20 border-gray-800 text-white">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="mp4">MP4</SelectItem>
                    <SelectItem value="webm">WebM</SelectItem>
                    <SelectItem value="m4a">M4A</SelectItem>
                    <SelectItem value="mp3">MP3</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quality"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-black/20 border-gray-800 text-white">
                      <SelectValue placeholder="Quality" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="high">High Quality</SelectItem>
                    <SelectItem value="medium">Medium Quality</SelectItem>
                    <SelectItem value="low">Low Quality</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button 
          type="submit" 
          className="w-full bg-white text-black hover:bg-white/90" 
          disabled={isPending}
        >
          <Download className="h-4 w-4 mr-2" />
          {isPending ? "Starting download..." : "Start Download"}
        </Button>
      </form>
    </Form>
  );
}