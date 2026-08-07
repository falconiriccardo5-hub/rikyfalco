#!/usr/bin/env python3
"""Generates the CSV databases under ../data from the seed data below.

Run this after editing the row lists in this file:
    python3 build_data.py

Kept alongside search.py so the databases can be regenerated/extended
without hand-editing CSV escaping.
"""

import csv
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
STACKS_DIR = os.path.join(DATA_DIR, "stacks")


def write_csv(filename, header, rows, subdir=None):
    target_dir = subdir or DATA_DIR
    path = os.path.join(target_dir, filename)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)
    print(f"wrote {len(rows)} rows -> {path}")


# ---------------------------------------------------------------------------
# STYLE (50 rows)
# id, name, keywords, description, best_for, effects, anti_patterns
# ---------------------------------------------------------------------------
STYLE_ROWS = [
("st01","glassmorphism","glass frosted blur translucent modern","Frosted-glass panels with backdrop blur over vivid backgrounds","SaaS dashboards, fintech apps, marketing hero sections","backdrop-blur-lg;bg-white/10-30;border border-white/20;soft shadow","Low contrast text on transparent panels; overuse on every surface"),
("st02","claymorphism","clay soft 3d puffy rounded playful","Soft, puffy 3D shapes with inset/outset shadows resembling clay","Kids apps, playful consumer apps, onboarding flows","double box-shadow (light+dark);large border-radius;pastel fills","Heavy shadows hurting performance; unreadable on dark backgrounds"),
("st03","neumorphism","soft ui embossed monochrome subtle","Extruded, monochrome surfaces using subtle dual shadows","Settings panels, music players, single-tone dashboards","subtle dual-shadow;low contrast fills;rounded corners","Fails accessibility contrast; unusable for primary CTAs"),
("st04","minimalism","minimal clean simple whitespace","Generous whitespace, restrained palette, single accent color","Portfolios, luxury brands, editorial sites","large whitespace;1-2 accent colors;thin dividers","Empty feeling if used for data-dense dashboards"),
("st05","brutalism","brutalist raw bold stark unpolished","Raw, unpolished layouts with stark typography and visible structure","Design studios, art portfolios, indie brands","harsh borders;system fonts;no rounded corners","Hurts usability for transactional/enterprise apps"),
("st06","neubrutalism","neo-brutalist bold outline offset shadow","Bold flat colors with thick black outlines and offset hard shadows","Startup landing pages, dev tools, youth brands","thick 2-4px borders;offset box-shadow no blur;bold flat colors","Overuse of clashing colors reduces readability"),
("st07","flat-design","flat 2d simple iconography","Simple 2D shapes, no gradients/shadows, bold solid colors","Mobile apps, icon systems, marketing sites","solid fills;no shadows;geometric icons","Lacks depth cues for complex interactive hierarchies"),
("st08","material-design","material google elevation ripple","Google's elevation-based system with ripple feedback and grid","Android apps, productivity tools, cross-platform apps","elevation shadows;ripple on tap;8px grid","Feels dated if not paired with current type scale"),
("st09","skeuomorphism","realistic textures shadows real-world","Mimics real-world textures and objects (leather, paper, metal)","Music/audio apps, camera apps, niche nostalgia products","realistic textures;drop shadows;gradients","Heavy, dated look; poor scalability across screen sizes"),
("st10","bento-grid","bento grid modular boxes asymmetric","Modular grid of rounded boxes of varying sizes, Apple-style","Product feature pages, portfolios, dashboards","rounded-2xl cards;CSS grid;varied cell spans","Cramped content when boxes are too small for their text"),
("st11","dark-mode","dark theme night low-light","Dark background UI with light text and muted accent surfaces","Developer tools, media apps, dashboards used at night","bg-gray-900/950;desaturated accents;elevated surface tones","Pure black backgrounds cause halation; low-contrast grays"),
("st12","high-contrast-dark","high-contrast dark accessible bold","Dark UI tuned for AA/AAA contrast with punchy accent colors","Accessibility-first apps, fintech, government","bg-#0B0F19;text >=7:1 contrast;saturated single accent","Neon accents everywhere causing visual fatigue"),
("st13","swiss-design","swiss grid international typographic","Grid-driven, typographic, objective layout (International Style)","Editorial, agencies, museum/culture sites","strict column grid;Helvetica-like sans;red/black accents","Feels cold for emotionally-driven consumer brands"),
("st14","editorial","editorial magazine long-form serif","Magazine-inspired layout emphasizing long-form reading","Blogs, news sites, essays, thought-leadership","serif headlines;drop caps;pull quotes","Line lengths too wide on desktop hurt readability"),
("st15","magazine-layout","magazine multi-column masthead","Multi-column print-like layout with mastheads and bylines","Content publishers, culture/lifestyle sites","multi-column text;masthead header;image captions","Doesn't collapse well without careful responsive rules"),
("st16","corporate-clean","corporate professional trustworthy b2b","Structured, conservative layout conveying trust for B2B","Enterprise SaaS, consulting, legal, finance","blue/navy palette;clear hierarchy;stock-free photography","Can feel generic without a distinct accent color"),
("st17","enterprise-serious","enterprise dense dashboard admin","Dense, information-rich UI optimized for power users","Admin panels, internal tools, B2B dashboards","compact spacing;data tables;muted neutral palette","Too dense for first-time/casual consumer users"),
("st18","startup-friendly","startup approachable modern gradient","Approachable modern look with soft gradients and rounded UI","Early-stage SaaS, product landing pages","soft gradient hero;rounded-xl buttons;friendly illustrations","Overused gradient hero pattern reads as templated"),
("st19","playful-rounded","playful rounded friendly bubbly","Bubbly, rounded shapes with bright saturated colors","Kids/education apps, social apps, casual games","rounded-full elements;bright palette;bouncy micro-animations","Undermines credibility for serious financial/medical tools"),
("st20","luxury-editorial","luxury premium elegant serif gold","High-end, elegant layout with serif type and restrained gold accents","Luxury retail, fashion, hospitality, real estate","serif display type;generous negative space;gold/black accents","Slow-loading heavy imagery hurts perceived performance"),
("st21","dark-luxury","dark luxury premium moody cinematic","Moody dark palette with metallic accents for premium branding","Automotive, watches, private banking, hospitality","near-black bg;metallic gold/bronze accent;cinematic imagery","Low contrast body text if accent overused for copy"),
("st22","organic-shapes","organic blob fluid shapes natural","Fluid, hand-crafted blob shapes breaking up rigid grids","Wellness, beauty, sustainability brands","blob SVG backgrounds;soft color washes;rounded imagery","Blobs overlapping text reduce legibility"),
("st23","gradient-mesh","gradient mesh vibrant colorful backdrop","Multi-color mesh gradients as vibrant section backgrounds","AI/tech product launches, creative agencies","mesh-gradient bg;vibrant multi-stop gradients;glass cards on top","Gradient banding on low-end displays; text contrast issues"),
("st24","aurora-gradient","aurora gradient glow ambient","Soft glowing aurora-like gradient blur behind content","AI products, dark-mode marketing pages","blurred radial gradients;dark bg;glow accents","Performance cost of large blurred gradients on mobile"),
("st25","monochrome","monochrome single-hue tonal","Single hue across all tints/shades for a cohesive tonal look","Portfolios, architecture, fashion","one hue, multiple tints;black/white photography","Hard to signal state (error/success) without a second hue"),
("st26","duotone","duotone two-color image treatment","Two-color image treatment for photography-heavy sections","Creative portfolios, music/event platforms","duotone photo filters;bold two-color palette","Repeated duotone on every image feels monotonous"),
("st27","soft-ui","soft-ui gentle pastel low-contrast","Gentle pastel surfaces with soft shadows, softer than neumorphism","Wellness apps, lifestyle products","pastel fills;soft 8-16px shadow blur;rounded-xl","Pastel-on-pastel text fails contrast checks"),
("st28","cyberpunk","cyberpunk neon glitch futuristic dark","Neon-on-black aesthetic with glitch accents and scanlines","Gaming, crypto, entertainment brands","neon pink/cyan accents;glitch hover effects;monospace type","Overstimulating for long reading sessions"),
("st29","vaporwave","vaporwave retro pastel neon 80s","Retro-futuristic pastel/neon palette with 80s grid motifs","Music platforms, nostalgia-driven consumer brands","pink/purple gradient;grid horizon backgrounds;retro serif logo","Niche aesthetic mismatched to serious/B2B products"),
("st30","y2k","y2k chrome bubble metallic 2000s","Chrome, bubble text and metallic gradients evoking early-2000s web","Gen-Z fashion, music, youth culture brands","chrome gradient text;bubble buttons;sparkle accents","Reads unprofessional for enterprise or finance contexts"),
("st31","retro-futurism","retro-futurism atomic space-age","Atomic-age, space-race inspired shapes and warm retro palette","Entertainment, travel, novelty consumer brands","starburst motifs;warm orange/teal palette;rounded geometric type","Clashes with modern minimal product UI patterns"),
("st32","memphis","memphis playful geometric shapes 80s","Bold geometric shapes and squiggles in the 1980s Memphis style","Creative agencies, event brands, youth marketing","squiggle/confetti shapes;primary color blocks;playful type","Visually noisy; avoid for data-heavy interfaces"),
("st33","art-deco","art-deco geometric gold luxury pattern","Symmetrical geometric ornamentation with gold/black luxury tones","Hospitality, events, luxury real estate","fan/sunburst motifs;gold foil accents;symmetric layout","Ornamentation slows down simple task-based flows"),
("st34","kinetic-typography","kinetic type motion animated text","Typography as the primary visual element, often animated","Agency portfolios, film/media brands","animated headline reveals;huge type scale;tight tracking","Motion-heavy type harms performance and reduced-motion users"),
("st35","brutalist-typography","brutalist type oversized raw stacked","Oversized, stacked, sometimes overlapping raw typography","Design portfolios, fashion editorials","huge type-scale;overlapping text blocks;monospace accents","Overlap can break screen-reader reading order"),
("st36","3d-depth","3d depth layered shadow parallax","Layered elements with strong shadows and parallax depth cues","Product launch pages, 3D/gaming products","multi-layer drop-shadow;parallax on scroll;3D render assets","Heavy 3D assets hurt load time on mobile"),
("st37","isometric","isometric illustration technical diagram","Isometric illustrations conveying technical/product concepts","Dev tools, infrastructure/cloud products","isometric SVG illustration;consistent 30deg angles","Isometric icons illegible at small sizes"),
("st38","hand-drawn","hand-drawn sketch doodle organic","Hand-sketched icon/illustration style for a human, approachable feel","Education, indie products, community platforms","sketch-style SVGs;imperfect hand-drawn borders","Inconsistent hand-drawn assets look unpolished if mixed styles"),
("st39","collage","collage cut-paper mixed-media layered","Cut-paper, mixed-media layered compositions","Music, culture, fashion editorial brands","layered image cutouts;mixed typography;paper-texture bg","Hard to keep accessible reading order with layered text"),
("st40","grain-texture","grain noise texture film organic","Subtle film-grain/noise texture overlay for warmth and depth","Photography, film, premium consumer brands","SVG noise overlay at low opacity;warm color grading","Noise overlays increase file size and can look like a bug"),
("st41","split-screen","split-screen dual-panel comparison","Two-panel layout contrasting content, image, or before/after","Landing pages, comparison/pricing pages","50/50 or 60/40 grid split;contrasting bg colors","Breaks awkwardly on narrow mobile widths without stacking"),
("st42","asymmetric-grid","asymmetric grid editorial dynamic","Off-balance grid creating dynamic tension and visual interest","Creative portfolios, editorial homepages","uneven column spans;overlapping grid items","Harder to maintain visual rhythm across many pages"),
("st43","data-dense","data-dense dashboard tables dense-ui","Compact, information-dense layout optimized for scanning data","Analytics dashboards, trading platforms, admin tools","8px base spacing;monospace numerals;sticky table headers","Overwhelming for casual/first-time users without onboarding"),
("st44","dashboard-minimal","dashboard minimal clean cards kpi","Clean card-based dashboard with generous spacing around KPIs","Executive dashboards, reporting tools","KPI stat cards;soft dividers;single accent for alerts","Too sparse for power users needing dense data views"),
("st45","warm-neutral","warm neutral beige earthy cozy","Warm beige/terracotta neutral palette for an approachable feel","Wellness, food, lifestyle, home brands","warm off-white bg;terracotta/olive accents;serif body option","Low contrast between neutral tones if not checked"),
("st46","cool-neutral","cool neutral slate gray corporate","Cool slate/gray neutral palette for a calm, professional feel","B2B SaaS, fintech, healthcare","cool gray scale;single blue/teal accent;crisp sans-serif","Can feel cold/impersonal for consumer-facing brands"),
("st47","pastel-soft","pastel soft muted gentle palette","Muted pastel palette across the whole UI for a gentle tone","Wellness, baby/kids products, journaling apps","desaturated pastel fills;soft rounded corners","Pastel text on pastel bg frequently fails contrast"),
("st48","bold-primary","bold primary saturated high-energy","Saturated primary-color blocks for high energy and clarity","Sports, entertainment, youth consumer brands","fully saturated color blocks;strong color contrast;bold sans","Too many saturated colors together causes visual fatigue"),
("st49","nature-organic","nature organic green sustainable earthy","Green, earth-toned palette with organic textures and imagery","Sustainability, outdoors, agriculture, wellness brands","forest/moss green palette;organic photography;leaf motifs","Overused green-washing aesthetic if not backed by real content"),
("st50","tech-futuristic","tech futuristic ai gradient dark sleek","Sleek dark UI with glowing gradient accents evoking AI/frontier tech","AI products, deep tech, developer platforms","dark bg with glow accents;gradient text;monospace code UI","Glow effects overused reduce readability of body copy"),
]

