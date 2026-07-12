(function(){
  const DEFAULT_LEVELS = {
    math: 4,
    olympiad: 2,
    reading: 3,
    english: 2,
    physics: 2,
    chemistry: 2,
    biology: 2,
    comprehensive: 2,
    history: 1,
    geography: 2,
    idiom: 2
  };

  const LEVEL_META = [
    {key:1, label:"L1 认识", sub:"记住事实和概念"},
    {key:2, label:"L2 理解", sub:"能说出原因"},
    {key:3, label:"L3 应用", sub:"放进情境使用"},
    {key:4, label:"L4 推理", sub:"两步或多步判断"},
    {key:5, label:"L5 挑战", sub:"综合与跨知识点"}
  ];

  const COUNT_OPTS = [5, 8, 10, 15];

  function ensureAdaptiveStore(store) {
    store.subjectLevels = store.subjectLevels || {};
    Object.keys(DEFAULT_LEVELS).forEach(k=>{
      if(!store.subjectLevels[k]) store.subjectLevels[k] = DEFAULT_LEVELS[k];
    });
    store.mastery = store.mastery || {};
    store.courseProgress = store.courseProgress || {};
    store.unlockedExtensions = store.unlockedExtensions || {};
    store.dailyPlan = store.dailyPlan || {};
    return store;
  }

  function subjectLevel(store, subject) {
    ensureAdaptiveStore(store);
    return Number(store.subjectLevels[subject] || DEFAULT_LEVELS[subject] || 2);
  }

  function setSubjectLevel(store, subject, level) {
    ensureAdaptiveStore(store);
    store.subjectLevels[subject] = Math.max(1, Math.min(5, Number(level) || 1));
  }

  function qTag(q) {
    return (q && ((q.tags && q.tags[0]) || q.tag || q.knowledgePoint || q.unit)) || "综合";
  }

  function masteryRecord(store, subject, tag) {
    ensureAdaptiveStore(store);
    store.mastery[subject] = store.mastery[subject] || {};
    const rec = store.mastery[subject][tag] || {
      attempts: 0,
      correct: 0,
      recentResults: [],
      questionTypesCorrect: [],
      lastPracticedAt: null,
      masteryLevel: 0
    };
    rec.recentResults = Array.isArray(rec.recentResults) ? rec.recentResults : [];
    rec.questionTypesCorrect = Array.isArray(rec.questionTypesCorrect) ? rec.questionTypesCorrect : [];
    store.mastery[subject][tag] = rec;
    return rec;
  }

  function updateMastery(store, subject, q, isCorrect) {
    const tag = qTag(q);
    const rec = masteryRecord(store, subject, tag);
    rec.attempts += 1;
    if(isCorrect) rec.correct += 1;
    rec.recentResults.push(isCorrect ? 1 : 0);
    if(rec.recentResults.length > 8) rec.recentResults = rec.recentResults.slice(-8);
    const type = q.type || q.practiceType || "single-choice";
    if(isCorrect && !rec.questionTypesCorrect.includes(type)) rec.questionTypesCorrect.push(type);
    rec.lastPracticedAt = new Date().toISOString();
    const accuracy = rec.attempts ? rec.correct / rec.attempts : 0;
    const recent = rec.recentResults.length ? rec.recentResults.reduce((a,b)=>a+b,0) / rec.recentResults.length : 0;
    const diversity = rec.questionTypesCorrect.length;
    if(rec.attempts >= 6 && accuracy >= .88 && recent >= .8 && diversity >= 2) rec.masteryLevel = 4;
    else if(rec.attempts >= 4 && accuracy >= .75 && recent >= .67) rec.masteryLevel = 3;
    else if(rec.attempts >= 3 && accuracy >= .6) rec.masteryLevel = 2;
    else if(rec.attempts > 0) rec.masteryLevel = 1;
    else rec.masteryLevel = 0;
    return rec;
  }

  function isTagMastered(store, subject, tag) {
    return masteryRecord(store, subject, tag).masteryLevel >= 3;
  }

  function questionMastered(store, subject, q) {
    return isTagMastered(store, subject, qTag(q));
  }

  function recommendedLevel(store, subject) {
    ensureAdaptiveStore(store);
    const level = subjectLevel(store, subject);
    const recent = (store.recent || []).filter(r=>r.s===subject).slice(-10);
    if(recent.length < 4) return {level, dir:"stay", rate:null, text:"先按当前学科等级练习，系统会根据这一科表现调整。"};
    const rate = Math.round(recent.filter(r=>r.c).length / recent.length * 100);
    if(rate >= 88 && level < 5) return {level:level+1, dir:"up", rate, text:`这一科最近正确率 ${rate}%，下一轮可升到 L${level+1}。`};
    if(rate < 60 && level > 1) return {level:level-1, dir:"down", rate, text:`这一科最近正确率 ${rate}%，先回到 L${level-1} 巩固。`};
    return {level, dir:"stay", rate, text:`这一科最近正确率 ${rate}%，保持 L${level}。`};
  }

  function classifyItem(store, subject, item) {
    const q = item.q;
    const tag = qTag(q);
    const rec = masteryRecord(store, subject, tag);
    if(q.courseType === "core" && rec.attempts === 0) return 1;
    if(q.courseType === "core" && rec.masteryLevel < 3) return 2;
    if((store.wrong?.[subject] || []).includes(item.i) || rec.recentResults.slice(-3).includes(0)) return 3;
    if(q.courseType === "bridge") return 4;
    if(subject === "olympiad" || q.courseType === "thinking") return 5;
    if(q.courseType === "extension") return 6;
    return q.courseType === "core" ? 2 : 6;
  }

  function pickPracticeQueue(store, subject, pool, count) {
    const target = Number(count) || 10;
    const current = [], review = [], advanced = [], challenge = [];
    const recLevel = subjectLevel(store, subject);
    pool.forEach(item=>{
      const lv = Number(item.q.lv || item.q.levelNum || 1);
      const bucket = classifyItem(store, subject, item);
      item.priorityBucket = bucket;
      if(bucket <= 3 || lv === recLevel) current.push(item);
      else if(lv < recLevel) review.push(item);
      else if(lv === recLevel + 1) advanced.push(item);
      else challenge.push(item);
    });
    const sortByPriority = arr => arr.slice().sort((a,b)=>a.priorityBucket-b.priorityBucket || String(a.q.id).localeCompare(String(b.q.id)));
    const take = (arr, n, out)=>{
      for(const item of sortByPriority(arr)){
        if(out.length >= target || n <= 0) break;
        if(!out.some(x=>x.i===item.i)){ out.push(item); n--; }
      }
    };
    const out = [];
    take(current, Math.ceil(target * .6), out);
    take(review, Math.ceil(target * .2), out);
    take(advanced, Math.ceil(target * .15), out);
    take(challenge, target - out.length, out);
    take(pool, target - out.length, out);
    return out.slice(0, Math.min(target, pool.length));
  }

  function courseProgress(subject, questions, store) {
    const byTag = new Map();
    questions.forEach(q=>{
      const tag = qTag(q);
      if(!byTag.has(tag)) byTag.set(tag, {tag, total:0, mastered:false, attempts:0, level:0, core:q.courseType==="core"});
      const row = byTag.get(tag);
      row.total++;
      const rec = masteryRecord(store, subject, tag);
      row.attempts = rec.attempts;
      row.level = rec.masteryLevel;
      row.mastered = rec.masteryLevel >= 3;
      row.core = row.core || q.courseType === "core";
    });
    const rows = [...byTag.values()];
    const coreRows = rows.filter(r=>r.core);
    const mastered = coreRows.filter(r=>r.mastered).length;
    return {
      rows,
      coreTotal: coreRows.length,
      coreMastered: mastered,
      pct: coreRows.length ? Math.round(mastered / coreRows.length * 100) : 0
    };
  }

  window.XUEBA_ADAPTIVE = {
    DEFAULT_LEVELS,
    LEVEL_META,
    COUNT_OPTS,
    ensureAdaptiveStore,
    subjectLevel,
    setSubjectLevel,
    qTag,
    updateMastery,
    questionMastered,
    recommendedLevel,
    pickPracticeQueue,
    courseProgress
  };
})();
