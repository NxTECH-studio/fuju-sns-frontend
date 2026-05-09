import { Navigate, Route, Routes } from "react-router";
import { RootLayoutRoute } from "./RootLayoutRoute";
import { HomeTimelineRoute } from "./HomeTimelineRoute";
import { GlobalTimelineRoute } from "./GlobalTimelineRoute";
import { LoginRoute } from "./LoginRoute";
import { NotFoundRoute } from "./NotFoundRoute";
import { PostDetailRoute } from "./PostDetailRoute";
import { FollowListRoute } from "./FollowListRoute";
import { UserProfileRoute } from "./UserProfileRoute";
import { SettingsRoute } from "./SettingsRoute";
import { SettingsProfileSection } from "./settings/SettingsProfileSection";
import { ImagesRoute } from "./ImagesRoute";
import { AdminBadgesRoute } from "./admin/AdminBadgesRoute";
import { AdminUserBadgesRoute } from "./admin/AdminUserBadgesRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayoutRoute />}>
        <Route index element={<HomeTimelineRoute />} />
        <Route path="global" element={<GlobalTimelineRoute />} />
        <Route path="posts/:id" element={<PostDetailRoute />} />
        <Route path="users/:sub" element={<UserProfileRoute />} />
        <Route
          path="users/:sub/followers"
          element={<FollowListRoute kind="followers" />}
        />
        <Route
          path="users/:sub/following"
          element={<FollowListRoute kind="following" />}
        />
        <Route path="settings" element={<SettingsRoute />}>
          <Route index element={<SettingsProfileSection />} />
          <Route path="profile" element={<SettingsProfileSection />} />
        </Route>
        <Route
          path="me/edit"
          element={<Navigate to="/settings/profile" replace />}
        />
        <Route path="images" element={<ImagesRoute />} />
        <Route path="admin/badges" element={<AdminBadgesRoute />} />
        <Route path="admin/users" element={<AdminUserBadgesRoute />} />
        <Route path="login" element={<LoginRoute />} />
        <Route path="*" element={<NotFoundRoute />} />
      </Route>
    </Routes>
  );
}
