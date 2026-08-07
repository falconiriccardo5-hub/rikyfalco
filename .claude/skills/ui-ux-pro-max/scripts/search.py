#!/usr/bin/env python3
"""CLI search tool for the ui-ux-pro-max skill's design databases.

Examples:
    search.py "healthcare dashboard" --domain product
    search.py "glassmorphism dark" --domain style -n 5
    search.py "layout responsive form" --stack html-tailwind
    search.py "beauty spa wellness service" --design-system -p "Serenity Spa"
"""

import argparse
import csv
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
STACKS_DIR = os.path.join(DATA_DIR, "stacks")

DOMAIN_FILES = {
    "product": "product.csv",
    "style": "style.csv",
    "typography": "typography.csv",
    "color": "color.csv",
    "landing": "landing.csv",
    "chart": "chart.csv",
    "ux": "ux.csv",
    "react": "react.csv",
    "web": "web.csv",
    "prompt": "prompt.csv",
}

STACKS = [
    "html-tailwind", "react", "nextjs", "vue", "svelte",
    "swiftui", "react-native", "flutter", "shadcn",
]

# Fields (besides id) that are searched for keyword matches, per domain/stack.
SEARCH_FIELDS = {
    "product": ["type", "name", "keywords", "notes"],
    "style": ["name", "keywords", "description", "best_for"],
    "typography": ["heading_font", "body_font", "keywords", "personality", "best_for"],
    "color": ["name", "category", "keywords"],
    "landing": ["name", "keywords", "sections", "best_for"],
    "chart": ["name", "keywords", "data_type"],
    "ux": ["title", "category", "guideline"],
    "react": ["keyword", "title", "guideline", "category"],
    "web": ["keyword", "title", "guideline", "category"],
    "prompt": ["style_name", "ai_prompt_keywords", "css_keywords"],
    "stack": ["keyword", "title", "guideline", "category"],
}


def load_csv(path):
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def score_row(row, terms, fields):
    haystack = " ".join(str(row.get(f, "")) for f in fields).lower()
    score = 0
    for term in terms:
        if term in haystack:
            score += 2 if any(term in str(row.get(f, "")).lower().split() for f in fields) else 1
    return score


def search_rows(rows, query, fields, max_results=10):
    terms = [t for t in query.lower().replace(",", " ").split() if t]
    if not terms:
        return rows[:max_results]
    scored = []
    for row in rows:
        s = score_row(row, terms, fields)
        if s > 0:
            scored.append((s, row))
    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        return []
    return [row for _, row in scored[:max_results]]


def print_rows(rows, title):
    if not rows:
        print(f"No results found for {title}.")
        return
    print(f"\n=== {title} ({len(rows)} result{'s' if len(rows) != 1 else ''}) ===")
    for row in rows:
        print("-" * 60)
        for k, v in row.items():
            if v:
                print(f"{k}: {v}")


def cmd_domain(args):
    if args.domain not in DOMAIN_FILES:
        print(f"Unknown domain '{args.domain}'. Available: {', '.join(sorted(DOMAIN_FILES))}", file=sys.stderr)
        sys.exit(1)
    rows = load_csv(os.path.join(DATA_DIR, DOMAIN_FILES[args.domain]))
    fields = SEARCH_FIELDS[args.domain]
    results = search_rows(rows, args.query, fields, args.max_results)
    print_rows(results, f"domain: {args.domain}")


def cmd_stack(args):
    if args.stack not in STACKS:
        print(f"Unknown stack '{args.stack}'. Available: {', '.join(STACKS)}", file=sys.stderr)
        sys.exit(1)
    rows = load_csv(os.path.join(STACKS_DIR, f"{args.stack}.csv"))
    results = search_rows(rows, args.query, SEARCH_FIELDS["stack"], args.max_results)
    print_rows(results, f"stack: {args.stack}")


def find_best_reasoning_rule(query):
    rows = load_csv(os.path.join(DATA_DIR, "ui-reasoning.csv"))
    terms = [t for t in query.lower().replace(",", " ").split() if t]
    best, best_score = None, 0
    for row in rows:
        haystack = row.get("trigger_keywords", "").lower()
        score = sum(1 for t in terms if t in haystack)
        if score > best_score:
            best, best_score = row, score
    return best


def lookup(rows_by_id, row_id):
    return rows_by_id.get(row_id)


def index_by_id(rows):
    return {r["id"]: r for r in rows}


def find_antipatterns(query, max_results=3):
    rows = load_csv(os.path.join(DATA_DIR, "anti-patterns.csv"))
    terms = [t for t in query.lower().replace(",", " ").split() if t]
    scored = []
    for row in rows:
        haystack = row.get("context_keywords", "").lower()
        score = sum(1 for t in terms if t in haystack)
        if score > 0:
            scored.append((score, row))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [r for _, r in scored[:max_results]]


