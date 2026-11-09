#!/usr/bin/env python3
"""Ashvamedha site sync — run after adding/removing articles (CI runs it on every push).

Builds from the article files themselves:
  • blog.html                 — light-theme index, grouped by topic, with search
  • guides/<hub>/index.html   — topic hub pages (pillar pages) that link every related article
  • te/index.html             — Telugu guides index
  • llms.txt                  — map of the site for AI assistants (ChatGPT, Claude, Perplexity, Gemini)
  • sitemap.xml               — every page with lastmod
and injects into every article (idempotent):
  • an author box (E-E-A-T)   • a "part of <hub> guide" link
Usage: python3 scripts/site_sync.py
"""
import html, json, re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://www.ashvamedhaai.com'
CALC = '/insurance/guaranteed-income/10-pay-30-year-income'
WA = 'https://wa.link/rwwzd4'
TODAY = date.today().isoformat()

# ─── topic groups for the blog index (articleSection → group) ───
GROUPS = [
    ('guaranteed-income', '💰 Guaranteed Income', ['Guaranteed Income']),
    ('retirement', '🌅 Retirement & Parents', ['Retirement']),
    ('nri', '🌎 NRI Investing', ['NRI Investing', 'NRI']),
    ('insurance', '🛡️ Insurance', ['Insurance']),
    ('children', '🧒 Children & Family', ['Children']),
    ('planning', '🧭 Financial Planning', ['Financial Planning']),
    ('mf-tax', '📈 Mutual Funds & Tax', ['Mutual Funds', 'Tax Planning']),
    ('hni', '🏆 HNI: PMS & AIF', ['PMS & AIF']),
    ('property', '🏠 Home Loans & Property', ['Home & Property']),
    ('us-stocks', '🇺🇸 US Stocks', ['US Stocks']),
    ('stocks', '📊 Stock Market', ['Stock Market']),
]
SECTION_FALLBACK = {'best-stocks-short-term-india-2025': 'Stock Market', 'how-to-select-growth-stocks-long-term': 'Stock Market',
                    'nri-financial-planner-india': 'NRI Investing', 'nri-returning-to-india-investment-planning': 'NRI Investing'}

