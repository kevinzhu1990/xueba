# 学霸网站 V2.0 题库扩充实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改变既有题目索引和学习记录的前提下，把题库拆成按学科追加的模块，并让出题严格遵循课程核心、薄弱知识、错题、衔接、奥数和拓展的优先级。

**Architecture:** 现有 `index.html` 继续作为兼容层和旧题库入口；新增 `data/questions/*.js` 只注册追加题目，由统一加载器做 ID、题干、答案、知识点去重后追加到 `DATA`。`adaptive-engine.js` 负责统一课程优先级，题目仍按原数组索引记录错题，旧索引不移动。

**Tech Stack:** 原生 JavaScript、静态 GitHub Pages、Cloudflare Worker 代理、阿里云函数后端。

## Global Constraints

- 不删除任何已有题目、题目 ID、学习记录、错题、积分和掌握度。
- 新题只能追加；重复 ID、题干、答案或知识点跳过。
- 每道新增题包含 `id/subject/grade/unit/tag/level/type/question/options/answer/explanation/verified`。
- 第一版新增分学科文件并达到每学科至少 100 道可用题，保留后续扩充到 3000-5000 道的接口。
- 默认四年级数学，允许低年级回补；出题顺序为课程核心、薄弱知识、错题、衔接、奥数、历史地理和百科拓展。

### Task 1: 追加题库注册与去重加载器

**Files:**
- Create: `data/questions/loader.js`
- Modify: `index.html:393-394,3239-3241`
- Test: `scripts/validate-question-bank.mjs`

- [ ] 新增 `window.XUEBA_QUESTION_BANK` 注册接口和统一追加函数。
- [ ] 保持旧数组索引不变，只对新题按 ID、题干、答案、知识点去重。
- [ ] 对新题校验字段、选项数量、答案存在性和 `verified`。
- [ ] 编写离线校验脚本，输出每学科数量、重复数和错误字段。

### Task 2: 按学科拆分第一批题库

**Files:**
- Create: `data/questions/math.js`
- Create: `data/questions/olympiad.js`
- Create: `data/questions/reading.js`
- Create: `data/questions/english.js`
- Create: `data/questions/physics.js`
- Create: `data/questions/chemistry.js`
- Create: `data/questions/biology.js`
- Create: `data/questions/science.js`
- Create: `data/questions/history.js`
- Create: `data/questions/geography.js`
- Create: `data/questions/idiom.js`

- [ ] 每个文件只注册自己的学科题目。
- [ ] 第一批覆盖数学、奥数、阅读、英语、科学、物理、化学、生物、综合科学、历史、地理、成语，全部达到至少 100 道，采用稳定模板生成但每题有独立知识点、解析和答案。
- [ ] 课程题标记 `courseType: core`，衔接题标记 `bridge`，奥数标记 `thinking`，拓展标记 `extension`。

### Task 3: 课程树与出题优先级

**Files:**
- Modify: `adaptive-engine.js`
- Modify: `data/questions/loader.js`

- [ ] 增加课程树元数据：课程、单元、知识点、学习卡、例题、基础、应用、综合、挑战、检测、复习。
- [ ] 调整队列为核心未学 > 核心薄弱 > 错题 > bridge > 奥数/拓展，保留当前难度和年级窗口。
- [ ] 继续使用原 `store.wrong[subject]` 和 `store.qstats[subject][index]`，追加题不改变旧索引。

### Task 4: 兼容、验证与发布

**Files:**
- Modify: `aliyun-function/public/*` by copying verified frontend assets
- Modify: `index.html` cache versions

- [ ] 执行题库校验、现有会员后端测试和本地静态页面测试。
- [ ] 在 GitHub Pages 发布，并把同一份前端同步到阿里云函数部署包。
- [ ] 验证 GitHub Pages、`https://geminizhu.top/`、登录接口和手机/iPad 无横向溢出。