def build_design_system(query, project_name=None):
    products = index_by_id(load_csv(os.path.join(DATA_DIR, "product.csv")))
    styles = index_by_id(load_csv(os.path.join(DATA_DIR, "style.csv")))
    colors = index_by_id(load_csv(os.path.join(DATA_DIR, "color.csv")))
    typography = index_by_id(load_csv(os.path.join(DATA_DIR, "typography.csv")))
    landing = index_by_id(load_csv(os.path.join(DATA_DIR, "landing.csv")))

    rule = find_best_reasoning_rule(query)

    if rule:
        product = lookup(products, rule["product_id"])
        style = lookup(styles, rule["style_id"])
        color = lookup(colors, rule["color_id"])
        type_pair = lookup(typography, rule["typography_id"])
        pattern = lookup(landing, rule["pattern_id"])
        reasoning = rule["reasoning"]
    else:
        # Fallback: best keyword match per domain, independently.
        product = (search_rows(list(products.values()), query, SEARCH_FIELDS["product"], 1) or [None])[0]
        style = (search_rows(list(styles.values()), query, SEARCH_FIELDS["style"], 1) or [None])[0]
        color = (search_rows(list(colors.values()), query, SEARCH_FIELDS["color"], 1) or [None])[0]
        type_pair = (search_rows(list(typography.values()), query, SEARCH_FIELDS["typography"], 1) or [None])[0]
        pattern = (search_rows(list(landing.values()), query, SEARCH_FIELDS["landing"], 1) or [None])[0]
        reasoning = "No exact reasoning rule matched; each recommendation was selected independently by keyword relevance."

    antipatterns = find_antipatterns(query)
    if not antipatterns and product:
        antipatterns = find_antipatterns(product.get("keywords", ""))

    return {
        "query": query,
        "project_name": project_name,
        "product": product,
        "style": style,
        "color": color,
        "typography": type_pair,
        "pattern": pattern,
        "reasoning": reasoning,
        "antipatterns": antipatterns,
    }


def format_ascii(ds):
    lines = []
    title = f"DESIGN SYSTEM — {ds['project_name']}" if ds["project_name"] else "DESIGN SYSTEM"
    width = max(60, len(title) + 4)
    lines.append("+" + "-" * (width - 2) + "+")
    lines.append("| " + title.ljust(width - 4) + " |")
    lines.append("+" + "-" * (width - 2) + "+")
    lines.append(f"Query: {ds['query']}")

    def section(name, row, fields):
        lines.append("")
        lines.append(f"[{name}]")
        if not row:
            lines.append("  (no match found)")
            return
        for f in fields:
            if row.get(f):
                lines.append(f"  {f}: {row[f]}")

    if ds["product"]:
        section("Product Pattern", ds["product"], ["name", "recommended_pattern", "notes"])
    if ds["style"]:
        section("Style", ds["style"], ["name", "description", "effects", "anti_patterns"])
    if ds["color"]:
        section("Color Palette", ds["color"], ["name", "primary", "secondary", "accent", "background", "text", "contrast_note"])
    if ds["typography"]:
        section("Typography", ds["typography"], ["heading_font", "body_font", "personality", "google_fonts_import"])
    if ds["pattern"]:
        section("Landing Structure", ds["pattern"], ["name", "sections", "cta_strategy"])

    lines.append("")
    lines.append("[Reasoning]")
    lines.append(f"  {ds['reasoning']}")

    if ds["antipatterns"]:
        lines.append("")
        lines.append("[Anti-patterns to avoid]")
        for ap in ds["antipatterns"]:
            lines.append(f"  - {ap['avoid']}: {ap['why']}")

    lines.append("")
    lines.append("+" + "-" * (width - 2) + "+")
    return "\n".join(lines)


def format_markdown(ds):
    lines = []
    title = f"Design System — {ds['project_name']}" if ds["project_name"] else "Design System"
    lines.append(f"# {title}")
    lines.append("")
    lines.append(f"**Query:** {ds['query']}")
    lines.append("")

    def section(name, row, fields):
        lines.append(f"## {name}")
        if not row:
            lines.append("_No match found._")
            lines.append("")
            return
        for f in fields:
            if row.get(f):
                label = f.replace("_", " ").title()
                lines.append(f"- **{label}:** {row[f]}")
        lines.append("")

    if ds["product"]:
        section("Product Pattern", ds["product"], ["name", "recommended_pattern", "notes"])
    if ds["style"]:
        section("Style", ds["style"], ["name", "description", "effects", "anti_patterns"])
    if ds["color"]:
        section("Color Palette", ds["color"], ["name", "primary", "secondary", "accent", "background", "text", "contrast_note"])
    if ds["typography"]:
        section("Typography", ds["typography"], ["heading_font", "body_font", "personality", "google_fonts_import"])
    if ds["pattern"]:
        section("Landing Structure", ds["pattern"], ["name", "sections", "cta_strategy"])

    lines.append("## Reasoning")
    lines.append(ds["reasoning"])
    lines.append("")

    if ds["antipatterns"]:
        lines.append("## Anti-patterns to avoid")
        for ap in ds["antipatterns"]:
            lines.append(f"- **{ap['avoid']}** — {ap['why']}")
        lines.append("")

    return "\n".join(lines)


def cmd_design_system(args):
    ds = build_design_system(args.query, args.project_name)
    if args.format == "markdown":
        print(format_markdown(ds))
    else:
        print(format_ascii(ds))


def main():
    parser = argparse.ArgumentParser(description="Search the ui-ux-pro-max design databases.")
    parser.add_argument("query", help="Search keywords, e.g. 'healthcare dashboard elegant'")
    parser.add_argument("-n", "--max-results", type=int, default=10, help="Maximum results to return")
    parser.add_argument("--domain", choices=sorted(DOMAIN_FILES), help="Search a specific domain database")
    parser.add_argument("--stack", choices=STACKS, help="Search a specific stack's implementation guidelines")
    parser.add_argument("--design-system", action="store_true", help="Generate a full design system recommendation")
    parser.add_argument("-p", "--project-name", help="Project name to include in --design-system output")
    parser.add_argument("-f", "--format", choices=["ascii", "markdown"], default="ascii", help="Output format for --design-system")

    args = parser.parse_args()

    selected = sum(bool(x) for x in [args.domain, args.stack, args.design_system])
    if selected > 1:
        parser.error("Choose only one of --domain, --stack, or --design-system")

    if args.design_system:
        cmd_design_system(args)
    elif args.domain:
        cmd_domain(args)
    elif args.stack:
        cmd_stack(args)
    else:
        parser.error("Specify one of --domain <domain>, --stack <stack>, or --design-system")


if __name__ == "__main__":
    main()
