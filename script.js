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
        if (cloudSync && cloudSync.getSyncInfo().enabled) {
            cloudSync.uploadLocalData().catch(err => console.error('自动同步失败:', err));
        }
    }

    loadStudents() {
        const data = localStorage.getItem('teacherStudents');
        return data ? JSON.parse(data) : [];
    }

    saveStudents() {
        localStorage.setItem('teacherStudents', JSON.stringify(this.students));
        // 自动同步到云端
        if (cloudSync && cloudSync.getSyncInfo().enabled) {
            cloudSync.uploadLocalData().catch(err => console.error('自动同步失败:', err));
        }
    }

    loadClasses() {
        const data = localStorage.getItem('teacherClasses');
        return data ? JSON.parse(data) : [];
    }

    saveClasses() {
        localStorage.setItem('teacherClasses', JSON.stringify(this.classes));
        // 自动同步到云端
        if (cloudSync && cloudSync.getSyncInfo().enabled) {
            cloudSync.uploadLocalData().catch(err => console.error('自动同步失败:', err));
        }
    }

    addClass(classData) {
        classData.id = Date.now();
        classData.type = 'class'; // 标记为班级类型
        this.classes.push(classData);
        this.saveClasses();
        this.updateStudentSelect();
    }

    deleteClass(id) {
        if (confirm('确定要删除这个班级吗？')) {
            this.classes = this.classes.filter(c => c.id !== id);
            this.saveClasses();
            this.renderClassList();
            this.updateStudentSelect();
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
        this.saveStudents();
        this.updateStudentSelect();
    }

    deleteStudent(id) {
        if (confirm('确定要删除这个学生吗？')) {
            this.students = this.students.filter(s => s.id !== id);
            this.saveStudents();
            this.updateStudentSelect();
            this.renderStudentList();
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
            });
            select.appendChild(studentGroup);
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
            });
            select.appendChild(classGroup);
        }
    }

    addRecord(record) {
        record.id = Date.now();
        record.salary = record.hours * record.rate;
        this.records.unshift(record);
        this.saveRecords();
        this.updateSummaryMonthFilter();
        this.updateSummary();
        this.updateMonthFilter();
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
        
        if (this.students.length === 0) {
            listContainer.innerHTML = '<p class="empty-message">暂无学生，请先添加学生</p>';
            return;
        }
        
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

        // 点击同步模态框背景关闭
        document.getElementById('syncModal').addEventListener('click', (e) => {
            if (e.target.id === 'syncModal') {
                this.closeSyncModal();
            }
        });

        // 同步表单提交
        document.getElementById('syncForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSyncSubmit();
        });
    }

    // 云端同步相关方法
    openSyncModal() {
        const modal = document.getElementById('syncModal');
        modal.classList.add('show');
        
        // 显示当前同步状态
        if (cloudSync && cloudSync.getSyncInfo().enabled) {
            const syncInfo = cloudSync.getSyncInfo();
            document.getElementById('syncCurrentCode').style.display = 'block';
            document.getElementById('currentCodeDisplay').textContent = syncInfo.syncCode;
            document.getElementById('syncCode').value = syncInfo.syncCode;
            document.getElementById('syncSetBtn').style.display = 'none';
            document.getElementById('syncChangeBtn').style.display = 'inline-block';
            document.getElementById('syncDisableBtn').style.display = 'inline-block';
            
            // 显示最后同步时间
            if (syncInfo.lastSyncTime) {
                const lastTime = new Date(syncInfo.lastSyncTime).toLocaleString('zh-CN');
                document.getElementById('syncLastUpdate').textContent = `最后同步: ${lastTime}`;
            }
        } else {
            document.getElementById('syncCurrentCode').style.display = 'none';
            document.getElementById('syncSetBtn').style.display = 'inline-block';
            document.getElementById('syncChangeBtn').style.display = 'none';
            document.getElementById('syncDisableBtn').style.display = 'none';
            document.getElementById('syncCode').value = '';
        }
    }

    closeSyncModal() {
        const modal = document.getElementById('syncModal');
        modal.classList.remove('show');
    }

    async handleSyncSubmit() {
        const syncCode = document.getElementById('syncCode').value.trim();
        
        if (!syncCode || syncCode.length < 6) {
            alert('同步码至少需要6位');
            return;
        }

        try {
            if (!cloudSync) {
                alert('同步服务未初始化，请刷新页面重试');
                return;
            }

            await cloudSync.setSyncCode(syncCode);
            this.showSuccessMessage('同步设置成功！');
            this.closeSyncModal();
            
            // 更新UI
            cloudSync.updateSyncStatus();
        } catch (error) {
            alert('同步设置失败: ' + error.message);
            console.error('同步设置失败:', error);
        }
    }

    async changeSyncCode() {
        if (!confirm('更改同步码会断开当前同步，确定要继续吗？')) {
            return;
        }
        
        cloudSync.disableSync();
        document.getElementById('syncCurrentCode').style.display = 'none';
        document.getElementById('syncSetBtn').style.display = 'inline-block';
        document.getElementById('syncChangeBtn').style.display = 'none';
        document.getElementById('syncDisableBtn').style.display = 'none';
        document.getElementById('syncCode').value = '';
    }

    async disableSync() {
        if (!confirm('停用同步后，数据将只保存在本地。确定要停用吗？')) {
            return;
        }
        
        cloudSync.disableSync();
        this.showSuccessMessage('已停用云端同步');
        this.closeSyncModal();
    }

    // 重新加载数据（用于云端同步更新后）
    reloadData() {
        this.records = this.loadRecords();
        this.students = this.loadStudents();
        this.classes = this.loadClasses();
        this.updateSummary();
        this.updateMonthFilter();
        this.updateStudentSelect();
        this.renderRecords();
        console.log('数据已从云端重新加载');
    }
}

// 初始化应用
const tracker = new SalaryTracker();
