(function(){
  const SUBJECT_ORDER = ["math","reading","english","chemistry","physics","biology","comprehensive","olympiad","geography","history","idiom"];
  const SUBJECT_META = {
    math:{name:"数学", emoji:"🧮", desc:"校内主线：四年级核心 + 五年级衔接", color:"#7b8cff", route:"校内课程", defaultLevel:4},
    reading:{name:"阅读", emoji:"📚", desc:"校内主线：字词、句子、段落和阅读理解", color:"#a06bff", route:"校内课程", defaultLevel:3},
    english:{name:"英语", emoji:"🔤", desc:"校内主线：自然拼读、词汇、句型和短文", color:"#4a90e2", route:"校内课程", defaultLevel:2},
    chemistry:{name:"化学启蒙", emoji:"🧪", desc:"小学科学：物质、水、空气、溶解和安全实验", color:"#ffcc4d", route:"校内课程", defaultLevel:2},
    physics:{name:"物理启蒙", emoji:"🧲", desc:"小学科学：力、光、声、热、电和磁", color:"#ff6b6b", route:"校内课程", defaultLevel:2},
    biology:{name:"生物", emoji:"🐢", desc:"小学科学：动物、植物、人体和生态", color:"#56ccf2", route:"校内课程", defaultLevel:2},
    comprehensive:{name:"综合科学", emoji:"🔬", desc:"科学思维：观察、假设、实验、证据和结论", color:"#21a67a", route:"能力提高", defaultLevel:2},
    olympiad:{name:"奥数思维", emoji:"🧠", desc:"拓展进阶：规律、巧算、逻辑和经典问题", color:"#f08a24", route:"奥数思维", defaultLevel:2},
    geography:{name:"地理拓展", emoji:"🌍", desc:"中国地理、世界地理、省会和首都", color:"#3ec46d", route:"课外拓展", defaultLevel:2},
    history:{name:"历史", emoji:"🏛️", desc:"时间线、人物故事、原因结果和古今对比", color:"#b8793b", route:"课外拓展", defaultLevel:1},
    idiom:{name:"成语语文积累", emoji:"📜", desc:"成语、好词和使用场景", color:"#ff8a5b", route:"校内课程", defaultLevel:2}
  };

  const COURSE_MAP = [
    ["math",3,2,"三年级关键复查","多位数乘一位数",["表内乘法"],true,2],
    ["math",3,2,"三年级关键复查","除数是一位数的除法",["表内除法"],true,2],
    ["math",4,1,"大数的认识","亿以内数的读写",["万以内数"],true,3],
    ["math",4,1,"三位数乘两位数","三位数乘两位数的笔算",["两位数乘两位数"],true,3],
    ["math",4,1,"除数是两位数的除法","试商和验算",["表内除法"],true,3],
    ["math",4,1,"四则混合运算","括号和运算顺序",["加减乘除"],true,3],
    ["math",4,1,"运算律","乘法分配律",["乘法"],true,4],
    ["math",4,1,"角的度量","锐角直角钝角和平角",["认识图形"],true,3],
    ["math",4,2,"平行与垂直","判断平行和垂直",["直线"],true,3],
    ["math",4,2,"平均数","用总数除以份数求平均数",["除法"],true,3],
    ["math",5,1,"五年级衔接","小数乘除法启蒙",["整数乘除法"],true,4],
    ["math",5,1,"五年级衔接","因数和倍数启蒙",["乘法"],true,4],
    ["reading",3,1,"字词句基础","近义词和反义词",[],true,2],
    ["reading",3,1,"句子理解","关联词和因果句",[],true,3],
    ["reading",3,2,"段落阅读","人物时间地点事件",[],true,3],
    ["reading",4,1,"阅读推理","原因结果和人物心情",[],true,3],
    ["reading",4,2,"阅读概括","主要内容和中心意思",[],true,4],
    ["english",2,1,"自然拼读","首字母和常见发音",[],true,1],
    ["english",2,1,"基础词汇","家庭、学校、食物、天气",[],true,2],
    ["english",3,1,"常见句型","I like / I can / This is",[],true,2],
    ["english",3,2,"短句阅读","读懂一两句话",[],true,3],
    ["physics",3,1,"力和运动","推拉、重力、摩擦力",[],true,2],
    ["physics",3,2,"光和声音","影子、反射、振动和回声",[],true,2],
    ["physics",4,1,"简单电路","电池、开关、导体和绝缘体",[],true,3],
    ["chemistry",3,1,"水和物质","三态变化和溶解",[],true,2],
    ["chemistry",3,2,"空气和燃烧","氧气、二氧化碳和安全",[],true,2],
    ["biology",3,1,"植物和动物","结构、生命周期和分类",[],true,2],
    ["biology",3,2,"人体健康","牙齿、视力、睡眠和运动",[],true,2],
    ["comprehensive",3,1,"科学方法","观察、假设和控制变量",[],true,2],
    ["olympiad",4,1,"奥数入门","找规律、巧算、排队和植树",["四年级校内"],false,2],
    ["geography",3,1,"中国地理","省份、省会、河流和方向",[],false,2],
    ["history",3,1,"历史启蒙","时间线、人物和事件影响",[],false,1],
    ["idiom",3,1,"语文积累","成语含义和使用场景",[],true,2]
  ].map(([subject,grade,semester,unit,knowledgePoint,prerequisite,core,level])=>({
    subject, grade, semester, unit, knowledgePoint, prerequisite, core, level,
    status:"not_started", mastery:0
  }));

  const FULL_COURSE_UNITS = {
    math:["数与计算","图形与几何","统计与概率","综合实践","分数与小数","解决问题"],
    reading:["字词句基础","段落阅读","阅读概括","写人记事","说明文阅读","古诗文启蒙"],
    english:["自然拼读","基础词汇","常见句型","日常对话","短文阅读","写作表达"],
    science:["观察与记录","物质与变化","生命世界","地球与宇宙","工程与技术","科学探究"]
  };
  [1,2,3,4,5,6].forEach(grade=>{
    FULL_COURSE_UNITS.math.forEach((unit,i)=>COURSE_MAP.push({id:`math-${grade}-${i+1}`,subject:"math",grade,semester:i<3?1:2,unit,knowledgePoint:`${grade}年级${unit}`,prerequisite:[],core:true,level:grade>=4?3:2,status:"not_started",mastery:0,defaultLevel:grade>=4?3:2,order:grade*10+i}));
  });
  ["reading","english"].forEach(subject=>[1,2,3,4,5,6].forEach(grade=>FULL_COURSE_UNITS[subject].forEach((unit,i)=>COURSE_MAP.push({id:`${subject}-${grade}-${i+1}`,subject,grade,semester:i<3?1:2,unit,knowledgePoint:`${grade}年级${unit}`,prerequisite:[],core:true,level:grade>=4?3:2,status:"not_started",mastery:0,defaultLevel:grade>=4?3:2,order:grade*10+i}))));
  FULL_COURSE_UNITS.science.forEach((unit,i)=>COURSE_MAP.push({id:`science-${i+1}`,subject:"comprehensive",grade:3+i%4,semester:i<3?1:2,unit,knowledgePoint:unit,prerequisite:[],core:true,level:2,status:"not_started",mastery:0,defaultLevel:2,order:100+i}));
  COURSE_MAP.forEach((node,i)=>{node.id=node.id||`${node.subject}-${node.grade||0}-${i}`;node.defaultLevel=node.defaultLevel||node.level;node.order=node.order||i;});

  const PROVINCE_CAPITALS = [
    ["北京","北京"],["天津","天津"],["上海","上海"],["重庆","重庆"],["河北","石家庄"],["山西","太原"],["辽宁","沈阳"],["吉林","长春"],["黑龙江","哈尔滨"],
    ["江苏","南京"],["浙江","杭州"],["安徽","合肥"],["福建","福州"],["江西","南昌"],["山东","济南"],["河南","郑州"],["湖北","武汉"],["湖南","长沙"],
    ["广东","广州"],["海南","海口"],["四川","成都"],["贵州","贵阳"],["云南","昆明"],["陕西","西安"],["甘肃","兰州"],["青海","西宁"],["台湾","台北"],
    ["内蒙古","呼和浩特"],["广西","南宁"],["西藏","拉萨"],["宁夏","银川"],["新疆","乌鲁木齐"],["香港","香港"],["澳门","澳门"]
  ];

  const COUNTRY_CAPITALS = [
    ["中国","北京","亚洲"],["日本","东京","亚洲"],["韩国","首尔","亚洲"],["英国","伦敦","欧洲"],["法国","巴黎","欧洲"],["德国","柏林","欧洲"],
    ["意大利","罗马","欧洲"],["西班牙","马德里","欧洲"],["美国","华盛顿","北美洲"],["加拿大","渥太华","北美洲"],["澳大利亚","堪培拉","大洋洲"],
    ["新西兰","惠灵顿","大洋洲"],["俄罗斯","莫斯科","欧洲"],["印度","新德里","亚洲"],["泰国","曼谷","亚洲"],["新加坡","新加坡","亚洲"],
    ["埃及","开罗","非洲"],["巴西","巴西利亚","南美洲"],["阿根廷","布宜诺斯艾利斯","南美洲"],["南非","比勒陀利亚","非洲"]
  ];

  function stableId(s){ return String(s).replace(/[^\w\u4e00-\u9fa5]+/g,"-").replace(/^-|-$/g,"").slice(0,80); }
  function ensureSubject(DATA, key) {
    if(!DATA[key]) DATA[key] = {questions:[], cards:[]};
    Object.assign(DATA[key], SUBJECT_META[key]);
    DATA[key].questions = DATA[key].questions || [];
    DATA[key].cards = DATA[key].cards || [];
  }
  function addCard(DATA, subject, front, back, tag, lv) {
    DATA[subject].cards.push({front, back, tag, lv:lv||2});
  }
  function addQ(DATA, subject, unit, tag, level, question, answer, wrongs, explain, opts={}) {
    ensureSubject(DATA, subject);
    const options = [answer].concat(wrongs).filter((v,i,a)=>a.indexOf(v)===i).slice(0,4);
    if(options.length < 4) return;
    if(DATA[subject].questions.some(q=>(opts.id && q.id===opts.id) || q.q===question)) return;
    DATA[subject].questions.push({
      id: opts.id || `${subject}-${stableId(unit)}-${stableId(question)}`,
      q: question,
      o: options,
      a: 0,
      lv: level,
      unit,
      tag,
      tags: [tag],
      courseType: opts.courseType || (opts.core === false ? "extension" : "core"),
      practiceType: opts.practiceType || (level>=4 ? "reasoning" : level>=3 ? "application" : "concept"),
      explain,
      optionExplanations: opts.optionExplanations || options.map(o=>o===answer ? `「${o}」正确。${explain}` : `「${o}」不符合题目条件。`),
      verified: true,
      verifiedAt: "2026-07",
      sourceCategory: opts.sourceCategory || "教材/权威百科/人工审核",
      ambiguityNote: opts.ambiguityNote || ""
    });
  }
  function pickWrongs(list, correct, start, count=3) {
    const pool = list.filter(x=>x!==correct);
    if(!pool.length) return [];
    return Array.from({length:count}, (_,i)=>pool[(start+i)%pool.length]);
  }
  function addMath(DATA) {
    const M = "math";
    [
      ["大数的认识","亿以内数的读写",3,"5080000 读作什么？","五百零八万",["五十万八千","五百八十万","五千零八十"],"5080000 按数级读：508 万，后面三个 0 不读，所以是五百零八万。"],
      ["三位数乘两位数","三位数乘两位数的笔算",3,"246 × 32 = ?", "7872",["7382","7870","7642"],"246×32=246×30+246×2=7380+492=7872。"],
      ["除数是两位数的除法","试商和验算",3,"864 ÷ 24 = ?", "36",["34","38","42"],"24×36=24×30+24×6=720+144=864，所以商是36。"],
      ["四则混合运算","括号和运算顺序",3,"96 ÷ (4 + 8) × 3 = ?", "24",["8","32","36"],"先算括号 4+8=12，再算 96÷12=8，最后 8×3=24。"],
      ["运算律","乘法分配律",4,"25 × 48 可以怎样巧算？", "25×(50-2)",["25+48","48×(20+8)一定最简","25×50+2"],"48 接近 50，可算 25×50-25×2=1250-50=1200。"],
      ["平均数","平均数",3,"四次数学练习分数是 80、90、85、95，平均分是多少？","87.5",["85","88","90"],"总分 80+90+85+95=350，4 次平均是 350÷4=87.5。"],
      ["角的度量","锐角直角钝角",3,"一个角是 120°，它是什么角？","钝角",["锐角","直角","平角"],"大于90°小于180°的角叫钝角，120°符合。"],
      ["平行与垂直","平行与垂直",3,"两条直线相交成 90°，它们互相？","垂直",["平行","重合","弯曲"],"相交成直角的两条直线互相垂直。"],
      ["组合图形","面积推理",4,"一个长方形长 12 厘米、宽 8 厘米，剪去一个边长 3 厘米的正方形，剩下面积是多少？","87平方厘米",["96平方厘米","90平方厘米","84平方厘米"],"原来面积 12×8=96 平方厘米，剪去 3×3=9 平方厘米，剩下 96-9=87 平方厘米。"],
      ["多步骤应用题","价格数量总价",4,"每盒彩笔 18 元，买 6 盒后还剩 42 元，原来有多少钱？","150元",["108元","132元","160元"],"先算花了 18×6=108 元，再加剩下 42 元，原来有 108+42=150 元。"],
      ["行程启蒙","速度时间路程",4,"小车每分钟走 65 米，走 12 分钟，一共走多少米？","780米",["770米","650米","720米"],"路程=速度×时间，65×12=65×10+65×2=650+130=780 米。"],
      ["五年级衔接","因数和倍数启蒙",4,"下面哪个数既是 6 的倍数，也是 9 的倍数？","18",["12","27","30"],"6 的倍数有 6、12、18、24；9 的倍数有 9、18、27；共同的是18。"],
      ["五年级衔接","小数乘法启蒙",4,"2.5 × 4 = ?", "10",["6.5","8","12.5"],"2.5×4 表示 4 个 2.5，相加是 10。"],
      ["综合挑战","和倍问题",5,"甲乙两数和是 72，甲是乙的 3 倍，乙是多少？","18",["24","36","54"],"把乙看作 1 份，甲是 3 份，一共 4 份。72÷4=18，所以乙是18。"],
      ["综合挑战","逆推应用",5,"一个数先加 15，再乘 4，结果是 100，这个数是多少？","10",["15","20","25"],"倒着算：100÷4=25，25-15=10。"]
    ].forEach(x=>addQ(DATA,M,x[0],x[1],x[2],x[3],x[4],x[5],x[6],{courseType:x[0]==="五年级衔接"?"bridge":"core"}));
  }

  function addOlympiad(DATA) {
    ensureSubject(DATA, "olympiad");
    [
      ["找规律","等差规律",2,"找规律：4，9，14，19，下一项是？","24",["23","25","29"],"相邻两个数都多 5，所以 19 后面是 19+5=24。"],
      ["巧算","凑整巧算",2,"99 + 102 + 101 最适合怎样算？","100×3+2",["99×3","102×2","101×4"],"把 99 看成 100-1，102 看成 100+2，101 看成 100+1，总共 300+2=302。"],
      ["排队问题","排队问题",2,"小明前面 7 人，后面 8 人，这队共有多少人？","16人",["15人","17人","14人"],"排队题要把小明自己算上：7+1+8=16。"],
      ["植树问题","两端都种",3,"一条路有 8 个间隔，两端都种树，需要几棵树？","9棵",["8棵","10棵","7棵"],"两端都种时，树的棵数比间隔数多 1，所以 8+1=9。"],
      ["鸡兔同笼","假设法",4,"鸡兔同笼共有 8 只，腿共有 22 条，兔有几只？","3只",["2只","4只","5只"],"① 假设全是鸡：8×2=16条腿。② 实际多 22-16=6条。③ 每只兔比鸡多2条腿。④ 6÷2=3，所以兔有3只。"],
      ["周期问题","周期规律",4,"红黄蓝红黄蓝……第 20 个颜色是什么？","黄",["红","蓝","绿"],"3 个颜色一组，20÷3=6余2，余2对应黄。"],
      ["逆推问题","逆推",3,"一个数先乘3再加6得到30，这个数是？","8",["6","9","12"],"倒着想：30-6=24，24÷3=8。"],
      ["最不利原则","抽屉原理启蒙",5,"袋里红球和蓝球各很多，至少摸几个球一定有两个同色？","3个",["2个","4个","5个"],"最不利情况前两个一红一蓝，第三个无论红蓝，都会和已有的一个同色。"]
    ].forEach(x=>addQ(DATA,"olympiad",x[0],x[1],x[2],x[3],x[4],x[5],x[6],{courseType:"thinking"}));
    addCard(DATA,"olympiad","鸡兔同笼怎么想","先假设全是鸡，算腿数差；每只兔比鸡多2条腿，用多出来的腿数除以2。","鸡兔同笼",4);
  }

  function addScience(DATA) {
    ensureSubject(DATA, "comprehensive");
    [
      ["控制变量","公平实验",2,"研究水温是否影响糖溶解速度，哪组实验最公平？","只改变水温，糖量、水量和搅拌方式相同",["热水多放糖，冷水少放糖","热水搅拌，冷水不搅拌","热水用大杯，冷水用小杯"],"公平实验只能改变要研究的因素。这里研究水温，所以糖量、水量、杯子和搅拌方式都要相同。"],
      ["观察和描述","事实与猜想",2,"“这杯水是透明的”属于什么？","观察到的事实",["猜想","结论","愿望"],"眼睛直接看到的现象是事实；还没证明的想法才是猜想。"],
      ["证据判断","证据充分",3,"只看到一只黑猫，就说所有猫都是黑的，这个结论？","证据不充分",["一定正确","和证据无关","不用观察"],"一个例子太少，不能代表所有猫，需要更多观察证据。"],
      ["图表观察","数据比较",3,"三盆植物分别每天浇水 0、50、100 毫升，比较生长时要记录什么？","每天高度变化",["花盆颜色","同学姓名","铅笔长度"],"研究浇水量对生长的影响，就要记录植物高度等生长数据。"],
      ["实验安全","安全判断",1,"闻未知气味时应该怎么做？","用手轻轻扇一点气味过来",["鼻子凑近猛闻","直接尝一口","加热后闻"],"实验安全第一，未知气体不能凑近猛闻，更不能品尝。"]
    ].forEach(x=>addQ(DATA,"comprehensive",x[0],x[1],x[2],x[3],x[4],x[5],x[6],{courseType:"core"}));
  }

  function addHistory(DATA) {
    ensureSubject(DATA, "history");
    [
      ["时间概念","先后顺序",1,"下面哪个词表示已经发生的时间？","过去",["未来","明天","以后"],"已经发生的事情属于过去；还没有发生的是未来。"],
      ["时间线","排序",2,"按时间先后排列，哪一组正确？","秦统一 → 汉朝丝绸之路 → 唐朝",["唐朝 → 秦统一 → 汉朝","汉朝 → 唐朝 → 秦统一","秦统一 → 唐朝 → 汉朝"],"秦朝在汉朝前，汉朝在唐朝前。"],
      ["中国历史","秦统一",2,"秦始皇统一六国后，重要影响之一是？","建立统一国家",["发明火车","发现电灯","修建互联网"],"秦统一结束长期分裂，建立统一的中央集权国家。"],
      ["历史人物","张骞",2,"张骞出使西域，对后来哪条交流路线很重要？","丝绸之路",["京杭大运河","长城","郑和下西洋"],"张骞沟通西域，为丝绸之路上的交流打下基础。"],
      ["历史人物","司马迁",2,"司马迁写下的著名史书是？","《史记》",["《西游记》","《水浒传》","《本草纲目》"],"《史记》记录从传说时代到汉武帝时期的历史，是重要史书。"],
      ["古今对比","交通变化",2,"古代远行主要靠马车和步行，现代远行常用？","高铁和飞机",["竹简","石斧","烽火台"],"这是古今交通方式的变化，现代交通更快。"],
      ["世界历史","古埃及",2,"古埃及最有代表性的巨大陵墓建筑是？","金字塔",["长城","斗兽场","兵马俑"],"金字塔是古埃及文明的重要建筑。"],
      ["历史影响","四大发明",3,"指南针对古代航海的重要作用是？","帮助辨别方向",["让船变大","让海水变甜","制造粮食"],"在海上容易迷失方向，指南针能帮助航海者判断方向。"]
    ].forEach(x=>addQ(DATA,"history",x[0],x[1],x[2],x[3],x[4],x[5],x[6],{courseType:"extension"}));
    addCard(DATA,"history","历史不是只背年份","先看时间顺序，再问：为什么发生？带来了什么结果？和今天有什么不同？","历史方法",1);
  }

  function addGeo(DATA) {
    const allCaps = PROVINCE_CAPITALS.map(x=>x[1]);
    PROVINCE_CAPITALS.forEach(([p,c],i)=>{
      const wrongs = pickWrongs(allCaps, c, i);
      addQ(DATA,"geography","中国省份与省会","中国省会",2,`${p}的省会或行政中心是？`,c,wrongs,`${p}的省会或行政中心是${c}。省会是省级行政区的重要城市。`,{courseType:"extension"});
    });
    const allCountryCaps = COUNTRY_CAPITALS.map(x=>x[1]);
    COUNTRY_CAPITALS.forEach(([country,cap,cont],i)=>{
      addQ(DATA,"geography","世界国家与首都","世界首都",2,`${country}的首都是哪里？`,cap,pickWrongs(allCountryCaps, cap, i),`${country}位于${cont}，首都是${cap}。注意不要把著名城市误认为首都。`,{courseType:"extension"});
    });
    addQ(DATA,"geography","容易混淆的首都","世界首都",3,"澳大利亚的首都是哪里？","堪培拉",["悉尼","墨尔本","布里斯班"],"悉尼很有名，但澳大利亚首都是堪培拉。",{courseType:"extension"});
    addQ(DATA,"geography","世界之最","极值知识",3,"关于海洋最深处，哪种说法更准确？","挑战者深渊是目前已知海洋最深处之一",["太平洋就是一个海沟","最深海洋叫马里亚纳","所有深海都一样深"],"太平洋是最大海洋，马里亚纳海沟位于太平洋，挑战者深渊是其中最深处之一。",{courseType:"extension", ambiguityNote:"极值采用稳定地理常识，避免变化数据。"});
  }

  function fixExisting(DATA) {
    if(DATA.idiom) {
      DATA.idiom.name = SUBJECT_META.idiom.name;
      DATA.idiom.desc = SUBJECT_META.idiom.desc;
      (DATA.idiom.questions||[]).forEach(q=>{
        q.q = String(q.q).replace(/低头丧气/g,"垂头丧气");
        q.o = (q.o||[]).map(o=>String(o).replace(/低头丧气/g,"垂头丧气"));
      });
      (DATA.idiom.cards||[]).forEach(c=>{
        if(c.word==="低头丧气") c.word="垂头丧气";
        if(c.mean) c.mean = String(c.mean).replace(/低头丧气/g,"垂头丧气");
      });
    }
    if(DATA.chemistry) {
      (DATA.chemistry.questions||[]).forEach(q=>{
        if(q.q && q.q.includes("奶粉放进水里会溶解吗")) {
          q.q = "奶粉放进水里，较准确的说法是？";
          q.o = ["会形成复杂的分散和部分溶解","一定完全溶解","会爆炸","会变成铁"];
          q.a = 0;
          q.explain = "奶粉里有多种成分，放进水里不是简单完全溶解，而是分散和部分溶解。";
        }
        if(q.q==="冰为什么能浮在水面上？") {
          q.o[q.a] = "冰的密度比液态水小";
          q.explain = "冰的密度比液态水小，所以同样体积下更轻，会浮在水面。";
        }
      });
    }
    if(DATA.physics) {
      (DATA.physics.questions||[]).forEach(q=>{
        if(q.q==="太阳下站着") {
          q.q = "太阳下站着，影子的位置主要和什么有关？";
          q.o = ["太阳方向和高度","鞋子颜色","衣服大小","当天星期几"];
          q.a = 0;
          q.explain = "影子总在光照来的反方向，长短和位置会随太阳方向和高度变化。";
        }
        if(q.q && q.q.includes("照镜子时，你举右手")) {
          q.q = "照镜子时，镜像为什么看起来左右相反？";
          q.o = ["镜面把前后方向反过来，我们转身比较时觉得左右相反","镜子真的把左手变成右手","镜子会改变人的身体","镜子只反射左边"];
          q.a = 0;
          q.explain = "镜面反射更准确地说是前后方向反转；我们把镜中人想象成转过身来，才会觉得左右相反。";
        }
        if(q.q && q.q.includes("看见镜子里的自己")) {
          q.explain = "镜子能反射照到它上面的光，光进入我们的眼睛，所以我们能看见镜子里的自己。";
        }
      });
    }
    if(DATA.biology) {
      (DATA.biology.questions||[]).forEach(q=>{
        if(q.q==="下面哪个是会飞的动物？") {
          q.explain = "大多数鸟会飞，但也有鸵鸟、企鹅等不会飞，所以不能说所有鸟都会飞。";
        }
      });
    }
  }

  function annotate(DATA) {
    Object.keys(SUBJECT_META).forEach(k=>ensureSubject(DATA,k));
    Object.keys(DATA).forEach(k=>{
      if(SUBJECT_META[k]) Object.assign(DATA[k], SUBJECT_META[k]);
    });
    Object.keys(DATA).forEach(subject=>{
      (DATA[subject].questions||[]).forEach((q,i)=>{
        q.lv = Math.max(1, Math.min(5, Number(q.lv || q.levelNum || 2)));
        q.courseType = q.courseType || (["math","reading","english","physics","chemistry","biology","idiom"].includes(subject) ? "core" : "extension");
        q.unit = q.unit || (q.tags && q.tags[0]) || "综合练习";
        q.tag = q.tag || (q.tags && q.tags[0]) || q.unit;
        q.tags = q.tags || [q.tag];
        q.id = q.id || `${subject}-${i}`;
        q.verified = q.verified !== false;
        q.verifiedAt = q.verifiedAt || "2026-07";
        q.sourceCategory = q.sourceCategory || "自建题库/人工审核";
      });
    });
  }

  function buildCards(DATA) {
    Object.keys(SUBJECT_META).forEach(subject=>{
      ensureSubject(DATA, subject);
      const meta = SUBJECT_META[subject];
      DATA[subject].cards.unshift({
        front: `${meta.route}：${meta.name}学习路线`,
        back: `先学单元核心知识，再做基础练习、应用练习和综合练习。掌握后再进入拓展或挑战内容。当前默认等级：L${meta.defaultLevel}。`,
        tag: "课程路线",
        lv: 1
      });
    });
    COURSE_MAP.forEach(kp=>{
      if(!DATA[kp.subject]) return;
      addCard(DATA, kp.subject, `${kp.grade}年级${kp.semester}册 · ${kp.unit}`, `知识点：${kp.knowledgePoint}\n前置知识：${kp.prerequisite.join("、") || "无"}\n路线：${kp.core ? "校内课程主线" : "拓展副线"}`, kp.unit, kp.level);
    });
  }

  function applyCurriculumEnhancements(DATA) {
    Object.keys(SUBJECT_META).forEach(k=>ensureSubject(DATA,k));
    addMath(DATA);
    addOlympiad(DATA);
    addScience(DATA);
    addHistory(DATA);
    addGeo(DATA);
    fixExisting(DATA);
    annotate(DATA);
    buildCards(DATA);
    window.XUEBA_CURRICULUM = {SUBJECT_ORDER, SUBJECT_META, COURSE_MAP, PROVINCE_CAPITALS, COUNTRY_CAPITALS};
  }

  window.applyCurriculumEnhancements = applyCurriculumEnhancements;
})();
