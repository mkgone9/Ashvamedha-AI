/* Ashvamedha AI — insurance guide chat endpoint (Vercel serverless function).
   Provider: any OpenAI-compatible API. Set in Vercel → Settings → Environment Variables:
     AI_API_KEY        (required)  e.g. a free Groq key from console.groq.com
     AI_BASE_URL       (optional)  default https://api.groq.com/openai/v1
     AI_MODEL          (optional)  default openai/gpt-oss-120b
     AI_FALLBACK_MODEL (optional)  default openai/gpt-oss-20b (used when the main model is rate-limited)
   Rule: the AI talks, these tools count. Every money figure shown to a client comes from a tool below. */

const BASE = process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1';
const MODEL = process.env.AI_MODEL || 'openai/gpt-oss-120b';
const FALLBACK = process.env.AI_FALLBACK_MODEL || 'openai/gpt-oss-20b';
const MAX_USER_TURNS = 40, MAX_CHARS = 1200, MAX_TOOL_ROUNDS = 4;

/* ───────── deterministic engines ───────── */
const L = n => n >= 1e7 ? '₹' + (n / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Crore' : '₹' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + ' Lakh';
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const num = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) && x >= lo && x <= hi ? x : null; };

// Same model as /insurance/guaranteed-income/10-pay-30-year-income (calibrated to insurer illustrations at age 40)
const GIP = { points: [[100000, 109.59], [250000, 111.26], [500000, 112.09]], refAge: 40, ageStep: 0.3, clamp: [18, 60], pay: 10, wait: 2, years: 30, cover: { base: 10.65, step: 0.01, oldAge: 45, oldMult: 7 } };
function gipRate(amt) {
  const p = GIP.points, x = Math.log(amt);
  for (let k = 0; k < p.length - 1; k++) {
    const [a, ra] = p[k], [b, rb] = p[k + 1];
    if (amt <= b || k === p.length - 2) { const t = Math.min(1, Math.max(0, (x - Math.log(a)) / (Math.log(b) - Math.log(a)))); return amt < a ? ra : ra + (rb - ra) * t; }
  }
}
function irr(P, n, M, T) { let lo = -0.5, hi = 0.5; for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; let v = M / Math.pow(1 + m, T); for (let t = 0; t < n; t++) v -= P / Math.pow(1 + m, t); v > 0 ? lo = m : hi = m; } return (lo + hi) / 2; }