# ─── hub (pillar) pages ───
HUBS = {
    'guaranteed-income': dict(
        title='Guaranteed Income Plans: The Complete Guide (2026)',
        h1='Guaranteed Income: The Complete Guide',
        desc='Everything about guaranteed income in India: how plans work, tax rules, safest regular income options, fixed income, and how to build a second income.',
        intro='A guaranteed income is money that arrives on fixed dates, in a fixed amount, whatever happens to markets, interest rates or your job. This guide brings together everything on the site about building one: how guaranteed income plans work, how they are taxed, how they compare with SCSS, FDs and SWPs, and how to use them for a second income or retirement.',
        rule=lambda s, sec: sec == 'Guaranteed Income' or any(k in s for k in ('guaranteed', 'annuity', 'endowment', 'swp', 'pension', 'fixed-income', 'fd-alternatives', 'bonds')),
        start=['how-guaranteed-income-plans-work-pay-10-get-30', 'guaranteed-income-second-income-source', 'are-guaranteed-income-plans-tax-free', 'safest-regular-income-options-india'],
        te=['guaranteed-income-plan-telugu', 'safe-monthly-income-schemes-telugu'], calc_btn='Calculate my guaranteed income →'),
    'parents-retirement': dict(
        title='Retirement & Parents: Monthly Income Planning Guide',
        h1='Retirement & Parents: Build a Monthly Income That Lasts',
        desc='Plan retirement and give your parents a fixed monthly income: corpus, SCSS, POMIS, pensions, annuities, health cover and guaranteed income plans.',
        intro='Whether you are planning your own retirement or want your parents to stop working, the question is the same: how do you build a monthly income that never stops? Start with the guides below: how much you need, where to keep it safe, and how to lock an income for 30 years.',
        rule=lambda s, sec: sec == 'Retirement' or 'parent' in s or 'retire' in s or 'senior' in s or 'fire' in s or 'nps' in s,
        start=['how-to-retire-your-parents-guaranteed-income', 'how-to-retire-parents-from-usa-nri-guide', 'guaranteed-monthly-income-after-retirement-india', 'how-much-should-you-save-for-retirement-by-age'],
        te=['parents-monthly-income-plan-telugu', 'nri-parents-care-from-usa-telugu'], calc_btn='Calculate for my parents →'),
    'nri': dict(
        title='NRI Investing in India: Complete Guide Hub (2026)',
        h1='NRI Investing in India: Everything in One Place',
        desc='All NRI guides in one place: investing in India, NRE/NRO, taxation, PFIC for US NRIs, insurance, supporting and retiring parents from abroad.',
        intro='For NRIs in the US, UK, Gulf and Singapore: how to invest in India, which accounts to use, how each country taxes you, which insurance makes sense, and how to take care of and retire your parents from abroad.',
        rule=lambda s, sec: sec in ('NRI Investing', 'NRI') or 'nri' in s.split('-') or 'from-usa' in s or 'gift-city' in s,
        start=['nri-investment-in-india-complete-guide-2026', 'how-to-take-care-of-parents-in-india-from-usa', 'us-nri-investing-in-india-pfic-tax-trap', 'nri-taxation-in-india-rates-and-rules'],
        te=['nri-parents-care-from-usa-telugu'], calc_btn='Plan income for my parents →'),
    'children': dict(
        title="Children's Investments & Money Habits: Parent's Guide",
        h1="Children's Investments: A Parent's Guide",
        desc="Investment plans for children, Sukanya, PPF, insurance, minor accounts, pocket money and building your child a guaranteed income from 18.",
        intro="From your child's first pocket money to their college fees and first home: the right investments, the tax rules for investments in a child's name, and how to give your child a fixed income from age 18.",
        rule=lambda s, sec: sec == 'Children' or any(k in s for k in ('child', 'kids', 'minor', 'marriage', 'first-salary')),
        start=['best-investment-plans-for-children-india', 'pocket-money-for-kids-india', 'childrens-insurance-plans-do-you-need-one'],
        te=['children-investment-plans-telugu'], calc_btn='Calculate for my child →'),
}

AUTHOR_BOX = ('<div id="author-box" style="display:flex;gap:14px;align-items:flex-start;margin:34px 0 8px;padding:18px 20px;border:1px solid #e6e9f0;border-radius:16px;background:#f8fafc">'
              '<img src="/assets/logo.jpg" alt="Manoj Kumar, Ashvamedha Finance" width="56" height="56" style="border-radius:12px;flex:none">'
              '<div><div style="font-size:15px;font-weight:800;color:#0f172a">Written by Manoj Kumar</div>'
              '<div style="font-size:13.5px;color:#475569;line-height:1.65;margin-top:2px">Founder, Ashvamedha Finance, Banjara Hills, Hyderabad. 6+ years helping Telugu-speaking families and NRIs with investments, insurance, guaranteed income and retirement planning. '
              'Guidance in Telugu and English. <a href="/about" style="font-weight:700">About Manoj →</a></div>'
              '<div style="font-size:12px;color:#64748b;margin-top:6px">Last reviewed: {d}</div></div></div>')
AUTHOR_BOX_TE = AUTHOR_BOX.replace('Written by Manoj Kumar', 'రచయిత: మనోజ్ కుమార్').replace('Last reviewed', 'చివరిగా సమీక్షించింది')


