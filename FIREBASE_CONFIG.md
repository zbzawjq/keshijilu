# Firebase云端同步配置指南

## 重要说明

当前代码中的Firebase配置是示例配置，**需要您创建自己的Firebase项目**才能正常使用云端同步功能。

## 设置步骤

### 1. 创建Firebase项目

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 点击"添加项目"
3. 输入项目名称（例如：course-salary-tracker）
4. 按提示完成项目创建

### 2. 添加Web应用

1. 在项目概览页面，点击"Web"图标（</>）
2. 输入应用昵称（例如：课时计算器）
3. 勾选"同时为此应用设置 Firebase Hosting"（可选）
4. 点击"注册应用"

### 3. 获取配置信息

注册完成后，您会看到类似以下的配置代码：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:..."
};
```

### 4. 启用 Authentication（账号登录功能）

1. 在Firebase控制台左侧菜单，点击"Authentication"
2. 点击"Get started"或"开始使用"
3. 在"Sign-in method"（登录方法）标签页中
4. 点击"Email/Password"（电子邮件/密码）
5. 启用"Email/Password"选项
6. 点击"Save"（保存）

### 5. 启用Firestore数据库

1. 在Firebase控制台左侧菜单，点击"Firestore Database"
2. 点击"创建数据库"
3. 选择"以测试模式启动"（或生产模式）
4. 选择数据库位置（建议选择asia-east1 - 台湾）
5. 点击"启用"

### 6. 设置安全规则

在Firestore的"规则"标签中，设置以下规则：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 用户数据规则：只有已登录用户可以访问自己的数据
    match /userData/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 兼容旧的同步码系统（如果不需要可以删除）
    match /salaryData/{document=**} {
      allow read, write: if true;
    }
  }
}
```

**注意**：
- 新的账号登录系统使用 `userData` 集合，每个用户只能访问自己的数据
- `salaryData` 规则用于兼容旧系统，升级后可以删除
- 这样设置确保了不同账号的数据完全隔离，更加安全

### 7. 更新代码配置

打开 `sync.js` 文件，将第2-9行的配置替换为您自己的配置：

```javascript
const firebaseConfig = {
    apiKey: "您的API密钥",
    authDomain: "您的项目.firebaseapp.com",
    projectId: "您的项目ID",
    storageBucket: "您的项目.appspot.com",
    messagingSenderId: "您的发送者ID",
    appId: "您的应用ID"
};
```

## 使用说明

配置完成后：

### 账号登录系统（推荐）

1. 在任意浏览器打开应用
2. 点击页面顶部的"登录"按钮
3. 首次使用点击"立即注册"
   - 输入邮箱和密码（至少6位）
   - 确认密码后点击"注册"
4. 已有账号直接登录
   - 输入邮箱和密码
   - 勾选"记住账号密码"可自动登录
   - 点击"登录"
5. 在其他设备使用相同的账号密码即可同步数据
6. 不同账号的数据完全隔离，互不影响

## 常见问题

### Q: 为什么需要自己创建Firebase项目？
A: 为了数据安全和独立性，每个用户应该使用自己的Firebase项目，这样数据完全由您控制。

### Q: Firebase是免费的吗？
A: Firebase提供免费额度，对于个人使用的课时记录应用完全足够。免费额度包括：
- Firestore：每天50,000次读取、20,000次写入
- 存储：1GB

### Q: 账号密码安全吗？
A: 使用 Firebase Authentication 进行身份验证，密码经过加密存储，非常安全。Google 的安全标准是业界顶级的。

### Q: 不同账号的数据会混淆吗？
A: 不会。每个账号的数据通过用户 ID 完全隔离，其他人无法访问您的数据。

### Q: 忘记密码怎么办？
A: 目前版本暂不支持密码重置功能。建议：
- 勾选"记住密码"避免遗忘
- 定期导出 Excel 备份数据
- 妥善保管账号密码

### Q: 可以在多个设备上同时使用吗？
A: 可以。使用相同账号密码登录后，数据会实时同步到所有设备。

### Q: 数据安全吗？
A: 数据存储在Google的Firebase服务器上，安全性极高。同时建议定期导出Excel备份数据。

## 技术支持

如有问题，请查看Firebase官方文档：https://firebase.google.com/docs
