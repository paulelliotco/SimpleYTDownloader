import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Initializes a timeout to remove a toast notification after a delay if it doesn't already exist.
 * @example
 * initiateToastRemoval("toast123")
 * // Initiates a timeout to remove the toast with ID "toast123" after the delay if not currently tracked.
 * @param {string} toastId - The unique identifier for the toast notification.
 * @returns {void} No return value.
 * @description
 *   - The function checks if a timeout already exists for the given toast ID, preventing duplicate entries.
 *   - Utilizes `setTimeout` to schedule the removal of the toast after `TOAST_REMOVE_DELAY`.
 *   - The toast ID and its corresponding timeout are tracked in a Map called `toastTimeouts`.
 *   - Dispatches a "REMOVE_TOAST" action with the specified toast ID to handle the actual removal.
 */
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

/**
* Reducer function for managing toast notifications in application state.
* @example
* manageToasts(currentState, { type: "ADD_TOAST", toast: { id: 1, message: "New toast!" } })
* Returns a new state with the added toast in the toasts array.
* @param {State} state - Current state object including toast notifications.
* @param {Action} action - Action to perform on the state, altering the collection of toasts.
* @returns {State} New state with updated toast notifications based on the action.
* @description
*   - Handles four action types: "ADD_TOAST", "UPDATE_TOAST", "DISMISS_TOAST", and "REMOVE_TOAST".
*   - Ensures the number of toasts does not exceed a specified limit (TOAST_LIMIT).
*   - Dismissing a toast merely sets its `open` property to false without removing it immediately.
*   - Side effects such as queueing toast removals occur in "DISMISS_TOAST" action handling.
*/
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

/**
 * Displays a toast notification with customizable properties.
 * @example
 * toast({ message: "Hello, world!", duration: 3000 })
 * { id: "uniqueToastId", dismiss: [Function], update: [Function] }
 * @param {Toast} props - Object containing properties for the toast such as message and duration.
 * @returns {{id: string, dismiss: function, update: function}} An object with methods to update or dismiss the toast.
 * @description
 *   - Automatically generates a unique ID for each toast.
 *   - Adds the toast to a dispatch queue with the initial open state set to true.
 *   - Provides an update method to modify the properties of the toast after it has been displayed.
 *   - The dismiss action is triggered when the toast's open state changes to false.
 */
function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

/**
* A custom React hook for managing toast notifications.
* @example
* const { toast, dismiss } = useToast();
* console.log(toast); // Logs current toast state
* @param {void} - No arguments needed.
* @returns {object} Returns an object containing the current toast state, a method to display a toast, and a method to dismiss a toast by ID.
* @description
*   - Listeners are dynamically added and removed during component lifecycle.
*   - The function integrates a dismiss method which can target specific toasts using their ID.
*/
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
