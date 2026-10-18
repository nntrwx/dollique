import { lazy, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  Navigate, Route, Routes, useParams,
} from 'react-router-dom';

import GuestRoute from './components/GuestRoute';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import { fetchCurrentUser } from './store/authSlice';

// The feed loads with the app; every other page is fetched the first time it is opened.
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const ConfirmEmailPage = lazy(() => import('./pages/ConfirmEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage'));
const PostEditorPage = lazy(() => import('./pages/PostEditorPage'));
const PostPage = lazy(() => import('./pages/PostPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));

// A category has no page of its own: it is the feed filtered by it.
function CategoryRedirect() {
  const { id } = useParams();
  return <Navigate to={`/?categories=${id}`} replace />;
}

function App() {
  const dispatch = useDispatch();

  // If a token survived the page reload, load the fresh profile for it.
  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<HomePage />} />
        <Route path="posts/:id" element={<PostPage />} />
        <Route element={<PrivateRoute />}>
          <Route path="posts/new" element={<PostEditorPage />} />
          <Route path="posts/:id/edit" element={<PostEditorPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/:id" element={<CategoryRedirect />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<ProfilePage />} />
        <Route path="notifications" element={<PlaceholderPage title="Notifications" />} />
        <Route element={<GuestRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
        <Route path="password-reset" element={<ForgotPasswordPage />} />
        <Route path="password-reset/:token" element={<ResetPasswordPage />} />
        <Route path="confirm-email/:token" element={<ConfirmEmailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
