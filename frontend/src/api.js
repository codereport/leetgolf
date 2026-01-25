// Backend API URL - change this when you deploy your backend
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function fetchCurrentUser() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

export async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

export function getGitHubLoginUrl() {
  return `${API_URL}/auth/github`;
}
