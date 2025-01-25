import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

/**
* Wraps the ResizablePrimitive.PanelGroup component with additional styling.
* @example
* myFunction({ className: "custom-class", someProp: value })
* <ResizablePrimitive.PanelGroup ... />
* @param {Object} ObjectArgument - Object containing className and other properties.
* @param {string} ObjectArgument.className - Additional class names to style the panel group.
* @param {React.ComponentProps<typeof ResizablePrimitive.PanelGroup>} ObjectArgument.props - Additional props for the PanelGroup component.
* @returns {JSX.Element} A styled ResizablePrimitive.PanelGroup component.
* @description
*   - The PanelGroup will adapt its direction based on its data attribute, allowing for either a vertical or horizontal layout.
*   - Utilizes utility function 'cn' to concatenate multiple class names.
*/
const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

/**
* Renders a resizable panel handle with optional grip UI.
* @example
* renderResizableHandle({ withHandle: true, className: 'custom-class' })
* // Renders a JSX element with the specified className and grip handle.
* @param {boolean} withHandle - Optional flag to include a grip handle in the panel.
* @param {string} className - Additional CSS class names to apply to the handle.
* @param {object} props - Additional properties passed to the PanelResizeHandle component.
* @returns {JSX.Element} A rendered PanelResizeHandle component with optional grip handle.
* @description
*   - Uses ResizablePrimitive.PanelResizeHandle as the underlying handle element.
*   - Applies conditional styles based on panel group direction.
*   - Leverages Tailwind CSS for styling.
*/
const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