def read(p): return p.read_text(encoding='utf-8')
def esc(s): return html.escape(s, quote=True)
def strip(s): return html.unescape(re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', s))).strip()


def meta(t, name):
    m = re.search(r'<meta[^>]+name=["\']' + name + r'["\'][^>]+content=["\'](.*?)["\']', t, re.S | re.I)
    return html.unescape(m.group(1)).strip() if m else ''


def load(folder, lang):
    out = []
    for p in sorted((ROOT / folder).glob('*.html')):
        if p.name == 'index.html': continue
        t = read(p)
        title = strip(re.search(r'<title>(.*?)</title>', t, re.S).group(1))
        sec = re.search(r'"articleSection": "([^"]+)"', t)
        sec = sec.group(1) if sec else SECTION_FALLBACK.get(p.stem, 'Financial Planning')
        dm = re.search(r'"dateModified": "([\d-]+)"', t) or re.search(r'"datePublished": "([\d-]+)"', t)
        out.append(dict(slug=p.stem, path=p, url=f'/{folder}/{p.stem}', title=title, desc=meta(t, 'description'),
                        section=sec, date=dm.group(1) if dm else TODAY, lang=lang))
    return out


HUB_PRIORITY = ['children', 'parents-retirement', 'nri', 'guaranteed-income']  # most specific first


def hub_of(a):
    for k in HUB_PRIORITY:
        h = HUBS[k]
        if h['rule'](a['slug'], a['section']): return k
    return None


def inject(a):
    """author box + hub link, idempotent."""
    t = read(a['path']); o = t
    box = (AUTHOR_BOX_TE if a['lang'] == 'te' else AUTHOR_BOX).replace('{d}', a['date'])
    t = re.sub(r'<div id="author-box".*?</div></div></div>', '', t, flags=re.S)
    for anchor in ('<div class="cta">', '<div class="rp">', '<div class="disc">', '</article>'):
        if anchor in t:
            t = t.replace(anchor, box + anchor, 1); break
    t = re.sub(r'<a class="hubln"[^>]*>.*?</a>', '', t, flags=re.S)
    hk = a.get('hub')
    if hk and a['lang'] == 'en':
        link = (f'<a class="hubln" href="/guides/{hk}" style="display:inline-block;margin:0 8px 18px 0;font-size:13px;font-weight:700;color:#12915a;'
                f'text-decoration:none;border:1px solid #b9e6cc;background:#ecfdf3;border-radius:999px;padding:6px 14px">📚 Part of: {esc(HUBS[hk]["h1"].split(":")[0])} guide →</a>')
        t = re.sub(r'(<div class="meta">.*?</div>)', lambda m: m.group(1) + link, t, count=1, flags=re.S)
    if t != o: a['path'].write_text(t, encoding='utf-8')


# ─── shared page shell (light theme) ───
CSS = """*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Outfit','Noto Sans Telugu',system-ui,sans-serif;background:#f3f5f9;color:#0f172a;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:#2563eb}nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 5%;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid #e6e9f0}
.nl{display:flex;align-items:center;gap:10px;text-decoration:none}.nl img{height:36px;border-radius:6px}.nl b{font-size:13px;color:#0f172a;display:block}.nl s{font-size:9px;color:#b8893a;letter-spacing:.15em;text-transform:uppercase;text-decoration:none;display:block}
.nh{display:flex;gap:6px;flex-wrap:wrap}.nh a{font-size:13px;font-weight:600;color:#334155;text-decoration:none;padding:7px 12px;border-radius:999px}.nh a.on,.nh a:hover{background:#eaf1fe;color:#2563eb}
.wrap{max-width:1180px;margin:0 auto;padding:34px 5% 70px}.hero{text-align:center;padding:26px 0 18px}.eb{display:inline-block;background:#eaf1fe;border:1px solid #cddffc;color:#2563eb;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:5px 14px;border-radius:999px;margin-bottom:14px}
h1{font-size:clamp(28px,4.5vw,46px);font-weight:800;letter-spacing:-.02em;line-height:1.12;margin-bottom:12px}.lead{font-size:17px;color:#475569;max-width:760px;margin:0 auto}
.srch{max-width:560px;margin:22px auto 0;position:relative}.srch input{width:100%;font:inherit;font-size:16px;padding:14px 18px 14px 44px;border:1.5px solid #d6dce8;border-radius:14px;background:#fff;outline:none}.srch input:focus{border-color:#2563eb}.srch span{position:absolute;left:16px;top:13px;font-size:18px}
.chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:22px 0 8px}.chips a{font-size:13px;font-weight:600;text-decoration:none;color:#334155;background:#fff;border:1px solid #e1e6ef;padding:7px 13px;border-radius:999px}.chips a:hover{border-color:#2563eb;color:#2563eb}
.hubs{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin:26px 0 10px}.hubs a{display:block;text-decoration:none;background:#fff;border:1px solid #e6e9f0;border-top:4px solid var(--c);border-radius:16px;padding:16px 18px}.hubs b{display:block;color:#0f172a;font-size:16px}.hubs span{font-size:13px;color:#64748b}
section{margin-top:44px}section h2{font-size:24px;font-weight:800;letter-spacing:-.01em;margin-bottom:6px;display:flex;align-items:center;gap:10px}section h2 small{font-size:13px;font-weight:600;color:#64748b}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:14px}.card{display:block;text-decoration:none;background:#fff;border:1px solid #e6e9f0;border-radius:16px;padding:18px 20px;transition:border-color .15s,box-shadow .15s}
.card:hover{border-color:#2563eb;box-shadow:0 6px 22px rgba(37,99,235,.08)}.card b{display:block;color:#0f172a;font-size:15.5px;line-height:1.4;margin-bottom:6px}.card span{display:block;font-size:13.5px;color:#64748b;line-height:1.55}.card i{display:inline-block;margin-top:10px;font-style:normal;font-size:12px;font-weight:700;color:#2563eb}
.te{background:linear-gradient(135deg,#fff7ed,#fff);border:1.5px solid #fcd9a8;border-radius:20px;padding:22px 24px;margin-top:40px}.te h2{font-size:22px}
.cta{margin-top:46px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:22px;padding:30px;text-align:center;color:#fff}.cta h3{font-size:24px;margin-bottom:8px}.cta p{color:rgba(255,255,255,.75);margin-bottom:18px}
.btn{display:inline-block;font-weight:700;font-size:14.5px;text-decoration:none;padding:13px 22px;border-radius:999px;margin:4px}.bg{background:#16a34a;color:#fff}.bb{background:#fff;color:#0f172a}
.calc{margin:26px 0 0;padding:22px;border-radius:18px;background:#e7f7ee;border:1.5px solid #b9e6cc}.calc b{font-size:19px;display:block;margin-bottom:4px}.calc p{color:#3d4a5c;margin-bottom:12px}
.prose{max-width:820px;margin:0 auto}.prose p{font-size:16.5px;color:#334155;margin-top:12px}.none{display:none!important}
footer{text-align:center;padding:26px 5%;border-top:1px solid #e6e9f0;background:#fff;font-size:12.5px;color:#64748b}footer a{color:#2563eb;text-decoration:none}
@media(max-width:700px){.nh a:not(.on){display:none}.wrap{padding:22px 4% 60px}.grid{grid-template-columns:1fr}}"""


def shell(title, desc, canon, body, lang='en', ld=None, extra_head=''):
    lds = ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in (ld or []))
    font = ('<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">'
            + ('<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;600;700;800&display=swap" rel="stylesheet">' if lang == 'te' else ''))
    return (f'<!DOCTYPE html><html lang="{lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{esc(title)}</title><meta name="description" content="{esc(desc)}"><meta name="robots" content="index,follow,max-image-preview:large">'
            f'<link rel="canonical" href="{SITE}{canon}">{extra_head}{font}<style>{CSS}</style>'
            f'<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:type" content="website">'
            f'<meta property="og:url" content="{SITE}{canon}"><meta property="og:site_name" content="Ashvamedha Finance"><meta property="og:image" content="{SITE}/og/default.jpg">'
            f'<meta name="twitter:card" content="summary_large_image">{lds}</head><body>'
            '<nav><a href="/" class="nl"><img src="/assets/logo.jpg" alt="Ashvamedha Finance"><div><b>MANOJ KUMAR</b><s>Ashvamedha Finance</s></div></a>'
            f'<div class="nh"><a href="/">Home</a><a href="/insurance">Insurance</a><a href="/blog"{" class=on" if canon.startswith("/blog") or canon.startswith("/guides") else ""}>Guides</a>'
            f'<a href="/te"{" class=on" if canon.startswith("/te") else ""}>తెలుగు</a><a href="/contact">Contact</a></div></nav>'
            f'{body}<footer>© {date.today().year} <a href="/">Ashvamedha Finance</a> · Banjara Hills, Hyderabad · <a href="{WA}">WhatsApp</a> · <a href="/blog">All guides</a> · <a href="/te">తెలుగు గైడ్స్</a></footer>'
            '<script defer src="/growth.js"></script></body></html>')


