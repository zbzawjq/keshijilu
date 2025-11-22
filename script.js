// 数据存储
class SalaryTracker {
    constructor() {
        this.records = this.loadRecords();
        this.students = this.loadStudents();
        this.classes = this.loadClasses();
        this.currentTimeField = null; // 当前正在选择时间的字段
        this.selectedHour = 8;
        this.selectedMinute = 0;
        this.editingStudentId = null; // 当前正在编辑的学生ID
        this.editingClassId = null; // 当前正在编辑的班级ID
        this.init();
    }

    init() {
        this.updateSummaryMonthFilter();
        this.updateSummary();
        this.updateMonthFilter();
        this.updateStudentSelect();
        this.renderRecords();
        this.bindEvents();
        this.setTodayDate();
        this.initTimePicker();
        this.showDailyQuote(); // 显示每日励志语
    }



    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('recordDate').value = today;
    }

    loadRecords() {
        const data = localStorage.getItem('teacherSalaryRecords');
        return data ? JSON.parse(data) : [];
    }

    saveRecords() {
        localStorage.setItem('teacherSalaryRecords', JSON.stringify(this.records));
        // 自动同步到云端
        if (cloudSync && cloudSync.isLoggedIn && cloudSync.isLoggedIn()) {
            cloudSync.uploadLocalData().catch(err => console.error('自动同步失败:', err));
        }
    }

    loadStudents() {
        console.log('loadStudents 被调用');
        const data = localStorage.getItem('teacherStudents');
        console.log('从 localStorage 读取的原始数据:', data);
        const students = data ? JSON.parse(data) : [];
        console.log('解析后的学生数据:', students);
        console.log('学生数量:', students.length);
        return students;
    }

    saveStudents() {
        console.log('saveStudents 被调用，保存学生数:', this.students.length);
        console.log('要保存的学生数据:', this.students);
        localStorage.setItem('teacherStudents', JSON.stringify(this.students));
        console.log('已保存到 localStorage');
        
        // 验证保存是否成功
        const saved = localStorage.getItem('teacherStudents');
        console.log('从 localStorage 读取的数据:', saved);
        
        // 自动同步到云端
        if (cloudSync && cloudSync.isLoggedIn && cloudSync.isLoggedIn()) {
            console.log('开始云同步...');
            cloudSync.uploadLocalData().catch(err => console.error('自动同步失败:', err));
        } else {
            console.log('云同步未启用或未登录');
        }
    }

    loadClasses() {
        const data = localStorage.getItem('teacherClasses');
        return data ? JSON.parse(data) : [];
    }

    saveClasses() {
        localStorage.setItem('teacherClasses', JSON.stringify(this.classes));
        // 自动同步到云端
        if (cloudSync && cloudSync.isLoggedIn && cloudSync.isLoggedIn()) {
            cloudSync.uploadLocalData().catch(err => console.error('自动同步失败:', err));
        }
    }

    addClass(classData) {
        classData.id = Date.now();
        classData.type = 'class'; // 标记为班级类型
        this.classes.push(classData);
        this.saveClasses();
        this.updateStudentSelect();
        this.renderClassList(); // 立即刷新班级列表显示
    }

    deleteClass(id) {
        if (confirm('确定要删除这个班级吗？')) {
            this.classes = this.classes.filter(c => c.id !== id);
            this.saveClasses();
            this.renderClassList();
            this.updateStudentSelect();
            this.showSuccessMessage('班级删除成功！'); // 添加成功提示
        }
    }

    editClass(id) {
        const classData = this.classes.find(c => c.id === id);
        if (!classData) return;
        
        this.editingClassId = id;
        
        // 填充表单
        document.getElementById('className').value = classData.name;
        document.getElementById('classGrade').value = classData.grade || '';
        document.getElementById('classCourse').value = classData.courseName;
        document.getElementById('classStartTime').value = classData.startTime;
        document.getElementById('classEndTime').value = classData.endTime;
        document.getElementById('classSize').value = classData.size;
        document.getElementById('classRate').value = classData.rate;
        
        // 修改按钮文本
        const submitBtn = document.querySelector('#classForm button[type="submit"]');
        submitBtn.textContent = '更新班级';
        submitBtn.classList.add('btn-update');
    }

    updateClass(id, classData) {
        const index = this.classes.findIndex(c => c.id === id);
        if (index !== -1) {
            classData.id = id;
            classData.type = 'class';
            this.classes[index] = classData;
            this.saveClasses();
            this.renderClassList();
            this.updateStudentSelect();
        }
    }

    addStudent(student) {
        student.id = Date.now();
        this.students.push(student);
        console.log('添加学生:', student.name, '当前学生总数:', this.students.length);
        console.log('当前所有学生:', this.students.map(s => s.name));
        this.saveStudents();
        this.updateStudentSelect();
        this.renderStudentList(); // 立即刷新学生列表显示
    }

    deleteStudent(id) {
        if (confirm('确定要删除这个学生吗？')) {
            this.students = this.students.filter(s => s.id !== id);
            this.saveStudents();
            this.updateStudentSelect();
            this.renderStudentList();
            this.showSuccessMessage('学生删除成功！'); // 添加成功提示
        }
    }

    editStudent(id) {
        const student = this.students.find(s => s.id === id);
        if (student) {
            this.editingStudentId = id;
            document.getElementById('studentName').value = student.name;
            document.getElementById('studentGrade').value = student.grade || '';
            document.getElementById('studentCourse').value = student.course;
            document.getElementById('studentStartTime').value = student.startTime;
            document.getElementById('studentEndTime').value = student.endTime;
            document.getElementById('studentRate').value = student.rate;
            
            // 修改按钮文字
            const submitBtn = document.querySelector('#studentForm button[type="submit"]');
            submitBtn.textContent = '更新学生';
            submitBtn.classList.add('btn-update');
            
            // 滚动到表单顶部
            document.querySelector('.student-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    updateStudent(id, studentData) {
        const index = this.students.findIndex(s => s.id === id);
        if (index !== -1) {
            this.students[index] = { ...studentData, id };
            this.saveStudents();
            this.updateStudentSelect();
            this.renderStudentList();
        }
    }

    updateStudentSelect() {
        const select = document.getElementById('studentSelect');
        if (!select) {
            console.error('找不到学生选择框元素');
            return;
        }
        
        console.log('更新学生选择框，学生数量:', this.students.length, '班级数量:', this.classes.length);
        
        select.innerHTML = '';
        
        // 添加空白默认选项
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '选择学生';
        select.appendChild(emptyOption);
        
        // 添加学生选项
        if (this.students.length > 0) {
            const studentGroup = document.createElement('optgroup');
            studentGroup.label = '👤 学生';
            this.students.forEach(student => {
                const option = document.createElement('option');
                option.value = `student-${student.id}`;
                option.textContent = student.name;
                option.dataset.type = 'student';
                studentGroup.appendChild(option);
                console.log('添加学生选项:', student.name);
            });
            select.appendChild(studentGroup);
        } else {
            console.log('没有学生数据');
        }
        
        // 添加班级选项
        if (this.classes.length > 0) {
            const classGroup = document.createElement('optgroup');
            classGroup.label = '👥 班级';
            this.classes.forEach(classData => {
                const option = document.createElement('option');
                option.value = `class-${classData.id}`;
                option.textContent = `${classData.name} (${classData.size}人)`;
                option.dataset.type = 'class';
                classGroup.appendChild(option);
                console.log('添加班级选项:', classData.name);
            });
            select.appendChild(classGroup);
        }
        
        console.log('选择框更新完成，总选项数:', select.options.length);
    }

    addRecord(record) {
        record.id = Date.now();
        record.salary = record.hours * record.rate;
        this.records.unshift(record);
        this.saveRecords();
        this.updateSummaryMonthFilter();
        this.updateSummary();
        this.updateMonthFilter();
        
        // 自动切换到新记录的月份，确保用户能看到新添加的记录
        const recordMonth = record.date.substring(0, 7); // 格式：YYYY-MM
        document.getElementById('monthFilter').value = recordMonth;
        document.getElementById('monthTotalFilter').value = recordMonth;
        document.getElementById('monthHoursFilter').value = recordMonth;
        
        this.updateSummary(); // 更新统计数据以反映新的月份筛选
        this.renderRecords();
        this.showSuccessMessage('课时记录添加成功！');
    }

    deleteRecord(id) {
        if (confirm('确定要删除这条记录吗？')) {
            this.records = this.records.filter(r => r.id !== id);
            this.saveRecords();
            this.updateSummaryMonthFilter();
            this.updateSummary();
            this.updateMonthFilter();
            this.renderRecords();
            this.showSuccessMessage('记录已删除');
        }
    }


    updateSummaryMonthFilter() {
        const monthTotalFilter = document.getElementById('monthTotalFilter');
        const monthHoursFilter = document.getElementById('monthHoursFilter');
        const months = new Set();
        
        this.records.forEach(r => {
            const month = r.date.substring(0, 7);
            months.add(month);
        });
        
        const sortedMonths = Array.from(months).sort().reverse();
        
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // 保存当前选中的值
        const currentValueTotal = monthTotalFilter.value;
        const currentValueHours = monthHoursFilter.value;
        
        // 更新两个选择器的选项
        const updateOptions = (select) => {
            select.innerHTML = '<option value="">本月</option>';
            
            sortedMonths.forEach(month => {
                const option = document.createElement('option');
                option.value = month;
                option.textContent = this.formatMonth(month);
                select.appendChild(option);
            });
        };
        
        updateOptions(monthTotalFilter);
        updateOptions(monthHoursFilter);
        
        // 恢复选中的值，如果没有则默认为当前月
        const valueToSet = currentValueTotal || currentValueHours || '';
        monthTotalFilter.value = valueToSet;
        monthHoursFilter.value = valueToSet;
    }

    updateSummary() {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // 获取选中的月份，如果为空则使用当前月
        const monthTotalFilter = document.getElementById('monthTotalFilter');
        const selectedMonth = monthTotalFilter.value || currentMonth;
        
        // 本月数据（根据选中的月份）
        const monthRecords = this.records.filter(r => r.date.startsWith(selectedMonth));
        const monthTotal = monthRecords.reduce((sum, r) => sum + r.salary, 0);
        const monthHours = monthRecords.reduce((sum, r) => sum + parseFloat(r.hours), 0);
        
        // 总数据
        const totalSalary = this.records.reduce((sum, r) => sum + r.salary, 0);
        
        document.getElementById('monthTotal').textContent = `¥${monthTotal.toFixed(2)}`;
        document.getElementById('monthHours').textContent = `${monthHours.toFixed(1)} 小时`;
        document.getElementById('totalSalary').textContent = `¥${totalSalary.toFixed(2)}`;
    }

    updateMonthFilter() {
        const select = document.getElementById('monthFilter');
        const months = new Set();
        
        this.records.forEach(r => {
            const month = r.date.substring(0, 7);
            months.add(month);
        });
        
        const sortedMonths = Array.from(months).sort().reverse();
        
        const currentValue = select.value;
        select.innerHTML = '';
        
        sortedMonths.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = this.formatMonth(month);
            select.appendChild(option);
        });
        
        // 如果当前没有选中值，默认选择本月
        if (currentValue && months.has(currentValue)) {
            select.value = currentValue;
        } else {
            const currentMonth = new Date().toISOString().substring(0, 7);
            if (months.has(currentMonth)) {
                select.value = currentMonth;
                // 同步到统计卡片
                document.getElementById('monthTotalFilter').value = currentMonth;
                document.getElementById('monthHoursFilter').value = currentMonth;
            }
        }
    }


    formatMonth(monthStr) {
        const [year, month] = monthStr.split('-');
        return `${year}年${month}月`;
    }

    formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return { month, day };
    }

    getFilteredRecords() {
        const filter = document.getElementById('monthFilter').value;
        if (!filter) {
            return this.records;
        }
        return this.records.filter(r => r.date.startsWith(filter));
    }

    renderRecords() {
        const recordsList = document.getElementById('recordsList');
        const filteredRecords = this.getFilteredRecords();
        
        if (filteredRecords.length === 0) {
            recordsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>暂无记录，开始添加你的第一条课时记录吧！</p>
                </div>
            `;
            return;
        }
        
        // 按日期倒序排列（最新的在上面），相同日期按时间倒序
        const sortedRecords = [...filteredRecords].sort((a, b) => {
            // 先按日期倒序排序
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) {
                return dateCompare;
            }
            
            // 日期相同时，按开始时间倒序排序（晚的在前）
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeB.localeCompare(timeA);
        });
        
        recordsList.innerHTML = sortedRecords.map(record => {
            const { month, day } = this.formatDate(record.date);
            const timeInfo = record.startTime && record.endTime 
                ? `${record.startTime} - ${record.endTime} (${record.hours}小时)` 
                : `${record.hours} 课时`;
            
            // 构建标题：学生姓名 + 课程名称
            const title = record.studentName 
                ? `${this.escapeHtml(record.studentName)} - ${this.escapeHtml(record.courseName)}`
                : this.escapeHtml(record.courseName);
            
            // 显示学生姓名或日期
            const displayName = record.studentName || day.toString();
            
            return `
                <div class="record-item" onclick="tracker.showRecordDetail(${record.id})" style="cursor: pointer;">
                    <div class="record-date">
                        <div class="day">${this.escapeHtml(displayName)}</div>
                        <div class="month">${month}月</div>
                    </div>
                    <div class="record-info">
                        <div class="record-course">${title}</div>
                        <div class="record-details">
                            ${timeInfo} × ¥${record.rate}/小时
                        </div>
                    </div>
                    <div class="record-salary">¥${record.salary.toFixed(2)}</div>
                    <button class="record-delete" onclick="event.stopPropagation(); tracker.deleteRecord(${record.id})">删除</button>
                </div>
            `;
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showPreview() {
        const selectedMonth = document.getElementById('monthFilter').value;
        
        if (!selectedMonth) {
            alert('请先选择要预览的月份！');
            return;
        }

        // 获取选定月份的记录并按日期升序排列（从1号到最后一天）
        let monthRecords = this.records.filter(r => r.date.startsWith(selectedMonth));
        
        if (monthRecords.length === 0) {
            alert('该月份暂无课时记录！');
            return;
        }

        // 按日期升序排列（从小到大），相同日期按时间升序
        monthRecords.sort((a, b) => {
            // 先按日期升序排序
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) {
                return dateCompare;
            }
            
            // 日期相同时，按开始时间升序排序（早的在前）
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB);
        });

        // 分离学生和班级记录
        const studentRecords = [];
        const classRecords = [];
        
        monthRecords.forEach(record => {
            if (record.studentName) {
                // 检查是否是班级记录
                const isClass = this.classes.some(c => c.name === record.studentName);
                if (isClass) {
                    classRecords.push(record);
                } else {
                    studentRecords.push(record);
                }
            } else {
                studentRecords.push(record);
            }
        });

        const modal = document.getElementById('previewModal');
        const content = document.getElementById('previewContent');
        
        const totalSalary = monthRecords.reduce((sum, r) => sum + r.salary, 0);
        const totalHours = monthRecords.reduce((sum, r) => sum + parseFloat(r.hours), 0);
        
        const monthTitle = this.formatMonth(selectedMonth);
        
        let html = `
            <div class="preview-summary">
                <h3>📊 ${monthTitle} - 课时汇总</h3>
                <div class="preview-summary-grid">
                    <div class="preview-summary-item">
                        <div class="preview-summary-label">总记录数</div>
                        <div class="preview-summary-value">${monthRecords.length} 条</div>
                    </div>
                    <div class="preview-summary-item">
                        <div class="preview-summary-label">总课时</div>
                        <div class="preview-summary-value">${totalHours.toFixed(1)} 小时</div>
                    </div>
                    <div class="preview-summary-item">
                        <div class="preview-summary-label">总工资</div>
                        <div class="preview-summary-value">¥${totalSalary.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `;
        
        // 学生记录部分
        if (studentRecords.length > 0) {
            const studentHours = studentRecords.reduce((sum, r) => sum + parseFloat(r.hours), 0);
            const studentSalary = studentRecords.reduce((sum, r) => sum + r.salary, 0);
            
            html += `
                <div class="preview-section">
                    <h4>👤 学生 (${studentRecords.length}条 | ${studentHours.toFixed(1)}小时 | ¥${studentSalary.toFixed(2)})</h4>
                    <div class="preview-table-wrapper">
                        <table class="preview-table">
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>学生姓名</th>
                                    <th>课程名称</th>
                                    <th>时间段</th>
                                    <th>课时数</th>
                                    <th>课时费</th>
                                    <th>工资</th>
                                    <th>备注</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            studentRecords.forEach(record => {
                const timeRange = record.startTime && record.endTime 
                    ? `${record.startTime}-${record.endTime}` 
                    : '-';
                html += `
                    <tr>
                        <td>${record.date}</td>
                        <td>${record.studentName ? this.escapeHtml(record.studentName) : '-'}</td>
                        <td>${this.escapeHtml(record.courseName)}</td>
                        <td>${timeRange}</td>
                        <td>${record.hours}</td>
                        <td>¥${record.rate}</td>
                        <td><strong>¥${record.salary.toFixed(2)}</strong></td>
                        <td>${record.notes ? this.escapeHtml(record.notes) : '-'}</td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        // 班级记录部分
        if (classRecords.length > 0) {
            const classHours = classRecords.reduce((sum, r) => sum + parseFloat(r.hours), 0);
            const classSalary = classRecords.reduce((sum, r) => sum + r.salary, 0);
            
            html += `
                <div class="preview-section">
                    <h4>👥 班级 (${classRecords.length}条 | ${classHours.toFixed(1)}小时 | ¥${classSalary.toFixed(2)})</h4>
                    <div class="preview-table-wrapper">
                        <table class="preview-table">
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>班级名称</th>
                                    <th>课程名称</th>
                                    <th>时间段</th>
                                    <th>课时数</th>
                                    <th>课时费</th>
                                    <th>工资</th>
                                    <th>备注</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            classRecords.forEach(record => {
                const timeRange = record.startTime && record.endTime 
                    ? `${record.startTime}-${record.endTime}` 
                    : '-';
                
                // 获取班级人数
                const classData = this.classes.find(c => c.name === record.studentName);
                const classSize = classData ? ` (${classData.size}人)` : '';
                
                html += `
                    <tr>
                        <td>${record.date}</td>
                        <td>${this.escapeHtml(record.studentName)}${classSize}</td>
                        <td>${this.escapeHtml(record.courseName)}</td>
                        <td>${timeRange}</td>
                        <td>${record.hours}</td>
                        <td>¥${record.rate}</td>
                        <td><strong>¥${record.salary.toFixed(2)}</strong></td>
                        <td>${record.notes ? this.escapeHtml(record.notes) : '-'}</td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        content.innerHTML = html;
        modal.classList.add('show');
    }

    closePreview() {
        const modal = document.getElementById('previewModal');
        modal.classList.remove('show');
    }

    // 时间选择器初始化
    initTimePicker() {
        const hourWheel = document.getElementById('hourWheel');
        const minuteWheel = document.getElementById('minuteWheel');
        
        // 生成小时选项 (0-23)
        for (let i = 0; i < 24; i++) {
            const item = document.createElement('div');
            item.className = 'wheel-item';
            item.textContent = String(i).padStart(2, '0');
            item.dataset.value = i;
            hourWheel.appendChild(item);
        }
        
        // 生成分钟选项 (0, 30)
        [0, 30].forEach(min => {
            const item = document.createElement('div');
            item.className = 'wheel-item';
            item.textContent = String(min).padStart(2, '0');
            item.dataset.value = min;
            minuteWheel.appendChild(item);
        });
        
        // 滚动事件监听
        this.setupWheelScroll(hourWheel, 'hour');
        this.setupWheelScroll(minuteWheel, 'minute');
    }

    setupWheelScroll(wheelElement, type) {
        let scrollTimeout;
        
        wheelElement.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            
            scrollTimeout = setTimeout(() => {
                const items = wheelElement.querySelectorAll('.wheel-item');
                const wheelRect = wheelElement.getBoundingClientRect();
                const centerY = wheelRect.top + wheelRect.height / 2;
                
                let closestItem = null;
                let minDistance = Infinity;
                
                items.forEach(item => {
                    const itemRect = item.getBoundingClientRect();
                    const itemCenterY = itemRect.top + itemRect.height / 2;
                    const distance = Math.abs(centerY - itemCenterY);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestItem = item;
                    }
                });
                
                if (closestItem) {
                    // 更新选中状态
                    items.forEach(item => item.classList.remove('selected'));
                    closestItem.classList.add('selected');
                    
                    // 保存选中值
                    const value = parseInt(closestItem.dataset.value);
                    if (type === 'hour') {
                        this.selectedHour = value;
                    } else {
                        this.selectedMinute = value;
                    }
                    
                    // 滚动到中心位置
                    const itemRect = closestItem.getBoundingClientRect();
                    const wheelRect = wheelElement.getBoundingClientRect();
                    const offset = itemRect.top - wheelRect.top - (wheelRect.height / 2) + (itemRect.height / 2);
                    wheelElement.scrollBy({ top: offset, behavior: 'smooth' });
                }
            }, 100);
        });
        
        // 点击项目直接选中
        wheelElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('wheel-item')) {
                const value = parseInt(e.target.dataset.value);
                if (type === 'hour') {
                    this.selectedHour = value;
                } else {
                    this.selectedMinute = value;
                }
                this.scrollToValue(wheelElement, value, type);
            }
        });
    }

    scrollToValue(wheelElement, value, type) {
        const items = wheelElement.querySelectorAll('.wheel-item');
        let targetItem = null;
        
        items.forEach(item => {
            if (parseInt(item.dataset.value) === value) {
                targetItem = item;
            }
        });
        
        if (targetItem) {
            items.forEach(item => item.classList.remove('selected'));
            targetItem.classList.add('selected');
            
            const itemRect = targetItem.getBoundingClientRect();
            const wheelRect = wheelElement.getBoundingClientRect();
            const offset = itemRect.top - wheelRect.top - (wheelRect.height / 2) + (itemRect.height / 2);
            wheelElement.scrollBy({ top: offset, behavior: 'smooth' });
        }
    }

    showTimePicker(fieldId) {
        this.currentTimeField = fieldId;
        const modal = document.getElementById('timePickerModal');
        const field = document.getElementById(fieldId);
        
        // 如果是选择结束时间，需要限制不能早于开始时间
        if (fieldId === 'endTime' || fieldId === 'studentEndTime' || fieldId === 'classEndTime') {
            let startTimeField = 'startTime';
            if (fieldId === 'studentEndTime') startTimeField = 'studentStartTime';
            if (fieldId === 'classEndTime') startTimeField = 'classStartTime';
            
            const startTime = document.getElementById(startTimeField).value;
            if (!startTime) {
                alert('请先选择开始时间！');
                return;
            }
            const [startHour, startMinute] = startTime.split(':').map(v => parseInt(v));
            this.minEndHour = startHour;
            this.minEndMinute = startMinute;
        } else {
            this.minEndHour = null;
            this.minEndMinute = null;
        }
        
        // 如果字段已有值，解析并设置到选择器
        if (field.value) {
            const [hour, minute] = field.value.split(':').map(v => parseInt(v));
            this.selectedHour = hour;
            this.selectedMinute = minute;
        } else {
            // 默认时间
            if ((fieldId === 'endTime' || fieldId === 'studentEndTime' || fieldId === 'classEndTime') && this.minEndHour !== null) {
                // 结束时间默认为开始时间+1小时
                this.selectedHour = this.minEndHour + 1;
                this.selectedMinute = this.minEndMinute;
                if (this.selectedHour >= 24) {
                    this.selectedHour = 23;
                    this.selectedMinute = 30;
                }
            } else {
                this.selectedHour = 8;
                this.selectedMinute = 0;
            }
        }
        
        // 滚动到当前值
        const hourWheel = document.getElementById('hourWheel');
        const minuteWheel = document.getElementById('minuteWheel');
        
        setTimeout(() => {
            this.scrollToValue(hourWheel, this.selectedHour, 'hour');
            this.scrollToValue(minuteWheel, this.selectedMinute, 'minute');
        }, 100);
        
        modal.classList.add('show');
    }

    confirmTimePicker() {
        // 如果是选择结束时间，验证不能早于开始时间
        if ((this.currentTimeField === 'endTime' || this.currentTimeField === 'studentEndTime' || this.currentTimeField === 'classEndTime') && this.minEndHour !== null) {
            const selectedTotalMinutes = this.selectedHour * 60 + this.selectedMinute;
            const minTotalMinutes = this.minEndHour * 60 + this.minEndMinute;
            
            if (selectedTotalMinutes <= minTotalMinutes) {
                alert('结束时间必须晚于开始时间！');
                return;
            }
        }
        
        const timeStr = `${String(this.selectedHour).padStart(2, '0')}:${String(this.selectedMinute).padStart(2, '0')}`;
        document.getElementById(this.currentTimeField).value = timeStr;
        this.closeTimePicker();
        
        // 只对添加记录表单的时间字段进行自动计算
        if (this.currentTimeField === 'startTime') {
            const hoursInput = document.getElementById('hours').value;
            if (hoursInput) {
                this.calculateEndTime();
            }
        } else if (this.currentTimeField === 'endTime') {
            // 如果是修改结束时间，计算课时数
            this.calculateHours();
        } else if (this.currentTimeField === 'studentStartTime' || this.currentTimeField === 'classStartTime') {
            // 如果是选择上课时间，自动计算下课时间（加2小时）
            let endHour = this.selectedHour + 2;
            let endMinute = this.selectedMinute;
            
            // 如果超过24小时，调整为当天的时间
            if (endHour >= 24) {
                endHour = endHour - 24;
            }
            
            const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
            const endTimeField = this.currentTimeField === 'studentStartTime' ? 'studentEndTime' : 'classEndTime';
            document.getElementById(endTimeField).value = endTimeStr;
        }
    }

    cancelTimePicker() {
        this.closeTimePicker();
    }

    closeTimePicker() {
        const modal = document.getElementById('timePickerModal');
        modal.classList.remove('show');
    }

    showStudentModal() {
        this.renderStudentList();
        const modal = document.getElementById('studentModal');
        modal.classList.add('show');
    }

    closeStudentModal() {
        const modal = document.getElementById('studentModal');
        modal.classList.remove('show');
        document.getElementById('studentForm').reset();
        
        // 取消编辑模式
        if (this.editingStudentId) {
            this.editingStudentId = null;
            const submitBtn = document.querySelector('#studentForm button[type="submit"]');
            submitBtn.textContent = '添加学生';
            submitBtn.classList.remove('btn-update');
        }
    }

    showClassModal() {
        this.renderClassList();
        const modal = document.getElementById('classModal');
        modal.classList.add('show');
    }

    closeClassModal() {
        const modal = document.getElementById('classModal');
        modal.classList.remove('show');
        document.getElementById('classForm').reset();
        
        // 取消编辑模式
        if (this.editingClassId) {
            this.editingClassId = null;
            const submitBtn = document.querySelector('#classForm button[type="submit"]');
            submitBtn.textContent = '添加班级';
            submitBtn.classList.remove('btn-update');
        }
    }

    showRecordDetail(id) {
        const record = this.records.find(r => r.id === id);
        if (!record) return;
        
        const { month, day } = this.formatDate(record.date);
        const timeInfo = record.startTime && record.endTime 
            ? `${record.startTime} - ${record.endTime}` 
            : '未记录';
        
        // 判断是否是班级，并获取班级人数
        const isClass = record.studentName && this.classes.some(c => c.name === record.studentName);
        const classData = isClass ? this.classes.find(c => c.name === record.studentName) : null;
        const nameLabel = isClass ? '👥 班级名称' : '👤 学生姓名';
        const nameValue = record.studentName 
            ? (isClass && classData ? `${this.escapeHtml(record.studentName)} (${classData.size}人)` : this.escapeHtml(record.studentName))
            : '未填写';
        
        const content = `
            <div class="detail-section">
                <div class="detail-row">
                    <span class="detail-label">${nameLabel}</span>
                    <span class="detail-value">${nameValue}</span>
                </div>
                ${record.grade ? `
                <div class="detail-row">
                    <span class="detail-label">🎓 年级</span>
                    <span class="detail-value">${this.escapeHtml(record.grade)}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">📚 课程名称</span>
                    <span class="detail-value">${this.escapeHtml(record.courseName)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📅 上课日期</span>
                    <span class="detail-value">${record.date} (${month}月${day}日)</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">⏰ 上课时间</span>
                    <span class="detail-value">${timeInfo}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">⏱️ 课时数</span>
                    <span class="detail-value">${record.hours} 小时</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">💰 课时费</span>
                    <span class="detail-value">¥${record.rate}/小时</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">💵 总工资</span>
                    <span class="detail-value total-salary">¥${record.salary.toFixed(2)}</span>
                </div>
                ${record.notes ? `
                <div class="detail-row">
                    <span class="detail-label">📝 备注</span>
                    <span class="detail-value">${this.escapeHtml(record.notes)}</span>
                </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('recordDetailContent').innerHTML = content;
        const modal = document.getElementById('recordDetailModal');
        modal.classList.add('show');
    }

    closeRecordDetail() {
        const modal = document.getElementById('recordDetailModal');
        modal.classList.remove('show');
    }

    renderStudentList() {
        const listContainer = document.getElementById('studentList');
        
        console.log('renderStudentList 被调用');
        console.log('listContainer:', listContainer);
        console.log('学生数量:', this.students.length);
        console.log('学生列表:', this.students);
        
        if (!listContainer) {
            console.error('找不到 studentList 容器元素！');
            return;
        }
        
        if (this.students.length === 0) {
            console.log('学生列表为空，显示空状态');
            listContainer.innerHTML = '<p class="empty-message">暂无学生，请先添加学生</p>';
            return;
        }
        
        console.log('开始渲染学生列表，共', this.students.length, '个学生');
        listContainer.innerHTML = this.students.map(student => {
            const hours = this.calculateHoursFromTimes(student.startTime, student.endTime);
            return `
                <div class="student-item">
                    <div class="student-info">
                        <div class="student-name">${this.escapeHtml(student.name)}${student.grade ? ` (${this.escapeHtml(student.grade)})` : ''}</div>
                        <div class="student-details">
                            ${this.escapeHtml(student.course)} | ${student.startTime}-${student.endTime} (${hours}h) | ¥${student.rate}/小时
                        </div>
                    </div>
                    <div class="student-actions">
                        <button class="btn-edit-student" onclick="tracker.editStudent(${student.id})">修改</button>
                        <button class="btn-delete-student" onclick="tracker.deleteStudent(${student.id})">删除</button>
                    </div>
                </div>
            `;
        }).join('');
        console.log('学生列表渲染完成');
    }

    renderClassList() {
        const listContainer = document.getElementById('classList');
        
        if (this.classes.length === 0) {
            listContainer.innerHTML = '<p class="empty-message">暂无班级，请先添加班级</p>';
            return;
        }
        
        listContainer.innerHTML = this.classes.map(classData => {
            const hours = this.calculateHoursFromTimes(classData.startTime, classData.endTime);
            return `
                <div class="student-item">
                    <div class="student-info">
                        <div class="student-name">${this.escapeHtml(classData.name)}${classData.grade ? ` (${this.escapeHtml(classData.grade)})` : ''} - ${classData.size}人</div>
                        <div class="student-details">
                            ${this.escapeHtml(classData.courseName)} | ${classData.startTime}-${classData.endTime} (${hours}h) | ¥${classData.rate}/小时
                        </div>
                    </div>
                    <div class="student-actions">
                        <button class="btn-edit-student" onclick="tracker.editClass(${classData.id})">修改</button>
                        <button class="btn-delete-student" onclick="tracker.deleteClass(${classData.id})">删除</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    calculateHoursFromTimes(startTime, endTime) {
        if (!startTime || !endTime) {
            return '0.0';
        }
        
        const [startHour, startMinute] = startTime.split(':').map(v => parseInt(v));
        const [endHour, endMinute] = endTime.split(':').map(v => parseInt(v));
        
        if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
            return '0.0';
        }
        
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        
        let diffMinutes = endTotalMinutes - startTotalMinutes;
        if (diffMinutes < 0) {
            diffMinutes += 24 * 60;
        }
        
        return (diffMinutes / 60).toFixed(1);
    }

    onStudentSelect() {
        const select = document.getElementById('studentSelect');
        const selectedValue = select.value;
        
        if (!selectedValue) {
            return;
        }
        
        // 解析选择的类型和ID
        const [type, idStr] = selectedValue.split('-');
        const id = parseInt(idStr);
        
        if (type === 'student') {
            const student = this.students.find(s => s.id === id);
            if (student) {
                document.getElementById('recordGrade').value = student.grade || '';
                document.getElementById('courseName').value = student.course;
                document.getElementById('startTime').value = student.startTime;
                document.getElementById('endTime').value = student.endTime;
                document.getElementById('rate').value = student.rate;
                
                // 使用setTimeout确保DOM更新后再计算课时数
                setTimeout(() => {
                    this.calculateHours();
                }, 0);
            }
        } else if (type === 'class') {
            const classData = this.classes.find(c => c.id === id);
            if (classData) {
                document.getElementById('recordGrade').value = classData.grade || '';
                document.getElementById('courseName').value = classData.courseName;
                document.getElementById('startTime').value = classData.startTime;
                document.getElementById('endTime').value = classData.endTime;
                document.getElementById('rate').value = classData.rate;
                
                // 使用setTimeout确保DOM更新后再计算课时数
                setTimeout(() => {
                    this.calculateHours();
                }, 0);
            }
        }
    }

    calculateHours() {
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        
        if (startTime && endTime) {
            const [startHour, startMinute] = startTime.split(':').map(v => parseInt(v));
            const [endHour, endMinute] = endTime.split(':').map(v => parseInt(v));
            
            const startTotalMinutes = startHour * 60 + startMinute;
            const endTotalMinutes = endHour * 60 + endMinute;
            
            let diffMinutes = endTotalMinutes - startTotalMinutes;
            
            // 如果结束时间小于开始时间，说明跨天了
            if (diffMinutes < 0) {
                diffMinutes += 24 * 60;
            }
            
            const hours = diffMinutes / 60;
            document.getElementById('hours').value = hours.toFixed(1);
        }
    }

    calculateEndTime() {
        const startTime = document.getElementById('startTime').value;
        const hoursInput = document.getElementById('hours').value;
        
        if (startTime && hoursInput) {
            const hours = parseFloat(hoursInput);
            if (isNaN(hours) || hours <= 0) {
                return;
            }
            
            const [startHour, startMinute] = startTime.split(':').map(v => parseInt(v));
            const startTotalMinutes = startHour * 60 + startMinute;
            
            // 计算结束时间（分钟数）
            const totalMinutes = hours * 60;
            let endTotalMinutes = startTotalMinutes + totalMinutes;
            
            // 处理跨天情况
            if (endTotalMinutes >= 24 * 60) {
                endTotalMinutes = endTotalMinutes % (24 * 60);
            }
            
            const endHour = Math.floor(endTotalMinutes / 60);
            const endMinute = Math.round(endTotalMinutes % 60);
            
            // 更新结束时间
            const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
            document.getElementById('endTime').value = endTimeStr;
        }
    }

    exportExcel() {
        const exportMonth = document.getElementById('monthFilter').value;
        
        if (!exportMonth) {
            alert('请先选择要导出的月份！');
            return;
        }

        // 获取选定月份的记录并按日期排序
        let exportRecords = this.records.filter(r => r.date.startsWith(exportMonth));
        
        if (exportRecords.length === 0) {
            alert('该月份暂无数据可导出！');
            return;
        }

        // 按日期和时间排序（升序）
        exportRecords.sort((a, b) => {
            // 先按日期排序
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) {
                return dateCompare;
            }
            
            // 日期相同时，按开始时间排序
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB);
        });

        const totalSalary = exportRecords.reduce((sum, r) => sum + r.salary, 0);
        const totalHours = exportRecords.reduce((sum, r) => sum + parseFloat(r.hours), 0);
        
        // 准备数据
        const data = exportRecords.map(record => {
            // 合并日期和时间段
            let dateTime = record.date;
            if (record.startTime && record.endTime) {
                dateTime = `${record.date} ${record.startTime}-${record.endTime}`;
            }
            
            // 判断是否是班级，获取人数
            let personCount = 1; // 学生默认1人
            if (record.studentName) {
                const classData = this.classes.find(c => c.name === record.studentName);
                if (classData) {
                    personCount = classData.size;
                }
            }
            
            return {
                '上课时间': dateTime,
                '学生姓名': record.studentName || '',
                '年级': record.grade || '',
                '课程名称': record.courseName,
                '人数': personCount,
                '课时数': record.hours,
                '课时费': record.rate,
                '工资': record.salary,
                '备注': record.notes || ''
            };
        });
        
        // 计算总人数
        const totalPersons = exportRecords.reduce((sum, record) => {
            let personCount = 1;
            if (record.studentName) {
                const classData = this.classes.find(c => c.name === record.studentName);
                if (classData) {
                    personCount = classData.size;
                }
            }
            return sum + personCount;
        }, 0);
        
        // 添加汇总行
        data.push({});
        data.push({
            '上课时间': '汇总统计',
            '学生姓名': '',
            '年级': '',
            '课程名称': '',
            '人数': totalPersons,
            '课时数': totalHours.toFixed(1),
            '课时费': '',
            '工资': totalSalary.toFixed(2),
            '备注': `共${exportRecords.length}条记录`
        });
        
        // 创建工作簿
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '课时记录');
        
        // 下载文件，文件名包含月份信息
        const [year, month] = exportMonth.split('-');
        const fileName = `课时工资记录_${year}年${month}月.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        this.showSuccessMessage(`${year}年${month}月Excel文件导出成功！`);
    }


    showSuccessMessage(message) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'success-message';
        msgDiv.textContent = message;
        document.body.appendChild(msgDiv);
        
        setTimeout(() => {
            msgDiv.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => msgDiv.remove(), 300);
        }, 2000);
    }

    bindEvents() {
        // 学生选择
        document.getElementById('studentSelect').addEventListener('change', () => {
            this.onStudentSelect();
        });

        // 管理学生按钮
        document.getElementById('manageStudentBtn').addEventListener('click', () => {
            this.showStudentModal();
        });

        // 管理班级按钮
        document.getElementById('manageClassBtn').addEventListener('click', () => {
            this.showClassModal();
        });

        // 学生表单提交
        document.getElementById('studentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const student = {
                name: document.getElementById('studentName').value,
                grade: document.getElementById('studentGrade').value,
                course: document.getElementById('studentCourse').value,
                startTime: document.getElementById('studentStartTime').value,
                endTime: document.getElementById('studentEndTime').value,
                rate: parseFloat(document.getElementById('studentRate').value)
            };
            
            if (this.editingStudentId) {
                // 更新模式
                this.updateStudent(this.editingStudentId, student);
                this.showSuccessMessage('学生更新成功！');
                this.editingStudentId = null;
                
                // 恢复按钮文字
                const submitBtn = document.querySelector('#studentForm button[type="submit"]');
                submitBtn.textContent = '添加学生';
                submitBtn.classList.remove('btn-update');
            } else {
                // 添加模式
                this.addStudent(student);
                this.showSuccessMessage('学生添加成功！');
            }
            
            e.target.reset();
            this.renderStudentList();
        });

        // 学生管理界面的时间选择器
        document.getElementById('studentStartTime').addEventListener('click', () => {
            this.showTimePicker('studentStartTime');
        });

        document.getElementById('studentEndTime').addEventListener('click', () => {
            this.showTimePicker('studentEndTime');
        });

        // 班级表单提交
        document.getElementById('classForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const classData = {
                name: document.getElementById('className').value,
                grade: document.getElementById('classGrade').value,
                courseName: document.getElementById('classCourse').value,
                startTime: document.getElementById('classStartTime').value,
                endTime: document.getElementById('classEndTime').value,
                size: parseInt(document.getElementById('classSize').value),
                rate: parseFloat(document.getElementById('classRate').value)
            };
            
            if (this.editingClassId) {
                // 更新模式
                this.updateClass(this.editingClassId, classData);
                this.showSuccessMessage('班级更新成功！');
                this.editingClassId = null;
                
                // 恢复按钮文字
                const submitBtn = document.querySelector('#classForm button[type="submit"]');
                submitBtn.textContent = '添加班级';
                submitBtn.classList.remove('btn-update');
            } else {
                // 添加模式
                this.addClass(classData);
                this.showSuccessMessage('班级添加成功！');
            }
            
            e.target.reset();
            this.renderClassList();
        });

        // 班级管理界面的时间选择器
        document.getElementById('classStartTime').addEventListener('click', () => {
            this.showTimePicker('classStartTime');
        });

        document.getElementById('classEndTime').addEventListener('click', () => {
            this.showTimePicker('classEndTime');
        });

        // 互动卡片事件绑定
        document.getElementById('moodCard').addEventListener('click', () => {
            this.showMoodCard();
        });

        document.getElementById('healthCard').addEventListener('click', () => {
            this.showHealthCard();
        });

        document.getElementById('encourageCard').addEventListener('click', () => {
            this.showEncourageCard();
        });

        document.getElementById('jokeCard').addEventListener('click', () => {
            this.showJokeCard();
        });

        // 表单提交
        document.getElementById('recordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            // 获取选中的学生或班级名称
            const studentSelect = document.getElementById('studentSelect');
            const selectedValue = studentSelect.value;
            let studentName = '';
            
            if (selectedValue) {
                const [type, idStr] = selectedValue.split('-');
                const id = parseInt(idStr);
                
                if (type === 'student') {
                    const student = this.students.find(s => s.id === id);
                    if (student) {
                        studentName = student.name;
                    }
                } else if (type === 'class') {
                    const classData = this.classes.find(c => c.id === id);
                    if (classData) {
                        studentName = classData.name;
                    }
                }
            }
            
            const record = {
                date: document.getElementById('recordDate').value,
                studentName: studentName,
                grade: document.getElementById('recordGrade').value,
                courseName: document.getElementById('courseName').value,
                startTime: document.getElementById('startTime').value,
                endTime: document.getElementById('endTime').value,
                hours: parseFloat(document.getElementById('hours').value),
                rate: parseFloat(document.getElementById('rate').value),
                notes: document.getElementById('notes').value
            };
            
            this.addRecord(record);
            e.target.reset();
            this.setTodayDate();
        });

        // 月份筛选
        document.getElementById('monthFilter').addEventListener('change', (e) => {
            // 同步到统计卡片的月份选择器
            document.getElementById('monthTotalFilter').value = e.target.value;
            document.getElementById('monthHoursFilter').value = e.target.value;
            this.updateSummary();
            this.renderRecords();
        });

        // 预览按钮
        document.getElementById('previewBtn').addEventListener('click', () => {
            this.showPreview();
        });

        // 开始时间选择器
        document.getElementById('startTime').addEventListener('click', () => {
            this.showTimePicker('startTime');
        });

        // 结束时间选择器
        document.getElementById('endTime').addEventListener('click', () => {
            this.showTimePicker('endTime');
        });

        // 课时数手动输入
        document.getElementById('hours').addEventListener('input', () => {
            // 如果有开始时间，根据课时数自动计算结束时间
            const startTime = document.getElementById('startTime').value;
            if (startTime) {
                this.calculateEndTime();
            }
        });

        // 本月总工资月份选择器
        document.getElementById('monthTotalFilter').addEventListener('change', (e) => {
            // 同步到本月总课时选择器和上课记录筛选器
            document.getElementById('monthHoursFilter').value = e.target.value;
            document.getElementById('monthFilter').value = e.target.value;
            // 更新统计数据和记录列表
            this.updateSummary();
            this.renderRecords();
        });

        // 本月总课时月份选择器
        document.getElementById('monthHoursFilter').addEventListener('change', (e) => {
            // 同步到本月总工资选择器和上课记录筛选器
            document.getElementById('monthTotalFilter').value = e.target.value;
            document.getElementById('monthFilter').value = e.target.value;
            // 更新统计数据和记录列表
            this.updateSummary();
            this.renderRecords();
        });

        // 导出Excel
        document.getElementById('exportExcelBtn').addEventListener('click', () => {
            this.exportExcel();
        });

        // 点击模态框背景关闭
        document.getElementById('previewModal').addEventListener('click', (e) => {
            if (e.target.id === 'previewModal') {
                this.closePreview();
            }
        });

        // 点击时间选择器背景关闭
        document.getElementById('timePickerModal').addEventListener('click', (e) => {
            if (e.target.id === 'timePickerModal') {
                this.closeTimePicker();
            }
        });

        // 点击学生模态框背景关闭
        document.getElementById('studentModal').addEventListener('click', (e) => {
            if (e.target.id === 'studentModal') {
                this.closeStudentModal();
            }
        });

        // 点击班级模态框背景关闭
        document.getElementById('classModal').addEventListener('click', (e) => {
            if (e.target.id === 'classModal') {
                this.closeClassModal();
            }
        });

        // 点击记录详情模态框背景关闭
        document.getElementById('recordDetailModal').addEventListener('click', (e) => {
            if (e.target.id === 'recordDetailModal') {
                this.closeRecordDetail();
            }
        });

        // 点击认证模态框背景（仅登录后可关闭）
        document.getElementById('authModal').addEventListener('click', (e) => {
            if (e.target.id === 'authModal' && cloudSync && cloudSync.isLoggedIn()) {
                cloudSync.closeAuthModal();
            }
        });
    }


    // 重新加载数据（用于云端同步更新后）
    reloadData() {
        console.log('重新加载数据前 - 学生数:', this.students.length, '班级数:', this.classes.length);
        this.records = this.loadRecords();
        this.students = this.loadStudents();
        this.classes = this.loadClasses();
        console.log('重新加载数据后 - 学生数:', this.students.length, '班级数:', this.classes.length);
        this.updateSummary();
        this.updateMonthFilter();
        this.updateStudentSelect();
        this.renderRecords();
        this.renderStudentList();
        this.renderClassList();
        console.log('数据已从云端重新加载');
    }

    // 显示每日励志语（轮播）
    showDailyQuote() {
        const quotes = [
            // 励志语
            "每一节课都是播种希望的种子，你的付出终将开花结果！🌱",
            "教育是点燃火焰，不是灌满容器。今天也要充满热情！🔥",
            "你的耐心和智慧，正在塑造孩子们的未来！💫",
            "每个学生的进步，都是你努力的见证。加油！📚",
            "教师是太阳底下最光辉的职业，你正在发光发热！☀️",
            "今天的辛苦，是为了明天更多的笑容！😊",
            "你不仅在传授知识，更在传递梦想！✨",
            "每一次备课，每一次讲解，都是爱的传递！❤️",
            "学生的成长，是对你最好的回报！🌟",
            "坚持下去，你正在做一件伟大的事情！💪",
            "教育的路上，你从不孤单！🤝",
            "今天又是充满希望的一天，继续加油！🌈",
            "你的专业和热情，正在改变世界！🌍",
            "每个孩子都是一颗星星，感谢你让他们闪耀！⭐",
            "教书育人，功德无量。你很棒！👏",
            "累了就休息，但别忘了你有多优秀！💝",
            "你的课堂，是孩子们最期待的时光！🎓",
            "用心教学，用爱育人。你做到了！🌺",
            "每一份付出都有意义，继续前行！🚀",
            "你是学生生命中的一盏明灯！💡",
            
            // 幽默笑话
            "老师问：'1+1等于几？' 学生：'不知道。' 老师：'回家问你爸妈！' 第二天学生：'爸爸说不知道，妈妈说随便！' 😄",
            "学生：'老师，我可以问个问题吗？' 老师：'当然可以！' 学生：'那我就不问了！' 老师：'......' 🤣",
            "为什么老师总是那么聪明？因为学生问题太多了！😂",
            "学生：'老师，我作业忘带了。' 老师：'那你脑子带了吗？' 学生：'带了！' 老师：'那就用脑子做！' 😅",
            "老师的三大法宝：粉笔、教鞭、还有无穷的耐心！💪",
            
            // 温馨提示
            "记得多喝水，保护好嗓子，你的声音很重要！💧",
            "课间休息一下，伸个懒腰，放松一下眼睛！👀",
            "今天记得按时吃饭，身体是革命的本钱！🍱",
            "晚上早点休息，充足的睡眠才能有好状态！😴",
            "记得放松一下，劳逸结合才能走得更远！🎮",
            
            // 正能量
            "教育需要耐心，而你拥有最好的耐心！🌸",
            "今天也要元气满满地上课哦！🎉",
            "你的微笑，是学生最好的鼓励！😄",
            "教师的工作虽然辛苦，但意义非凡！🏆",
            "感谢你为教育事业的付出！🙏",
            "每一天都是新的开始，加油！🌅",
            "你的努力，学生和家长都看在眼里！👀",
            "教育是一场马拉松，你跑得很棒！🏃",
            "今天也要保持好心情，传递正能量！⚡",
            "你的课堂，充满了智慧和温暖！🏠",
            
            // 更多幽默
            "学生：'老师，我能用一个词形容您吗？' 老师：'当然！' 学生：'完美！' 老师：'谢谢！' 学生：'完美地严格！' 😆",
            "为什么老师喜欢用红笔？因为红色代表热情！❤️",
            "老师的口头禅：'这道题我讲过多少遍了？' 学生心想：'我也想知道...' 😂",
            "课堂上最安静的时候：老师问'谁来回答？' 🤫",
            "老师：'你为什么迟到？' 学生：'因为您说过，迟到总比不到好！' 老师：'......' 😅"
        ];

        let currentIndex = 0;
        
        // 初始显示
        const quoteElement = document.getElementById('quoteText');
        if (!quoteElement) return;
        
        const updateQuote = () => {
            // 淡出
            quoteElement.style.opacity = '0';
            
            setTimeout(() => {
                // 更换文字
                quoteElement.textContent = quotes[currentIndex];
                currentIndex = (currentIndex + 1) % quotes.length;
                
                // 淡入
                quoteElement.style.transition = 'opacity 1s ease-in-out';
                quoteElement.style.opacity = '1';
            }, 500);
        };
        
        // 首次显示
        updateQuote();
        
        // 每10秒轮播一次
        setInterval(updateQuote, 10000);
    }

    // 显示情绪卡片
    showMoodCard() {
        const modal = document.getElementById('interactiveModal');
        const title = document.getElementById('interactiveModalTitle');
        const content = document.getElementById('interactiveModalContent');
        
        title.textContent = '😊 关心你的情绪';
        content.innerHTML = `
            <span class="content-icon">😊</span>
            <div class="content-text">今天心情怎么样？选择你的情绪吧~</div>
            <div class="mood-options">
                <div class="mood-option" onclick="tracker.selectMood('😄', '开心')">😄<br>开心</div>
                <div class="mood-option" onclick="tracker.selectMood('😊', '愉快')">😊<br>愉快</div>
                <div class="mood-option" onclick="tracker.selectMood('😌', '平静')">😌<br>平静</div>
                <div class="mood-option" onclick="tracker.selectMood('😔', '有点累')">😔<br>有点累</div>
                <div class="mood-option" onclick="tracker.selectMood('😢', '需要安慰')">😢<br>需要安慰</div>
                <div class="mood-option" onclick="tracker.selectMood('😤', '有点烦')">😤<br>有点烦</div>
            </div>
        `;
        modal.classList.add('show');
    }

    // 选择情绪
    selectMood(emoji, mood) {
        const content = document.getElementById('interactiveModalContent');
        const responses = {
            '😄': '太好了！保持这份好心情，你的快乐会感染每一个学生！',
            '😊': '很棒！保持愉快的心情，教学会更轻松有趣！',
            '😌': '平静也是一种力量，愿你内心宁静，教学从容。',
            '😔': '辛苦了！记得适当休息，照顾好自己才能更好地照顾学生。',
            '😢': '抱抱你~ 如果有什么烦恼，可以和朋友聊聊，或者给自己放个假。',
            '😤': '理解你的感受，深呼吸，给自己一点时间，一切都会好起来的。'
        };
        
        content.innerHTML = `
            <span class="content-icon">${emoji}</span>
            <div class="content-text">你选择了：${mood}</div>
            <div class="content-text">${responses[emoji]}</div>
            <div style="margin-top: 20px;">
                <button class="btn-primary" onclick="tracker.closeInteractiveModal()">谢谢关心 ❤️</button>
            </div>
        `;
    }

    // 显示健康卡片
    showHealthCard() {
        const modal = document.getElementById('interactiveModal');
        const title = document.getElementById('interactiveModalTitle');
        const content = document.getElementById('interactiveModalContent');
        
        title.textContent = '💪 关心你的健康';
        content.innerHTML = `
            <span class="content-icon">💪</span>
            <div class="content-text">身体是革命的本钱，要好好照顾自己哦！</div>
            <ul class="health-tips">
                <li>多喝水，保持身体水分充足</li>
                <li>注意休息，不要过度劳累</li>
                <li>适当运动，增强体质</li>
                <li>规律作息，保证充足睡眠</li>
                <li>注意用嗓，保护嗓子健康</li>
                <li>定期体检，关注身体健康</li>
                <li>保持好心情，心情好身体才会好</li>
            </ul>
            <div style="margin-top: 20px;">
                <button class="btn-primary" onclick="tracker.closeInteractiveModal()">我会注意的 ❤️</button>
            </div>
        `;
        modal.classList.add('show');
    }

    // 显示鼓励卡片
    showEncourageCard() {
        const modal = document.getElementById('interactiveModal');
        const title = document.getElementById('interactiveModalTitle');
        const content = document.getElementById('interactiveModalContent');
        
        const encouragements = [
            '你是最棒的老师！你的付出会改变学生的未来！',
            '教师是太阳底下最光辉的职业，你正在发光发热！',
            '每一个学生都是你播下的种子，终有一天会开花结果！',
            '你的耐心和爱心，是学生成长路上最温暖的阳光！',
            '坚持下去，你的努力一定会有回报的！',
            '你是学生心中的明灯，照亮他们前行的路！',
            '感谢你的辛勤付出，世界因你而更美好！',
            '你的每一堂课，都在为学生的未来添砖加瓦！',
            '相信自己，你已经做得很好了！',
            '你的热情和专注，是学生最好的榜样！'
        ];
        
        const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
        
        title.textContent = '🌟 为你加油';
        content.innerHTML = `
            <span class="content-icon">🌟</span>
            <div class="encouragement-text">${randomEncouragement}</div>
            <div style="margin-top: 20px;">
                <button class="btn-primary" onclick="tracker.showEncourageCard()">再来一句 💪</button>
                <button class="btn-secondary" onclick="tracker.closeInteractiveModal()" style="margin-left: 10px;">谢谢鼓励 ❤️</button>
            </div>
        `;
        modal.classList.add('show');
    }

    // 显示笑话卡片
    showJokeCard() {
        const modal = document.getElementById('interactiveModal');
        const title = document.getElementById('interactiveModalTitle');
        const content = document.getElementById('interactiveModalContent');
        
        const jokes = [
            {
                question: '为什么老师总是说"这道题我讲过"？',
                answer: '因为老师想让学生知道，他们其实都听过了，只是...忘了 😂'
            },
            {
                question: '老师最怕什么？',
                answer: '最怕学生说"老师，这道题您刚才讲过了"然后还是不会做 😅'
            },
            {
                question: '为什么老师总是说"我再讲最后一道题"？',
                answer: '因为"最后一道题"后面还有"最后一道题"的"最后一道题" 😄'
            },
            {
                question: '老师：为什么作业没交？',
                answer: '学生：因为您说过，作业要用心做，所以我还在用心思考... 🤔'
            },
            {
                question: '课堂上最安静的时候是什么时候？',
                answer: '老师问"谁来回答这个问题？"的时候 🤫'
            },
            {
                question: '为什么老师总是说"这道题很简单"？',
                answer: '因为对老师来说确实很简单，但对学生来说... 😂'
            },
            {
                question: '老师：你为什么迟到？',
                answer: '学生：因为您说过，迟到总比不到好！老师：...... 😅'
            },
            {
                question: '最让老师崩溃的话是什么？',
                answer: '学生：老师，您刚才讲的我都听懂了，但是... 🤯'
            }
        ];
        
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        
        title.textContent = '😄 讲个笑话';
        content.innerHTML = `
            <span class="content-icon">😄</span>
            <div class="joke-text">
                <strong>${randomJoke.question}</strong><br><br>
                ${randomJoke.answer}
            </div>
            <div style="margin-top: 20px;">
                <button class="btn-primary" onclick="tracker.showJokeCard()">再来一个 😂</button>
                <button class="btn-secondary" onclick="tracker.closeInteractiveModal()" style="margin-left: 10px;">谢谢，我笑了 😊</button>
            </div>
        `;
        modal.classList.add('show');
    }

    // 关闭互动模态框
    closeInteractiveModal() {
        const modal = document.getElementById('interactiveModal');
        modal.classList.remove('show');
    }
}

// 初始化应用
const tracker = new SalaryTracker();

// 确保tracker在全局作用域中可用
window.tracker = tracker;

// 添加调试信息
console.log('✅ Tracker 已初始化并挂载到 window.tracker');
console.log('✅ reloadData 方法可用:', typeof tracker.reloadData === 'function');
