"use client";

import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string; sources?: Array<{ title: string; sourceName: string; url: string; checkedAt: string }> };

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi, I’m Ashvamedha AI Insurance Analyst. Ask me about term insurance, ULIPs, guaranteed-income plans or insurance terminology. I’ll cite sources where available and tell you when the evidence is insufficient. This prototype is educational, not an official quote or a personalised recommendation." }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [age, setAge] = useState("32");
  const [income, setIncome] = useState("1200000");
  const [budget, setBudget] = useState("60000");
  const [dependants, setDependants] = useState("2");
  const [goal, setGoal] = useState("family");
  const [assessment, setAssessment] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [phone, setPhone] = useState("");

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const text = question.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); setQuestion(""); setLoading(true); setError("");
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history: next.slice(-7).map(({ role, content }) => ({ role, content })) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to answer right now.");
      setMessages([...next, { role: "assistant", content: data.answer, sources: data.sources }]);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  async function assess(e: FormEvent) {
    e.preventDefault(); setAssessment([]);
    const res = await fetch("/api/assessment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ age: Number(age), annualIncome: Number(income), annualPremiumBudget: Number(budget), dependants: Number(dependants), goal }) });
    const data = await res.json();
    setAssessment(res.ok ? [
      data.annualBudgetShareOfIncome === null ? "Income share cannot be calculated until annual income is supplied." : `Your stated annual premium budget is ${data.annualBudgetShareOfIncome}% of your stated annual income.`,
      ...data.flags
    ] : data.errors || [data.error || "Unable to calculate assessment."]);
  }

  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  const handoffEnabled = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER && process.env.NEXT_PUBLIC_WHATSAPP_NUMBER.length > 5;

  function whatsappHref() {
    const msg = `Hello Ashvamedha AI team. I would like an insurance consultation. My goal is ${goal}. I consent to opening WhatsApp and sharing this message with your team.`;
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
  }

  return <main className="shell">
    <header className="topbar"><div className="brandmark">A</div><div><div className="brand">ASHVAMEDHA <span>AI</span></div><div className="subbrand">INSURANCE ANALYST</div></div><span className="prototype">PRIVATE PROTOTYPE</span></header>
    <section className="hero"><div className="eyebrow">INSURANCE, EXPLAINED CLEARLY</div><h1>Understand your cover.<br/><em>Make informed decisions.</em></h1><p>Ask questions, explore insurance concepts and get a preliminary needs assessment with transparent limitations.</p><div className="hero-note">Educational prototype · No official quotes · No personal details required for chat</div></section>
    <div className="layout">
      <section className="panel chat-panel"><div className="panel-head"><div><div className="eyebrow">01 / ASK ASHVAMEDHA</div><h2>Insurance assistant</h2></div><span className="live-dot">● Ready</span></div>
        <div className="quick-prompts">{["How does a ULIP work?","What should I check in a guaranteed-income plan?","What is the difference between term and savings insurance?"].map(q => <button key={q} className="prompt" onClick={() => setQuestion(q)}>{q}</button>)}</div>
        <div className="messages">{messages.map((m, i) => <article key={i} className={`message ${m.role}`}><div className="message-label">{m.role === "assistant" ? "ASHVAMEDHA AI" : "YOU"}</div><div className="message-content">{m.content}</div>{m.sources?.length ? <div className="sources"><strong>Retrieved sources</strong>{m.sources.map((s, j) => <a key={s.url + j} href={s.url} target="_blank" rel="noreferrer">[{j + 1}] {s.sourceName} ↗ <small>Checked {s.checkedAt}</small></a>)}</div> : null}</article>)}
          {loading && <div className="message assistant"><div className="message-label">ASHVAMEDHA AI</div><div className="message-content">Checking available sources…</div></div>}
        </div>
        {error && <div className="error">{error}</div>}
        <form className="composer" onSubmit={send}><input value={question} onChange={e => setQuestion(e.target.value)} maxLength={2000} placeholder="Ask an insurance question…" aria-label="Ask an insurance question"/><button disabled={loading || !question.trim()} type="submit">{loading ? "…" : "Ask ↗"}</button></form>
        <p className="fineprint">Answers may be incomplete. Product-specific terms must be verified against the current insurer-issued policy wording and benefit illustration.</p>
      </section>
      <aside className="panel"><div className="panel-head"><div><div className="eyebrow">02 / QUICK CHECK</div><h2>Needs snapshot</h2></div></div><p className="muted">This calculation is deterministic. It does not recommend a product or estimate insurance cover.</p>
        <form className="assessment" onSubmit={assess}><label>Age<input type="number" min="18" max="100" required value={age} onChange={e => setAge(e.target.value)}/></label><label>Annual income (₹)<input type="number" min="0" required value={income} onChange={e => setIncome(e.target.value)}/></label><label>Annual premium budget (₹)<input type="number" min="0" required value={budget} onChange={e => setBudget(e.target.value)}/></label><label>Financial dependants<input type="number" min="0" max="20" required value={dependants} onChange={e => setDependants(e.target.value)}/></label><label>Main goal<select value={goal} onChange={e => setGoal(e.target.value)}><option value="family">Family protection</option><option value="income">Future income</option><option value="growth">Long-term growth</option><option value="child">Child's future</option><option value="review">Review existing policies</option></select></label><button className="primary" type="submit">Run basic assessment</button></form>
        {assessment.length > 0 && <div className="result"><strong>Preliminary flags</strong><ul>{assessment.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        <div className="handoff"><div className="eyebrow">03 / HUMAN SUPPORT</div><h3>Prefer to speak to a person?</h3><p className="muted">WhatsApp handoff is disabled until the business number, consent wording and compliance review are completed.</p><label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/> I agree to open WhatsApp and share my consultation request with Ashvamedha.</label><label className="sr-label" htmlFor="phone">Optional phone number (not stored in this prototype)</label><input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional — leave blank" inputMode="tel" maxLength={20}/>{handoffEnabled && consent ? <a className="primary wa-link" href={whatsappHref()} target="_blank" rel="noreferrer">Continue to WhatsApp ↗</a> : <button className="primary" disabled>WhatsApp handoff not configured</button>}</div>
      </aside>
    </div>
    <footer><span>ASHVAMEDHA AI · PROTOTYPE</span><span>Fictional/demo use only. Not an insurer quote, policy document or financial recommendation.</span></footer>
  </main>;
}