# ---------------------------------------------------------------------------
# COLOR PALETTES (21 rows)
# id, name, category, keywords, primary, secondary, accent, background, text, contrast_note
# ---------------------------------------------------------------------------
COLOR_ROWS = [
("cl01","saas-blue","saas","saas b2b trust blue professional","#2563EB","#1E3A8A","#22D3EE","#F8FAFC","#0F172A","Blue-600 on white passes 4.5:1 for body text"),
("cl02","saas-indigo","saas","saas modern indigo tech","#4F46E5","#312E81","#A78BFA","#FFFFFF","#111827","Use indigo-700+ for text-on-white, not indigo-400"),
("cl03","fintech-navy","fintech","fintech finance trust navy gold","#0B1E3F","#13294B","#D4AF37","#F5F7FA","#0B1E3F","Gold accent only for highlights, never body text"),
("cl04","fintech-emerald","fintech","fintech growth money emerald","#047857","#064E3B","#34D399","#F0FDF4","#052E1B","Emerald-700 minimum for text on light backgrounds"),
("cl05","healthcare-teal","healthcare","healthcare medical calm teal","#0D9488","#134E4A","#5EEAD4","#F0FDFA","#082F2C","Avoid teal-300 for critical alert text; use red-600 instead"),
("cl06","healthcare-soft-blue","healthcare","healthcare calm trust soft-blue","#3B82F6","#1D4ED8","#93C5FD","#F8FAFC","#0F172A","Pair soft blue bg with slate-900 text for AA compliance"),
("cl07","ecommerce-coral","ecommerce","ecommerce retail energetic coral","#F97316","#C2410C","#FDE047","#FFFFFF","#1C1917","Coral CTA on white passes contrast; verify yellow accent separately"),
("cl08","ecommerce-black-gold","ecommerce","ecommerce luxury retail black gold","#111111","#D4AF37","#F5F5F5","#0A0A0A","#F5F5F5","Gold-on-black decorative only; body copy stays white/gray"),
("cl09","beauty-blush","beauty","beauty spa wellness blush pink","#DB2777","#831843","#FBCFE8","#FFF1F2","#3F1220","Blush pink backgrounds need slate-900-level text, not gray-400"),
("cl10","beauty-lavender","beauty","beauty spa calm lavender purple","#7C3AED","#4C1D95","#DDD6FE","#FAF5FF","#2E1065","Lavender bg + purple-900 text meets AA for body copy"),
("cl11","education-sunny","education","education learning friendly yellow","#F59E0B","#B45309","#3B82F6","#FFFBEB","#1C1917","Yellow reserved for accents/badges, never small text"),
("cl12","education-forest","education","education growth calm forest-green","#15803D","#14532D","#FACC15","#F0FDF4","#052E16","Forest green passes AA on white; avoid green-400 for text"),
("cl13","gaming-neon","gaming","gaming esports neon dark energetic","#A855F7","#6B21A8","#22D3EE","#0A0A12","#F5F3FF","High-saturation neon needs dark bg to keep contrast usable"),
("cl14","gaming-purple","gaming","gaming entertainment purple dark","#8B5CF6","#5B21B6","#F472B6","#0F0A1E","#EDE9FE","Keep body copy at violet-100/white, not mid-tone purple"),
("cl15","portfolio-mono","portfolio","portfolio creative minimal monochrome","#111111","#404040","#EF4444","#FFFFFF","#111111","Single red accent used sparingly for links/CTAs only"),
("cl16","portfolio-warm","portfolio","portfolio creative warm editorial","#B45309","#78350F","#F97316","#FFFBEB","#1C1917","Warm neutrals with one orange accent for interactive elements"),
("cl17","dashboard-slate","dashboard","dashboard admin analytics slate","#334155","#1E293B","#3B82F6","#F8FAFC","#0F172A","Reserve blue for interactive/primary actions only"),
("cl18","dashboard-charcoal","dashboard","dashboard dark admin charcoal","#1E293B","#0F172A","#38BDF8","#0B1120","#E2E8F0","Charcoal-900 bg with slate-200 text meets AA"),
("cl19","nonprofit-earth","nonprofit","nonprofit charity warm earth-tones","#B45309","#78350F","#15803D","#FFFBEB","#1C1917","Earth tones convey warmth; keep CTA color distinct from body"),
("cl20","food-warm-red","food","restaurant food warm appetite red","#DC2626","#7F1D1D","#F59E0B","#FFFBEB","#1C1917","Warm red drives appetite cues; ensure 4.5:1 for menu text"),
("cl21","luxury-black-gold","luxury","luxury premium hospitality black gold","#0A0A0A","#1A1A1A","#C9A227","#F5F5F0","#0A0A0A","Gold on black decorative only; use off-white for long text"),
]

