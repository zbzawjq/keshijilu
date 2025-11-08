// Firebase配置（使用公共测试项目）
const firebaseConfig = {
    apiKey: "AIzaSyBgjaQILhhoEWVgs6LEAwoEUK3zFb2oCEc",
    authDomain: "zbzawjq-keshijisuan.firebaseapp.com",
    projectId: "zbzawjq-keshijisuan",
    storageBucket: "zbzawjq-keshijisuan.firebasestorage.app",
    messagingSenderId: "408881827749",
    appId: "1:408881827749:web:870defc75e87281f8e224c"
};

// 云端数据同步管理器
class CloudSync {
    constructor() {
        this.db = null;
        this.syncCode = localStorage.getItem('syncCode') || null;
        this.isSyncing = false;
        this.lastSyncTime = localStorage.getItem('lastSyncTime') || null;
        this.initFirebase();
    }

    initFirebase() {
        try {
            // 初始化Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            this.db = firebase.firestore();
            
            // 启用离线持久化
            this.db.enablePersistence({ synchronizeTabs: true })
                .catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.log('多个标签页打开，持久化失败');
                    } else if (err.code === 'unimplemented') {
                        console.log('浏览器不支持持久化');
                    }
                });
            
            console.log('Firebase初始化成功');
            
            // 如果已有同步码，自动开启同步
            if (this.syncCode) {
                this.startRealtimeSync();
            }
        } catch (error) {
            console.error('Firebase初始化失败:', error);
        }
    }

    // 生成文档ID（基于同步码的哈希）
    generateDocId(syncCode) {
        // 简单的哈希函数，生成固定长度的ID
        let hash = 0;
        for (let i = 0; i < syncCode.length; i++) {
            const char = syncCode.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'user_' + Math.abs(hash).toString(36);
    }

    // 设置同步码
    async setSyncCode(code) {
        if (!code || code.length < 6) {
            throw new Error('同步码至少需要6位');
        }

        this.syncCode = code;
        localStorage.setItem('syncCode', code);
        
        // 先检查云端是否有数据
        try {
            this.setSyncingStatus(true);
            const docId = this.generateDocId(this.syncCode);
            const docRef = this.db.collection('salaryData').doc(docId);
            const doc = await docRef.get();

            if (doc.exists) {
                // 云端有数据，下载到本地
                console.log('检测到云端数据，正在下载...');
                await this.downloadCloudData();
            } else {
                // 云端没有数据，上传本地数据
                console.log('云端无数据，正在上传本地数据...');
                await this.uploadLocalData();
            }
            
            this.setSyncingStatus(false);
        } catch (error) {
            console.error('同步数据失败:', error);
            this.setSyncingStatus(false);
            throw error;
        }
        
        // 开启实时同步
        this.startRealtimeSync();
        
        return true;
    }

    // 上传本地数据到云端
    async uploadLocalData() {
        if (!this.syncCode || !this.db) return;

        try {
            this.setSyncingStatus(true);
            
            const docId = this.generateDocId(this.syncCode);
            const docRef = this.db.collection('salaryData').doc(docId);

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
                syncCode: this.syncCode.substring(0, 4) + '****' // 只存储部分同步码用于验证
            }, { merge: true });

            this.lastSyncTime = new Date().toISOString();
            localStorage.setItem('lastSyncTime', this.lastSyncTime);
            
            console.log('数据已上传到云端');
            this.setSyncingStatus(false);
            
            return true;
        } catch (error) {
            console.error('上传数据失败:', error);
            this.setSyncingStatus(false);
            throw error;
        }
    }

    // 从云端下载数据
    async downloadCloudData() {
        if (!this.syncCode || !this.db) return;

        try {
            const docId = this.generateDocId(this.syncCode);
            const docRef = this.db.collection('salaryData').doc(docId);
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

                this.lastSyncTime = new Date().toISOString();
                localStorage.setItem('lastSyncTime', this.lastSyncTime);
                
                console.log('数据已从云端下载并保存到本地');
                
                // 通知页面刷新数据
                if (window.tracker) {
                    console.log('正在刷新页面数据...');
                    window.tracker.reloadData();
                }
                
                return true;
            } else {
                console.log('云端没有数据');
                return false;
            }
        } catch (error) {
            console.error('下载数据失败:', error);
            throw error;
        }
    }

    // 开启实时同步监听
    startRealtimeSync() {
        if (!this.syncCode || !this.db) return;

        const docId = this.generateDocId(this.syncCode);
        const docRef = this.db.collection('salaryData').doc(docId);

        // 监听云端数据变化
        this.unsubscribe = docRef.onSnapshot((doc) => {
            if (doc.exists && !this.isSyncing) {
                const data = doc.data();
                const cloudUpdateTime = data.lastUpdate?.toMillis() || 0;
                const localUpdateTime = new Date(this.lastSyncTime || 0).getTime();

                // 只有云端数据更新时才同步
                if (cloudUpdateTime > localUpdateTime) {
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

                    this.lastSyncTime = new Date().toISOString();
                    localStorage.setItem('lastSyncTime', this.lastSyncTime);

                    // 通知页面刷新数据
                    if (window.tracker) {
                        window.tracker.reloadData();
                    }

                    this.updateSyncStatus('已同步');
                }
            }
        }, (error) => {
            console.error('实时同步监听失败:', error);
        });

        this.updateSyncStatus('已同步');
    }

    // 停用同步
    disableSync() {
        this.syncCode = null;
        localStorage.removeItem('syncCode');
        localStorage.removeItem('lastSyncTime');
        
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        this.updateSyncStatus('未同步');
    }

    // 更新同步状态UI
    updateSyncStatus(status) {
        const syncBtn = document.getElementById('syncBtn');
        const syncStatusText = document.getElementById('syncStatusText');
        const syncStatusIcon = document.getElementById('syncStatusIcon');

        if (this.syncCode) {
            syncBtn.classList.add('synced');
            syncBtn.classList.remove('syncing');
            syncStatusIcon.textContent = '✅';
            syncStatusText.textContent = status || '已同步';
        } else {
            syncBtn.classList.remove('synced', 'syncing');
            syncStatusIcon.textContent = '☁️';
            syncStatusText.textContent = '设置同步';
        }
    }

    // 设置同步中状态
    setSyncingStatus(isSyncing) {
        this.isSyncing = isSyncing;
        const syncBtn = document.getElementById('syncBtn');
        const syncStatusText = document.getElementById('syncStatusText');
        const syncStatusIcon = document.getElementById('syncStatusIcon');

        if (isSyncing) {
            syncBtn.classList.add('syncing');
            syncStatusIcon.textContent = '🔄';
            syncStatusText.textContent = '同步中...';
        } else {
            this.updateSyncStatus();
        }
    }

    // 手动同步
    async manualSync() {
        if (!this.syncCode) {
            throw new Error('请先设置同步码');
        }

        await this.uploadLocalData();
        this.updateSyncStatus('同步完成');
        
        setTimeout(() => {
            this.updateSyncStatus('已同步');
        }, 2000);
    }

    // 获取同步状态信息
    getSyncInfo() {
        return {
            enabled: !!this.syncCode,
            syncCode: this.syncCode,
            lastSyncTime: this.lastSyncTime
        };
    }
}

// 全局实例
let cloudSync = null;

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    // 等待Firebase加载
    const initSync = () => {
        if (typeof firebase !== 'undefined') {
            cloudSync = new CloudSync();
            cloudSync.updateSyncStatus();
        } else {
            setTimeout(initSync, 100);
        }
    };
    initSync();
});
