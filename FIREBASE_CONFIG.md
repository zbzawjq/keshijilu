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

### 4. 启用Firestore数据库

1. 在Firebase控制台左侧菜单，点击"Firestore Database"
2. 点击"创建数据库"
3. 选择"以测试模式启动"（或生产模式）
4. 选择数据库位置（建议选择asia-east1 - 台湾）
5. 点击"启用"

### 5. 设置安全规则

在Firestore的"规则"标签中，设置以下规则：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /salaryData/{document=**} {
      allow read, write: if true;
    }
  }
}
```

**注意**：以上规则允许任何人读写数据，仅用于个人使用。如需更高安全性，请参考Firebase文档设置更严格的规则。

### 6. 更新代码配置

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

1. 在任意浏览器打开应用
2. 点击页面顶部的"设置同步"按钮
3. 输入一个6-20位的同步码（建议使用手机号）
4. 点击"启用同步"
5. 在其他浏览器使用相同的同步码即可同步数据

## 常见问题

### Q: 为什么需要自己创建Firebase项目？
A: 为了数据安全和独立性，每个用户应该使用自己的Firebase项目，这样数据完全由您控制。

### Q: Firebase是免费的吗？
A: Firebase提供免费额度，对于个人使用的课时记录应用完全足够。免费额度包括：
- Firestore：每天50,000次读取、20,000次写入
- 存储：1GB

### Q: 同步码会被其他人看到吗？
A: 同步码只存储在您的浏览器本地，不会发送到任何地方（除了用于生成文档ID）。但请不要将同步码告诉他人。

### Q: 数据安全吗？
A: 数据存储在Google的Firebase服务器上，安全性较高。但建议定期导出Excel备份数据。

## 技术支持

如有问题，请查看Firebase官方文档：https://firebase.google.com/docs