# ---------------------------------------------------------------------------
# TYPOGRAPHY (50 rows)
# id, heading_font, body_font, keywords, personality, best_for, google_fonts_import
# ---------------------------------------------------------------------------
TYPOGRAPHY_ROWS = [
("ty01","Inter","Inter","modern clean neutral saas","Neutral, versatile, highly legible","SaaS, dashboards, general UI","Inter:wght@400;500;600;700"),
("ty02","Manrope","Inter","modern geometric friendly saas","Friendly-modern with a geometric edge","Startup landing pages, product sites","Manrope:wght@600;800|Inter:wght@400;500"),
("ty03","Space Grotesk","Inter","tech futuristic geometric mono-adjacent","Distinct, techy, slightly quirky","AI/dev tools, tech startups","Space+Grotesk:wght@500;700|Inter:wght@400;500"),
("ty04","Sora","Work Sans","modern rounded friendly approachable","Approachable and rounded-modern","Consumer apps, onboarding flows","Sora:wght@600;800|Work+Sans:wght@400;500"),
("ty05","Playfair Display","Lato","elegant luxury serif editorial","Elegant, high-contrast, editorial luxury","Luxury retail, fashion, hospitality","Playfair+Display:wght@600;700|Lato:wght@400;500"),
("ty06","Cormorant Garamond","Karla","elegant refined classic luxury","Refined, classic, softly elegant","Luxury editorial, weddings, boutique brands","Cormorant+Garamond:wght@500;600|Karla:wght@400;500"),
("ty07","Fraunces","Inter","warm editorial expressive serif","Warm, expressive serif with character","Editorial blogs, lifestyle brands","Fraunces:wght@500;600|Inter:wght@400;500"),
("ty08","Libre Baskerville","Source Sans 3","classic editorial readable serif","Classic, trustworthy, highly readable","Long-form editorial, news, blogs","Libre+Baskerville:wght@400;700|Source+Sans+3:wght@400;500"),
("ty09","DM Serif Display","DM Sans","elegant modern serif display","Elegant modern serif with clean body pairing","Boutique product sites, portfolios","DM+Serif+Display|DM+Sans:wght@400;500"),
("ty10","Poppins","Nunito Sans","playful geometric rounded friendly","Playful, rounded, energetic","Consumer apps, education, kids products","Poppins:wght@600;700|Nunito+Sans:wght@400;600"),
("ty11","Fredoka","Nunito","playful bubbly rounded kids","Bubbly and youthful","Kids apps, games, playful brands","Fredoka:wght@500;600|Nunito:wght@400;600"),
("ty12","Baloo 2","Mulish","playful rounded warm approachable","Warm, rounded, welcoming","Education platforms, community apps","Baloo+2:wght@600;700|Mulish:wght@400;500"),
("ty13","Archivo Black","Archivo","bold brutalist strong impact","Bold, high-impact, brutalist-friendly","Brutalist/neubrutalist sites, agencies","Archivo+Black|Archivo:wght@400;500;700"),
("ty14","Anton","Work Sans","bold condensed impact headline","Extreme condensed impact for headlines","Sports, entertainment, event brands","Anton|Work+Sans:wght@400;500"),
("ty15","Bebas Neue","Roboto","bold condensed sporty energetic","Tall condensed sans for energy","Sports, fitness, entertainment","Bebas+Neue|Roboto:wght@400;500"),
("ty16","Clash Display","General Sans","modern bold tech premium","Bold, premium-modern tech feel","Tech product launches, AI brands","Clash+Display:wght@600;700|General+Sans:wght@400;500"),
("ty17","Syne","Inter","modern experimental geometric creative","Experimental, creative-forward geometric","Creative agencies, portfolios","Syne:wght@600;800|Inter:wght@400;500"),
("ty18","Unbounded","Inter","modern rounded geometric bold","Bold rounded-geometric with presence","Web3, gaming, bold consumer brands","Unbounded:wght@600;700|Inter:wght@400;500"),
("ty19","IBM Plex Sans","IBM Plex Sans","technical neutral engineering precise","Precise, technical, engineering-grade","Dev tools, infrastructure, enterprise","IBM+Plex+Sans:wght@400;500;600"),
("ty20","IBM Plex Mono","IBM Plex Sans","monospace technical code developer","Technical and code-forward","Developer tools, API docs, terminals","IBM+Plex+Mono:wght@400;500|IBM+Plex+Sans:wght@400"),
("ty21","JetBrains Mono","Inter","monospace developer code precise","Distinct monospace for code-heavy UI","Dev tools, code editors, API dashboards","JetBrains+Mono:wght@400;500|Inter:wght@400;500"),
("ty22","Outfit","Inter","modern geometric clean minimal","Clean geometric minimal-modern","SaaS, portfolios, minimal sites","Outfit:wght@500;600;700|Inter:wght@400;500"),
("ty23","Plus Jakarta Sans","Plus Jakarta Sans","modern warm friendly versatile","Warm, versatile, contemporary","Startup sites, product marketing","Plus+Jakarta+Sans:wght@400;500;600;700"),
("ty24","Lexend","Lexend","readable accessible clear modern","Optimized for reading proficiency/clarity","Accessibility-first products, education","Lexend:wght@400;500;600;700"),
("ty25","Public Sans","Public Sans","government civic neutral accessible","Neutral, highly accessible, civic-grade","Government, civic tech, public services","Public+Sans:wght@400;500;600;700"),
("ty26","Source Serif 4","Source Sans 3","professional readable serif trustworthy","Professional and highly readable serif","Legal, professional services, reports","Source+Serif+4:wght@400;600|Source+Sans+3:wght@400;500"),
("ty27","Merriweather","Karla","readable trustworthy editorial classic","Sturdy, trustworthy, screen-optimized serif","Blogs, news, long-form content","Merriweather:wght@400;700|Karla:wght@400;500"),
("ty28","Newsreader","Inter","editorial literary refined serif","Literary, refined, quietly elegant","Essays, publications, thought leadership","Newsreader:wght@400;500;600|Inter:wght@400;500"),
("ty29","Bricolage Grotesque","Inter","modern quirky expressive versatile","Expressive grotesque with character","Creative studios, modern portfolios","Bricolage+Grotesque:wght@500;700|Inter:wght@400;500"),
("ty30","Instrument Serif","Inter","elegant editorial expressive modern-serif","Expressive modern serif for display type","Fashion, editorial landing pages","Instrument+Serif|Inter:wght@400;500"),
("ty31","Cabinet Grotesk","Satoshi","modern clean premium minimal","Clean premium grotesque pairing","Premium product sites, portfolios","Cabinet+Grotesk:wght@600;700|Satoshi:wght@400;500"),
("ty32","General Sans","General Sans","neutral modern versatile clean","Neutral modern workhorse sans","General UI, SaaS, product sites","General+Sans:wght@400;500;600;700"),
("ty33","Red Hat Display","Red Hat Text","modern enterprise approachable","Approachable enterprise-modern","Enterprise SaaS, dev platforms","Red+Hat+Display:wght@600;700|Red+Hat+Text:wght@400;500"),
("ty34","Urbanist","Urbanist","modern minimal geometric urban","Minimal, urban, geometric-light","Real estate, urban lifestyle brands","Urbanist:wght@400;600;700"),
("ty35","Epilogue","Epilogue","modern versatile clean neutral","Versatile modern neutral sans","Startups, general marketing sites","Epilogue:wght@400;600;700"),
("ty36","Sen","Nunito Sans","warm rounded friendly modern","Warm, rounded, approachable","Wellness, lifestyle, community apps","Sen:wght@500;700|Nunito+Sans:wght@400;500"),
("ty37","Grandstander","Mulish","playful bouncy expressive fun","Bouncy, expressive, high-energy","Kids products, casual games","Grandstander:wght@600;700|Mulish:wght@400;500"),
("ty38","Righteous","Inter","bold retro display playful","Retro-futuristic bold display","Retro brands, entertainment, novelty","Righteous|Inter:wght@400;500"),
("ty39","Monoton","Inter","retro neon vaporwave display","Neon retro display for vaporwave/y2k","Music, nightlife, retro entertainment","Monoton|Inter:wght@400;500"),
("ty40","Orbitron","Rajdhani","futuristic sci-fi tech display","Sci-fi, futuristic, tech-forward display","Gaming, crypto, futuristic products","Orbitron:wght@600;700|Rajdhani:wght@400;500"),
("ty41","Chakra Petch","Chakra Petch","tech futuristic angular sci-fi","Angular tech aesthetic","Cyberpunk/tech brands, gaming HUDs","Chakra+Petch:wght@400;500;600"),
("ty42","Prata","Jost","elegant classic serif refined","Refined classic serif with modern body","Luxury hospitality, real estate","Prata|Jost:wght@400;500"),
("ty43","Marcellus","Jost","elegant timeless serif luxury","Timeless elegant display serif","Luxury fashion, jewelry, fine dining","Marcellus|Jost:wght@400;500"),
("ty44","Abril Fatface","Lato","bold editorial display fashion","High-contrast bold display serif","Fashion editorials, magazine sites","Abril+Fatface|Lato:wght@400;500"),
("ty45","Big Shoulders Display","Inter","industrial condensed bold urban","Industrial condensed for strong headlines","Real estate, industrial/B2B brands","Big+Shoulders+Display:wght@600;700|Inter:wght@400;500"),
("ty46","Karla","Karla","clean neutral warm humanist","Warm humanist neutral sans","General product UI, blogs","Karla:wght@400;500;700"),
("ty47","Nunito","Nunito","rounded soft friendly approachable","Soft rounded, gentle and friendly","Wellness, health, family apps","Nunito:wght@400;600;700"),
("ty48","Zilla Slab","Zilla Slab","technical readable slab serif","Technical slab serif, developer-friendly","Dev blogs, technical documentation","Zilla+Slab:wght@400;500;600"),
("ty49","Bitter","Karla","readable warm slab editorial","Warm, readable slab serif","Editorial, food/lifestyle blogs","Bitter:wght@400;600|Karla:wght@400;500"),
("ty50","Michroma","Inter","futuristic wide tech display","Wide futuristic display face","AI/tech launches, sci-fi themed products","Michroma|Inter:wght@400;500"),
]

