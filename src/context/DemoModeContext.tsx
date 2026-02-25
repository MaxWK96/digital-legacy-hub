import React, { createContext, useContext, useState } from 'react'

interface DemoModeContextValue {
  demoMode: boolean
  toggleDemoMode: () => void
}

const DemoModeContext = createContext<DemoModeContextValue>({
  demoMode: false,
  toggleDemoMode: () => {},
})

export const DemoModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [demoMode, setDemoMode] = useState(false)

  const toggleDemoMode = () => setDemoMode((v) => !v)

  return (
    <DemoModeContext.Provider value={{ demoMode, toggleDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  )
}

export const useDemoMode = () => useContext(DemoModeContext)
