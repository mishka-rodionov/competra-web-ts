import { createHashRouter } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { AboutPage } from './pages/AboutPage'
import { AddCompetitionToRatingPage } from './pages/AddCompetitionToRatingPage'
import { ClubDetailPage } from './pages/ClubDetailPage'
import { ClubJoinRequestsPage } from './pages/ClubJoinRequestsPage'
import { ClubsPage } from './pages/ClubsPage'
import { CompetitionDetailPage } from './pages/CompetitionDetailPage'
import { CompetitionsPage } from './pages/CompetitionsPage'
import { CreateClubPage } from './pages/CreateClubPage'
import { CreateCompetitionPage } from './pages/CreateCompetitionPage'
import { DiaryPage } from './pages/DiaryPage'
import { GroupMappingPage } from './pages/GroupMappingPage'
import { ManageCompetitionPage } from './pages/ManageCompetitionPage'
import { ManagementPage } from './pages/ManagementPage'
import { MyJoinRequestsPage } from './pages/MyJoinRequestsPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { ProfilePage } from './pages/ProfilePage'
import { RatingDetailPage } from './pages/RatingDetailPage'
import { RatingFormPage } from './pages/RatingFormPage'
import { RatingsSearchPage } from './pages/RatingsSearchPage'
import { TeamDetailPage } from './pages/TeamDetailPage'
import { WorkoutDetailPage } from './pages/WorkoutDetailPage'
import { WorkoutEditorPage } from './pages/WorkoutEditorPage'
import { WorkoutTrackPage } from './pages/WorkoutTrackPage'

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
  { path: '/management/:id', element: <ManageCompetitionPage /> },
  { path: '/clubs/create', element: <CreateClubPage /> },
  { path: '/clubs/my-join-requests', element: <MyJoinRequestsPage /> },
  { path: '/clubs/:id', element: <ClubDetailPage /> },
  { path: '/clubs/:id/join-requests', element: <ClubJoinRequestsPage /> },
  { path: '/teams/:id', element: <TeamDetailPage /> },
  { path: '/ratings', element: <RatingsSearchPage /> },
  { path: '/ratings/create', element: <RatingFormPage /> },
  { path: '/ratings/:id', element: <RatingDetailPage /> },
  { path: '/ratings/:id/edit', element: <RatingFormPage /> },
  { path: '/ratings/:id/add-competition', element: <AddCompetitionToRatingPage /> },
  { path: '/ratings/:id/mapping/:competitionId', element: <GroupMappingPage /> },
  { path: '/diary/create', element: <WorkoutEditorPage /> },
  { path: '/diary/:id', element: <WorkoutDetailPage /> },
  { path: '/diary/:id/edit', element: <WorkoutEditorPage /> },
  { path: '/diary/:id/track', element: <WorkoutTrackPage /> },
])