# ---------------------------------------------------------------------------
# CHARTS (20 rows)
# id, name, keywords, data_type, library_recommendation, accessibility_note
# ---------------------------------------------------------------------------
CHART_ROWS = [
("ch01","line-chart","trend time-series over-time change","Continuous values over time","Recharts, Chart.js, D3, Observable Plot","Provide a data-table toggle; avoid relying on color alone for series"),
("ch02","area-chart","trend volume cumulative filled","Magnitude of trend over time","Recharts, Chart.js","Use pattern fills or labels in addition to color for stacked areas"),
("ch03","bar-chart","comparison categorical ranking discrete","Comparing discrete categories","Recharts, Chart.js, D3","Sort bars meaningfully; label values directly for screen readers"),
("ch04","horizontal-bar-chart","comparison ranking long-labels","Category comparison with long labels","Recharts, Chart.js","Preferred over vertical bars when category names are long"),
("ch05","grouped-bar-chart","comparison multi-series subcategory","Comparing subcategories across groups","Recharts, D3","Limit to 3-4 series max; add legend with sufficient contrast"),
("ch06","stacked-bar-chart","composition part-to-whole over-time","Part-to-whole composition across categories","Recharts, Chart.js","Order segments consistently; provide totals as text alternative"),
("ch07","pie-chart","proportion percentage part-to-whole simple","Simple part-to-whole with few segments","Recharts, Chart.js","Limit to 5-6 slices max; always label percentages directly"),
("ch08","donut-chart","proportion percentage kpi center-label","Part-to-whole with a central KPI label","Recharts, Chart.js","Use center label for the key metric; avoid for >6 categories"),
("ch09","scatter-plot","correlation relationship distribution two-variable","Relationship between two numeric variables","D3, Observable Plot, Recharts","Use shape + color redundantly to distinguish groups"),
("ch10","bubble-chart","correlation three-variable size distribution","Relationship across three numeric dimensions","D3, Observable Plot","Cap bubble count; provide a legend for size scale"),
("ch11","heatmap","density matrix intensity correlation-grid","Intensity across two categorical dimensions","D3, Observable Plot, Nivo","Use a colorblind-safe sequential palette, not red-green"),
("ch12","funnel-chart","conversion drop-off stages pipeline","Sequential stage-based conversion/drop-off","Recharts, D3, Nivo","Always show absolute numbers alongside percentages"),
("ch13","gauge-chart","single-metric progress-to-goal kpi","Single metric progress toward a target","Chart.js, ECharts","Pair with a numeric label; don't rely on needle position alone"),
("ch14","radar-chart","multi-dimensional comparison profile","Comparing multiple dimensions for one/few entities","Recharts, Chart.js","Limit to 2-3 overlapping entities to stay legible"),
("ch15","treemap","hierarchy proportion nested part-to-whole","Hierarchical part-to-whole with size encoding","D3, Nivo, ECharts","Provide a table alternative; nested labels can be inaccessible"),
("ch16","sankey-diagram","flow allocation pipeline movement","Flow/allocation between stages or categories","D3, Nivo","Complex for screen readers; always ship a data table fallback"),
("ch17","candlestick-chart","financial ohlc price-movement trading","OHLC financial price movement over time","TradingView Lightweight Charts, D3","Pair up/down colors with shape (filled/hollow) for colorblind users"),
("ch18","sparkline","micro-trend inline compact single-value","Compact inline trend next to a KPI","Recharts, tiny D3, custom SVG","Provide the numeric trend value in adjacent text, not chart-only"),
("ch19","calendar-heatmap","activity streak daily contribution-graph","Daily activity/streak intensity over a year","D3, react-calendar-heatmap","Include a text summary of streaks for screen-reader users"),
("ch20","waterfall-chart","cumulative-effect sequential increments-decrements","Sequential positive/negative contributions to a total","D3, ECharts, Highcharts","Use consistent color coding for increase vs decrease with icons"),
]

# ---------------------------------------------------------------------------
# UX GUIDELINES (domain: ux) — covers priority categories 1-6 from SKILL.md
# id, category, priority, title, guideline, do, dont
# ---------------------------------------------------------------------------
UX_ROWS = [
("ux001","accessibility",1,"color-contrast","Text must meet WCAG contrast minimums","Use 4.5:1 for normal text, 3:1 for large text (18px+ bold or 24px+)","Placing gray-400 text on a white background"),
("ux002","accessibility",1,"focus-states","Interactive elements need a visible focus ring","Use a 2px visible outline/ring with sufficient contrast on :focus-visible","Removing outline:none without a replacement focus style"),
("ux003","accessibility",1,"alt-text","Meaningful images need descriptive alt text","Describe the image's purpose/content in alt=''","Leaving alt empty on informative images or stuffing keywords"),
("ux004","accessibility",1,"aria-labels","Icon-only buttons need an accessible name","Add aria-label describing the action, e.g. aria-label='Close menu'","Shipping an icon button with no discernible text for screen readers"),
("ux005","accessibility",1,"keyboard-nav","All interactive elements must be keyboard reachable","Ensure logical tab order matching visual order; support Enter/Space","Trapping focus in a modal with no escape, or skipping tabindex order"),
("ux006","accessibility",1,"form-labels","Every input needs an associated label","Use <label for='id'> or aria-labelledby, not placeholder-only","Using placeholder text as the only label (disappears on input)"),
("ux007","accessibility",1,"semantic-html","Use semantic elements over generic divs","Use nav, main, header, button, etc. for their intended purpose","Using <div onClick> instead of <button> for actions"),
("ux008","accessibility",1,"skip-links","Provide a skip-to-content link","Add a visually-hidden-until-focused 'Skip to main content' link","Forcing keyboard users to tab through the entire nav every page"),
("ux009","accessibility",1,"error-identification","Form errors must be programmatically associated","Use aria-describedby to link error text to its input","Showing error text visually with no association for screen readers"),
("ux010","accessibility",1,"heading-hierarchy","Headings must follow a logical, non-skipping order","Use h1 > h2 > h3 in document order for structure","Skipping heading levels purely for font-size convenience"),
("ux011","touch",2,"touch-target-size","Touch targets must be large enough to hit reliably","Minimum 44x44px (iOS) / 48x48dp (Android) tappable area","Small icon buttons packed tightly with no spacing"),
("ux012","touch",2,"hover-vs-tap","Primary actions must not depend on hover","Use click/tap as the primary trigger; hover is progressive enhancement","Hiding a critical action behind hover-only reveal on touch devices"),
("ux013","touch",2,"loading-buttons","Disable buttons during async operations","Show a spinner and disable the button while the request is in flight","Allowing repeat clicks that fire duplicate form submissions"),
("ux014","touch",2,"error-feedback","Errors must appear near the point of failure","Show inline error messages next to the offending field","Showing only a generic top-of-page banner for a specific field error"),
("ux015","touch",2,"cursor-pointer","Clickable elements need a pointer cursor","Add cursor-pointer/cursor: pointer to all clickable elements","Leaving the default cursor on a clickable card or row"),
("ux016","touch",2,"tap-feedback","Taps need immediate visual feedback","Use an active/pressed state (opacity/scale) on tap","No visual acknowledgment that a tap registered"),
("ux017","touch",2,"swipe-affordance","Swipeable content needs a visible affordance","Peek the next item or add dots/arrows to hint swipeability","A fully swipeable carousel with no visual hint it's swipeable"),
("ux018","touch",2,"destructive-confirmation","Destructive actions need confirmation","Require a confirm step (dialog) for delete/irreversible actions","One-tap delete with no undo or confirmation"),
("ux019","performance",3,"image-optimization","Images should be optimized and responsive","Use WebP/AVIF, srcset, and lazy loading below the fold","Shipping full-resolution PNGs with no lazy loading"),
("ux020","performance",3,"reduced-motion","Respect the user's reduced-motion preference","Wrap non-essential animation in @media (prefers-reduced-motion: reduce)","Forcing parallax/auto-play animation regardless of OS setting"),
("ux021","performance",3,"content-jumping","Reserve space for async content","Set explicit width/height or aspect-ratio before content loads","Letting images/ads load in and shift layout (high CLS)"),
("ux022","performance",3,"font-loading","Fonts shouldn't cause invisible text or big shifts","Use font-display: swap and preload critical fonts","Blocking render on web font load with no fallback"),
("ux023","performance",3,"code-splitting","Ship only what the current view needs","Lazy-load routes/heavy components (charts, editors, modals)","Bundling every page's JS into a single blocking initial payload"),
("ux024","performance",3,"debounce-input","Expensive input handlers should be debounced","Debounce search/filter inputs that trigger network/heavy compute","Firing an API call on every keystroke with no debounce"),
("ux025","layout",4,"viewport-meta","Pages need a correct viewport meta tag","<meta name='viewport' content='width=device-width, initial-scale=1'>","Omitting the viewport tag, causing mobile browsers to zoom out"),
("ux026","layout",4,"readable-font-size","Body text should be readable without zooming","Minimum 16px body text on mobile","Using 12-13px body copy that forces users to pinch-zoom"),
("ux027","layout",4,"horizontal-scroll","Content must fit the viewport width","Use max-width: 100%, overflow-x: auto only on intentional scroll areas","Fixed-width elements causing unintended horizontal page scroll"),
("ux028","layout",4,"z-index-management","Define a consistent z-index scale","Use a scale like 10/20/30/50 for dropdown/modal/toast/tooltip layers","Ad-hoc z-index: 9999 sprinkled wherever something doesn't show"),
("ux029","layout",4,"responsive-breakpoints","Test at standard breakpoints","Verify layout at 375, 768, 1024, 1440px widths","Designing only for one desktop width and hoping it reflows"),
("ux030","layout",4,"safe-area-insets","Respect device safe areas on mobile","Use env(safe-area-inset-*) for notches/home indicators","Content hidden behind the iPhone notch or home indicator bar"),
("ux031","layout",4,"empty-states","Every list/table needs a designed empty state","Show a helpful message + primary action when there's no data","Rendering a blank white area when a list has zero items"),
("ux032","layout",4,"floating-nav-spacing","Floating navbars need edge spacing","Add top-4/left-4/right-4 spacing instead of sticking to viewport edges","Sticking a floating-style navbar flush to top-0 left-0 right-0"),
("ux033","layout",4,"content-under-fixed-nav","Content must not hide behind fixed headers","Add top padding/margin to main content equal to navbar height","Fixed navbar overlapping the first block of page content"),
("ux034","typography",5,"line-height","Body text needs comfortable line-height","Use 1.5-1.75 line-height for paragraph text","Tight 1.1-1.2 line-height on multi-line body copy"),
("ux035","typography",5,"line-length","Limit line length for readability","Keep body text to 65-75 characters per line (max-w-prose)","Full-bleed paragraph text stretching 150+ characters wide"),
("ux036","typography",5,"font-pairing","Pair fonts with complementary personalities","Match a distinct heading font with a neutral, legible body font","Using two competing display fonts for both heading and body"),
("ux037","typography",5,"type-scale","Use a consistent modular type scale","Define a fixed scale (e.g. 12/14/16/20/24/32/48px)","Ad-hoc font sizes chosen per-component with no system"),
("ux038","color",5,"color-not-only-indicator","Don't rely on color alone to convey meaning","Pair color with icons/text for status (success/error/warning)","Red/green-only indicators that are invisible to colorblind users"),
("ux039","color",5,"dark-mode-glass-contrast","Glass/transparent surfaces need enough opacity in light mode","Use bg-white/80+ (not bg-white/10) for glass cards in light mode","Using near-transparent white panels that vanish on light backgrounds"),
("ux040","color",5,"border-visibility","Borders must be visible in both themes","Use border-gray-200 in light mode, border-white/10 only in dark mode","Using border-white/10 in light mode where it's effectively invisible"),
("ux041","animation",6,"duration-timing","Micro-interactions should be fast, not sluggish","Use 150-300ms for hover/tap/toggle transitions","500ms+ transitions on simple hover states feel laggy"),
("ux042","animation",6,"transform-performance","Animate cheap properties, not layout-triggering ones","Animate transform and opacity for smooth 60fps motion","Animating width/height/top/left, forcing layout recalculation"),
("ux043","animation",6,"loading-states","Async content needs a loading state","Use skeleton screens or spinners while data loads","Blank screen with no feedback while a request is pending"),
("ux044","animation",6,"easing-curves","Use natural easing, not linear","Use ease-out for entrances, ease-in for exits","Linear easing on every transition, which feels robotic"),
("ux045","animation",6,"purposeful-motion","Animation should communicate, not decorate","Use motion to show relationship/continuity (e.g. shared element transitions)","Adding animation to every element with no functional purpose"),
("ux046","style",7,"style-match","Match visual style to product type and audience","Pick a style whose personality matches the product's context (e.g. corporate-clean for B2B finance)","Applying a playful/brutalist style to a serious medical or legal product"),
("ux047","style",7,"consistency","Keep style consistent across all pages","Reuse the same spacing scale, radius, and color tokens sitewide","Mixing glassmorphism on the homepage with flat design on the dashboard"),
("ux048","style",7,"no-emoji-icons","Use real icons, not emoji, for UI iconography","Use an SVG icon set (Heroicons, Lucide) sized consistently","Using emoji like ⚙️ 🚀 🎨 as functional UI icons"),
("ux049","style",7,"icon-consistency","Icons should share one visual system","Use one icon library with a fixed viewBox (e.g. 24x24) throughout","Mixing icon sets with different stroke widths and grids"),
("ux050","style",7,"brand-logo-accuracy","Third-party brand logos must be accurate","Source official SVGs (e.g. from Simple Icons) for brand marks","Guessing or hand-drawing an approximation of a brand's logo"),
("ux051","chart",8,"chart-type-match","Choose chart type based on the data relationship","Match trend->line, comparison->bar, composition->stacked/pie","Using a pie chart for a time-series trend"),
("ux052","chart",8,"chart-color-guidance","Use accessible, distinguishable chart colors","Use a colorblind-safe categorical palette with sufficient contrast","Red/green as the only distinguishing colors between two series"),
("ux053","chart",8,"chart-data-table","Provide a non-visual alternative to charts","Offer a toggle to a data table for screen-reader/keyboard users","Charts with no way to access the underlying data non-visually"),
("ux054","interaction",2,"disabled-state-clarity","Disabled controls need a visibly distinct state","Reduce opacity and remove pointer affordance, add a tooltip if useful","A disabled button that looks identical to an enabled one"),
("ux055","interaction",2,"undo-over-confirm","Prefer undo for low-risk reversible actions","Use a toast with 'Undo' instead of a blocking confirm dialog","Interrupting every minor action with a confirmation modal"),
("ux056","forms",1,"inline-validation-timing","Validate on blur/submit, not on every keystroke","Show validation errors after the user leaves the field or submits","Flashing 'required' errors while the user is still typing"),
("ux057","forms",4,"input-grouping","Group related fields visually","Use fieldset/legend or spacing to cluster related inputs","A flat list of 20 unlabeled-grouped inputs in one long form"),
("ux058","navigation",4,"active-state-indication","Current page/section must be visually indicated","Highlight the active nav item with color/underline + aria-current","Navigation with no indication of which page is currently active"),
("ux059","navigation",2,"breadcrumb-for-depth","Deep hierarchies need breadcrumbs","Show breadcrumbs for content nested 3+ levels deep","No wayfinding in a deeply nested admin/docs hierarchy"),
("ux060","feedback",2,"toast-timing","Toasts should stay long enough to read","Keep toasts visible 4-6s, longer for multi-line messages","Toasts that auto-dismiss in under 2 seconds"),
]

