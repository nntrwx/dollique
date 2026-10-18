import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Routes } from 'react-router-dom';

import GuestRoute from './components/GuestRoute';
import Layout from './components/Layout';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import PlaceholderPage from './pages/PlaceholderPage';
import PostPage from './pages/PostPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { fetchCurrentUser } from './store/authSlice';

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
        <Route path="posts/new" element={<PlaceholderPage title="New post" />} />
        <Route path="posts/:id" element={<PostPage />} />
        <Route path="posts/:id/edit" element={<PlaceholderPage title="Edit post" />} />
        <Route path="categories" element={<PlaceholderPage title="Categories" />} />
        <Route path="categories/:id" element={<PlaceholderPage title="Category" />} />
        <Route path="users" element={<PlaceholderPage title="Users" />} />
        <Route path="users/:id" element={<ProfilePage />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
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
