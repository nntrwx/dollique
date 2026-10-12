import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  api, getToken, getTokenUserId, saveToken,
} from '../api/client';

// The API returns users in snake_case (GET /users/:id) or camelCase (login response).
// Keep one shape in the store.
export function normalizeUser(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    login: raw.login,
    fullName: raw.fullName ?? raw.full_name ?? '',
    email: raw.email ?? '',
    role: raw.role,
    rating: raw.rating ?? 0,
    profilePicture: raw.profilePicture ?? raw.profile_picture ?? null,
    useDollAsAvatar: Boolean(raw.use_doll_as_avatar),
    bio: raw.bio ?? '',
  };
}

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async () => {
  const userId = getTokenUserId();
  if (!userId) return null;
  try {
    const user = await api.get(`/users/${userId}`);
    return normalizeUser(user);
  } catch (error) {
    // The saved token points to a user that no longer exists: forget it.
    saveToken(null);
    throw error;
  }
});

export const login = createAsyncThunk('auth/login', async (credentials) => {
  const data = await api.post('/auth/login', credentials);
  saveToken(data.token);
  // The login answer has no bio and doll flag, so load the full profile too.
  const profile = await api.get(`/users/${data.user.id}`).catch(() => ({}));
  return normalizeUser({ ...data.user, ...profile });
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post('/auth/logout');
  } finally {
    // Even if the API call fails, the user is logged out on this device.
    saveToken(null);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    // 'loading' until we know whether the saved token is valid
    status: getToken() ? 'loading' : 'ready',
  },
  reducers: {
    userUpdated(state, action) {
      state.user = { ...state.user, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'ready';
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.status = 'ready';
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'ready';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
      });
  },
});

export const { userUpdated } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectAuthReady = (state) => state.auth.status === 'ready';

export default authSlice.reducer;
