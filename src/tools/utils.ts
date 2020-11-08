export const normalizeUsername = (username: string): string => {
  if (!username) {
    return username;
  }

  return decodeURIComponent(username)
    .toLowerCase()
    .replace(/\+.*/, '')
    .replace(/\./g, '');
};
