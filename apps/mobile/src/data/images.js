// Image resources mapping
export const roleImages = {
  antoine: {
    avatar: require('../../assets/antonie.jpg'),
    heroImage: require('../../assets/antonie.jpg'),
  },
  edward: {
    avatar: require('../../assets/edward.png'),
    heroImage: require('../../assets/edward.png'),
  },
  kieran: {
    avatar: require('../../assets/kieran.jpg'),
    heroImage: require('../../assets/kieran.jpg'),
  },
};

function normalizeSource(source) {
  if (!source) return null;
  if (typeof source === 'string') return { uri: source };
  if (source.uri) return source;
  return source;
}

// Merge remote image URLs into the in-memory map so existing callers work.
export function primeRoleImages(roles = []) {
  roles.forEach((role) => {
    if (!role?.id) return;
    const current = roleImages[role.id] || {};
    const avatar = normalizeSource(role.avatar);
    const heroImage = normalizeSource(role.heroImage || role.hero_image);
    roleImages[role.id] = {
      avatar: avatar || current.avatar,
      heroImage: heroImage || current.heroImage || current.avatar,
    };
  });
}

// Helper function to get image for a role
export function getRoleImage(roleId, type = 'avatar') {
  const record = roleImages[roleId];
  if (!record) return null;
  return record[type] || record.avatar;
}
