import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
// После index.css (Tailwind) — иначе Preflight может перебить правила Leaflet с той же
// специфичностью (порядок в CSS-каскаде при равной специфичности решает импорт последним).
import 'leaflet/dist/leaflet.css'
import './lib/leafletSetup'
import { initAnalytics } from './lib/analytics/analytics'
import { router } from './routes'

const queryClient = new QueryClient()

initAnalytics(router)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
