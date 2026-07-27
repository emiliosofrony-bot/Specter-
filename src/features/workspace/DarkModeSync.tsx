import { useEffect } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { parseWorkspaceConfig } from '@/api/profiles'

// Aplica workspace_config.is_dark_mode (default true, ver 0002_tables.sql) a
// la clase de <html> que consume Tailwind (`darkMode: ['class']`).
export function DarkModeSync() {
  const { data: profile } = useProfile()

  useEffect(() => {
    const isDarkMode = profile ? parseWorkspaceConfig(profile.workspace_config).is_dark_mode : true
    document.documentElement.classList.toggle('dark', isDarkMode)
    document.documentElement.classList.toggle('light', !isDarkMode)
  }, [profile])

  return null
}