# ---------------------------------------------------------------------------
# PRODUCT TYPE RECOMMENDATIONS (domain: product)
# id, type, name, keywords, recommended_styles, recommended_colors, recommended_pattern, notes
# ---------------------------------------------------------------------------
PRODUCT_ROWS = [
("pr01","saas","SaaS Product","saas b2b software subscription platform","st16;st01;st10","cl01;cl02;cl17","hero-centric","Lead with a clear value prop hero, feature bento-grid, and pricing table"),
("pr02","ecommerce","E-commerce Store","ecommerce shop retail store product-catalog","st07;st48;st20","cl07;cl08","product-grid","Prioritize product imagery, fast filtering, and a frictionless checkout"),
("pr03","fintech","Fintech / Finance App","fintech banking payments money crypto","st16;st46;st12","cl03;cl04","trust-centric","Emphasize security signaling, data clarity, and conservative color use"),
("pr04","healthcare","Healthcare / Medical","healthcare medical clinic patient wellness-service","st04;st46;st27","cl05;cl06","reassurance-centric","Calm palettes, large legible type, and clear appointment/contact CTAs"),
("pr05","education","Education Platform","education learning course school edtech","st19;st10;st38","cl11;cl12","course-centric","Friendly, encouraging tone with clear progress indicators"),
("pr06","dashboard","Analytics Dashboard","dashboard analytics admin data internal-tool","st43;st44;st11","cl17;cl18","data-dense","Prioritize scanability: sticky headers, compact rows, strong hierarchy"),
("pr07","admin-panel","Admin Panel","admin panel back-office crud internal","st16;st43","cl17;cl18","table-centric","Consistent table/detail patterns; bulk actions and filters up top"),
("pr08","portfolio","Portfolio / Personal Site","portfolio personal creative freelancer resume","st04;st42;st35","cl15;cl16","work-showcase","Let the work be the hero; minimal chrome around case studies"),
("pr09","landing-page","Marketing Landing Page","landing page marketing product-launch campaign","st18;st23;st01","cl01;cl02","hero-centric","Single clear CTA above the fold with social proof below"),
("pr10","blog","Blog / Publication","blog content publication editorial writing","st14;st15;st25","cl15;cl19","content-centric","Optimize for reading: serif option, generous line-height, clear TOC"),
("pr11","mobile-app","Mobile App","mobile app ios android native","st04;st19;st48","cl01;cl13","tab-centric","Design for thumb reach; bottom nav for primary actions"),
("pr12","beauty","Beauty / Spa / Wellness Service","beauty spa wellness service skincare salon","st22;st27;st20","cl09;cl10","booking-centric","Soft imagery-led hero with a prominent booking CTA"),
("pr13","real-estate","Real Estate","real-estate property listing housing rental","st20;st33;st45","cl16;cl21","listing-grid","High-quality imagery grid with map integration and inquiry forms"),
("pr14","restaurant","Restaurant / Food Service","restaurant food dining menu cafe","st22;st40;st45","cl20;cl16","menu-centric","Appetite-driving imagery, clear menu structure, reservation CTA"),
("pr15","agency","Creative Agency / Studio","agency studio creative branding design-firm","st05;st42;st34","cl15;cl16","portfolio-showcase","Bold typographic statements; let case studies carry the narrative"),
("pr16","nonprofit","Nonprofit / Charity","nonprofit charity donation cause ngo","st04;st49","cl19;cl12","cause-centric","Emotional storytelling hero with a clear, low-friction donate CTA"),
("pr17","gaming","Gaming / Esports","gaming esports game platform entertainment","st28;st50;st36","cl13;cl14","hype-centric","High-energy dark UI with bold accent color and motion"),
("pr18","fitness","Fitness / Sports","fitness gym sports training wellness-app","st48;st19;st46","cl20;cl12","program-centric","Energetic imagery and clear progress/streak tracking"),
("pr19","legal","Legal / Professional Services","legal law firm consulting professional-services","st16;st17;st26","cl17;cl03","credibility-centric","Conservative palette, clear credentials, straightforward contact path"),
("pr20","travel","Travel / Hospitality","travel hospitality hotel booking tourism","st20;st22;st33","cl16;cl21","inspiration-centric","Large destination imagery with a simple search/booking widget"),
("pr21","ai-product","AI / Deep Tech Product","ai artificial-intelligence deep-tech developer-platform","st50;st24;st23","cl02;cl18","demo-centric","Sleek dark UI with a live demo/interactive proof of capability up top"),
("pr22","developer-tool","Developer Tool / API","developer tool api sdk cli infrastructure","st19;st37;st43","cl17;cl18","docs-centric","Code-first hero, copyable snippets, and a clear docs entry point"),
]

