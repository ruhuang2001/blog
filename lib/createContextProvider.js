import { createContext, useContext } from 'react'

/**
 * Creates a Context Provider pattern utility to reduce code duplication
 * across config, locale, theme, and blockMap contexts.
 *
 * @param {string} displayName - The display name for the context (useful for debugging)
 * @returns {Object} { Provider, useHook } - The Provider component and custom hook
 *
 * @example
 * const { Provider: ConfigProvider, useHook: useConfig } = createContextProvider('Config')
 */
export function createContextProvider (displayName) {
  const context = createContext(undefined)
  context.displayName = displayName

  /**
   * Provider component for the context
   * @param {Object} props - { value, children }
   * @param {*} props.value - The context value to provide
   * @param {React.ReactNode} props.children - Child components
   */
  function Provider ({ value, children }) {
    return <context.Provider value={value}>{children}</context.Provider>
  }

  /**
   * Custom hook to use the context
   * @throws {Error} If used outside of the Provider
   * @returns {*} The context value
   */
  function useHook () {
    const value = useContext(context)
    if (value === undefined) {
      throw new Error(`use${displayName} must be used within a ${displayName}Provider`)
    }
    return value
  }

  return { Provider, useHook }
}
