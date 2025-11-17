## Dreamate Expo 上架通道（iOS & Android）

### 1. 代码位置与基础信息
- Expo 工程目录：`/Users/pengyanlun/workdir/Dreamate/frontend/mobile`
- 入口脚本：`App.js`，Expo 配置：`app.json`
- 新增 `eas.json`（同目录）已内置 development / preview / production 三套 Profile，可直接复用
- 版本号沿用 `app.json` 中 `expo.version`，构建号由 `autoIncrement: true` 自动递增

### 2. 环境与账号准备
- Node.js 18+、npm 9+、最新 `expo`、`eas-cli`（`npm i -g expo eas-cli`）
- Expo 账号：确保已 `expo login`
- Apple 开发者账号（99 USD/年），在 App Store Connect 中创建 App，记录：
  - Bundle ID（例如 `com.dreamate.app`）
  - TEAM ID、App Store Connect API Key（`Issuer ID`,`Key ID`,`p8` 文件）
- Google Play Console：
  - 注册开发者账号
  - 在 Play Console 创建应用，记录 Application ID（例如 `com.dreamate.app`）
  - 生成服务账号 JSON（Play API），下载后放置于 `frontend/mobile/credentials/google-service-account.json`（不纳入版本控制）

### 3. `app.json` 配置要点
1. **基础字段**
   ```json
   {
     "expo": {
       "name": "Dreamate",
       "slug": "dreamate",
       "version": "1.0.0",
       "runtimeVersion": {
         "policy": "sdkVersion"
       }
     }
   }
   ```
2. **iOS**
   ```json
   "ios": {
     "bundleIdentifier": "com.dreamate.app",
     "supportsTablet": true,
     "buildNumber": "1"
   }
   ```
3. **Android**
   ```json
   "android": {
     "package": "com.dreamate.app",
     "versionCode": 1,
     "adaptiveIcon": { ... },
     "permissions": []
   }
   ```
4. **自定义原生配置（可选）**  
   安装 `expo-build-properties`，在 `app.json` plugins 中添加：
   ```json
   [
     [
       "expo-build-properties",
       {
         "ios": { "useFrameworks": "static" },
         "android": { "compileSdkVersion": 35, "targetSdkVersion": 35 }
       }
     ]
   ]
   ```

### 4. `eas.json` 结构说明（位于 `frontend/mobile/eas.json`）
- `development`：使用开发客户端，`distribution: internal`，便于真机调试
- `preview`：灰度/测试渠道
- `production`：`autoIncrement: true` 自动递增构建号，配合 `channel: production` 用于正式上架
- `submit.production`
  - iOS：`appleId` 仅作占位，真实 Apple ID、App 专用密码通过 `eas secret:create --scope project --name APPLE_APP_SPECIFIC_PASSWORD --value *****` 注入
  - Android：`serviceAccountKeyPath` 指向本地 JSON，提交前可软链或复制至 `frontend/mobile/credentials`，`track` 设为 `production`

### 5. 凭证管理
1. **Apple**
   - `eas credentials` 选择 `iOS` -> `App Store Connect API Key`
   - 上传 `.p8`，并设置 `EXPO_APPLE_APP_SPECIFIC_PASSWORD` Secret
   - 若使用手动 Provisioning，可运行 `eas build:configure` 选择 “手动” 并上传 `.p12`、`.mobileprovision`
2. **Android**
   - 首次构建让 EAS 自动生成 Keystore，并下载备份（`expo credentials:manager`）
   - 或者上传现有 keystore：`eas credentials` -> `Android` -> `Upload Keystore`
   - Play 服务账号 JSON 仅用于 `eas submit`

### 6. 构建与提交流程
```bash
cd /Users/pengyanlun/workdir/Dreamate/frontend/mobile
expo login
eas login
eas build:configure

# 调试包
eas build --profile development --platform ios
eas build --profile development --platform android

# 预发布/测试
eas build --profile preview --platform ios
eas build --profile preview --platform android

# 商店正式包（会触发 autoIncrement）
eas build --profile production --platform ios
eas build --profile production --platform android
```

构建完成后，直接用 `eas submit`：
```bash
# iOS
eas submit --platform ios --profile production \
  --apple-id <Apple ID> \
  --asc-app-id <App Store Connect App ID> \
  --sku <SKU>

# Android
eas submit --platform android --profile production \
  --track production \
  --release-status completed
```

如需同时构建+提交，可追加 `--auto-submit`.

### 7. App Store Connect 关键动作
- 在 App Store Connect 创建 App 记录，填写名称、副标题、隐私政策 URL
- 上传图标、5.5/6.5/12.9 英寸截图、隐私营养标签
- 填写 `贸易与合规`、`App 审核信息`
- 通过 `TestFlight` 邀测后再提交审核可缩短流程

### 8. Google Play 关键动作
- 启用 App 签名（如需）并上传 EAS 生成的 keystore SHA1/SHA256
- 填写内容分级问卷、数据安全、隐私政策
- 准备不同分辨率截图（phone/tablet/7-inch/10-inch）
- 选择发布轨道（internal、alpha、beta、production）对应 `eas submit` 中 `track`

### 9. OTA 与版本策略
- 启动 `eas update`（可选）：
  ```bash
  eas update --branch production --message "hotfix: ..."
  ```
- 若引入原生依赖变化，必须重新执行 `eas build` 生成新二进制
- 版本号建议规则：
  - `expo.version`: 语义化
  - iOS `buildNumber`: 与 `CFBundleVersion` 对齐，字符串
  - Android `versionCode`: 递增整数，可与 `autoIncrement` 联动

### 10. 常见问题定位
- **Xcode 版本不兼容**：在 `eas build` 输出中查看 `EAS_BUILD_RUNTIME_VERSION`，必要时在 `eas.json -> build.production.ios.image` 指定.
- **Android 构建卡在 gradle**：开启 `EAS_NO_VCS=1`，或在 `gradle.properties` 添加 `org.gradle.jvmargs=-Xmx4096m`
- **App Store Connect 卡 `ITMS-90809`**：确保使用 App Store Connect API Key，而非用户名/密码登录
- **Google Play 提示 `App Bundle targets debug`**：确认 `distribution` 设为 `store`（默认）且未启用 `developmentClient`

完成上述配置后即可在 CI/CD 或本地稳定触发 EAS 构建并向两大商店发布。任何敏感证书务必借助 `eas secret`、`.gitignore` 管理，不要直接提交到仓库。

