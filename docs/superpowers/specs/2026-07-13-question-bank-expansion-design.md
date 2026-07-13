# 学霸网站题库扩充设计

## 目标

在不删除、不覆盖、不重排现有题目的前提下，为 `kevinzhu1990/xueba` 增量扩充题库。第一批新增数学、奥数、地理、历史、综合科学五个学科，每科至少 100 道新题，共不少于 500 道。

## 核心约束

1. 现有题目全部保留。
2. 新题使用独立 JS 文件，不继续堆进 `index.html`。
3. 加载时只做追加合并，不替换 `DATA[subject].questions`。
4. 使用稳定、唯一的新题 ID；如 ID 冲突则跳过新增题，不覆盖旧题。
5. 现有错题记录、学习记录和题目索引兼容逻辑不得破坏。
6. 所有新增题必须有正确答案、具体解析、知识点、年级、单元、难度、题型和审核信息。

## 第一批题量

- 数学：新增至少 100 题，以四年级核心为主，包含三年级前置复查、五年级衔接和少量综合挑战。
- 奥数：新增至少 100 题，覆盖找规律、巧算、排队、植树、和差、和倍、差倍、年龄、周期、鸡兔同笼、逻辑、枚举、图形和逆推。
- 地理：新增至少 100 题，覆盖中国省级行政区与行政中心、国家与首都、反向问答、洲与国家、河流山脉、海洋和世界之最。
- 历史：新增至少 100 题，覆盖中国历史时间线、人物、事件、原因结果、古今对比和世界文明启蒙。
- 综合科学：新增至少 100 题，覆盖观察、假设、控制变量、证据、图表、实验安全和跨学科生活科学。

## 文件结构

```text
data/questions/
  math-extra.js
  olympiad-extra.js
  geography-extra.js
  history-extra.js
  comprehensive-extra.js
  question-bank-loader.js
```

每个学科文件将新增题目注册到 `window.XUEBA_EXTRA_QUESTIONS`，由 `question-bank-loader.js` 在原题库和课程增强逻辑完成后进行增量合并。

## 合并策略

```javascript
const seenIds = new Set(existingQuestions.map(q => q.id).filter(Boolean));
const seenTexts = new Set(existingQuestions.map(q => q.q));

extraQuestions.forEach(q => {
  if (seenIds.has(q.id) || seenTexts.has(q.q)) return;
  existingQuestions.push(q);
});
```

合并函数不得执行以下操作：

- 不得清空原数组。
- 不得用新数组覆盖原数组。
- 不得修改旧题 ID。
- 不得删除旧题。
- 不得按新顺序重排旧题。

## 题目结构

```javascript
{
  id: "math-g4-multiply-001",
  subject: "math",
  grade: 4,
  semester: 1,
  unit: "三位数乘两位数",
  tag: "笔算乘法",
  tags: ["笔算乘法"],
  lv: 3,
  type: "single-choice",
  practiceType: "application",
  courseType: "core",
  q: "题目",
  o: ["选项1", "选项2", "选项3", "选项4"],
  a: 0,
  explain: "具体解析",
  optionExplanations: ["选项解释1", "选项解释2", "选项解释3", "选项解释4"],
  verified: true,
  verifiedAt: "2026-07",
  sourceCategory: "教材/权威百科/人工审核",
  ambiguityNote: ""
}
```

## 题型范围

本批优先保证现有系统可以稳定展示，因此以单选题为主，同时用题目内容模拟以下能力：

- 反向问答
- 时间排序
- 事件排序
- 省份与省会匹配
- 国家与首都匹配
- 多步骤计算
- 表格和数据判断
- 实验设计
- 证据判断

真正的拖拽连线、地图点击和多选交互留到单独的题型引擎升级，不在本批通过伪交互强行实现。

## 校验要求

新增题库需要通过自动校验：

1. 每科新增题目不少于 100。
2. ID 唯一。
3. 题干不重复。
4. 每题恰好 4 个不重复选项。
5. 正确答案索引有效。
6. 解析不为空。
7. 学科、单元、知识点、难度和年级字段完整。
8. 数学和奥数题重新计算验证。
9. 极值类地理题避免没有标准的“最热城市”等问题。
10. 历史题避免存在争议时设置绝对唯一答案。

## 兼容性

- 新题只追加到现有题库末尾，因此旧题索引保持不变。
- 旧错题本按索引记录的内容继续有效。
- 新题使用稳定 ID，为后续迁移到 ID 型错题记录做准备。
- GitHub Pages 继续保持纯静态部署。

## 验收标准

- 五个学科各新增至少 100 题。
- 原有题数只增不减。
- 原有登录、积分、错题、云同步、3 秒跳题和响应式功能保持可用。
- 页面加载后五科题量正确增加。
- 控制台无重复 ID、选项错误或加载失败警告。