const TOOLS = {
  life_cover_gap(a) {
    const inc = num(a.annual_income, 50000, 5e8), loans = num(a.loans_outstanding ?? 0, 0, 1e9), have = num(a.existing_life_cover ?? 0, 0, 1e10);
    if (inc === null || loans === null || have === null) return { error: 'Need annual_income (rupees), loans_outstanding (rupees), existing_life_cover (rupees).' };
    const deps = a.has_dependents !== false;
    const lo = deps ? inc * 10 + loans : loans, hi = deps ? inc * 15 + loans : loans, gap = Math.max(0, lo - have);
    const status = (!deps && !loans) ? 'green' : have >= lo ? 'green' : have >= lo * 0.5 ? 'amber' : 'red';
    return { result: { guide_low: lo, guide_high: hi, existing: have, gap, status },
      card: { kind: 'life', status, title: 'Life cover', big: status === 'green' ? (deps || loans ? 'Looks enough' : 'Low need') : L(gap) + ' short',
        bar: lo ? Math.min(100, Math.round(have / lo * 100)) : 100,
        rows: [['You have', have ? L(have) : 'None'], ['Common guide', deps || loans ? `${L(lo)} – ${L(hi)}` : 'Low need']],
        note: deps ? `Guide = 10–15 years of income${loans ? ' + loans' : ''}.` : 'No dependents: cover mainly needs to clear loans.' } };
  },
  health_cover_check(a) {
    const lakh = num(a.cover_lakh ?? 0, 0, 1000), fam = !!a.covers_family, emp = !!a.employer_only;
    if (lakh === null) return { error: 'Need cover_lakh (number, 0 if none).' };
    const need = fam ? 10 : 5;
    let status, big, note;
    if (!lakh) { status = 'red'; big = 'No health cover'; note = `A common starting point is ₹${need} Lakh${fam ? ' for a family' : ''}, plus a super top-up.`; }
    else if (emp) { status = 'amber'; big = 'Employer cover only'; note = 'It stops when you leave the job, and new cover gets harder to buy with age.'; }
    else if (lakh < need) { status = 'amber'; big = `₹${lakh} Lakh cover`; note = `₹${need} Lakh or more is a common guide${fam ? ' for a family' : ''} in a city like Hyderabad.`; }
    else { status = 'green'; big = `₹${lakh} Lakh cover`; note = 'Check room-rent limits and co-payment in your policy.'; }
    return { result: { status, guide_lakh: need }, card: { kind: 'health', status, title: 'Health cover', big, rows: [], note } };
  },
  savings_policy_return(a) {
    const P = num(a.yearly_premium, 1000, 1e8), n = num(a.premium_years, 1, 40), T = num(a.policy_term_years, 1, 60), M = num(a.maturity_amount, 1000, 1e10);
    if ([P, n, T, M].includes(null) || T < n) return { error: 'Need yearly_premium, premium_years, policy_term_years (>= premium_years), maturity_amount — all in rupees/years.' };
    const r = irr(P, n, M, T) * 100, status = r < 6 ? 'red' : r < 7 ? 'amber' : 'green';
    return { result: { return_pct_per_year: +r.toFixed(2), total_paid: P * n, maturity: M, ppf_rate_pct: 7.1, status },
      card: { kind: 'policy', status, title: a.label ? `Policy: ${String(a.label).slice(0, 40)}` : 'Your savings policy', big: `${r.toFixed(1)}% a year`,
        rows: [['You pay in total', L(P * n)], ['You get back', L(M)], ['PPF pays today', '7.1% a year']],
        note: "Don't stop paying on your own — stopping early can mean a loss. Ask Manoj to check the surrender value first." } };
  },
  guaranteed_income_sample(a) {
    const age = num(a.age, 18, 70), amt = num(a.yearly_amount, 50000, 5e7);
    if (age === null || amt === null) return { error: 'Need age and yearly_amount (rupees).' };
    if (age > 60) return { result: { available: false, reason: 'Most guaranteed income plans stop accepting new buyers around 60. Mention SCSS (8.2%) and Post Office MIS (7.4%) instead.' } };
    const e = Math.min(Math.max(age, GIP.clamp[0]), GIP.clamp[1]);
    const income = Math.round(amt * (gipRate(amt) + (GIP.refAge - e) * GIP.ageStep) / 100 / 10) * 10;
    const c = GIP.cover, cover = Math.round(amt * (age < c.oldAge ? c.base + (GIP.refAge - age) * c.step : c.oldMult) / 100) * 100;
    const start = age + GIP.pay + GIP.wait + 1, end = age + GIP.pay + GIP.wait + GIP.years;
    return { result: { yearly_income: income, monthly_approx: Math.round(income / 12), income_from_age: start, income_to_age: end, lump_sum_at_end: amt * 10, life_cover: cover, taxable_warning: amt > 500000 },
      card: { kind: 'gip', status: 'blue', title: 'Guaranteed income · sample', big: `${inr(income)} a year`,
        rows: [['You pay', `${L(amt)} a year × 10 years`], ['Income', `Age ${start} to ${end}`], ['Monthly, roughly', inr(income / 12)], ['Back at the end', L(amt * 10)], ['Life cover', L(cover)]],
        note: (amt > 500000 ? 'Premium above ₹5 Lakh a year makes the payouts taxable. ' : '') + 'Sample for a healthy non-smoker; the exact figure comes from the insurer.',
        link: ['Try other amounts', '/insurance/guaranteed-income/10-pay-30-year-income'] } };
  },
  finish_checkup(a) {
    const s = x => String(x || '').slice(0, 300);
    return { result: { ok: true }, done: { name: s(a.name), summary: s(a.summary_for_manoj), goal: s(a.goal), age: s(a.age), income: s(a.income), dependents: s(a.dependents), loans: s(a.loans) } };
  }
};

