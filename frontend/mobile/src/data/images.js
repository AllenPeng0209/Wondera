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

// Helper function to get image for a role
export function getRoleImage(roleId, type = 'avatar') {
  return roleImages[roleId]?.[type] || roleImages[roleId]?.avatar;
}
