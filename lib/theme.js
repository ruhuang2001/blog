import { createContext, useContext, useEffect, useState } from 'react'
import { useConfig } from '@/lib/config'

const ThemeContext = createContext({ dark: true })

function useMediaQuery (query, defaultState = null) {
  const [matches, setMatches] = useState(defaultState)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const media = window.matchMedia(query)
    const updateMatches = () => setMatches(media.matches)

    updateMatches()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', updateMatches)
      return () => media.removeEventListener('change', updateMatches)
    }

    media.addListener(updateMatches)
    return () => media.removeListener(updateMatches)
  }, [query])

  return matches
}

export function ThemeProvider ({ children }) {
  const { appearance } = useConfig()

  // `defaultState` should normally be a boolean. But it causes initial loading flashes in slow
  // rendering. Setting it to `null` so that we can differentiate the initial loading phase
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', null)
  const dark = appearance === 'dark' || (appearance === 'auto' && prefersDark)

  useEffect(() => {
    // Only decide color scheme after initial loading, i.e. when `dark` is really representing a
    // media query result
    if (typeof dark === 'boolean') {
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.classList.remove('color-scheme-unset')
    }
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default function useTheme () {
  return useContext(ThemeContext)
}
