import { getRoleImage } from './images';

const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_TIME = Date.now();

const buildAuthor = (name, label, roleId) => ({
  name,
  label,
  avatar: getRoleImage(roleId, 'avatar'),
});

const explorePostEntries = [
  {
    id: 'post-london-journey',
    type: 'post',
    postType: '路线',
    title: '雾蓝伦敦半日散步路线',
    summary: '从泰晤士河畔到小巷咖啡馆，适合慢慢走、慢慢聊。',
    location: '伦敦',
    tags: ['伦敦', '散步', '冬日'],
    author: buildAuthor('Mori', '情绪旅行记录', 'edward'),
    images: [
      getRoleImage('edward', 'heroImage'),
      getRoleImage('antoine', 'heroImage'),
      getRoleImage('kieran', 'heroImage'),
    ],
    coverHeight: 230,
    stats: { likes: 2380, collects: 186, comments: 42 },
    createdAt: BASE_TIME - DAY_MS * 2,
    content: [
      '伦敦的冷像一层薄雾，最舒服的方式是把目的地交给脚步。',
      '从河边出发，沿着旧桥慢慢走，记住每一次风从围巾里钻过的方向。',
      '中段拐进旧书店，点一杯拿铁，把想说的话写在票据背面。',
      '最后一站是小巷咖啡馆，把今天的散步当作一场只属于你们的默契练习。',
    ],
  },
  {
    id: 'post-night-market',
    type: 'post',
    postType: '穿搭',
    title: '夜市约会穿搭清单',
    summary: '亮色外套 + 轻便鞋，走一整晚也不累。',
    location: '台北',
    tags: ['夜市', '穿搭', '约会'],
    author: buildAuthor('Rika', '今日心动造型', 'antoine'),
    images: [getRoleImage('antoine', 'heroImage'), getRoleImage('edward', 'heroImage')],
    coverHeight: 200,
    stats: { likes: 1650, collects: 92, comments: 18 },
    createdAt: BASE_TIME - DAY_MS * 4,
    content: [
      '夜市不怕热闹，怕的是脚步跟不上情绪。',
      '亮色外套可以增加照片的清晰度，低饱和裤子让整体更温柔。',
      '鞋子一定要舒服，能陪你走到最后一条摊位。',
    ],
  },
  {
    id: 'post-midnight-letter',
    type: 'post',
    postType: '心情',
    title: '写给深夜的我',
    summary: '把今天的疲惫折成一张纸，留给明天的太阳。',
    tags: ['深夜', '心情', '日记'],
    author: buildAuthor('Nora', '低声讲故事的人', 'kieran'),
    images: [getRoleImage('kieran', 'heroImage')],
    coverHeight: 250,
    stats: { likes: 980, collects: 64, comments: 9 },
    createdAt: BASE_TIME - DAY_MS * 1,
    content: [
      '今天像一杯没有加糖的咖啡，苦得刚刚好。',
      '我想把每一个想念都写下来，让它们变成可触摸的句子。',
      '等明天醒来，就让这些句子替我先说一声早安。',
    ],
  },
  {
    id: 'post-opener-guide',
    type: 'post',
    postType: '攻略',
    title: '三句让他心动的开场白',
    summary: '不尴尬、不硬聊，像在轻轻敲门。',
    tags: ['聊天', '开场白', '关系'],
    author: buildAuthor('Luma', '聊天陪练', 'edward'),
    images: [getRoleImage('edward', 'heroImage'), getRoleImage('kieran', 'heroImage')],
    coverHeight: 190,
    stats: { likes: 3120, collects: 420, comments: 76 },
    createdAt: BASE_TIME - DAY_MS * 6,
    content: [
      '“我今天路过一家很像你会喜欢的店。”',
      '“如果现在有一首歌想分享给你，你会点开吗？”',
      '“刚刚想起你说的那句话，突然笑出来了。”',
      '开场白的重点不是技巧，而是你愿意把情绪递出去。',
    ],
  },
  {
    id: 'post-breakfast',
    type: 'post',
    postType: '美食',
    title: '5 分钟法式早餐',
    summary: '用一份热气腾腾的吐司，撑起一天的温度。',
    tags: ['早餐', '生活感', '仪式感'],
    author: buildAuthor('Sia', '生活小确幸', 'antoine'),
    images: [getRoleImage('antoine', 'heroImage'), getRoleImage('edward', 'heroImage')],
    coverHeight: 210,
    stats: { likes: 1430, collects: 154, comments: 28 },
    createdAt: BASE_TIME - DAY_MS * 3,
    content: [
      '吐司微烤到微微金黄，抹上黄油和一点蜂蜜。',
      '配一杯热奶咖，窗边的光会把早餐变成一张照片。',
      '如果有人刚好在身边，记得分他半块。',
    ],
  },
  {
    id: 'post-date-list',
    type: 'post',
    postType: '清单',
    title: '一周情侣约会清单',
    summary: '从周一到周日，每天都有一个小小的期待。',
    tags: ['约会', '清单', '陪伴'],
    author: buildAuthor('Mika', '心动日程管家', 'kieran'),
    images: [getRoleImage('kieran', 'heroImage'), getRoleImage('antoine', 'heroImage')],
    coverHeight: 240,
    stats: { likes: 2260, collects: 310, comments: 52 },
    createdAt: BASE_TIME - DAY_MS * 8,
    content: [
      '周一：一起写一张“本周想完成的事情”便签。',
      '周三：晚饭后散步 20 分钟，交换今天的一个情绪。',
      '周五：一起看一部老电影，把喜欢的对白记下来。',
      '周末：挑一个从未去过的小店，记录第一次。',
    ],
  },
];

