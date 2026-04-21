import { Route, Routes } from 'react-router';
import { RootLayoutRoute } from './RootLayoutRoute';
import { HomeTimelineRoute } from './HomeTimelineRoute';
import { GlobalTimelineRoute } from './GlobalTimelineRoute';
import { LoginRoute } from './LoginRoute';
import { NotFoundRoute } from './NotFoundRoute';
import { PostDetailRoute } from './PostDetailRoute';
import { FollowListRoute } from './FollowListRoute';
import { UserProfileRoute } from './UserProfileRoute';
import { MyProfileEditRoute } from './MyProfileEditRoute';
import { ImagesRoute } from './ImagesRoute';
import { AdminBadgesRoute } from './admin/AdminBadgesRoute';
import { AdminUserBadgesRoute } from './admin/AdminUserBadgesRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayoutRoute />}>
        <Route index element={<HomeTimelineRoute />} />
        <Route path="global" element={<GlobalTimelineRoute />} />
        <Route path="posts/:id" element={<PostDetailRoute />} />
        <Route path="users/:sub" element={<UserProfileRoute />} />
        <Route path="users/:sub/followers" element={<FollowListRoute kind="followers" />} />
        <Route path="users/:sub/following" element={<FollowListRoute kind="following" />} />
        <Route path="me/edit" element={<MyProfileEditRoute />} />
        <Route path="images" element={<ImagesRoute />} />
        <Route path="admin/badges" element={<AdminBadgesRoute />} />
        <Route path="admin/users" element={<AdminUserBadgesRoute />} />
        <Route path="login" element={<LoginRoute />} />
        <Route path="*" element={<NotFoundRoute />} />
      </Route>
    </Routes>
  );
}
