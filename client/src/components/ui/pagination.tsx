import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">

/**
* Generates a pagination link component with appropriate attributes and styles.
* @example
* PaginationLink({ className: 'custom-class', isActive: true, size: 'large' })
* <a class="btn btn-outline custom-class" aria-current="page"></a>
* @param {Object} {className, isActive, size, ...props} - Props containing class name, active state, size, and any additional attributes.
* @param {string} className - Custom class name for additional styling.
* @param {boolean} isActive - Determines if the link is the current page.
* @param {string} [size='icon'] - Specifies the size variant of the button.
* @returns {JSX.Element} A styled anchor tag component used as a pagination link.
* @description
*   - Applies aria-current attribute to indicate the active page.
*   - Combines button variant styles with custom class names.
*   - Supports additional props to be spread onto the anchor element.
*/
const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className,
    )}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

/**
* Renders a PaginationLink component with a "Previous" label and a left chevron icon.
* @example
* renderPreviousPageLink("custom-class", {disabled: true})
* <PaginationLink aria-label="Go to previous page" size="default" class="gap-1 pl-2.5 custom-class" disabled>
*   <ChevronLeft className="h-4 w-4" />
*   <span>Previous</span>
* </PaginationLink>
* @param {string} className - Additional custom class names to style the PaginationLink.
* @param {object} props - Additional properties passed to the PaginationLink component.
* @returns {React.Node} A PaginationLink component configured for navigating to the previous page.
* @description
*   - Combines custom class names with default styling for spacing and padding.
*   - Incorporates "ChevronLeft" icon for intuitive navigation indication.
*/
const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

/**
* Renders a pagination link styled component with a "Next" label.
* @example
* renderNextPaginationLink({ className: "custom-class", onClick: handlePageChange })
* // Returns a PaginationLink component for navigating to the next page.
* @param {Object} {className, ...props} - Props to pass to the PaginationLink component.
* @returns {JSX.Element} A PaginationLink component with custom styling and children.
* @description
*   - Combines gap and padding-right styles with custom provided className.
*   - Spreads additional props to the PaginationLink component.
*   - Uses ChevronRight icon for indicating direction.
*/
const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

/**
* Renders a span element used for pagination with additional properties.
* @example
* PaginationComponent({ className: "custom-class", onClick: handleClick })
* <span class="flex h-9 w-9 items-center justify-center custom-class" ...additionalProps />
* @param {string} className - Additional class names to modify the styling.
* @param {Object} props - Additional properties to be spread onto the span element.
* @returns {JSX.Element} A span element representing a pagination control.
* @description
*   - The component visually represents a "more pages" control in pagination.
*   - Uses the 'MoreHorizontal' icon component within the span.
*   - Includes an 'aria-hidden' attribute to not be announced by screen readers.
*/
const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
