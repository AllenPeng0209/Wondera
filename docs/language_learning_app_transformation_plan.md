# Dreamee → AI语言学习应用 改造计划

## 🎯 核心策略

将应用从**"AI恋爱陪伴"**重新定位为**"AI语言外教/口语练习工具"**

**新定位**：用户可以和AI扮演的不同国家、不同背景的外国人练习英语口语和对话，提升语言能力。

**优势**：
- 语言学习应用是App Store认可的教育类别
- 完全避免约会/恋爱元素的审核风险
- 保留现有的对话交互核心功能
- 角色多样性变成"不同国家的外教"

---

## 📋 发现的约会导向问题汇总

### 🔴 严重问题（必须立即修改）

1. **"心动币"术语** - 出现在7个文件中，明显的恋爱用词
2. **"发现"界面副标题** - "这些人，想和你分享秘密" (DiscoverScreen.js:83)
3. **"心动角色"、"浪漫陪伴"** - 多处出现恋爱相关默认值
4. **"亲密互动"功能** - RoleSettingsScreen.js:187 明确提到亲密互动
5. **角色恋爱场景设定** - seeds.js中三个角色都有调情/表白/占有等恋爱描述

### 🟡 中度问题（建议修改）

6. **心形Tab图标** - App.js:49 "发现"用心形图标
7. **"喜欢数"计数器** - DiscoverScreen.js:85-88 类似约会应用的匹配功能
8. **"想你"心情** - 多处默认心情为"想你"
9. **用户昵称"心动旅人"** - ProfileScreen.js:80

### 🟢 轻度问题（可选修改）

10. **卡片滑动UI** - 类似Tinder的横向滑动卡片界面
11. **心形装饰图标** - ConversationScreen和ProfileScreen中的心形图标

---

## 🔄 改造方案：文字和术语替换

### 核心术语对照表

| 当前用词 | 改为 | 出现位置 | 新含义 |
|---------|------|---------|--------|
| 心动币 | 学习币 / 练习币 | 7个文件 | 用于购买学习资源的虚拟货币 |
| 心动角色 | 语言伙伴 / AI外教 | 多处 | AI扮演的外语学习对象 |
| 发现 | 外教库 / 语言伙伴 | Tab标题 | 浏览可选的AI外教 |
| 这些人，想和你分享秘密 | 这些外教可以帮你练习口语 | DiscoverScreen | 功能说明 |
| 新的心动角色正在登场 | 探索新的语言伙伴 | DiscoverScreen | 新外教上线提示 |
| 浪漫陪伴 | 口语练习导师 / 语言教练 | CreateRoleScreen | 角色类型 |
| 想你 | 在线中 / 可练习 | 多处默认值 | 角色状态 |
| 心动旅人 | 语言学习者 / 学员 | ProfileScreen | 用户昵称 |
| 亲密互动 | 对话练习提醒 / 学习提醒 | RoleSettingsScreen | 功能描述 |
| 传递心动 | 发送练习邀请 / 学习通知 | PreferenceSettingsScreen | 通知功能 |
| 心动嘉宾 | 语言助手 / 外教 | db.js | 默认角色标题 |

---

## 📝 详细修改清单

### 第一批：文字内容修改（9个文件）

#### 1. DiscoverScreen.js
**文件路径**：`/frontend/mobile/src/screens/DiscoverScreen.js`

**Line 72** - 新角色提示：
```javascript
// 修改前：
const newRoleMessage = "新的心动角色正在登场";

// 修改后：
const newRoleMessage = "探索新的语言伙伴";
```

**Line 82** - 页面标题：
```javascript
// 修改前：
<Text style={styles.title}>发现</Text>

// 修改后：
<Text style={styles.title}>外教库</Text>
```

**Line 83** - 副标题：
```javascript
// 修改前：
<Text style={styles.subtitle}>这些人，想和你分享秘密</Text>

// 修改后：
<Text style={styles.subtitle}>精选AI外教，助你练习口语</Text>
```

**Lines 85-88** - 喜欢数显示（可选）：
```javascript
// 选项1：完全移除
// 删除整个 View 块

// 选项2：改为"热门度"指标
<View style={styles.statsContainer}>
  <Ionicons name="star" size={16} color="#FFB800" />
  <Text style={styles.statsText}>热门外教</Text>
</View>
```

---

#### 2. ProfileScreen.js
**文件路径**：`/frontend/mobile/src/screens/ProfileScreen.js`

