import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav"> & {
    separator?: React.ReactNode
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />)
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
      className,
    )}
    {...props}
  />
))
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props}
  />
))
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      className={cn("transition-colors hover:text-foreground", className)}
      {...props}
    />
  )
})
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-foreground", className)}
    {...props}
  />
))
BreadcrumbPage.displayName = "BreadcrumbPage"

/**
* Renders a list item with specific styling and an optional chevron icon.
* @example
* BreadcrumbItem({ children: <span>Item</span>, className: "custom-class" })
* // Returns: <li role="presentation" aria-hidden="true" class="... custom-class">...</li>
* @param {object} {children, className, ...props} - Destructured properties including children elements, custom class names, and other list item attributes.
* @returns {JSX.Element} A styled list item element with optional chevron icon as a child.
* @description
*   - Sets a CSS class to adjust the size of SVG elements if present.
*   - Defaults to a downward chevron icon if no children are provided.
*   - Uses role "presentation" and "aria-hidden" attributes for accessibility compliance.
*/
const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

/**
* Renders a span element styled as a button for displaying more options.
* @example
* renderMoreButton("custom-class")
* <span class="flex h-9 w-9 items-center justify-center custom-class">
*   <MoreHorizontal class="h-4 w-4" />
*   <span class="sr-only">More</span>
* </span>
* @param {React.ComponentProps<"span">} props - Additional properties applied to the span element.
* @param {string} [className] - Optional custom CSS class to style the span component.
* @returns {JSX.Element} A styled span element containing an icon and a screen reader-only text.
* @description
*   - Uses the 'MoreHorizontal' component to render a horizontal ellipsis icon.
*   - Includes an aria-hidden attribute to hide this element from screen readers.
*   - The 'sr-only' span provides a textual alternative for screen readers.
*   - Combines default styles with any additional className passed through props.
*/
const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
)
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