const TOOL_DEFS = [
  { name: 'life_cover_gap', description: 'Compute life-cover need (10–15× income + loans) and the gap. Call once you know income, loans, existing life cover and whether anyone depends on them.',
    parameters: { type: 'object', properties: { annual_income: { type: 'number', description: 'Yearly income in rupees (e.g. 1500000). Use midpoint if they gave a range.' }, loans_outstanding: { type: 'number', description: 'Total outstanding loans in rupees, 0 if none' }, existing_life_cover: { type: 'number', description: 'Total personal life cover in rupees, excluding employer group cover; 0 if none' }, has_dependents: { type: 'boolean' } }, required: ['annual_income', 'loans_outstanding', 'existing_life_cover', 'has_dependents'] } },
  { name: 'health_cover_check', description: 'Assess health insurance. Call once you know their health cover.',
    parameters: { type: 'object', properties: { cover_lakh: { type: 'number', description: 'Sum insured in lakh rupees, 0 if none' }, covers_family: { type: 'boolean', description: 'True if spouse/children/parents need covering' }, employer_only: { type: 'boolean', description: 'True if their only health cover is from the employer' } }, required: ['cover_lakh', 'covers_family', 'employer_only'] } },
  { name: 'savings_policy_return', description: 'Real yearly return (IRR) of an endowment / money-back / LIC-type savings policy. Money-back payouts should be added into maturity_amount.',
    parameters: { type: 'object', properties: { yearly_premium: { type: 'number' }, premium_years: { type: 'number' }, policy_term_years: { type: 'number' }, maturity_amount: { type: 'number', description: 'Total amount promised at maturity incl. bonus, in rupees' }, label: { type: 'string', description: 'Short label the user uses for it, e.g. "LIC Jeevan" — no policy numbers' } }, required: ['yearly_premium', 'premium_years', 'policy_term_years', 'maturity_amount'] } },
  { name: 'guaranteed_income_sample', description: 'Sample of a pay-10-years, income-for-30-years guaranteed income plan with premiums returned at the end. Use for goals: fixed income later, retirement income, income for parents.',
    parameters: { type: 'object', properties: { age: { type: 'number', description: 'Age of the person who will pay' }, yearly_amount: { type: 'number', description: 'Yearly premium in rupees, e.g. 250000' } }, required: ['age', 'yearly_amount'] } },
  { name: 'finish_checkup', description: 'Call once the check-up is complete (after the relevant tools). This shows the client their report and the WhatsApp button.',
    parameters: { type: 'object', properties: { name: { type: 'string' }, age: { type: 'string' }, income: { type: 'string' }, dependents: { type: 'string' }, loans: { type: 'string' }, goal: { type: 'string' }, summary_for_manoj: { type: 'string', description: '2–4 short lines for Manoj: key gaps found and what the client wants help with' } }, required: ['summary_for_manoj', 'goal'] } }
].map(f => ({ type: 'function', function: f }));

const SYSTEM = `You are "Ashvamedha AI", the insurance guide on the website of Manoj Kumar (Ashvamedha Finance, Banjara Hills, Hyderabad). You are an AI assistant, not a human; say so if asked.

The website has already greeted the client with a short welcome, so don't greet again at length.

YOUR JOB: run a friendly 3–5 minute insurance check-up, show the client facts about their situation, and hand them to Manoj on WhatsApp for real advice and quotes.

COLLECT, ONE QUESTION AT A TIME (skip what they already told you):
1. Age  2. Yearly income (a range is fine)  3. Who depends on them  4. Outstanding loans  5. Total personal life cover (not from employer)  6. Health insurance (amount; own or only employer)  7. Any savings policy like LIC/endowment/money-back — if yes: yearly premium, years paying, policy term, maturity amount  8. Main goal: protect family / fixed income later in life / grow money with life cover / regular income for parents  9. If goal is not just protection: how much they could set aside per year for 10 years.

TOOLS — the most important rule:
- NEVER state or estimate any rupee amount, return %, cover need or plan benefit yourself. Every such number must come from a tool result in this conversation. If you lack a tool for it, say Manoj will share exact figures.
- Call each tool as soon as you have its inputs. The client sees each result as a card, so after a tool call just explain it in 1–2 plain sentences; do not repeat every number.
- Convert answers to rupees for tools (₹15 Lakh = 1500000; for a range like 10–20 Lakh use 1500000).
- When the check-up is done, call finish_checkup, then say their report is ready and they can send it to Manoj on WhatsApp.

PRODUCTS YOU MAY EXPLAIN (concepts only):
- Term insurance: pure life cover, lowest cost.
- Guaranteed income plans: pay ~10 years, fixed income for ~30 years, premiums often returned; return roughly 6–6.5% a year; tax-free only if total yearly premiums on such policies stay within ₹5 Lakh and cover is at least 10× premium. Use guaranteed_income_sample for numbers.
- Term + ULIP plans (TULIP): large life cover plus market-linked funds, typically 10-year premium payment. Value depends on markets; insurers show illustrations at 4% and 8% only. You have NO tool for TULIP numbers: say Manoj will share a personalised illustration.
- Safe government options for 60+: SCSS 8.2%, Post Office MIS 7.4% (rates for Oct–Dec 2026). PPF 7.1%.

HARD LIMITS:
- Never name an insurance company or a specific product name. Never say a plan is "the best".
- Never tell anyone to buy, stop, surrender or replace a specific policy. Show facts; decisions are for a conversation with Manoj.
- ULIPs are not "investment products" — describe them as insurance with market-linked savings, and always mention market risk.
- Never ask for PAN, Aadhaar, policy numbers, bank or card details. If they share any, tell them not to and continue.
- Stay on insurance, retirement income and protecting family. For stock tips or unrelated topics, politely bring them back.
- Not a guarantee of returns beyond what a guaranteed plan contractually promises; no tax or legal advice beyond the general rules above.

STYLE:
- Warm, simple, short: 1–3 sentences per message. One question per message.
- Reply in the client's language (English, Telugu, or Hindi/Telugu mixed with English).
- When your question has clear choices, end the message with a final line exactly like: OPTIONS: choice one | choice two | choice three  (max 5 choices, each under 25 characters).`;