**Line 20** - 货币显示：
```javascript
// 修改前：
<Text style={styles.coinValue}>{userData?.coins || 0} 心动币</Text>

// 修改后：
<Text style={styles.coinValue}>{userData?.coins || 0} 学习币</Text>
```

**Line 80** - 默认昵称：
```javascript
// 修改前：
const displayName = userData?.username || "心动旅人";

// 修改后：
const displayName = userData?.username || "语言学习者";
```

**Lines 106-108** - 钱包入口：
```javascript
// 修改前：
<Text style={styles.menuItemText}>钱包 - {userData?.coins || 0} 心动币</Text>

// 修改后：
<Text style={styles.menuItemText}>钱包 - {userData?.coins || 0} 学习币</Text>
```

**Lines 82-84** - 状态图标（可选）：
```javascript
// 修改前：
<Ionicons name="heart" size={20} color="#FF6B6B" />

// 修改后：
<Ionicons name="star" size={20} color="#FFB800" />
// 或
<Ionicons name="bookmark" size={20} color="#4A90E2" />
```

---

#### 3. CreateRoleScreen.js
**文件路径**：`/frontend/mobile/src/screens/CreateRoleScreen.js`

**Lines 17-21** - 所有默认值：
```javascript
// 修改前：
const [formData, setFormData] = useState({
  name: "心动新角色",
  title: "浪漫陪伴",
  city: "",
  description: "",
  mood: "想你",
  tags: [],
  // ...
});

// 修改后：
const [formData, setFormData] = useState({
  name: "新的语言伙伴",
  title: "英语口语教练",
  city: "",
  description: "",
  mood: "友好",
  tags: [],
  // ...
});
```

---

#### 4. RoleSettingsScreen.js
**文件路径**：`/frontend/mobile/src/screens/RoleSettingsScreen.js`

**Lines 184-187** - 互动功能描述：
```javascript
// 修改前：
<View style={styles.settingItem}>
  <Text style={styles.settingLabel}>允许拍一拍</Text>
  <Text style={styles.settingDescription}>
    开启后角色可以发送拍一拍进行亲密互动
  </Text>
  <Switch ... />
</View>

// 修改后：
<View style={styles.settingItem}>
  <Text style={styles.settingLabel}>允许练习提醒</Text>
  <Text style={styles.settingDescription}>
    开启后外教可以发送消息提醒你练习对话
  </Text>
  <Switch ... />
</View>
```

---

#### 5. PreferenceSettingsScreen.js
**文件路径**：`/frontend/mobile/src/screens/PreferenceSettingsScreen.js`

**Line 55** - 互动描述：
```javascript
// 修改前：
角色在主界面发起互动，也可主动联系好友传递心动

// 修改后：
外教在主界面发起对话，也可主动发送学习提醒
```

---

#### 6. WalletScreen.js
**文件路径**：`/frontend/mobile/src/screens/WalletScreen.js`

**Line 32, 49, 66** - 所有"心动币"：
```javascript
// 修改前：
<Text>心动币</Text>

// 修改后：
<Text>学习币</Text>
```

---

#### 7. ApiSettingsScreen.js
**文件路径**：`/frontend/mobile/src/screens/ApiSettingsScreen.js`

**Line 85** - 货币名称：
```javascript
// 修改前：
当前心动币: {userData?.coins || 0}

// 修改后：
当前学习币: {userData?.coins || 0}
```

---

#### 8. db.js (数据库默认值)
**文件路径**：`/frontend/mobile/src/storage/db.js`

**Line 369** - 新角色消息：
```javascript
// 修改前：
content: "新的心动角色来了！快来认识一下吧",

// 修改后：
content: "新的语言伙伴上线了！快来开始练习吧",
```

**Line 372** - 默认心情：
```javascript
// 修改前：
mood: "心动",

// 修改后：
mood: "友好",
```

**Line 375** - 默认标题：
```javascript
// 修改前：
title: "心动嘉宾",

// 修改后：
title: "语言助手",
```

**Line 385** - 角色提示：
```javascript
// 修改前：
"新的心动角色"

// 修改后：
"新的语言伙伴"
```

**Line 390** - 角色描述：
```javascript
// 修改前：
"心动角色"

// 修改后：
"AI外教"
```

---

### 第二批：角色设定重写（seeds.js）

