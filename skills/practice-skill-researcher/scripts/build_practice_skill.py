#!/usr/bin/env python3
"""
Build a research-backed practice skill package with Tavily.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

TAVILY_SEARCH_URL = "https://api.tavily.com/search"


@dataclass
class SearchResult:
    query: str
    title: str
    url: str
    content: str
    score: float
    published_date: str | None

    @property
    def domain(self) -> str:
        cleaned = re.sub(r"^https?://", "", self.url.lower()).split("/")[0]
        return cleaned.removeprefix("www.")


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    slug = re.sub(r"-{2,}", "-", slug) or "practice-topic"
    # Keep generated skill names within common skill naming limits.
    return slug[:50].strip("-") or "practice-topic"


def unique_words(value: str) -> list[str]:
    stop_words = {
        "about",
        "after",
        "again",
        "against",
        "also",
        "because",
        "from",
        "into",
        "just",
        "more",
        "most",
        "other",
        "should",
        "their",
        "there",
        "these",
        "those",
        "through",
        "under",
        "very",
        "with",
        "your",
    }
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9-]{2,}", value.lower())
    seen: set[str] = set()
    out: list[str] = []
    for word in words:
        if word in stop_words:
            continue
        if word not in seen:
            seen.add(word)
            out.append(word)
    return out


def build_queries(practice: str, audience: str, goal: str) -> list[str]:
    queries = [
        f"{practice} frameworks checklist best practices",
        f"{practice} common mistakes pitfalls and how to improve",
        f"{practice} coaching rubric evaluation criteria scoring",
        f"{practice} drills exercises role play prompts",
        f"{practice} feedback techniques and debrief method",
    ]
    if audience:
        queries.append(f"{practice} for {audience} examples and guidance")
    if goal:
        queries.append(f"{practice} methods to improve {goal}")

    # Preserve order but avoid duplicates.
    seen: set[str] = set()
    deduped: list[str] = []
    for query in queries:
        if query not in seen:
            seen.add(query)
            deduped.append(query)
    return deduped


def tavily_search(
    api_key: str,
    query: str,
    max_results: int,
    include_domains: list[str] | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "api_key": api_key,
        "query": query,
        "search_depth": "advanced",
        "max_results": max_results,
        "include_answer": True,
        "include_raw_content": False,
    }
    if include_domains:
        payload["include_domains"] = include_domains

    request = Request(
        TAVILY_SEARCH_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=45) as response:
            status = getattr(response, "status", 200)
            if status >= 400:
                raise RuntimeError(f"Tavily request failed with HTTP {status}")
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Tavily HTTP error {exc.code}: {body}") from exc
    except URLError as exc:
        raise RuntimeError(f"Tavily network error: {exc.reason}") from exc


def parse_results(query: str, payload: dict[str, Any]) -> tuple[str, list[SearchResult]]:
    answer = str(payload.get("answer") or "").strip()
    items = payload.get("results")
    if not isinstance(items, list):
        return answer, []

    parsed: list[SearchResult] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        url = str(item.get("url") or "").strip()
        if not url:
            continue
        parsed.append(
            SearchResult(
                query=query,
                title=str(item.get("title") or "Untitled source").strip(),
                url=url,
                content=str(item.get("content") or "").strip(),
                score=float(item.get("score") or 0.0),
                published_date=(
                    str(item.get("published_date")).strip() if item.get("published_date") else None
                ),
            )
        )
    return answer, parsed


def dedupe_results(results: list[SearchResult]) -> list[SearchResult]:
    deduped: dict[str, SearchResult] = {}
    for result in results:
        key = result.url.strip().lower()
        existing = deduped.get(key)
        if existing is None or result.score > existing.score:
            deduped[key] = result
    ordered = sorted(deduped.values(), key=lambda item: item.score, reverse=True)
    return ordered


def summarize_insights(
    practice: str,
    answers: list[dict[str, str]],
    results: list[SearchResult],
    limit: int = 10,
) -> list[str]:
    keywords = set(unique_words(practice))
    candidates: list[tuple[int, float, str]] = []

    for answer_item in answers:
        text = answer_item["answer"]
        for sentence in re.split(r"(?<=[.!?])\s+", text):
            clean = sentence.strip()
            if len(clean) < 45 or len(clean) > 260:
                continue
            score = sum(1 for word in unique_words(clean) if word in keywords)
            candidates.append((score + 1, 1.0, clean))

    for item in results:
        for sentence in re.split(r"(?<=[.!?])\s+", item.content):
            clean = sentence.strip()
            if len(clean) < 45 or len(clean) > 260:
                continue
            score = sum(1 for word in unique_words(clean) if word in keywords)
            candidates.append((score, item.score, clean))

    # Keep the most topical and highest-confidence sentences.
    candidates.sort(key=lambda row: (row[0], row[1]), reverse=True)
    unique: list[str] = []
    seen: set[str] = set()
    for _, _, sentence in candidates:
        normalized = re.sub(r"\s+", " ", sentence.lower())
        if normalized in seen:
            continue
        seen.add(normalized)
        unique.append(sentence)
        if len(unique) >= limit:
            break
    return unique


def markdown_sources(results: list[SearchResult], limit: int = 12) -> str:
    lines = []
    for item in results[:limit]:
        published = f" ({item.published_date})" if item.published_date else ""
        lines.append(f"- [{item.title}]({item.url}){published}")
    if not lines:
        lines.append("- No sources returned from Tavily.")
    return "\n".join(lines)


def write_package(
    output_dir: Path,
    practice: str,
    audience: str,
    goal: str,
    queries: list[str],
    answers: list[dict[str, str]],
    results: list[SearchResult],
    min_unique_sources: int,
) -> None:
    slug = slugify(practice)
    package_dir = output_dir / slug
    package_dir.mkdir(parents=True, exist_ok=True)

    unique_domains = sorted({result.domain for result in results})
    insights = summarize_insights(practice, answers, results, limit=10)
    if not insights:
        insights = [
            "Use the sources below to extract the most relevant frameworks, pitfalls, and evaluation criteria before starting practice."
        ]

    generated_skill = f"""---