def card(a, cta='Read guide →'):
    d = a['desc'] if len(a['desc']) <= 150 else a['desc'][:147].rsplit(' ', 1)[0] + '…'
    return (f'<a class="card" href="{a["url"]}" data-q="{esc((a["title"] + " " + a["desc"]).lower())}">'
            f'<b>{esc(a["title"])}</b><span>{esc(d)}</span><i>{cta}</i></a>')


def org_ld(): return {"@type": "Organization", "@id": f"{SITE}/#org", "name": "Ashvamedha Finance", "url": f"{SITE}/"}


def build_blog(en, te):
    hub_cards = ''.join(f'<a href="/guides/{k}" style="--c:{c}"><b>{esc(h["h1"].split(":")[0])}</b><span>{esc(h["desc"][:90])}…</span></a>'
                        for (k, h), c in zip(HUBS.items(), ('#12915a', '#c2620a', '#2563eb', '#6d3fd6')))
    secs, chips = '', ''
    for gid, name, sections in GROUPS:
        items = sorted([a for a in en if a['section'] in sections], key=lambda a: a['date'], reverse=True)
        if not items: continue
        chips += f'<a href="#{gid}">{name} <small>({len(items)})</small></a>'
        secs += f'<section id="{gid}" data-sec><h2>{name} <small>{len(items)} guides</small></h2><div class="grid">{"".join(card(a) for a in items)}</div></section>'
    te_cards = ''.join(card(a, 'చదవండి →') for a in te)
    body = (f'<div class="wrap"><div class="hero"><div class="eb">Knowledge Centre</div><h1>Money guides for Telugu families &amp; NRIs</h1>'
            f'<p class="lead">{len(en)} plain-language guides on guaranteed income, insurance, retirement, NRI investing and tax, by Manoj Kumar, Ashvamedha Finance, Hyderabad. Also in తెలుగు.</p>'
            '<div class="srch"><span>🔎</span><input id="q" type="search" placeholder="Search guides: e.g. term insurance, SCSS, NRI tax" aria-label="Search guides"></div></div>'
            f'<div class="hubs">{hub_cards}</div><div class="chips">{chips}<a href="/te">తెలుగు గైడ్స్ ({len(te)})</a></div>'
            f'<div class="te"><h2>📖 తెలుగులో చదవండి</h2><p style="color:#7c4a03;font-size:14.5px;margin:4px 0 0">ముఖ్యమైన గైడ్స్ ఇప్పుడు తెలుగులో కూడా.</p><div class="grid">{te_cards}</div></div>'
            f'{secs}<div class="cta"><h3>Not sure where to start?</h3><p>Talk to Manoj — a free 15-minute call in Telugu or English.</p>'
            f'<a class="btn bg" href="{WA}" target="_blank" rel="noopener">WhatsApp free consultation</a><a class="btn bb" href="{CALC}">Guaranteed income calculator</a></div></div>'
            '<script>(function(){var q=document.getElementById("q");q.addEventListener("input",function(){var v=q.value.trim().toLowerCase();'
            'document.querySelectorAll("[data-sec]").forEach(function(s){var n=0;s.querySelectorAll(".card").forEach(function(c){var h=v&&c.dataset.q.indexOf(v)<0;c.classList.toggle("none",h);if(!h)n++});s.classList.toggle("none",n===0)})})})()</script>')
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Ashvamedha Finance Guides", "url": f"{SITE}/blog", "inLanguage": "en-IN", "publisher": org_ld(),
           "hasPart": [{"@type": "WebPage", "url": f"{SITE}/guides/{k}", "name": h['h1']} for k, h in HUBS.items()]},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"}, {"@type": "ListItem", "position": 2, "name": "Guides", "item": f"{SITE}/blog"}]}]
    (ROOT / 'blog.html').write_text(shell('Investment, Insurance & NRI Guides | Ashvamedha Finance',
        'Plain-language guides on guaranteed income, insurance, retirement, NRI investing and tax by Manoj Kumar, Ashvamedha Finance, Hyderabad. English and Telugu.',
        '/blog', body, ld=ld), encoding='utf-8')