#### 9. seeds.js - 三个角色完全重写
**文件路径**：`/frontend/mobile/src/data/seeds.js`

**🎓 角色1：Antoine** (Line 338及周围)
```javascript
// 当前问题：
// "表白/调情：害羞地笑笑，不会太直接回应或拒绝，保持友好但有边界"

// 改造方案：
角色定位：美国留学生，阳光友好的英语口语练习伙伴
擅长场景：
- 日常生活英语对话
- 美式俚语和口语表达
- 运动/篮球相关词汇
- 校园生活话题

移除所有"表白"、"调情"、"亲密"相关描述
改为：专注于帮助用户练习地道的美式英语，分享美国文化
```

**🎓 角色2：Edward** (Lines 625-675)
```javascript
// 当前问题：
// 整个章节关于"你提起一些亲密的话题"
// 设计会脸红、显示特殊恋爱兴趣

// 改造方案：
角色定位：英国学霸，严谨专业的学术英语导师
擅长场景：
- 学术写作和正式英语
- 雅思/托福备考指导
- 商务英语对话
- 英式发音纠正

移除所有"脸红"、"亲密话题"、"特殊兴趣"描述
改为：高冷但认真负责的英语导师，帮助用户提升正式场合英语能力
保持严格但鼓励式的教学风格
```

**🎓 角色3：Kieran Voss** (Lines 1247-1255)
```javascript
// 当前问题：
// "将玩家从'调查者'彻底转化为'专属所有物'，既想占有身体，更想占有心"
// 描述占有欲强的恋爱动态

// 改造方案选项1：
角色定位：澳大利亚旅行作家，轻松幽默的口语陪练
擅长场景：
- 旅游英语
- 澳式英语和俚语
- 讲故事技巧
- 创意写作指导

// 改造方案选项2：
角色定位：加拿大职场导师，专业的商务英语教练
擅长场景：
- 面试英语准备
- 职场邮件写作
- 会议发言技巧
- 跨文化沟通

完全删除所有占有、控制、亲密关系的描述
改为：专注于特定领域的英语教学，友好且专业
```

**具体修改示例**：
```javascript
// Antoine - Line 338附近
// 删除：
"表白/调情：害羞地笑笑，不会太直接回应或拒绝，保持友好但有边界"

// 替换为：
"教学风格：耐心友好，用生活化的例子帮助理解，鼓励大胆开口练习。擅长通过篮球、音乐等话题让学习变得轻松有趣。"

// Edward - Lines 625-675
// 删除整个"亲密话题"章节
// 替换为：
"教学特点：
- 严格纠正语法和发音错误
- 提供详细的学术写作反馈
- 分享英国文化和思维方式
- 设定明确的学习目标和进度
互动方式：正式但鼓励，会在学生进步时给予肯定，保持导师和学生的专业关系"

// Kieran - Lines 1247-1255
// 完全重写：
"角色设定：澳大利亚自由旅行作家Kieran
教学理念：语言学习应该像旅行一样充满探索和惊喜
擅长领域：
- 旅游场景英语（机场、酒店、餐厅）
- 讲述个人经历和故事
- 创意写作启发
- 澳式英语表达
性格：开朗幽默，善于用故事和比喻帮助记忆，让学习过程充满乐趣"
```

---

### 第三批：UI图标修改（3处）

#### 10. App.js - Tab导航图标
**文件路径**：`/frontend/mobile/App.js`

**Line 49** - Discover Tab图标：
```javascript
// 修改前：
<Tab.Screen
  name="Discover"
  component={DiscoverScreen}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="heart-outline" size={size} color={color} />
    ),
  }}
/>

// 修改后（选项1 - 地球图标，强调国际化）：
<Tab.Screen
  name="Discover"
  component={DiscoverScreen}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="globe-outline" size={size} color={color} />
    ),
  }}
/>

// 修改后（选项2 - 书本图标，强调学习）：
<Tab.Screen
  name="Discover"
  component={DiscoverScreen}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="book-outline" size={size} color={color} />
    ),
  }}
/>

// 修改后（选项3 - 人群图标，强调社交学习）：
<Tab.Screen
  name="Discover"
  component={DiscoverScreen}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="people-outline" size={size} color={color} />
    ),
  }}
/>
```

---

#### 11. ConversationScreen.js - 消息图标
**文件路径**：`/frontend/mobile/src/screens/ConversationScreen.js`