# ---------------------------------------------------------------------------
# LANDING PAGE PATTERNS (domain: landing)
# id, name, keywords, sections, cta_strategy, best_for
# ---------------------------------------------------------------------------
LANDING_ROWS = [
("ld01","hero-centric","hero centric single-cta above-fold","Hero, value-prop, primary CTA, social proof strip, features","Single dominant CTA repeated in hero and final section","SaaS, product launches, general marketing"),
("ld02","product-grid","product grid ecommerce catalog","Hero banner, category nav, product grid, promo blocks","Add-to-cart / shop-now CTAs on each product card","E-commerce, retail catalogs"),
("ld03","trust-centric","trust centric security compliance finance","Hero, security badges, testimonials, compliance logos, CTA","CTA paired with trust signals (security badges, client logos)","Fintech, healthcare, B2B enterprise"),
("ld04","course-centric","course centric education curriculum","Hero, curriculum outline, instructor bio, testimonials, pricing","Enroll/Start-learning CTA near curriculum and pricing","Education platforms, online courses"),
("ld05","booking-centric","booking centric service appointment","Hero, services list, gallery, testimonials, booking widget","Persistent Book-Now CTA in header and hero","Beauty/spa, healthcare, home services"),
("ld06","listing-grid","listing grid real-estate marketplace","Hero search bar, filterable listing grid, map view, inquiry form","Inquire/Contact CTA on each listing card","Real estate, marketplaces, rentals"),
("ld07","menu-centric","menu centric restaurant food","Hero, menu highlights, gallery, reservation, location/hours","Reserve-a-table CTA plus order-online secondary CTA","Restaurants, cafes, food delivery"),
("ld08","portfolio-showcase","portfolio showcase case-studies work","Hero statement, selected work grid, case study pages, contact","Low-pressure Contact/Let's-talk CTA at the end","Agencies, freelancers, portfolios"),
("ld09","cause-centric","cause centric nonprofit donation","Hero story, impact stats, testimonials, donate section","Prominent Donate CTA with suggested amounts","Nonprofits, charities, causes"),
("ld10","hype-centric","hype centric gaming launch entertainment","Full-bleed hero video/art, trailer, features, community links","Wishlist/Play-now CTA with urgency/countdown","Gaming, entertainment launches"),
("ld11","demo-centric","demo centric ai product interactive","Hero with live/interactive demo, capability list, use-cases, pricing","Try-it-now CTA above the fold, docs CTA secondary","AI products, deep tech, dev platforms"),
("ld12","docs-centric","docs centric developer api tool","Hero with code snippet, quickstart, feature grid, docs link","Get-started/Read-docs CTA, copy-paste code sample","Developer tools, APIs, SDKs"),
("ld13","comparison","comparison pricing competitor versus","Hero, comparison table, pricing tiers, FAQ","Choose-plan CTA per pricing tier","Pricing pages, competitor comparison pages"),
("ld14","social-proof-heavy","social proof testimonials logos reviews","Hero, logo wall, testimonial carousel, case study stats, CTA","CTA reinforced by adjacent testimonial/logo proof","Enterprise SaaS, B2B services"),
("ld15","waitlist","waitlist pre-launch coming-soon early-access","Hero, product teaser, email capture, social links","Join-waitlist email capture as the sole CTA","Pre-launch products, early access programs"),
]

# ---------------------------------------------------------------------------
# UI REASONING RULES — used by --design-system to pick a coherent bundle
# id, trigger_keywords, product_id, style_id, color_id, typography_id, pattern_id, reasoning
# ---------------------------------------------------------------------------
REASONING_ROWS = [
("rs01","saas b2b software platform subscription","pr01","st16","cl01","ty01","ld01","B2B buyers need trust and clarity; clean corporate style with a neutral blue builds credibility fast"),
("rs02","fintech finance bank payments money","pr03","st46","cl03","ty19","ld03","Financial products need conservative, precise styling that signals security over playfulness"),
("rs03","fintech crypto web3 defi trading","pr03","st12","cl03","ty40","ld03","Crypto-native audiences respond to high-contrast dark UI with a futuristic technical typeface"),
("rs04","healthcare medical clinic patient wellness-service","pr04","st27","cl05","ty24","ld05","Calm soft-ui with a highly readable typeface reduces anxiety for health-related tasks"),
("rs05","beauty spa wellness service skincare salon","pr12","st22","cl09","ty07","ld05","Organic shapes and blush tones evoke care and softness appropriate for beauty/wellness"),
("rs06","education learning course school edtech","pr05","st19","cl11","ty10","ld04","Playful rounded shapes and a warm palette keep learners engaged without feeling childish for adults"),
("rs07","ecommerce shop retail store product","pr02","st48","cl07","ty04","ld02","Bold saturated colors and a friendly sans draw attention to products and drive urgency"),
("rs08","ecommerce luxury fashion premium retail","pr02","st20","cl08","ty05","ld02","Luxury retail needs restraint and elegance; serif display type signals premium quality"),
("rs09","dashboard analytics admin internal-tool data","pr06","st43","cl17","ty01","ld13","Power users scanning dense data need a compact, neutral system with strong hierarchy, not decoration"),
("rs10","portfolio personal creative freelancer resume","pr08","st04","cl15","ty22","ld08","Minimalism keeps focus on the creative work itself rather than the chrome around it"),
("rs11","agency studio creative branding design-firm","pr15","st05","cl15","ty17","ld08","A bold, opinionated studio should look distinct; brutalist type signals creative confidence"),
("rs12","landing page marketing product-launch startup","pr09","st18","cl02","ty02","ld01","Startups benefit from an approachable, modern look that feels current without being niche"),
("rs13","ai artificial-intelligence deep-tech developer-platform","pr21","st50","cl02","ty03","ld11","AI products benefit from a sleek dark aesthetic with glowing accents that reads as frontier tech"),
("rs14","developer tool api sdk cli infrastructure","pr22","st19","cl17","ty20","ld12","Developer audiences trust technical, code-forward design with a monospace accent typeface"),
("rs15","gaming esports game platform entertainment","pr17","st28","cl13","ty40","ld10","High-energy neon-on-dark aesthetics match gaming audience expectations and build hype"),
("rs16","nonprofit charity donation cause ngo","pr16","st49","cl19","ty07","ld09","Warm earth tones and organic imagery support an emotionally resonant, trustworthy cause narrative"),
("rs17","real-estate property listing housing rental","pr13","st20","cl21","ty42","ld06","Elegant serif type and restrained luxury tones elevate perceived property value"),
("rs18","restaurant food dining menu cafe","pr14","st22","cl20","ty49","ld07","Warm reds and organic texture stimulate appetite while staying legible for menus"),
("rs19","legal law firm consulting professional-services","pr19","st16","cl17","ty26","ld14","Legal/professional services need conservative, high-trust design with a readable serif accent"),
("rs20","travel hospitality hotel booking tourism","pr20","st20","cl21","ty05","ld01","Travel/hospitality brands sell aspiration; large imagery and elegant type support that fantasy"),
("rs21","fitness gym sports training wellness-app","pr18","st48","cl20","ty15","ld04","Fitness products benefit from bold energetic color and a condensed sporty display font"),
("rs22","mobile app ios android native consumer","pr11","st04","cl01","ty01","ld01","Mobile-first consumer apps favor minimal chrome and neutral system-friendly typography"),
("rs23","blog content publication editorial writing","pr10","st14","cl15","ty27","ld01","Editorial content prioritizes long-form readability with classic serif/sans pairing"),
("rs24","admin panel back-office crud internal","pr07","st17","cl18","ty01","ld13","Internal tools prioritize density and speed of scanning over visual flourish"),
]

# ---------------------------------------------------------------------------
# ANTI-PATTERNS (linked to reasoning by product/style — kept in ux.csv via
# the 'category' field; this file cross-references common combos to avoid)
# id, context_keywords, avoid, why
# ---------------------------------------------------------------------------
ANTIPATTERN_ROWS = [
("ap01","fintech finance banking","Playful rounded/bubbly style with saturated primary colors","Undermines the trust and seriousness financial products need to convey"),
("ap02","healthcare medical","Brutalist or neubrutalist raw aesthetic","Feels alarming/unpolished in a context where users are often anxious"),
("ap03","legal professional-services","Neon, gaming, or vaporwave aesthetics","Signals a lack of seriousness for high-stakes professional decisions"),
("ap04","dashboard admin data-dense","Large whitespace-heavy minimalism with sparse cards","Wastes screen space power users need for scanning dense data"),
("ap05","ecommerce checkout","Multi-step animated transitions on the checkout flow","Adds friction and perceived slowness right when users want to complete a purchase"),
("ap06","kids-education children","Small touch targets and low-contrast pastel-on-pastel text","Children and low-vision users can't reliably interact with tiny, low-contrast controls"),
("ap07","enterprise-saas b2b","Emoji used as functional icons in the product UI","Reads as unprofessional and inconsistent across platforms/fonts"),
("ap08","luxury fashion retail","Default system fonts (Arial/system-ui) for display headlines","Fails to convey the premium positioning the brand is paying for"),
("ap09","gaming entertainment","Low-saturation corporate-clean palette","Fails to create the energy/excitement gaming audiences expect"),
("ap10","portfolio creative","Templated hero-centric SaaS pattern with generic gradient blob","Makes a personal portfolio indistinguishable from a generic SaaS landing page"),
]

