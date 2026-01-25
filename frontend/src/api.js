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

export async function fetchProblems() {
  try {
    const response = await fetch(`${API_URL}/api/problems`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to load problems');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch problems:', error);
    throw error;
  }
}

export async function fetchProblem(slug) {
  try {
    const response = await fetch(`${API_URL}/api/problems/${slug}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to load problem');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch problem:', error);
    throw error;
  }
}

// ============================================================================
// Code Runner API
// ============================================================================

/**
 * Get available languages on the server
 * @returns {Promise<{bqn: boolean, uiua: boolean, j: boolean, apl: boolean}>}
 */
export async function fetchAvailableLanguages() {
  try {
    const response = await fetch(`${API_URL}/api/languages`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch languages');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch languages:', error);
    // Return default (only BQN is guaranteed)
    return { bqn: true, uiua: false, j: false, apl: false };
  }
}

/**
 * Run code against test cases
 * @param {string} language - 'bqn', 'uiua', 'j', or 'apl'
 * @param {string} code - The user's solution code
 * @param {Array<{input: string, expected: string}>} testCases - Test cases
 * @returns {Promise<{results: Array, allPassed: boolean, passedCount: number, totalCount: number}>}
 */
export async function runTests(language, code, testCases) {
  const response = await fetch(`${API_URL}/api/run-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ language, code, testCases }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Server error' }));
    throw new Error(error.error || 'Failed to run tests');
  }
  
  return await response.json();
}

/**
 * Run code once (for REPL use)
 * @param {string} language
 * @param {string} code
 * @param {string} input
 * @returns {Promise<{success: boolean, output: string}>}
 */
export async function runCode(language, code, input = '') {
  const response = await fetch(`${API_URL}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ language, code, input }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Server error' }));
    throw new Error(error.error || 'Failed to run code');
  }
  
  return await response.json();
}

/**
 * Format Uiua code (convert ASCII names to Unicode symbols)
 * @param {string} code - Uiua code to format
 * @returns {Promise<{success: boolean, formatted: string}>}
 */
export async function formatUiua(code) {
  try {
    const response = await fetch(`${API_URL}/api/format-uiua`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      return { success: false, formatted: code };
    }
    
    return await response.json();
  } catch (error) {
    return { success: false, formatted: code };
  }
}