def build_hubs(en, te):
    tmap = {a['slug']: a for a in te}
    for k, h in HUBS.items():
        items = [a for a in en if h['rule'](a['slug'], a['section']) or a['slug'] in h['start']]
        start = [a for s in h['start'] for a in items if a['slug'] == s]
        rest = sorted([a for a in items if a['slug'] not in h['start']], key=lambda a: a['date'], reverse=True)
        tes = [tmap[s] for s in h['te'] if s in tmap]
        body = (f'<div class="wrap"><div class="hero"><div class="eb">Complete guide</div><h1>{esc(h["h1"])}</h1></div><div class="prose"><p>{h["intro"]}</p>'
                f'<div class="calc"><b>See your numbers first</b><p>Pay for 10 years, get a fixed income for 30 years. Check the exact amount for your age and budget — 3 taps, no sign-up.</p>'
                f'<a class="btn bg" style="margin:0" href="{CALC}">{h["calc_btn"]}</a></div></div>'
                f'<section><h2>⭐ Start here</h2><div class="grid">{"".join(card(a) for a in start)}</div></section>'
                + (f'<div class="te"><h2>📖 తెలుగులో</h2><div class="grid">{"".join(card(a, "చదవండి →") for a in tes)}</div></div>' if tes else '')
                + f'<section><h2>All {esc(h["h1"].split(":")[0])} guides <small>{len(items)}</small></h2><div class="grid">{"".join(card(a) for a in rest)}</div></section>'
                f'<div class="cta"><h3>Want a plan for your family?</h3><p>Free 15-minute call with Manoj, in Telugu or English.</p><a class="btn bg" href="{WA}" target="_blank" rel="noopener">WhatsApp free consultation</a></div></div>')
        ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": h['h1'], "description": h['desc'], "url": f"{SITE}/guides/{k}", "inLanguage": "en-IN", "publisher": org_ld(),
               "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE + a['url'], "name": a['title']} for i, a in enumerate(start + rest)]}},
              {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
               {"@type": "ListItem", "position": 2, "name": "Guides", "item": f"{SITE}/blog"}, {"@type": "ListItem", "position": 3, "name": h['h1'], "item": f"{SITE}/guides/{k}"}]}]
        d = ROOT / 'guides' / k; d.mkdir(parents=True, exist_ok=True)
        (d / 'index.html').write_text(shell(h['title'], h['desc'], f'/guides/{k}', body, ld=ld), encoding='utf-8')


