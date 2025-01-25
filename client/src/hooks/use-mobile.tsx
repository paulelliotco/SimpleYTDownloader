import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
* Determines if the current viewport is considered "mobile" based on a predefined breakpoint.
* @example
* useIsMobile()
* true
* @param {void} None - The function does not take any arguments.
* @returns {boolean} A boolean indicating whether the current viewport is mobile.
* @description
*   - Utilizes a media query to monitor changes in the viewport's width.
*   - The mobile state is dynamically updated on viewport size changes.
*   - Listens for changes using the `matchMedia` API and manages cleanup to prevent memory leaks.
*   - Initially sets the mobile state based on the current window width.
*/
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
