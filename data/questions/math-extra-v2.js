(function(){
  const B=window.XUEBA_QUESTION_BANK, out=[];
  const opts=(answer,wrong)=>{const a=[String(answer)];wrong.map(String).forEach(x=>{if(!a.includes(x))a.push(x);});while(a.length<4)a.push(`${a.length}-${String(answer)}`);return a;};
  const add=(id,unit,tag,level,question,answer,wrong,ex,extra)=>out.push(B.make("math",`v2-math-${id}`,4,unit,tag,level,"single",question,opts(answer,wrong),String(answer),ex,{courseType:"core",...extra}));
  for(let i=1;i<=10;i++){const a=20+i*7,b=3+i;add(`add-${i}`,"四则运算","整数加法",2,`${a} + ${b} = ?`,a+b,[a+b-1,a+b+1,a+b+10],"把个位和十位分别相加，结果是两个数的和。");}
  for(let i=1;i<=10;i++){const a=80+i*6,b=7+i;add(`sub-${i}`,"四则运算","整数减法",2,`${a} - ${b} = ?`,a-b,[a-b-1,a-b+1,a+b],"减法可以用加法验算：差加减数应等于被减数。");}
  for(let i=1;i<=10;i++){const a=3+i,b=4+i%5;add(`mul-${i}`,"三位数乘两位数","乘法",3,`${a} × ${b} = ?`,a*b,[a*b-1,a*b+1,a+b],"乘法表示几个相同数相加，可以先估算再计算。");}
  for(let i=1;i<=10;i++){const b=3+i%6,a=b*(4+i);add(`div-${i}`,"除数是两位数的除法","除法",3,`${a} ÷ ${b} = ?`,a/b,[a/b-1,a/b+1,b],"除法可以用乘法验算：商乘除数等于被除数。");}
  for(let i=1;i<=10;i++){const n=10+i*3;add(`seq-${i}`,"数与代数","找规律",3,`找规律：${n}, ${n+4}, ${n+8}, ( )`,n+12,[n+10,n+14,n+16],"相邻两项都增加4，所以再加4。");}
  for(let i=1;i<=10;i++){const w=3+i,l=6+i;add(`perimeter-${i}`,"图形的周长","长方形周长",3,`长${l}厘米、宽${w}厘米的长方形，周长是多少厘米？`,2*(l+w),[l+w,l*w,2*l+w],"长方形周长=(长+宽)×2。");}
  for(let i=1;i<=10;i++){const s=3+i;add(`area-${i}`,"图形的面积","正方形面积",3,`边长${s}厘米的正方形，面积是多少平方厘米？`,s*s,[s*4,s*2,s*s+1],"正方形面积=边长×边长。");}
  for(let i=1;i<=10;i++){const x=60+i*5,y=70+i*5;add(`average-${i}`,"统计与平均数","平均数",4,`两次数学练习得${x}分和${y}分，平均分是多少？`,(x+y)/2,[x,y,(x+y)/2+5],"平均数=(总数)÷份数。");}
  for(let i=1;i<=10;i++){const each=12+i,total=each*(3+i%4);add(`word-${i}`,"解决问题","数量关系",4,`每盒有${each}支笔，买${3+i%4}盒一共有多少支？`,total,[total-each,total+each,each+3+i%4],"总数=每份数×份数。");}
  for(let i=1;i<=10;i++){const a=4+i,b=2+i%3;add(`fraction-${i}`,"分数初步认识","分数意义",4,`把一个整体平均分成${a}份，取其中${b}份，应表示为哪个分数？`,`${b}/${a}`,[`${a}/${b}`,`${b+1}/${a}`,`1/${a}`],"分母表示平均分成几份，分子表示取了几份。");}
  B.register("math",out);
})();
