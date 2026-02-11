const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const emojiPackageRoot = path.resolve(workspaceRoot, 'third_party', 'EmojiPackage');

const config = getDefaultConfig(projectRoot);

// Allow requiring emoji assets from the repo-level EmojiPackage folder.
config.watchFolders = [...(config.watchFolders || []), emojiPackageRoot];

module.exports = config;

