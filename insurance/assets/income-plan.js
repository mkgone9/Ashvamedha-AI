/* ═══════════════════════════════════════════════════════════════
   Ashvamedha · Income-plan calculator engine
   Shared by every "Guaranteed Income Plan" page.
   Each page sets window.PLAN = {...} (see config reference below)
   before loading this file. Only the numbers live in PLAN;
   all wording lives in the page's own HTML.

   PLAN config reference
   ─────────────────────
   id           short id used in WhatsApp message      'gip-10-30'
   name         public name (never the insurer name)   'Pay 10, Get 30 Income Plan'
   payYears     years premium is paid                   10
   waitYears    gap after last premium                  2
   incomeYears  years income is paid                    30
   ropMultiple  lump sum at end, × yearly premium       10   (0 = none)
   refAge       age the calibration points are for      40
   points       [[yearlyPremium, income per ₹100 premium], …]
                taken straight from insurer illustrations at refAge
   ageStep      income per ₹100 gained per year younger 0.03
   ageClamp     [min,max] ages the model is valid for   [18,60]
   cover        {base:10.65, step:0.01, oldAge:45, oldMult:7}
                life cover = premium × (base + (refAge-age)×step),
                or premium × oldMult at/after oldAge
   taxLimit     yearly premium above which gains are taxed  500000
   defaultAmt   pre-selected premium                    500000
   ═══════════════════════════════════════════════════════════════ */
(function(){
const P=window.PLAN,WA='918790109022',$=id=>document.getElementById(id);
const S={who:'self',age:35,amt:P.defaultAmt};
const AGE={self:[18,60,35,'Your age'],spouse:[18,60,32,"Spouse's age"],child:[0,17,5,"Child's age"],parent:[40,65,55,"Parent's age"]};
const startYr=P.payYears+P.waitYears+1, endYr=P.payYears+P.waitYears+P.incomeYears;

function rateFor(amt){
  const pts=P.points,x=Math.log(amt);
  if(pts.length===1)return pts[0][1];
  for(let i=0;i<pts.length-1;i++){const[a,ra]=pts[i],[b,rb]=pts[i+1];
    if(amt<=b||i===pts.length-2){const t=Math.min(1,Math.max(0,(x-Math.log(a))/(Math.log(b)-Math.log(a))));return amt<a?ra:ra+(rb-ra)*t;}}
}
function model(age,amt){
  const e=Math.min(Math.max(age,P.ageClamp[0]),P.ageClamp[1]),r=rateFor(amt)+(P.refAge-e)*P.ageStep;
  const c=P.cover,mult=age<c.oldAge?c.base+(P.refAge-age)*c.step:c.oldMult;
  return{income:Math.round(amt*r/100/10)*10,cover:Math.round(amt*mult/100)*100};
}
const inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
const sh=n=>n>=1e7?'₹'+(n/1e7).toFixed(2).replace(/\.?0+$/,'')+' Cr':n>=1e5?'₹'+(n/1e5).toFixed(1).replace(/\.0$/,'')+' L':inr(n);
const lakh=n=>n>=1e7?'₹'+(n/1e7).toFixed(2).replace(/\.?0+$/,'')+' Crore':'₹'+(n/1e5).toFixed(1).replace(/\.0$/,'')+' Lakh';

function render(){
  const{age,amt}=S,m=model(age,amt),back=amt*P.ropMultiple,total=m.income*P.incomeYears+back;
  $('ageOut').textContent=age;$('age').value=age;
  $('income').textContent=inr(m.income);$('barInc').textContent=inr(m.income);
  $('sub').innerHTML=`Starting at age <b>${age+startYr}</b>`+(back?` · Plus <b>${sh(back)} back</b> at the end`:'');
  $('give').textContent=sh(amt*P.payYears);$('get').textContent=sh(total);
  $('kfCover').textContent=lakh(m.cover)+' Life Cover';
  $('kfTax').textContent=amt>P.taxLimit
    ?`Premium above ${sh(P.taxLimit)} a year: income and maturity become taxable. Ask Manoj how to structure it.`
    :`Save up to ${lakh((total-amt*P.payYears)*0.312)} in tax. Income and maturity are tax-free.`;
  const steps=[
    ['c-blue',age,'Start paying',`<span class="amt">${sh(amt)}</span> a year for ${P.payYears} years`],
    ['c-orange',age+P.payYears,'Stop paying',`Wait just ${P.waitYears} years`],
    ['c-green',age+startYr,'Income starts',`<span class="amt">${inr(m.income)}</span> every year for ${P.incomeYears} years`]];
  if(back)steps.push(['c-purple',age+endYr,'On Maturity',`<span class="lbl">Additional Lump Sum Amount</span><span class="lump">${lakh(back)} at age ${age+endYr}</span>`]);
  $('tl').innerHTML=steps.map(([c,a,t,s])=>`<li class="${c}"><div><div class="dot">${a}</div><div class="tl-age">age</div></div><div class="tl-t"><b>${t}</b><span>${s}</span></div></li>`).join('');
}
function setAge(v){const[mn,mx]=AGE[S.who];S.age=Math.min(mx,Math.max(mn,v));render();}

document.querySelectorAll('[data-who]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('[data-who]').forEach(x=>x.setAttribute('aria-pressed',x===b));
  S.who=b.dataset.who;const[mn,mx,d,l]=AGE[S.who];
  $('age').min=mn;$('age').max=mx;$('ageQ').textContent=l;setAge(d);
});
document.querySelectorAll('[data-amt]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('[data-amt]').forEach(x=>x.setAttribute('aria-pressed',x===b));
  S.amt=+b.dataset.amt;render();
});
$('minus').onclick=()=>setAge(S.age-1);$('plus').onclick=()=>setAge(S.age+1);
$('age').oninput=e=>setAge(+e.target.value);

/* consultation sheet → WhatsApp */
const W=$('sheetWrap');
function open(){
  const m=model(S.age,S.amt),w={self:'me',spouse:'my spouse',child:'my child',parent:'my parent'}[S.who];
  $('sum').innerHTML=`For ${w} (age ${S.age}) · <b>${sh(S.amt)}/year</b> → <b>${inr(m.income)}/year</b> for ${P.incomeYears} years`;
  W.classList.add('open');setTimeout(()=>$('name').focus(),260);
}
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=open);
document.querySelector('[data-close]').onclick=()=>W.classList.remove('open');
document.addEventListener('keydown',e=>{if(e.key==='Escape')W.classList.remove('open')});
$('name').oninput=()=>$('fName').classList.remove('err');
$('form').onsubmit=e=>{
  e.preventDefault();const n=$('name').value.trim();
  if(!n){$('fName').classList.add('err');$('name').focus();return;}
  const m=model(S.age,S.amt),who={self:'Myself',spouse:'Spouse',child:'Child',parent:'Parent'}[S.who];
  const t=[`Hi Manoj 👋 I checked the *${P.name}* on your website.`,'',
    `Name: ${n}`,`City: ${$('city').value.trim()||'-'}`,`I am: ${$('occ').value}`,`Yearly income: ${$('inc').value}`,'',
    `Plan for: ${who} (age ${S.age})`,`Invest: ${inr(S.amt)} per year for ${P.payYears} years`,`Income shown: ${inr(m.income)} per year for ${P.incomeYears} years`,'',
    `Please explain the plan and share my exact quote. [${P.id}]`].join('\n');
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(t)}`,'_blank','noopener');
};
render();
})();