/* ───────── provider call ───────── */
async function callModel(messages, model) {
  const r = await fetch(BASE.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.AI_API_KEY },
    body: JSON.stringify({ model, messages, tools: TOOL_DEFS, tool_choice: 'auto', temperature: 0.3, max_tokens: 900 })
  });
  if (!r.ok) { const t = await r.text(); const e = new Error('provider ' + r.status + ': ' + t.slice(0, 300)); e.status = r.status; throw e; }
  return (await r.json()).choices[0].message;
}

/* best-effort per-instance rate limit */
const hits = new Map();
function limited(ip) { const now = Date.now(), w = hits.get(ip) || []; const recent = w.filter(t => now - t < 60000); recent.push(now); hits.set(ip, recent); return recent.length > 20; }

function clean(history) {
  if (!Array.isArray(history)) return null;
  const out = [];
  for (const m of history.slice(-60)) {
    if (!m || typeof m !== 'object') continue;
    if (m.role === 'user' && typeof m.content === 'string') out.push({ role: 'user', content: m.content.slice(0, MAX_CHARS) });
    else if (m.role === 'assistant') {
      const a = { role: 'assistant', content: typeof m.content === 'string' ? m.content.slice(0, 4000) : '' };
      if (Array.isArray(m.tool_calls) && m.tool_calls.length) a.tool_calls = m.tool_calls.slice(0, 6).map(t => ({ id: String(t.id), type: 'function', function: { name: String(t.function?.name), arguments: String(t.function?.arguments || '{}').slice(0, 2000) } }));
      out.push(a);
    } else if (m.role === 'tool' && m.tool_call_id) out.push({ role: 'tool', tool_call_id: String(m.tool_call_id), content: String(m.content || '').slice(0, 3000) });
  }
  // drop leading tool/assistant messages that would orphan tool results
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.AI_API_KEY) return res.status(503).json({ error: 'AI is not set up yet (missing AI_API_KEY).' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  if (limited(ip)) return res.status(429).json({ error: 'Too many messages. Please wait a minute.' });
  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const history = clean(body && body.messages);
  if (!history || !history.length) return res.status(400).json({ error: 'No messages.' });
  if (history.filter(m => m.role === 'user').length > MAX_USER_TURNS) return res.status(429).json({ error: 'This chat is very long. Please send your details to Manoj on WhatsApp.' });

  const added = [], cards = []; let done = null;
  try {
    let model = MODEL;
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      let msg;
      try { msg = await callModel([{ role: 'system', content: SYSTEM }, ...history, ...added], model); }
      catch (e) { if (e.status === 429 && model !== FALLBACK) { model = FALLBACK; msg = await callModel([{ role: 'system', content: SYSTEM }, ...history, ...added], model); } else throw e; }
      const a = { role: 'assistant', content: msg.content || '' };
      if (msg.tool_calls && msg.tool_calls.length && round < MAX_TOOL_ROUNDS) {
        a.tool_calls = msg.tool_calls.map(t => ({ id: t.id, type: 'function', function: { name: t.function.name, arguments: t.function.arguments || '{}' } }));
        added.push(a);
        for (const t of a.tool_calls) {
          let args = {}; try { args = JSON.parse(t.function.arguments); } catch {}
          const fn = TOOLS[t.function.name];
          const out = fn ? fn(args) : { error: 'Unknown tool' };
          if (out.card) cards.push(out.card);
          if (out.done) done = out.done;
          added.push({ role: 'tool', tool_call_id: t.id, content: JSON.stringify(out.result || { error: out.error }) });
        }
        continue;
      }
      added.push(a);
      break;
    }
  } catch (e) {
    console.error(e.message);
    return res.status(502).json({ error: 'The assistant is busy right now. Please try again in a moment, or message Manoj on WhatsApp.' });
  }
  const last = added[added.length - 1] || { content: '' };
  let reply = (last.content || '').trim(), options = [];
  const m = reply.match(/\n?\s*OPTIONS:\s*(.+)\s*$/i);
  if (m) { options = m[1].split('|').map(s => s.trim()).filter(Boolean).slice(0, 5); reply = reply.slice(0, m.index).trim(); }
  return res.status(200).json({ reply, options, cards, done, messages: added });
};
module.exports.TOOLS = TOOLS; // for tests
