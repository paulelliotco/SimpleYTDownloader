import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

/**
 * Renders a list of toast notifications using the ToastProvider.
 * @example
 * Toaster()
 * <ToastProvider>
 *   // Rendered toast notifications
 * </ToastProvider>
 * @returns {JSX.Element} A JSX element containing the ToastProvider and its children.
 * @description
 *   - Utilizes the useToast hook to manage toast notifications.
 *   - Maps through the toasts array to render each Toast component.
 *   - Allows for optional title, description, and action elements within each toast.
 */
export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
