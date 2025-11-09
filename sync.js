// Firebase配置
// 注意：如果无法连接到Firebase，应用会自动切换到离线模式
const firebaseConfig = {
    apiKey: "AIzaSyBgjaQILhhoEWVgs6LEAwoEUK3zFb2oCEc",
    authDomain: "zbzawjq-keshijisuan.firebaseapp.com",
    projectId: "zbzawjq-keshijisuan",
    storageBucket: "zbzawjq-keshijisuan.firebasestorage.app",
    messagingSenderId: "408881827749",
    appId: "1:408881827749:web:efe2129719fa19d98e224c",
    measurementId: "G-682XQ3065D"
};

// 云端数据同步管理器（基于用户账号）
class CloudSync {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.unsubscribe = null;
        this.offlineMode = false; // 离线模式标志
        this.initFirebase();
        this.bindEventListeners();
    }

    initFirebase() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            
            // 设置网络超时
            const networkTimeout = setTimeout(() => {
                if (!this.offlineMode) {
                    console.warn('Firebase 网络连接超时，启用离线模式');
                    this.enableOfflineMode();
                }
            }, 5000); // 5秒超时
            
            // 启用离线持久化
            this.db.enablePersistence({ synchronizeTabs: true })
                .catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.log('多个标签页打开，持久化失败');
                    } else if (err.code === 'unimplemented') {
                        console.log('浏览器不支持持久化');
                    } else if (err.message.includes('configuration')) {
                        console.error('Firebase 配置错误');
                        clearTimeout(networkTimeout);
                        this.enableOfflineMode();
                    }
                });
            
            // 监听用户登录状态
            this.auth.onAuthStateChanged((user) => {
                clearTimeout(networkTimeout); // 清除超时
                this.currentUser = user;
                if (user) {
                    console.log('用户已登录:', user.email);
                    this.updateUserStatus(user.email);
                    this.startRealtimeSync();
                    this.hideLoginOverlay();
                } else {
                    console.log('用户未登录');
                    this.updateUserStatus(null);
                    this.stopRealtimeSync();
                    if (!this.offlineMode) {
                        this.showLoginOverlay();
                    }
                }
            }, (error) => {
                clearTimeout(networkTimeout);
                console.error('Firebase 认证错误:', error);
                // 网络或配置错误时启用离线模式
                if (error.code === 'auth/network-request-failed' || 
                    error.code === 'auth/configuration-not-found' ||
                    error.message.includes('configuration')) {
                    this.enableOfflineMode();
                }
            });
            
            // 尝试自动登录（如果有保存的凭据）
            this.tryAutoLogin().catch((err) => {
                console.error('自动登录失败:', err);
                if (err.code === 'auth/configuration-not-found' || 
                    err.message.includes('configuration')) {
                    clearTimeout(networkTimeout);
                    this.enableOfflineMode();
                }
            });
            
            console.log('Firebase初始化成功');
        } catch (error) {
            console.error('Firebase初始化失败:', error);
            this.enableOfflineMode();
        }
    }

    // 启用离线模式
    enableOfflineMode() {
        // 防止重复触发
        if (this.offlineMode) {
            console.log('已经处于离线模式');
            return;
        }
        
        console.log('=== 启用离线模式 ===');
        console.log('提示：应用将使用本地存储，数据仅保存在当前设备');
        
        // 标记为离线模式（先设置，避免重复触发）
        this.offlineMode = true;
        
        // 隐藏登录遮罩层
        this.hideLoginOverlay();
        
        // 关闭认证模态框
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // 更新状态显示
        const userStatusText = document.getElementById('userStatusText');
        const userStatusIcon = document.getElementById('userStatusIcon');
        if (userStatusText) userStatusText.textContent = '离线模式';
        if (userStatusIcon) userStatusIcon.textContent = '📴';
        
        // 显示提示（使用 setTimeout 确保在 DOM 更新后显示）
        setTimeout(() => {
            alert('⚠️ 无法连接到云端服务\n\n应用已切换到离线模式\n数据将仅保存在本地设备\n\n功能说明：\n✅ 可以正常添加、编辑、删除记录\n✅ 可以导出Excel\n✅ 数据保存在浏览器本地存储\n❌ 无法跨设备同步数据\n\n💡 提示：请定期导出Excel备份数据！');
        }, 100);
    }

    // 绑定事件监听器
    bindEventListeners() {
        // 绑定事件的函数
        const bindEvents = () => {
            // 欢迎页面的按钮
            const btnWelcomeLogin = document.getElementById('btnWelcomeLogin');
            const btnWelcomeRegister = document.getElementById('btnWelcomeRegister');
            
            if (btnWelcomeLogin) {
                btnWelcomeLogin.addEventListener('click', () => {
                    this.showLoginFormDirect();
                });
            }
            
            if (btnWelcomeRegister) {
                btnWelcomeRegister.addEventListener('click', () => {
                    this.showRegisterFormDirect();
                });
            }

            // 模态框内的登录按钮
            const btnLogin = document.getElementById('btnLogin');
            if (btnLogin) {
                btnLogin.addEventListener('click', () => {
                    this.login();
                });
            }

            // 模态框内的注册按钮
            const btnRegister = document.getElementById('btnRegister');
            if (btnRegister) {
                btnRegister.addEventListener('click', () => {
                    this.register();
                });
            }

            // 表单切换链接
            const linkToRegister = document.getElementById('linkToRegister');
            if (linkToRegister) {
                linkToRegister.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showRegisterForm();
                });
            }

            const linkToLogin = document.getElementById('linkToLogin');
            if (linkToLogin) {
                linkToLogin.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showLoginForm();
                });
            }

            // 模态框关闭按钮
            const authModalClose = document.getElementById('authModalClose');
            if (authModalClose) {
                authModalClose.addEventListener('click', () => {
                    this.closeAuthModal();
                });
            }

            // 为登录和注册表单添加回车键提交支持
            const loginEmail = document.getElementById('loginEmail');
            const loginPassword = document.getElementById('loginPassword');
            const registerEmail = document.getElementById('registerEmail');
            const registerPassword = document.getElementById('registerPassword');
            const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');

            const handleLoginEnter = (e) => {
                if (e.key === 'Enter') {
                    this.login();
                }
            };

            const handleRegisterEnter = (e) => {
                if (e.key === 'Enter') {
                    this.register();
                }
            };

            if (loginEmail) loginEmail.addEventListener('keypress', handleLoginEnter);
            if (loginPassword) loginPassword.addEventListener('keypress', handleLoginEnter);
            if (registerEmail) registerEmail.addEventListener('keypress', handleRegisterEnter);
            if (registerPassword) registerPassword.addEventListener('keypress', handleRegisterEnter);
            if (registerPasswordConfirm) registerPasswordConfirm.addEventListener('keypress', handleRegisterEnter);
        };

        // DOM已经加载完成，直接绑定
        // 使用 setTimeout 确保所有元素都已渲染
        setTimeout(() => {
            bindEvents();
        }, 0);
    }

    // 尝试自动登录
    async tryAutoLogin() {
        const savedEmail = localStorage.getItem('rememberedEmail');
        const savedPassword = localStorage.getItem('rememberedPassword');
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        
        if (rememberMe && savedEmail && savedPassword) {
            try {
                console.log('尝试自动登录...');
                const userCredential = await this.auth.signInWithEmailAndPassword(savedEmail, savedPassword);
                
                // 检查邮箱是否已验证
                if (!userCredential.user.emailVerified) {
                    console.log('邮箱未验证，自动登录失败');
                    await this.auth.signOut();
                    // 清除保存的凭据，因为账号未验证
                    localStorage.removeItem('rememberedEmail');
                    localStorage.removeItem('rememberedPassword');
                    localStorage.removeItem('rememberMe');
                }
            } catch (error) {
                console.log('自动登录失败:', error.message);
                // 清除无效的保存凭据
                localStorage.removeItem('rememberedEmail');
                localStorage.removeItem('rememberedPassword');
                localStorage.removeItem('rememberMe');
            }
        }
    }

    // 用户注册
    async register() {
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerPasswordConfirm').value;

        if (!email || !password) {
            alert('请填写完整的注册信息');
            return;
        }

        if (password.length < 6) {
            alert('密码至少需要6位');
            return;
        }

        if (password !== confirmPassword) {
            alert('两次输入的密码不一致');
            return;
        }

        // 检查是否处于离线模式
        if (this.offlineMode) {
            alert('⚠️ 当前为离线模式\n\n无法注册账号，应用将使用本地存储。\n\n如需使用云同步功能，请确保网络可以访问 Firebase 服务后重新加载页面。');
            return;
        }

        try {
            this.setSyncingStatus(true, '注册中...');
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            console.log('注册成功:', userCredential.user.email);
            
            // 发送邮箱验证邮件
            await userCredential.user.sendEmailVerification();
            
            // 注册成功后先退出登录，要求用户验证邮箱后再登录
            await this.auth.signOut();
            
            this.setSyncingStatus(false);
            
            // 显示注册成功提示
            alert('✅ 注册成功！\n\n📧 验证邮件已发送到您的邮箱\n请查收邮件并点击验证链接\n\n验证完成后，请使用邮箱和密码登录');
            
            // 切换到登录表单
            this.showLoginForm();
        } catch (error) {
            console.error('注册失败:', error);
            this.setSyncingStatus(false);
            
            // 网络或配置错误，切换到离线模式
            if (error.code === 'auth/network-request-failed' || 
                error.code === 'auth/configuration-not-found' ||
                error.message.includes('network') ||
                error.message.includes('configuration')) {
                alert('⚠️ 无法连接到云端服务\n\n正在切换到离线模式...');
                this.enableOfflineMode();
                return;
            }
            
            // 处理频率限制错误
            if (error.code === 'auth/too-many-requests') {
                alert('❌ 操作过于频繁\n\nFirebase 检测到异常活动，已暂时限制访问\n\n请稍后再试（建议等待 15-30 分钟）\n\n或者直接使用离线模式');
                return;
            }
            
            if (error.code === 'auth/email-already-in-use') {
                alert('该邮箱已被注册，请直接登录');
            } else if (error.code === 'auth/invalid-email') {
                alert('邮箱格式不正确');
            } else if (error.code === 'auth/weak-password') {
                alert('密码强度太弱，请使用至少6位的密码');
            } else {
                alert('注册失败: ' + error.message);
            }
        }
    }

    // 用户登录
    async login() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!email || !password) {
            alert('请填写邮箱和密码');
            return;
        }

        // 检查是否处于离线模式
        if (this.offlineMode) {
            alert('⚠️ 当前为离线模式\n\n无法登录账号，应用将使用本地存储。\n\n如需使用云同步功能，请确保网络可以访问 Firebase 服务后重新加载页面。');
            return;
        }

        try {
            this.setSyncingStatus(true, '登录中...');
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            
            // 检查邮箱是否已验证
            if (!userCredential.user.emailVerified) {
                // 邮箱未验证，退出登录
                await this.auth.signOut();
                this.setSyncingStatus(false);
                
                // 询问是否重新发送验证邮件
                const resend = confirm('❌ 邮箱尚未验证\n\n请先验证邮箱后再登录\n\n是否重新发送验证邮件？');
                if (resend) {
                    try {
                        // 重新登录以获取用户对象
                        const tempCredential = await this.auth.signInWithEmailAndPassword(email, password);
                        await tempCredential.user.sendEmailVerification();
                        await this.auth.signOut();
                        alert('✅ 验证邮件已重新发送\n\n请查收邮件并点击验证链接');
                    } catch (err) {
                        alert('❌ 发送验证邮件失败：' + err.message);
                    }
                }
                return;
            }
            
            console.log('登录成功:', userCredential.user.email);
            
            // 处理记住密码
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
                localStorage.setItem('rememberedPassword', password);
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberedEmail');
                localStorage.removeItem('rememberedPassword');
                localStorage.removeItem('rememberMe');
            }
            
            // 登录成功后下载云端数据
            await this.downloadCloudData();
            
            this.hideLoginOverlay();
            this.closeAuthModal();
            this.setSyncingStatus(false);
            alert('✅ 登录成功！欢迎回来！');
        } catch (error) {
            console.error('登录失败:', error);
            this.setSyncingStatus(false);
            
            // 网络或配置错误，切换到离线模式
            if (error.code === 'auth/network-request-failed' || 
                error.code === 'auth/configuration-not-found' ||
                error.message.includes('network') ||
                error.message.includes('configuration')) {
                alert('⚠️ 无法连接到云端服务\n\n正在切换到离线模式...');
                this.enableOfflineMode();
                return;
            }
            
            // 处理频率限制错误
            if (error.code === 'auth/too-many-requests') {
                alert('❌ 登录尝试过于频繁\n\nFirebase 已暂时限制访问\n\n请稍后再试（建议等待 15-30 分钟）\n\n或者直接使用离线模式');
                return;
            }
            
            if (error.code === 'auth/user-not-found') {
                alert('该邮箱未注册，请先注册');
            } else if (error.code === 'auth/wrong-password') {
                alert('密码错误');
            } else if (error.code === 'auth/invalid-email') {
                alert('邮箱格式不正确');
            } else {
                alert('登录失败: ' + error.message);
            }
        }
    }

    // 用户退出登录
    async logout() {
        if (!confirm('确定要退出登录吗？退出后将停止数据同步。')) {
            return;
        }

        try {
            await this.auth.signOut();
            
            // 清除记住的密码
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('rememberedPassword');
            localStorage.removeItem('rememberMe');
            
            this.closeAuthModal();
            alert('已退出登录');
        } catch (error) {
            console.error('退出登录失败:', error);
            alert('退出登录失败: ' + error.message);
        }
    }

    // 上传本地数据到云端
    async uploadLocalData() {
        if (this.offlineMode) {
            console.log('离线模式，跳过数据上传');
            return;
        }
        
        if (!this.currentUser || !this.db) {
            console.log('未登录，无法上传数据');
            return;
        }

        try {
            this.isSyncing = true;
            
            const userId = this.currentUser.uid;
            const docRef = this.db.collection('userData').doc(userId);

            // 获取本地数据
            const records = JSON.parse(localStorage.getItem('teacherSalaryRecords') || '[]');
            const students = JSON.parse(localStorage.getItem('teacherStudents') || '[]');
            const classes = JSON.parse(localStorage.getItem('teacherClasses') || '[]');

            // 上传到云端
            await docRef.set({
                records: records,
                students: students,
                classes: classes,
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp(),
                userEmail: this.currentUser.email
            }, { merge: true });

            this.lastSyncTime = new Date();
            console.log('数据已上传到云端');
            
            this.isSyncing = false;
            return true;
        } catch (error) {
            console.error('上传数据失败:', error);
            this.isSyncing = false;
            throw error;
        }
    }

    // 从云端下载数据
    async downloadCloudData() {
        if (this.offlineMode) {
            console.log('离线模式，跳过数据下载');
            return;
        }
        
        if (!this.currentUser || !this.db) {
            console.log('未登录，无法下载数据');
            return;
        }

        try {
            const userId = this.currentUser.uid;
            const docRef = this.db.collection('userData').doc(userId);
            const doc = await docRef.get();

            if (doc.exists) {
                const data = doc.data();
                
                console.log('从云端获取到数据:', {
                    records: data.records?.length || 0,
                    students: data.students?.length || 0,
                    classes: data.classes?.length || 0
                });
                
                // 更新本地数据
                if (data.records !== undefined) {
                    localStorage.setItem('teacherSalaryRecords', JSON.stringify(data.records));
                }
                if (data.students !== undefined) {
                    localStorage.setItem('teacherStudents', JSON.stringify(data.students));
                }
                if (data.classes !== undefined) {
                    localStorage.setItem('teacherClasses', JSON.stringify(data.classes));
                }

                this.lastSyncTime = new Date();
                
                console.log('数据已从云端下载并保存到本地');
                
                // 通知页面刷新数据
                if (window.tracker) {
                    console.log('正在刷新页面数据...');
                    window.tracker.reloadData();
                }
                
                return true;
            } else {
                console.log('云端暂无数据，将上传本地数据');
                await this.uploadLocalData();
                return false;
            }
        } catch (error) {
            console.error('下载数据失败:', error);
            throw error;
        }
    }

    // 开启实时同步监听
    startRealtimeSync() {
        if (this.offlineMode) {
            console.log('离线模式，跳过实时同步');
            return;
        }
        
        if (!this.currentUser || !this.db) return;

        const userId = this.currentUser.uid;
        const docRef = this.db.collection('userData').doc(userId);

        // 监听云端数据变化
        this.unsubscribe = docRef.onSnapshot((doc) => {
            if (doc.exists && !this.isSyncing) {
                const data = doc.data();
                const cloudUpdateTime = data.lastUpdate?.toMillis() || 0;
                const localUpdateTime = this.lastSyncTime ? this.lastSyncTime.getTime() : 0;

                // 只有云端数据更新时才同步（避免循环同步）
                if (cloudUpdateTime > localUpdateTime + 1000) {
                    console.log('检测到云端数据更新，正在同步...');
                    
                    // 更新本地数据
                    if (data.records) {
                        localStorage.setItem('teacherSalaryRecords', JSON.stringify(data.records));
                    }
                    if (data.students) {
                        localStorage.setItem('teacherStudents', JSON.stringify(data.students));
                    }
                    if (data.classes) {
                        localStorage.setItem('teacherClasses', JSON.stringify(data.classes));
                    }

                    this.lastSyncTime = new Date();

                    // 通知页面刷新数据
                    if (window.tracker) {
                        window.tracker.reloadData();
                    }

                    this.showSyncNotification('数据已同步');
                }
            }
        }, (error) => {
            console.error('实时同步监听失败:', error);
        });
    }

    // 停止实时同步
    stopRealtimeSync() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    // 显示同步通知
    showSyncNotification(message) {
        const userBtn = document.getElementById('userBtn');
        const originalText = document.getElementById('userStatusText').textContent;
        
        document.getElementById('userStatusIcon').textContent = '✅';
        document.getElementById('userStatusText').textContent = message;
        
        setTimeout(() => {
            if (this.currentUser) {
                document.getElementById('userStatusIcon').textContent = '👤';
                document.getElementById('userStatusText').textContent = this.currentUser.email.split('@')[0];
            }
        }, 2000);
    }

    // 更新用户状态显示
    updateUserStatus(email) {
        const userBtn = document.getElementById('userBtn');
        const userStatusText = document.getElementById('userStatusText');
        const userStatusIcon = document.getElementById('userStatusIcon');

        if (email) {
            userBtn.classList.add('logged-in');
            userStatusIcon.textContent = '👤';
            userStatusText.textContent = email.split('@')[0];
        } else {
            userBtn.classList.remove('logged-in');
            userStatusIcon.textContent = '👤';
            userStatusText.textContent = '登录';
        }
    }

    // 设置同步中状态
    setSyncingStatus(isSyncing, message = '同步中...') {
        this.isSyncing = isSyncing;
        const userStatusIcon = document.getElementById('userStatusIcon');
        const userStatusText = document.getElementById('userStatusText');

        if (isSyncing) {
            userStatusIcon.textContent = '🔄';
            userStatusText.textContent = message;
        } else if (this.currentUser) {
            userStatusIcon.textContent = '👤';
            userStatusText.textContent = this.currentUser.email.split('@')[0];
        }
    }

    // 打开认证模态框
    openUserModal() {
        const modal = document.getElementById('authModal');
        modal.classList.add('active');
        
        if (this.currentUser) {
            // 已登录，显示用户信息
            this.showUserInfo();
        } else {
            // 未登录，显示登录表单
            this.showLoginForm();
            
            // 如果有记住的账号，自动填充
            const savedEmail = localStorage.getItem('rememberedEmail');
            const savedPassword = localStorage.getItem('rememberedPassword');
            const rememberMe = localStorage.getItem('rememberMe') === 'true';
            
            if (rememberMe && savedEmail) {
                document.getElementById('loginEmail').value = savedEmail;
                document.getElementById('loginPassword').value = savedPassword || '';
                document.getElementById('rememberMe').checked = true;
            }
        }
    }

    // 关闭认证模态框
    closeAuthModal() {
        // 如果用户未登录，不允许关闭模态框
        if (!this.currentUser) {
            alert('请先登录后才能使用应用');
            return;
        }
        
        const modal = document.getElementById('authModal');
        modal.classList.remove('active');
        
        // 登录后显示关闭按钮
        document.getElementById('authModalClose').style.display = 'block';
    }

    // 显示登录表单
    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('authModalTitle').textContent = '🔐 账号登录';
    }

    // 显示注册表单
    showRegisterForm() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('authModalTitle').textContent = '📝 账号注册';
    }

    // 显示用户信息
    showUserInfo() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('authModalTitle').textContent = '👤 我的账号';
        
        if (this.currentUser) {
            document.getElementById('currentUserEmail').textContent = this.currentUser.email;
            
            if (this.lastSyncTime) {
                const timeStr = this.lastSyncTime.toLocaleString('zh-CN');
                document.getElementById('lastSyncDisplay').textContent = '最后同步: ' + timeStr;
            } else {
                document.getElementById('lastSyncDisplay').textContent = '';
            }
        }
    }

    // 获取当前用户信息
    getCurrentUser() {
        return this.currentUser;
    }

    // 检查是否已登录
    isLoggedIn() {
        return !!this.currentUser;
    }

    // 显示登录遮罩层
    showLoginOverlay() {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
        
        // 锁定body滚动，防止显示主页内容
        document.body.style.overflow = 'hidden';
        
        // 自动打开认证模态框
        setTimeout(() => {
            this.openUserModal();
        }, 300);
    }

    // 隐藏登录遮罩层
    hideLoginOverlay() {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        
        // 恢复body滚动
        document.body.style.overflow = '';
    }

    // 直接显示登录表单（从欢迎界面点击）
    showLoginFormDirect() {
        this.openUserModal();
        this.showLoginForm();
        
        // 如果有记住的账号，自动填充
        const savedEmail = localStorage.getItem('rememberedEmail');
        const savedPassword = localStorage.getItem('rememberedPassword');
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        
        if (rememberMe && savedEmail) {
            document.getElementById('loginEmail').value = savedEmail;
            document.getElementById('loginPassword').value = savedPassword || '';
            document.getElementById('rememberMe').checked = true;
        }
    }

    // 直接显示注册表单（从欢迎界面点击）
    showRegisterFormDirect() {
        this.openUserModal();
        this.showRegisterForm();
    }
}

// 全局实例
let cloudSync = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    const initSync = () => {
        if (typeof firebase !== 'undefined') {
            cloudSync = new CloudSync();
            console.log('CloudSync 已初始化');
        } else {
            console.log('等待 Firebase 加载...');
            setTimeout(initSync, 100);
        }
    };
    initSync();
});
