// 儿童粤语口语启蒙：粤拼采用香港语言学学会方案，词句与常见读音按粤典核对。
// 情境与题目为本项目原创；不把设备的普通话语音当作粤语示范。
(function(){
  const rawUnits=[
    {name:"问候礼貌",emoji:"👋",items:[
      ["你好","nei5 hou2","见面时说的你好","下午第一次见到新同学，先打招呼。"],
      ["早晨","zou2 san4","早上好","早上进教室，向老师问好。"],
      ["再见","zoi3 gin3","分别时说再见","放学后与同学分别。"],
      ["唔该","m4 goi1","请人帮忙或接受服务时说谢谢","同学帮你打开门，你想向对方道谢。"],
      ["多谢","do1 ze6","收到礼物或赞美时说谢谢","朋友送给你一份生日礼物。"],
      ["对唔住","deoi3 m4 zyu6","做错事时说对不起","不小心踩到同学的脚，主动道歉。"],
      ["唔紧要","m4 gan2 jiu3","回应道歉时说没关系","同学不小心碰到你并道歉，你表示没关系。"],
      ["请问","cing2 man6","礼貌地开始提问","想向不认识的人问路，先礼貌地开口。"]
    ]},
    {name:"家人朋友",emoji:"🏠",items:[
      ["阿爸","aa3 baa4","爸爸","向朋友介绍自己的爸爸。"],
      ["阿妈","aa3 maa1","妈妈","放学见到妈妈，叫她一声。"],
      ["哥哥","go4 go1","哥哥","介绍家里比自己年长的男孩。"],
      ["家姐","gaa1 ze1","姐姐","介绍自己的姐姐。"],
      ["细佬","sai3 lou2","弟弟","介绍自己的弟弟。"],
      ["阿妹","aa3 mui2","妹妹","介绍自己的妹妹。"],
      ["我哋","ngo5 dei6","我们","把自己和身边的伙伴合在一起称呼。"],
      ["你哋","nei5 dei6","你们","同时对两位同学说话，称呼他们。"]
    ]},
    {name:"吃喝生活",emoji:"🍚",items:[
      ["食饭","sik6 faan6","吃饭","到了午饭时间，准备吃正餐。"],
      ["饮水","jam2 seoi2","喝水","运动后口渴，想喝一杯水。"],
      ["好味","hou2 mei6","好吃、味道好","尝了点心，想夸它味道好。"],
      ["肚饿","tou5 ngo6","肚子饿","还没吃午饭，肚子已经饿了。"],
      ["饱喇","baau2 laa3","已经吃饱了","吃完晚饭，不想再添饭。"],
      ["苹果","ping4 gwo2","苹果","看到一种圆圆的红色水果，想说出它的名字。"],
      ["牛奶","ngau4 naai5","牛奶","早餐想喝一杯白色的奶制饮品。"],
      ["几多钱","gei2 do1 cin2","多少钱","买文具前想知道价格。"]
    ]},
    {name:"校园用语",emoji:"📚",items:[
      ["上堂","soeng5 tong4","上课","铃声响了，课程开始。"],
      ["落堂","lok6 tong4","下课","这节课结束，可以休息了。"],
      ["功课","gung1 fo3","作业","老师布置了放学后要完成的练习。"],
      ["唔明","m4 ming4","不明白","听完讲解还是没听懂，想告诉老师。"],
      ["老师","lou5 si1","老师","礼貌地称呼给大家上课的人。"],
      ["同学","tung4 hok6","同学","称呼和自己一起在学校学习的人。"],
      ["睇书","tai2 syu1","看书","坐在阅读角，打开书来读。"],
      ["写字","se2 zi6","写字","拿起笔，在纸上练习写汉字。"]
    ]},
    {name:"感受与行动",emoji:"😊",items:[
      ["开心","hoi1 sam1","高兴、开心","和朋友玩游戏玩得很高兴。"],
      ["唔开心","m4 hoi1 sam1","不高兴","比赛输了，心情有点不好。"],
      ["攰","gui6","累了","跑了一会儿，身体感觉很累。"],
      ["惊","geng1","害怕","突然听见一声巨响，心里有点害怕。"],
      ["等一等","dang2 jat1 dang2","等一下","朋友走得太快，你请他稍等。"],
      ["快啲","faai3 di1","快一点","快迟到了，提醒伙伴加快脚步。"],
      ["慢啲","maan6 di1","慢一点","地面有点滑，提醒伙伴放慢脚步。"],
      ["一齐玩","jat1 cai4 waan2","一起玩","想邀请新朋友加入游戏。"]
    ]}
  ];

  const units=rawUnits.map(unit=>({
    name:unit.name,emoji:unit.emoji,
    items:unit.items.map(([phrase,jyutping,meaning,scene])=>({phrase,jyutping,meaning,scene}))
  }));

  function buildSubject(){
    const cards=[], questions=[];
    units.forEach((unit,unitIndex)=>unit.items.forEach((item,itemIndex)=>{
      const wrongs=[1,2,3].map(offset=>unit.items[(itemIndex+offset)%unit.items.length]);
      const id=`cantonese-${unitIndex+1}-${itemIndex+1}`;
      cards.push({front:`${unit.emoji} ${item.phrase}`,
        back:`意思：${item.meaning}\n粤拼：${item.jyutping}\n场景：${item.scene}`,
        cantonese:item.phrase,jyutping:item.jyutping,tag:unit.name,lv:1});
      questions.push({id:`${id}-meaning`,type:"meaning",lv:1,tag:unit.name,
        q:`“${item.phrase}”在粤语里是什么意思？`,o:[item.meaning,...wrongs.map(w=>w.meaning)],a:0,
        audioText:item.phrase,explain:`正确答案是「${item.meaning}」。场景：${item.scene}`});
      const reversePrompt=item.meaning.includes(item.phrase)
        ? `粤拼“${item.jyutping}”对应哪句粤语？`
        : `要表达“${item.meaning}”，应选哪句粤语？`;
      questions.push({id:`${id}-reverse`,type:"reverse",lv:2,tag:unit.name,
        q:reversePrompt,o:[item.phrase,...wrongs.map(w=>w.phrase)],a:0,
        explain:`正确答案是「${item.phrase}」。粤拼：${item.jyutping}。`});
      questions.push({id:`${id}-scene`,type:"scene",lv:2,tag:unit.name,
        q:`情境：${item.scene}最合适说哪句粤语？`,o:[item.phrase,...wrongs.map(w=>w.phrase)],a:0,
        explain:`最合适说「${item.phrase}」，意思是${item.meaning}。`});
    }));
    return {units,cards,questions};
  }

  window.XUEBA_CANTONESE={buildSubject};
})();