def build_te(te):
    body = (f'<div class="wrap"><div class="hero"><div class="eb">తెలుగు గైడ్స్</div><h1>డబ్బు, ఇన్సూరెన్స్, రిటైర్మెంట్ — తెలుగులో సులభంగా</h1>'
            '<p class="lead">గ్యారెంటీడ్ ఆదాయం, అమ్మానాన్నల రిటైర్మెంట్, పిల్లల పెట్టుబడులు, term insurance, NRI గైడ్స్ — మనోజ్ కుమార్, అశ్వమేధ ఫైనాన్స్, హైదరాబాద్.</p></div>'
            f'<section><div class="grid">{"".join(card(a, "చదవండి →") for a in te)}</div></section>'
            f'<div class="cta"><h3>మనోజ్‌తో మాట్లాడండి — ఉచిత సలహా</h3><p>తెలుగులో, 15 నిమిషాల ఉచిత కాల్.</p><a class="btn bg" href="{WA}" target="_blank" rel="noopener">WhatsApp ఉచిత కన్సల్టేషన్</a>'
            f'<a class="btn bb" href="{CALC}">ఆదాయ కాలిక్యులేటర్</a></div><p style="text-align:center;margin-top:22px"><a href="/blog">English guides →</a></p></div>')
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "తెలుగు ఆర్థిక గైడ్స్", "url": f"{SITE}/te", "inLanguage": "te", "publisher": org_ld()}]
    (ROOT / 'te').mkdir(exist_ok=True)
    (ROOT / 'te' / 'index.html').write_text(shell('తెలుగు ఆర్థిక గైడ్స్ — Investment & Insurance Guides in Telugu | Ashvamedha',
        'గ్యారెంటీడ్ ఆదాయం, అమ్మానాన్నల రిటైర్మెంట్, పిల్లల పెట్టుబడులు, term insurance, NRI గైడ్స్ — తెలుగులో సులభంగా. Ashvamedha Finance, Hyderabad.',
        '/te', body, lang='te', ld=ld, extra_head=f'<link rel="alternate" hreflang="te" href="{SITE}/te"><link rel="alternate" hreflang="en" href="{SITE}/blog">'), encoding='utf-8')