const exploreWorldEntries = [
  {
    id: 'world-london-tower',
    type: 'world',
    worldType: '云端旅途',
    title: '伦敦塔桥 · 雾蓝晨光',
    summary: '在冷色调的晨光里，慢慢听见城市醒来的心跳。',
    location: '伦敦',
    tags: ['人文', '历史', '河畔'],
    targetRoleId: 'edward',
    recommendedRoles: ['edward', 'kieran', 'antoine'],
    author: buildAuthor('云端向导', '城市走读', 'edward'),
    images: [getRoleImage('edward', 'heroImage')],
    coverHeight: 260,
    stats: { views: 12400, likes: 2100 },
    createdAt: BASE_TIME - DAY_MS * 2,
    world: {
      infoTitle: '场景信息',
      infoBody: '维多利亚时期的城市地标，桥下潮水与城市节拍交叠，适合进行慢热的对话。',
      infoTags: ['室外景标签', '历史', '城市天际线'],
      routeSteps: [
        {
          title: '塔桥外景',
          subtitle: '晨光与铁艺的纹理',
          image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
        },
        {
          title: '河畔步道',
          subtitle: '捕捉彼此的呼吸节奏',
          image: 'https://images.unsplash.com/photo-1473959383414-bddf002a13b4?auto=format&fit=crop&w=900&q=80',
        },
        {
          title: '拱桥下',
          subtitle: '触发低语式互动',
          image: 'https://images.unsplash.com/photo-1488747279002-c8523379faaa?auto=format&fit=crop&w=900&q=80',
        },
      ],
      interactionTags: ['点击触发塔桥钟声', '轻触打开河畔对话', '长按记录云端笔记'],
      actionLabel: '进入云端旅途',
    },
  },
  {
    id: 'world-kamakura',
    type: 'world',
    worldType: '世界探索',
    title: '镰仓海风 · 黄昏列车',
    summary: '海风带着盐味，列车穿过暮色，适合讲一些不敢说的心事。',
    location: '镰仓',
    tags: ['海边', '黄昏', '慢旅'],
    targetRoleId: 'antoine',
    recommendedRoles: ['antoine', 'edward', 'kieran'],
    author: buildAuthor('行程记录员', '云端旅行', 'antoine'),
    images: [getRoleImage('antoine', 'heroImage')],
    coverHeight: 220,
    stats: { views: 8600, likes: 1340 },
    createdAt: BASE_TIME - DAY_MS * 5,
    world: {
      infoTitle: '场景信息',
      infoBody: '镰仓沿海的列车线，是放慢节奏、听见心跳的最佳窗口。',
      infoTags: ['室外景标签', '海风', '日落'],
      routeSteps: [
        {
          title: '海边站台',
          subtitle: '光线渐暗的等待',
          image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
        },
        {
          title: '列车车厢',
          subtitle: '靠窗对话时段',
          image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
        },
        {
          title: '海边步道',
          subtitle: '适合发出心动信号',
          image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
        },
      ],
      interactionTags: ['点击触发海浪声', '滑动进入车厢视角', '长按保存旅途片段'],
      actionLabel: '进入世界探索',
    },
  },
  {
    id: 'world-venice',
    type: 'world',
    worldType: '云端旅途',
    title: '威尼斯 · 夜色运河',
    summary: '轻轻划过水面，把想说的话留在水纹里。',
    location: '威尼斯',
    tags: ['夜色', '运河', '浪漫'],
    targetRoleId: 'kieran',
    recommendedRoles: ['kieran', 'edward', 'antoine'],
    author: buildAuthor('夜航主持人', '云端漫游', 'kieran'),
    images: [getRoleImage('kieran', 'heroImage')],
    coverHeight: 240,
    stats: { views: 10400, likes: 2480 },
    createdAt: BASE_TIME - DAY_MS * 7,
    world: {
      infoTitle: '场景信息',
      infoBody: '夜色里的运河像一条慢慢呼吸的线，适合写下秘密或发起试探。',
      infoTags: ['夜景', '水面反光', '静谧'],
      routeSteps: [
        {
          title: '桥上远望',
          subtitle: '灯火映进眼睛',
          image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80',
        },
        {
          title: '运河中央',
          subtitle: '低声的心事交换',
          image: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=900&q=80',
        },
        {
          title: '拐角码头',
          subtitle: '触发专属对白',
          image: 'https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?auto=format&fit=crop&w=900&q=80',
        },
      ],
      interactionTags: ['点击触发船桨声', '轻触开启私密对话', '长按保存夜景记录'],
      actionLabel: '进入云端旅途',
    },
  },
];

export const explorePosts = [...explorePostEntries, ...exploreWorldEntries];

export const getExplorePostById = (id) =>
  explorePosts.find((post) => post.id === id && post.type === 'post');

export const getExploreWorldById = (id) =>
  explorePosts.find((post) => post.id === id && post.type === 'world');