# ---------------------------------------------------------------------------
# DOMAIN: react (React/Next.js performance)
# id, keyword, title, guideline, category
# ---------------------------------------------------------------------------
REACT_DOMAIN_ROWS = [
("rd01","waterfall sequential fetch blocking","Avoid request waterfalls","Fetch independent data in parallel (Promise.all / parallel server fetches) instead of sequential awaits","performance"),
("rd02","bundle size code-splitting lazy","Keep bundles small","Use dynamic import()/React.lazy for heavy, non-critical components (charts, editors, modals)","performance"),
("rd03","suspense streaming loading-boundary","Use Suspense boundaries deliberately","Wrap slow subtrees in <Suspense> with a meaningful fallback, not the whole page","performance"),
("rd04","memo rerender unnecessary-render","Prevent unnecessary re-renders","Use React.memo/useMemo/useCallback only where profiling shows real re-render cost","performance"),
("rd05","rerender state-colocation lifting","Colocate state close to where it's used","Avoid lifting state higher than necessary; it causes broad re-render trees","architecture"),
("rd06","cache stale-data revalidate","Cache and revalidate server data deliberately","Use a data-fetching layer (React Query, SWR, Next cache) with explicit revalidation, not ad-hoc useEffect fetches","performance"),
("rd07","key list-rendering index-key","Use stable keys for list items","Use a stable unique id as the key prop, never the array index for reorderable lists","correctness"),
("rd08","hydration mismatch ssr client","Avoid hydration mismatches","Ensure server-rendered and first client render output match exactly (no Date.now()/Math.random in render)","correctness"),
("rd09","image next-image optimization","Use optimized image components","Use next/image (or equivalent) for automatic sizing, lazy loading, and format negotiation","performance"),
("rd10","context re-render provider-scope","Scope context providers narrowly","Split large contexts so unrelated consumers don't re-render on every change","performance"),
("rd11","server-components client-boundary","Push interactivity to the leaves","Keep 'use client' boundaries as small/deep as possible in the tree to minimize client JS","performance"),
("rd12","effect dependency-array stale-closure","Keep effect dependencies accurate","List all reactive values used inside useEffect in its dependency array","correctness"),
("rd13","virtualize long-list windowing","Virtualize very long lists","Use windowing (react-window/virtualized) for lists with hundreds+ of rows","performance"),
("rd14","route-prefetch navigation-speed","Prefetch likely next routes","Use built-in Link prefetching for perceived-instant navigation","performance"),
("rd15","error-boundary fallback resilience","Wrap risky subtrees in error boundaries","Add an ErrorBoundary around widgets that fetch external/unreliable data","resilience"),
]

# ---------------------------------------------------------------------------
# DOMAIN: web (general web interface guidelines)
# id, keyword, title, guideline, category
# ---------------------------------------------------------------------------
WEB_DOMAIN_ROWS = [
("wd01","aria role landmark semantic","Use ARIA to supplement, not replace, semantics","Prefer native semantic elements first; use ARIA roles only when no native element fits","accessibility"),
("wd02","focus trap modal dialog","Trap and restore focus for modals","Trap focus within an open modal and return it to the trigger element on close","accessibility"),
("wd03","keyboard shortcut conflict","Avoid clobbering browser/OS shortcuts","Don't override common shortcuts (Cmd/Ctrl+F, Tab, Esc) without a clear, documented reason","accessibility"),
("wd04","semantic landmark structure","Use landmark regions for page structure","Wrap the page in header/nav/main/footer so assistive tech can jump between regions","accessibility"),
("wd05","virtualize scroll-performance long-page","Virtualize offscreen content on long pages","Use content-visibility: auto or windowing for very long scrollable pages","performance"),
("wd06","meta description title seo","Every page needs a unique title and description","Set a descriptive <title> and meta description per route for SEO/sharing","seo"),
("wd07","responsive images picture srcset","Serve appropriately sized images per device","Use srcset/sizes or <picture> so mobile doesn't download desktop-resolution images","performance"),
("wd08","form autocomplete input-type","Use correct input types and autocomplete","Use type='email'/'tel' and autocomplete attributes to speed up form filling","ux"),
("wd09","link vs button semantics","Use links for navigation, buttons for actions","<a> changes the URL/navigates; <button> triggers an action — don't mix them up","accessibility"),
("wd10","prefers-color-scheme dark-mode-detection","Respect the OS color scheme preference","Use prefers-color-scheme as the default theme unless the user overrides it","ux"),
("wd11","offline-state network-error handling","Handle offline/network-failure states gracefully","Detect and communicate offline/failed-request states instead of a silent hang","resilience"),
("wd12","print-stylesheet printable-page","Provide sensible print styles where relevant","Hide nav/chrome and ensure readable print layout for content-heavy pages (invoices, articles)","ux"),
("wd13","favicon manifest pwa-basics","Ship basic PWA/browser metadata","Include a favicon, apple-touch-icon, and web manifest for a polished browser presence","polish"),
("wd14","language-attribute lang-tag","Declare the page's language","Set <html lang='en'> (or the correct locale) so assistive tech and translators work correctly","accessibility"),
("wd15","external-link-indication new-tab","Indicate links that open in a new tab","Add a visual cue and rel='noopener noreferrer' for target='_blank' links","accessibility"),
]

# ---------------------------------------------------------------------------
# PROMPT / CSS KEYWORDS per style (domain: prompt) — mirrors style.csv ids
# id, style_id, style_name, ai_prompt_keywords, css_keywords
# ---------------------------------------------------------------------------
def build_prompt_rows():
    rows = []
    for s in STYLE_ROWS:
        sid, name, keywords, description, best_for, effects, anti = s
        ai_prompt = f"{description}, {best_for.split(',')[0]}"
        css_kw = effects
        rows.append((f"pm{sid[2:]}", sid, name, ai_prompt, css_kw))
    return rows


PROMPT_ROWS = build_prompt_rows()