name: practice-{slug}-coach
description: Research-backed coaching plan for practicing {practice}. Use when the user wants a structured practice session with drills, rubric scoring, and actionable feedback.
---

# Practice: {practice}

## Session Setup

- Confirm session target: `{goal or "improve performance through deliberate practice"}`
- Confirm audience/context: `{audience or "general professional context"}`
- Set timebox and expected number of practice rounds.

## Research-Backed Guidance

{chr(10).join(f"- {item}" for item in insights[:8])}

## Practice Flow

1. Baseline attempt:
- Ask the user for a first attempt with no coaching interruptions.
- Capture strengths and failure points against the rubric.

2. Focused drills:
- Drill 1: Structure and clarity under time pressure.
- Drill 2: Handling pushback, follow-up, or ambiguity.
- Drill 3: Advanced scenario aligned to the user's goal.

3. Full simulation:
- Run one realistic end-to-end simulation.
- Score immediately and identify the top two improvement actions.

4. Debrief:
- Explain what improved, what is still weak, and what to practice next.
- Give one homework drill and one reflection prompt.

## Coaching Rubric (1-5)

- `Structure`: clear sequence, no rambling, logical transitions.
- `Relevance`: answer/pattern directly matches prompt and context.
- `Depth`: demonstrates reasoning, tradeoffs, and concrete examples.
- `Delivery`: concise communication, confidence, and control.
- `Adaptability`: adjusts when challenged or redirected.

## Common Failure Modes

- Overly generic responses without concrete examples.
- Missing structure or skipping reasoning steps.
- Weak adaptation to constraints, follow-up, or feedback.
- No explicit self-correction after mistakes.

## Sources

