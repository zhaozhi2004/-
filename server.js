const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 5000;

// 中间件
app.use(cors());
app.use(express.json());

// MongoDB 连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/tasks';

// 任务模型（扩展字段）
const taskSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'verified'], default: 'pending' },
    deadline: { type: String, default: '' },          // 验收截止时间
    assignee: { type: String, default: '' },          // 指派员工
    creator: { type: String, default: '' },           // 发布人（老板）
    updates: {                                         // 更新记录
        type: [{
            author: String,
            content: String,
            time: String
        }],
        default: []
    },
    createdAt: { type: String, default: Date.now },
    updatedAt: { type: String, default: Date.now }
});

const Task = mongoose.model('Task', taskSchema);

// 连接数据库
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ MongoDB 连接成功');
}).catch((error) => {
    console.error('❌ MongoDB 连接失败:', error);
});

// ==================== API 路由 ====================

// 获取所有任务（按优先级+截止时间排序）
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find().lean();

        // 排序逻辑
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const statusOrder = { pending: 0, 'in-progress': 1, completed: 2, verified: 3 };

        tasks.sort((a, b) => {
            // 1. 状态排序
            const statusDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
            if (statusDiff !== 0) return statusDiff;

            // 2. 优先级排序（高优先）
            const priorityDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
            if (priorityDiff !== 0) return priorityDiff;

            // 3. 截止时间排序（近的优先）
            const deadlineA = new Date(a.deadline).getTime();
            const deadlineB = new Date(b.deadline).getTime();
            return deadlineA - deadlineB;
        });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取单个任务
app.get('/api/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findOne({ id: req.params.id });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 创建任务
app.post('/api/tasks', async (req, res) => {
    try {
        const task = new Task(req.body);
        await task.save();
        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 更新任务
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findOneAndUpdate(
            { id: req.params.id },
            { ...req.body, updatedAt: new Date().toISOString() },
            { new: true }
        );
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 删除任务
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ id: req.params.id });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 切换任务状态
app.patch('/api/tasks/:id/toggle', async (req, res) => {
    try {
        const task = await Task.findOne({ id: req.params.id });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const statusFlow = ['pending', 'in-progress', 'completed', 'verified'];
        const currentIdx = statusFlow.indexOf(task.status);
        task.status = statusFlow[(currentIdx + 1) % statusFlow.length];
        task.updatedAt = new Date().toISOString();
        await task.save();

        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 添加更新记录
app.patch('/api/tasks/:id/update', async (req, res) => {
    try {
        const task = await Task.findOne({ id: req.params.id });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const { author, content } = req.body;
        if (!author || !content) {
            return res.status(400).json({ error: 'Author and content required' });
        }

        task.updates.push({
            author,
            content,
            time: new Date().toISOString()
        });
        task.updatedAt = new Date().toISOString();
        await task.save();

        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://0.0.0.0:${PORT}`);
});