# ---------------------------------------------------------------------------
# STACK GUIDELINES — one CSV per stack under data/stacks/
# schema: id, keyword, title, guideline, category
# ---------------------------------------------------------------------------
STACK_DATA = {
"html-tailwind": [
("hw01","utility responsive breakpoint","Use Tailwind's responsive prefixes deliberately","Design mobile-first; add sm:/md:/lg: overrides only where the layout truly changes","layout"),
("hw02","spacing scale consistent","Stick to Tailwind's spacing scale","Use the default spacing scale (4px increments) instead of arbitrary values like [17px]","consistency"),
("hw03","a11y focus-visible ring","Style focus states explicitly","Use focus-visible:ring-2 focus-visible:ring-offset-2 on interactive elements","accessibility"),
("hw04","dark-mode class strategy","Use the class-based dark mode strategy for user toggles","Set darkMode: 'class' in config and toggle a class on <html> for a user-controlled switch","theming"),
("hw05","purge unused-css build-size","Keep the generated CSS small","Ensure content globs cover all template files so unused utilities are purged in production","performance"),
("hw06","component-extraction repeated-classes","Extract repeated utility clusters into components","When the same long className string repeats 3+ times, extract a component/partial, not @apply everywhere","maintainability"),
("hw07","semantic-html tailwind","Don't let utility classes replace semantic tags","Apply utilities to semantic elements (button, nav, main), not generic divs","accessibility"),
("hw08","form-styling native-inputs","Reset and restyle native form controls consistently","Use @tailwindcss/forms as a base, then layer custom focus/border styles","forms"),
("hw09","container max-width consistent","Keep a consistent content container width","Use one max-w-6xl/7xl container class across pages, not mixed widths","layout"),
("hw10","arbitrary-values overuse","Avoid excessive arbitrary value usage","Prefer scale tokens (text-lg, p-4) over arbitrary values like text-[17.3px] unless truly necessary","maintainability"),
],
"react": [
("rc01","state-lifting prop-drilling","Avoid excessive prop drilling","Use composition or context for state needed 3+ levels deep instead of drilling props","architecture"),
("rc02","controlled-uncontrolled input","Be deliberate about controlled vs uncontrolled inputs","Pick one pattern per form field and stay consistent; don't flip-flop with value/defaultValue","forms"),
("rc03","key stable-identity","Use stable keys for dynamic lists","Key list items by a stable unique id, never array index for reorderable/filterable lists","correctness"),
("rc04","effect side-effect minimal","Minimize useEffect usage","Prefer event handlers and derived state over useEffect for logic that isn't a true side effect","architecture"),
("rc05","custom-hook reusable-logic","Extract reusable logic into custom hooks","Move repeated stateful logic into a named useXyz hook rather than duplicating it","maintainability"),
("rc06","memo profiling premature-optimization","Don't memoize prematurely","Reach for React.memo/useMemo only after profiling shows a real re-render cost","performance"),
("rc07","error-boundary resilience","Add error boundaries around risky subtrees","Wrap components that fetch external data in an ErrorBoundary with a graceful fallback","resilience"),
("rc08","accessibility-aria interactive","Keep custom interactive components accessible","When building custom dropdowns/tabs, follow WAI-ARIA authoring patterns for roles and keyboard support","accessibility"),
],
"nextjs": [
("nx01","ssr-csr rendering-strategy","Choose rendering strategy per route intentionally","Use server components/SSR for content-heavy or SEO-critical routes, client components for interactivity","architecture"),
("nx02","image next-image responsive","Always use next/image for images","Get automatic responsive sizing, lazy loading, and format negotiation for free","performance"),
("nx03","api-route validation","Validate input in API routes/route handlers","Never trust client input in a route handler; validate and sanitize server-side","security"),
("nx04","metadata seo per-route","Set metadata per route for SEO/sharing","Use the metadata API (or next/head) for unique title/description per page","seo"),
("nx05","caching revalidate isr","Use ISR/revalidation deliberately","Choose revalidate intervals or on-demand revalidation based on how fresh the data must be","performance"),
("nx06","client-boundary use-client-minimal","Keep 'use client' boundaries small","Push 'use client' as deep in the tree as possible to minimize shipped client JS","performance"),
("nx07","env-vars secrets server-only","Never expose secrets to the client bundle","Only prefix env vars with NEXT_PUBLIC_ when they're safe to ship to the browser","security"),
],
"vue": [
("vu01","composition-api setup script","Prefer the Composition API with <script setup>","Use <script setup> for new components; it's terser and better for TypeScript inference","architecture"),
("vu02","reactivity ref-vs-reactive","Be consistent about ref vs reactive","Use ref for primitives, reactive for objects, and don't mix patterns arbitrarily in one file","consistency"),
("vu03","pinia store-scoping","Scope Pinia stores by domain, not globally","Create focused stores (useAuthStore, useCartStore) instead of one giant app store","architecture"),
("vu04","vue-router lazy-routes","Lazy-load route components","Use dynamic import() for route components to keep the initial bundle small","performance"),
("vu05","computed derived-state","Prefer computed over watch for derived state","Use computed() when a value is purely derived; reserve watch for real side effects","architecture"),
("vu06","v-for key stable","Always key v-for with a stable id","Provide a stable :key (not index) for reorderable/filterable v-for lists","correctness"),
("vu07","slots composition reuse","Use slots for flexible component composition","Prefer scoped slots over prop-explosion for components with variable content","architecture"),
],
"svelte": [
("sv01","runes state reactivity","Use Svelte 5 runes for explicit reactivity","Use $state/$derived/$effect deliberately rather than relying on implicit reactivity everywhere","architecture"),
("sv02","stores shared-state scope","Scope stores to the feature that owns them","Avoid one giant global store; colocate stores with the feature/module they belong to","architecture"),
("sv03","sveltekit load-function data","Fetch page data in load functions","Use +page.ts/+page.server.ts load functions instead of fetching in onMount for initial data","performance"),
("sv04","transition animation built-in","Use built-in transitions for simple animation","Reach for Svelte's transition:/animate: directives before pulling in an animation library","performance"),
("sv05","each key stable-identity","Key #each blocks with a stable id","Use {#each items as item (item.id)} for reorderable lists, not bare index-based iteration","correctness"),
("sv06","form-actions progressive-enhancement","Use SvelteKit form actions for forms","Prefer server-side form actions with progressive enhancement over pure client-side fetch submits","architecture"),
],
"swiftui": [
("sw01","state-ownership source-of-truth","Keep a single source of truth per piece of state","Use @State for local view state, @Observable/@StateObject for shared model state owned by one view","architecture"),
("sw02","view-decomposition small-views","Break large views into small, composable views","Extract subviews when a body closure grows large; SwiftUI diffs and re-renders more efficiently","performance"),
("sw03","navigation-stack programmatic","Use NavigationStack with a typed path for navigation","Drive navigation via a path array/enum for deep-linking and programmatic control","architecture"),
("sw04","list identifiable id","Conform list data to Identifiable with a stable id","Avoid using array index as id for List/ForEach over mutable/reorderable data","correctness"),
("sw05","animation implicit-explicit","Prefer implicit animation modifiers for simple cases","Use .animation(value:) tied to specific state changes rather than blanket global animation","animation"),
("sw06","accessibility-label voiceover","Provide accessibility labels for custom controls","Set .accessibilityLabel/.accessibilityHint on icon-only or custom-drawn controls","accessibility"),
("sw07","dynamic-type text-scaling","Support Dynamic Type for text scaling","Use built-in text styles (.body, .headline) so text scales with the user's accessibility settings","accessibility"),
],
"react-native": [
("rn01","flatlist virtualization long-list","Use FlatList/SectionList for long lists","Never map() a large array directly into ScrollView; use virtualized list components","performance"),
("rn02","safe-area-view notch-handling","Respect safe areas on notched devices","Wrap screens in SafeAreaView or use safe-area-context insets for status bar/notch/home indicator","layout"),
("rn03","touchable-feedback press-state","Give touchables clear pressed feedback","Use Pressable with a visible pressed style rather than TouchableOpacity with no feedback","touch"),
("rn04","image-caching remote-images","Cache and size remote images deliberately","Set explicit width/height and use a caching image component for remote images","performance"),
("rn05","navigation stack-tab structure","Structure navigation with stack + tab navigators","Combine React Navigation stack and tab navigators to match common mobile IA patterns","architecture"),
("rn06","platform-specific ios-android-parity","Account for platform differences deliberately","Use Platform.select/OS checks for intentional iOS/Android differences, not accidental ones","cross-platform"),
("rn07","keyboard-avoiding form-inputs","Handle the keyboard covering form inputs","Wrap forms in KeyboardAvoidingView so inputs aren't hidden behind the keyboard","forms"),
],
"flutter": [
("fl01","widget-composition small-widgets","Break large build methods into small widgets","Extract StatelessWidget/StatelessWidget classes instead of deeply nested inline builder trees","architecture"),
("fl02","state-management scoped","Scope state management to what actually needs it","Use local setState for simple widget state; reach for Provider/Riverpod/Bloc only for shared state","architecture"),
("fl03","listview-builder long-list","Use ListView.builder for long/lazy lists","Avoid building a full Column of children for large lists; use builder constructors for lazy rendering","performance"),
("fl04","theme-data consistent-theming","Centralize styling in ThemeData","Define colors/typography once in ThemeData/TextTheme instead of hardcoding styles per widget","theming"),
("fl05","key stable-identity widgets","Use Keys for widgets that need identity across rebuilds","Provide ValueKey/ObjectKey for list items so Flutter can correctly diff reordered widgets","correctness"),
("fl06","semantics accessibility-labels","Add Semantics labels for custom-drawn widgets","Wrap icon-only or custom-painted controls in Semantics(label: ...) for screen readers","accessibility"),
("fl07","mediaquery responsive-layout","Use MediaQuery/LayoutBuilder for responsive layout","Adapt layout to available width instead of hardcoding sizes for a single device class","layout"),
],
"shadcn": [
("sc01","theming css-variables tokens","Theme via CSS variables, not hardcoded colors","Use the generated CSS variable tokens (--primary, --background) so theming/dark-mode stays consistent","theming"),
("sc02","composition primitive-based","Compose shadcn primitives rather than rebuilding them","Build higher-level components by composing existing primitives (Dialog, Popover, Command) instead of reinventing them","architecture"),
("sc03","form react-hook-form zod","Pair Form components with react-hook-form + zod","Use the shadcn Form wrapper with a zod schema for typed, accessible validation","forms"),
("sc04","variant class-variance-authority","Define component variants with cva","Use class-variance-authority for variant/size props instead of ad-hoc conditional className strings","maintainability"),
("sc05","accessibility radix-primitives","Rely on Radix primitives for accessible behavior","Don't strip away the built-in keyboard/focus handling that Radix-based primitives provide","accessibility"),
("sc06","dark-mode next-themes toggle","Use next-themes (or equivalent) for theme switching","Drive the dark-mode class toggle through a dedicated theme provider, not manual class manipulation","theming"),
],
}


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(STACKS_DIR, exist_ok=True)

    write_csv("style.csv", ["id","name","keywords","description","best_for","effects","anti_patterns"], STYLE_ROWS)
    write_csv("color.csv", ["id","name","category","keywords","primary","secondary","accent","background","text","contrast_note"], COLOR_ROWS)
    write_csv("typography.csv", ["id","heading_font","body_font","keywords","personality","best_for","google_fonts_import"], TYPOGRAPHY_ROWS)
    write_csv("chart.csv", ["id","name","keywords","data_type","library_recommendation","accessibility_note"], CHART_ROWS)
    write_csv("ux.csv", ["id","category","priority","title","guideline","do","dont"], UX_ROWS)
    write_csv("product.csv", ["id","type","name","keywords","recommended_styles","recommended_colors","recommended_pattern","notes"], PRODUCT_ROWS)
    write_csv("landing.csv", ["id","name","keywords","sections","cta_strategy","best_for"], LANDING_ROWS)
    write_csv("ui-reasoning.csv", ["id","trigger_keywords","product_id","style_id","color_id","typography_id","pattern_id","reasoning"], REASONING_ROWS)
    write_csv("anti-patterns.csv", ["id","context_keywords","avoid","why"], ANTIPATTERN_ROWS)
    write_csv("react.csv", ["id","keyword","title","guideline","category"], REACT_DOMAIN_ROWS)
    write_csv("web.csv", ["id","keyword","title","guideline","category"], WEB_DOMAIN_ROWS)
    write_csv("prompt.csv", ["id","style_id","style_name","ai_prompt_keywords","css_keywords"], PROMPT_ROWS)

    for stack, rows in STACK_DATA.items():
        write_csv(f"{stack}.csv", ["id","keyword","title","guideline","category"], rows, subdir=STACKS_DIR)

    print("\nDone.")


if __name__ == "__main__":
    main()
