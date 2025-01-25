import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

/**
* Renders a 404 error page indicating the requested resource was not found.
* @example
* NotFound()
* <div>...</div>
* @returns {JSX.Element} A component that displays a "404 Page Not Found" message with styling.
* @description
*   - Uses Tailwind CSS classes for styling.
*   - Centered message using flexbox utilities.
*   - Incorporates an alert icon to enhance the visual cue of an error.
*   - Suggests a possible cause of the error in a subtext.
*/
export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