{markdown_sources(results)}
"""

    research_lines = [
        f"# Tavily Research Log: {practice}",
        "",
        f"- Generated at: {datetime.now(timezone.utc).isoformat()}",
        f"- Audience: {audience or 'N/A'}",
        f"- Goal: {goal or 'N/A'}",
        f"- Unique sources: {len(results)}",
        f"- Unique domains: {len(unique_domains)}",
        "",
        "## Queries",
        "",
    ]
    research_lines.extend([f"- {query}" for query in queries])
    research_lines.extend(["", "## Tavily Answers", ""])
    for answer_item in answers:
        research_lines.append(f"### {answer_item['query']}")
        research_lines.append("")
        research_lines.append(answer_item["answer"] or "_No answer returned._")
        research_lines.append("")
    research_lines.extend(["## Source Inventory", ""])
    for result in results:
        research_lines.append(f"- {result.title} | {result.domain} | {result.url}")

    sources_payload = {
        "practice": practice,
        "audience": audience,
        "goal": goal,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "queries": queries,
        "unique_source_count": len(results),
        "unique_domain_count": len(unique_domains),
        "results": [
            {
                "query": result.query,
                "title": result.title,
                "url": result.url,
                "domain": result.domain,
                "score": result.score,
                "published_date": result.published_date,
                "content": result.content,
            }
            for result in results
        ],
    }

    (package_dir / "SKILL.md").write_text(generated_skill)
    (package_dir / "research.md").write_text("\n".join(research_lines).rstrip() + "\n")
    (package_dir / "sources.json").write_text(json.dumps(sources_payload, indent=2) + "\n")

    print(f"[OK] Created package: {package_dir}")
    print(f"[OK] SKILL: {package_dir / 'SKILL.md'}")
    print(f"[OK] Research log: {package_dir / 'research.md'}")
    print(f"[OK] Sources JSON: {package_dir / 'sources.json'}")

    if len(results) < min_unique_sources:
        print(
            f"[WARN] Only {len(results)} unique sources found. Target is {min_unique_sources}.",
            file=sys.stderr,
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a comprehensive practice skill package using Tavily search.",
    )
    parser.add_argument("practice", help="Practice topic to prepare (e.g. 'system design interview').")
    parser.add_argument(
        "--audience",
        default="",
        help="Audience context (e.g. 'staff engineer candidate').",
    )
    parser.add_argument(
        "--goal",
        default="",
        help="User's target improvement goal.",
    )
    parser.add_argument(
        "--output-dir",
        default="generated-practice-skills",
        help="Directory where the package should be created.",
    )
    parser.add_argument(
        "--max-results",
        type=int,
        default=6,
        help="Maximum Tavily results per query.",
    )
    parser.add_argument(
        "--min-unique-sources",
        type=int,
        default=8,
        help="Warn if fewer than this many unique sources are collected.",
    )
    parser.add_argument(
        "--include-domains",
        default="",
        help="Comma-separated domains to restrict Tavily search scope.",
    )
    parser.add_argument(
        "--api-key",
        default="",
        help="Tavily API key. Defaults to TAVILY_API_KEY environment variable.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    api_key = (args.api_key or os.environ.get("TAVILY_API_KEY", "")).strip()
    if not api_key:
        print(
            "[ERROR] Missing Tavily API key. Set TAVILY_API_KEY or pass --api-key.",
            file=sys.stderr,
        )
        return 2

    include_domains = [item.strip() for item in args.include_domains.split(",") if item.strip()]
    queries = build_queries(args.practice, args.audience, args.goal)

    all_answers: list[dict[str, str]] = []
    all_results: list[SearchResult] = []

    for query in queries:
        print(f"[INFO] Tavily search: {query}")
        payload = tavily_search(
            api_key=api_key,
            query=query,
            max_results=args.max_results,
            include_domains=include_domains or None,
        )
        answer, results = parse_results(query, payload)
        all_answers.append({"query": query, "answer": answer})
        all_results.extend(results)

    deduped = dedupe_results(all_results)
    write_package(
        output_dir=Path(args.output_dir),
        practice=args.practice,
        audience=args.audience,
        goal=args.goal,
        queries=queries,
        answers=all_answers,
        results=deduped,
        min_unique_sources=args.min_unique_sources,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
