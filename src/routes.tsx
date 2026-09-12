import { createHashRouter } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { AboutPage } from './pages/AboutPage'
import { ClubsPage } from './pages/ClubsPage'
import { CompetitionDetailPage } from './pages/CompetitionDetailPage'
import { CompetitionsPage } from './pages/CompetitionsPage'
import { CreateCompetitionPage } from './pages/CreateCompetitionPage'
import { DiaryPage } from './pages/DiaryPage'
import { ManagementPage } from './pages/ManagementPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { ProfilePage } from './pages/ProfilePage'

/**
 * Hash-роутинг (#/...) осознанно вместо обычного BrowserRouter — GitHub Pages
 * отдаёт статику без server-side rewrite, а значит прямой заход/обновление
 * страницы на вложенном пути (например /competition/123) дал бы 404. Хэш живёт
 * только в браузере и такой проблемы не создаёт. Можно пересмотреть на схему
 * с 404.html-редиректом (spa-github-pages), если понадобятся чистые URL.
 */
export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <CompetitionsPage /> },
      { path: '/management', element: <ManagementPage /> },
      { path: '/clubs', element: <ClubsPage /> },
      { path: '/diary', element: <DiaryPage /> },
      { path: '/profile', element: <ProfilePage /> },
    ],
  },
  // Вне AppShell — full-screen, без нижней навигации (как Page.CompetitionDetail в старом приложении).
  { path: '/competition/:id', element: <CompetitionDetailPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/privacy', element: <PrivacyPolicyPage /> },
  { path: '/management/create', element: <CreateCompetitionPage /> },
])