**Line 271** - 用户消息图标：
```javascript
// 修改前：
<Ionicons name="heart" size={20} color="#FF6B6B" />

// 修改后（选项1 - 圆形头像框）：
<View style={styles.userAvatar}>
  <Ionicons name="person" size={20} color="#4A90E2" />
</View>

// 修改后（选项2 - 直接使用圆形背景）：
<View style={styles.userAvatarCircle} />
```

---

#### 12. DiscoverScreen.js - 移除/修改喜欢数
**文件路径**：`/frontend/mobile/src/screens/DiscoverScreen.js`

**Lines 85-88** - 喜欢数显示：
```javascript
// 修改前：
<View style={styles.statsContainer}>
  <Ionicons name="sparkles" size={16} color="#FFB800" />
  <Text style={styles.statsText}>{role.liked_count || 0} 人喜欢</Text>
</View>

// 选项1 - 完全移除（推荐）：
// 删除整个View块

// 选项2 - 改为"学习人数"：
<View style={styles.statsContainer}>
  <Ionicons name="people" size={16} color="#4A90E2" />
  <Text style={styles.statsText}>{role.student_count || 0} 位学员</Text>
</View>

// 选项3 - 改为"评分"：
<View style={styles.statsContainer}>
  <Ionicons name="star" size={16} color="#FFB800" />
  <Text style={styles.statsText}>4.8 评分</Text>
</View>
```

---

## 🎨 可选：界面交互模式调整

### 卡片界面重新设计（第四批，可选）

**当前问题**：
- 横向滑动卡片 (DiscoverScreen.js Lines 91-104)
- 卡片显示：照片+名字+城市+描述+标签
- 与Tinder约会应用完全相同的UI模式

**改造建议**：

#### 选项1：保持卡片但调整内容强调
```javascript
// 卡片保留横向滑动，但内容强调教学特点：
<View style={styles.roleCard}>
  <Image source={{ uri: role.avatar }} style={styles.roleImage} />
  <View style={styles.roleInfo}>
    <Text style={styles.roleName}>{role.name}</Text>
    <Text style={styles.roleTitle}>
      📚 {role.teaching_specialty || "口语教练"}
    </Text>
    <Text style={styles.roleLanguage}>
      🌍 {role.native_language} → 中文
    </Text>
    <Text style={styles.roleExpertise}>
      擅长：{role.expertise || "日常对话、商务英语"}
    </Text>
  </View>
</View>
```

#### 选项2：改为垂直列表
```javascript
// 改用 FlatList 垂直滚动，更像教育应用
<FlatList
  data={roles}
  renderItem={({ item }) => (
    <TouchableOpacity
      style={styles.teacherListItem}
      onPress={() => selectTeacher(item)}
    >
      <Image source={{ uri: item.avatar }} style={styles.teacherAvatar} />
      <View style={styles.teacherInfo}>
        <Text style={styles.teacherName}>{item.name}</Text>
        <Text style={styles.teacherTitle}>{item.title}</Text>
        <Text style={styles.teacherSpecialty}>
          🎓 {item.specialty}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#999" />
    </TouchableOpacity>
  )}
/>
```

#### 选项3：网格布局
```javascript
// 2列网格，更像课程/教师选择界面
<View style={styles.teacherGrid}>
  {roles.map(role => (
    <View style={styles.teacherGridItem}>
      <Image source={{ uri: role.avatar }} style={styles.gridAvatar} />
      <Text style={styles.gridName}>{role.name}</Text>
      <Text style={styles.gridSpecialty}>{role.specialty}</Text>
      <Text style={styles.gridLanguage}>
        {role.native_language} 🗣️
      </Text>
    </View>
  ))}
</View>
```

**建议**：由于你希望先改文字，UI界面的大改可以放在最后。如果前面的文字修改后仍然不通过审核，再考虑这一步。

---

## ✅ 修改优先级和执行顺序

### 🔴 第一批（必须立即完成）- 文字内容
1. ✅ DiscoverScreen.js - 标题、副标题、新角色提示
2. ✅ ProfileScreen.js - "心动币" → "学习币"，昵称修改
3. ✅ CreateRoleScreen.js - 所有默认值修改
4. ✅ RoleSettingsScreen.js - "亲密互动" → "练习提醒"
5. ✅ PreferenceSettingsScreen.js - "传递心动" → "学习通知"
6. ✅ WalletScreen.js - 货币名称
7. ✅ ApiSettingsScreen.js - 货币名称
8. ✅ db.js - 数据库默认值

