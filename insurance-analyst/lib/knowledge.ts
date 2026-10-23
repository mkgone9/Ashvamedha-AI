export type KnowledgeItem = {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  url: string;
  checkedAt: string;
  topics: string[];
  status: "official" | "needs-review";
};

// Curated starter index only. Review source content and dates before public launch.
// Product-specific facts must come from current insurer documents uploaded and approved by the team.
export const KNOWLEDGE: KnowledgeItem[] = [
  {
    id: "irdai-consumer",
    title: "IRDAI consumer information",
    summary: "Use IRDAI's official consumer resources to verify insurance concepts, policyholder information and current regulatory material. Always check the specific circular or product document relevant to a question.",
    sourceName: "Insurance Regulatory and Development Authority of India",
    url: "https://irdai.gov.in/",
    checkedAt: "2026-10-23",
    topics: ["insurance", "consumer", "regulation", "policyholder", "complaint"]
  },
  {
    id: "irdai-life",
    title: "Life insurance and policyholder resources",
    summary: "For life insurance benefits, exclusions, premium payment terms, surrender conditions and claims, rely on the actual policy wording, Customer Information Sheet and insurer-issued benefit illustration for the exact product and version. General pages cannot establish a customer's contractual benefit.",
    sourceName: "IRDAI official website",
    url: "https://irdai.gov.in/",
    checkedAt: "2026-10-23",
    topics: ["life", "term", "ulip", "tulip", "guaranteed", "income", "surrender", "benefit", "policy"]
  },
  {
    id: "india-code",
    title: "India Code — legislation database",
    summary: "Use the official India Code database to locate the text of applicable Indian legislation. Confirm commencement dates, amendments and applicability before relying on a legal summary.",
    sourceName: "Ministry of Law and Justice, Government of India",
    url: "https://www.indiacode.nic.in/",
    checkedAt: "2026-10-23",
    topics: ["law", "legal", "tax", "data protection", "dpdp", "legislation"]
  },
  {
    id: "incometax",
    title: "Income Tax Department",
    summary: "Tax treatment depends on the applicable law, policy type, issue date, premium conditions and the customer's circumstances. Verify the current statute and official guidance; do not promise that a premium or maturity benefit is tax-free without checking eligibility.",
    sourceName: "Income Tax Department, Government of India",
    url: "https://www.incometax.gov.in/",
    checkedAt: "2026-10-23",
    topics: ["tax", "80c", "10(10d)", "income tax", "deduction", "maturity"]
  }
];

function tokens(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9()]+/g)?.filter(t => t.length > 2) ?? [];
}

export function retrieveKnowledge(query: string, limit = 3): KnowledgeItem[] {
  const q = new Set(tokens(query));
  return KNOWLEDGE.map(item => {
    const corpus = tokens([item.title, item.summary, ...item.topics].join(" "));
    const overlap = corpus.reduce((n, token) => n + (q.has(token) ? 1 : 0), 0);
    const topicHits = item.topics.filter(topic => query.toLowerCase().includes(topic)).length;
    return { item, score: overlap + topicHits * 2 };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.item);
}