def build_llms(en, te):
    L = ['# Ashvamedha Finance', '',
         '> Personal-finance guidance for Telugu-speaking families and NRIs, by Manoj Kumar (founder, Banjara Hills, Hyderabad, India). '
         'Plain-language guides on guaranteed income plans, insurance, retirement and parents\' income, NRI investing, children\'s investments and tax, in English and Telugu.', '',
         'Contact: WhatsApp +91 87901 09022 · https://wa.link/rwwzd4 · Free 15-minute consultation in Telugu or English.',
         'Content is educational and not personalised investment advice. Figures in guides state their date and source; small-savings rates change quarterly.', '',
         '## Tools', f'- [Guaranteed income calculator (Pay 10, Get 30)]({SITE}{CALC}): yearly income, start age and life cover for a given age and yearly premium; for self, spouse, child or parent.',
         f'- [All calculators]({SITE}/calculators): SIP, retirement, EMI and more.', f'- [₹1 crore retirement plan]({SITE}/plans/1-crore-retirement)', '',
         '## Topic hubs']
    L += [f'- [{h["h1"]}]({SITE}/guides/{k}): {h["desc"]}' for k, h in HUBS.items()]
    for gid, name, sections in GROUPS:
        items = [a for a in en if a['section'] in sections]
        if not items: continue
        L += ['', f'## {re.sub(r"^[^A-Za-z]+", "", name)}']
        L += [f'- [{a["title"]}]({SITE}{a["url"]}): {a["desc"]}' for a in sorted(items, key=lambda a: a['date'], reverse=True)]
    L += ['', '## Telugu (తెలుగు)'] + [f'- [{a["title"]}]({SITE}{a["url"]}): {a["desc"]}' for a in te]
    L += ['', '## Optional', f'- [About Manoj Kumar]({SITE}/about)', f'- [Insurance plans]({SITE}/insurance)', f'- [Free portfolio review]({SITE}/portfolio)']
    (ROOT / 'llms.txt').write_text('\n'.join(L) + '\n', encoding='utf-8')


def build_sitemap(en, te):
    static = [('/', '1.0'), ('/insurance', '0.9'), ('/insurance/guaranteed-income', '0.9'), (CALC, '0.95'), ('/calculators', '0.9'),
              ('/plans/1-crore-retirement', '0.8'), ('/blog', '0.9'), ('/te', '0.8'), ('/services', '0.7'), ('/health-check', '0.7'),
              ('/portfolio', '0.7'), ('/about', '0.7'), ('/contact', '0.7'), ('/start', '0.6')]
    U = [f'<url><loc>{SITE}{u}</loc><lastmod>{TODAY}</lastmod><priority>{p}</priority></url>' for u, p in static]
    U += [f'<url><loc>{SITE}/guides/{k}</loc><lastmod>{TODAY}</lastmod><priority>0.9</priority></url>' for k in HUBS]
    U += [f'<url><loc>{SITE}{a["url"]}</loc><lastmod>{a["date"]}</lastmod><priority>0.8</priority></url>' for a in en + te]
    (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  '
                                      + '\n  '.join(U) + '\n</urlset>\n', encoding='utf-8')


def main():
    en, te = load('blog', 'en'), load('te', 'te')
    for a in en: a['hub'] = hub_of(a)
    for a in en + te: inject(a)
    build_blog(en, te); build_hubs(en, te); build_te(te); build_llms(en, te); build_sitemap(en, te)
    print(f'{len(en)} English, {len(te)} Telugu articles; hubs:', {k: sum(h['rule'](a['slug'], a['section']) for a in en) for k, h in HUBS.items()})


if __name__ == '__main__':
    main()
