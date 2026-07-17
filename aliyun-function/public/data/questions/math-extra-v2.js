(function(){
  const B=window.XUEBA_QUESTION_BANK,out=[];
  const opts=(a,w)=>{const out=[String(a)];w.map(String).forEach(x=>{if(!out.includes(x))out.push(x);});while(out.length<4)out.push(out.length+"-"+a);return out;};
  const add=(id,unit,tag,level,q,a,w,ex,extra)=>out.push(B.make("math",`v2-math-${id}`,4,unit,tag,level,"single",q,opts(a,w),String(a),ex,{courseType:"core",...extra}));
  for(let i=1;i<=10;i++){const a=120+i*13,b=230+i*17;add(`add-${i}`,"四则运算","整数加法",2,`${a} + ${b} = ?`,a+b,[a+b-1,a+b+1,a+b+10],"把个位、十位和百位分别相加，再检查进位。");}
  for(let i=1;i<=10;i++){const a=540+i*23,b=120+i*7;add(`sub-${i}`,"四则运算","整数减法",2,`${a} - ${b} = ?`,a-b,[a-b-1,a-b+1,a+b],"减法可以用加法验算：差加减数应等于被减数。");}
  const mult=[[246,32],[508,47],[315,26],[704,18],[129,35],[432,21],[675,14],[803,27],[391,42],[527,36]];
  mult.forEach(([a,b],i)=>add(`mul-${i+1}`,"三位数乘两位数","三位数乘两位数",3,`${a} × ${b} = ?`,a*b,[a*b-10,a*b+10,a*b+100],"先分别乘个位和十位，再把十位乘积向左移一位后相加。"));
  const div=[[864,24],[1728,48],[936,36],[1248,26],[1512,42],[2070,45],[3168,66],[2592,54],[1872,39],[3456,72]];
  div.forEach(([a,b],i)=>add(`div-${i+1}`,"除数是两位数的除法","两位数除法",3,`${a} ÷ ${b} = ?`,a/b,[a/b-1,a/b+1,b],"试商后用商乘除数验算，商乘除数应等于被除数。"));
  for(let i=1;i<=10;i++){const n=10+i*3;add(`seq-${i}`,"数与代数","找规律",3,`找规律：${n}, ${n+4}, ${n+8}, ( )`,n+12,[n+10,n+14,n+16],"相邻两项都增加4，所以再加4。",{courseType:"bridge"});}
  for(let i=1;i<=10;i++){const w=3+i,l=6+i;add(`perimeter-${i}`,"图形的周长","长方形周长",3,`长${l}厘米、宽${w}厘米的长方形，周长是多少厘米？`,2*(l+w),[l+w,l*w,2*l+w],"长方形周长=(长+宽)×2。",{practiceType:"application"});}
  for(let i=1;i<=10;i++){const s=3+i;add(`area-${i}`,"图形的面积","正方形面积",3,`边长${s}厘米的正方形，面积是多少平方厘米？`,s*s,[s*4,s*2,s*s+1],"正方形面积=边长×边长。",{practiceType:"application"});}
  for(let i=1;i<=10;i++){const x=60+i*5,y=70+i*5;add(`average-${i}`,"统计与平均数","平均数",4,`两次数学练习得${x}分和${y}分，平均分是多少？`,(x+y)/2,[x,y,(x+y)/2+5],"平均数=(总数)÷份数。",{practiceType:"application"});}
  for(let i=1;i<=10;i++){const each=12+i,total=each*(3+i%4);add(`word-${i}`,"解决问题","数量关系",4,`每盒有${each}支笔，买${3+i%4}盒一共有多少支？`,total,[total-each,total+each,each+3+i%4],"总数=每份数×份数，先找每份数和份数。",{practiceType:"application"});}
  for(let i=1;i<=10;i++){const denominator=4+i,numerator=2+i%3;add(`fraction-${i}`,"分数初步认识","分数意义",4,`把一个整体平均分成${denominator}份，取其中${numerator}份，应表示为哪个分数？`,`${numerator}/${denominator}`,[`${denominator}/${numerator}`,`${numerator+1}/${denominator}`,`1/${denominator}`],"分母表示平均分成几份，分子表示取了几份。",{practiceType:"concept"});}
  B.register("math",out);
})();