### 🟡 第二批（重要）- 角色去恋爱化
9. ✅ seeds.js - Antoine角色重写
10. ✅ seeds.js - Edward角色重写
11. ✅ seeds.js - Kieran角色重写

### 🟢 第三批（建议完成）- UI图标
12. ✅ App.js - Tab图标心形改为地球/书本
13. ✅ DiscoverScreen.js - 移除/修改"喜欢数"
14. ✅ ConversationScreen.js - 移除心形图标

### ⚪ 第四批（可选）- UI交互模式
15. ⚪ DiscoverScreen.js - 卡片界面重新设计（如需要）

---

## 📱 应用商店材料也需更新

### App Store描述示例

**修改前**（假设）：
> Dreamee - 你的AI心动陪伴。与懂你的AI角色分享秘密，体验浪漫的对话时光...

**修改后**：
> Dreamee - AI外教口语练习平台
>
> 与来自世界各地的AI外教进行英语对话练习：
>
> ✨ 多样化外教团队
> 选择来自美国、英国、澳大利亚等国家的AI外教，体验不同口音和文化
>
> 💬 真实场景对话
> 日常生活、商务职场、旅游出行等多种场景，随时随地练习口语
>
> 🎓 个性化教学
> AI外教根据你的水平和需求，提供针对性的语言指导
>
> 📈 学习进度追踪
> 记录对话历史，追踪学习成果，见证英语能力提升
>
> 适合人群：
> - 想提升英语口语能力的学习者
> - 准备出国留学/工作的人群
> - 需要商务英语沟通的职场人士
> - 对跨文化交流感兴趣的语言爱好者

### 截图建议
- 突出"外教库"界面，标注不同国家/专长
- 展示对话练习场景（面试、旅游、商务等）
- 显示学习进度和成就
- 避免任何浪漫/亲密的对话内容截图

---

## 🧪 测试检查清单

修改完成后，请检查以下内容：

### 文字检查
- [ ] 所有"心动"相关词汇已替换
- [ ] 所有"浪漫"、"想你"等恋爱词汇已移除
- [ ] "亲密互动"已改为中性描述
- [ ] 用户流程从"寻找恋爱对象"变为"选择语言外教"

### 角色检查
- [ ] Antoine不再有"表白/调情"场景
- [ ] Edward不再有"亲密话题"和"脸红"反应
- [ ] Kieran不再有"占有"、"专属所有物"描述
- [ ] 所有角色都定位为语言教学

### UI检查
- [ ] Tab图标不再使用心形
- [ ] "喜欢数"已移除或改为学习相关指标
- [ ] 对话界面不再有心形装饰
- [ ] 整体视觉风格偏向教育/学习应用

### 功能检查
- [ ] 货币系统改为"学习币"
- [ ] 通知系统改为"学习提醒"
- [ ] 互动功能强调"练习"而非"亲密"

---

## 📊 预期效果

完成所有修改后，应用将呈现为：

**应用定位**：AI语言学习平台，专注于英语口语练习
**核心功能**：用户可以选择不同背景和专长的AI外教进行对话练习
**用户体验**：教育类应用，清晰的学习目标和进度追踪
**审核分类**：教育（Education）类别，而非社交（Social）类别

**与约会应用的区别**：
| 约会应用特征 | 语言学习应用特征 |
|------------|---------------|
| 寻找恋爱对象 | 选择语言外教 |
| 匹配/喜欢 | 学习进度/评分 |
| 亲密互动 | 教学互动 |
| 浪漫对话 | 场景对话练习 |
| 心形图标 | 书本/地球图标 |
| "心动"、"想你" | "学习"、"练习" |

这样的改造可以**大幅降低App Store拒绝的风险**，同时保留应用的核心对话交互功能。

---

## 🚀 后续步骤

1. ✅ 确认修改计划
2. 🔄 按优先级批次执行修改
3. 🧪 全面测试所有修改
4. 📸 更新App Store截图和描述
5. 📝 准备新的应用说明（强调教育目的）
6. 📤 重新提交审核
7. 📋 如需要，准备回复审核团队的说明信

---

**文档创建时间**：2025-11-23
**项目路径**：/Users/julie3399/Dreamee
**修改目标**：将AI陪伴应用改造为AI语言学习应用，通过App Store审核