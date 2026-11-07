/**
 * BRANDCORE — Navigation Context
 * Provides page navigation state to all page components.
 * App.jsx owns activePage; consumers call setActivePage to navigate.
 */
import { createContext, useContext, useState } from 'react'

const NavigationContext = createContext(null)

export function NavigationProvider({ children }) {
  const [activePage, setActivePage] = useState('overview')
  return (
    <NavigationContext.Provider value={{ activePage, setActivePage }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const ctx = useContext(NavigationContext)
  if (!ctx) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return ctx
}
