#!/usr/bin/env python3
"""
update_devlog.py — Auto-update DEVLOG.md

Modes:
  push   Read $COMMIT_MSG env var, append to today's section
  daily  Compile all of today's commits from git log, replace today's section
"""

import os, re, subprocess, sys
from datetime import datetime
from zoneinfo import ZoneInfo

DEVLOG = "DEVLOG.md"
TZ = ZoneInfo("Asia/Taipei")
START = "<!-- LOG_START -->"
END = "<!-- LOG_END -->"


def today():
    return datetime.now(TZ).strftime("%Y-%m-%d")


def get_commits_today():
    d = today()
    r = subprocess.run(
        ["git", "log",
         f"--after={d} 00:00:00 +0800",
         f"--before={d} 23:59:59 +0800",
         "--format=%s", "--no-merges"],
        capture_output=True, text=True,
    )
    return [
        l.strip() for l in r.stdout.splitlines()
        if l.strip() and "auto-update DEVLOG" not in l
    ]


def read():
    return open(DEVLOG, encoding="utf-8").read()


def write(c):
    open(DEVLOG, "w", encoding="utf-8").write(c)


def get_block(content):
    m = re.search(re.escape(START) + r"(.*?)" + re.escape(END), content, re.DOTALL)
    return m.group(1) if m else "\n"


def set_block(content, block):
    return re.sub(
        re.escape(START) + r".*?" + re.escape(END),
        START + block + END,
        content, flags=re.DOTALL,
    )


def prepend_day(block, d, entries):
    header = f"### {d}"
    bullets = "\n".join(f"- {e}" for e in entries)
    section = f"\n{header}\n{bullets}\n"
    if header in block:
        # Replace entire day section (daily mode idempotent)
        block = re.sub(
            rf"\n{re.escape(header)}\n(?:- [^\n]*\n)*",
            section,
            block,
        )
    else:
        block = section + block.lstrip("\n")
    return block


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "daily"
    d = today()
    content = read()
    block = get_block(content)

    if mode == "push":
        msg = os.environ.get("COMMIT_MSG", "").strip()
        if not msg or "auto-update DEVLOG" in msg:
            print("Skipping bot/empty commit.")
            return
        line = msg.splitlines()[0]
        header = f"### {d}"
        if header in block:
            # Append bullet right after the day header
            block = block.replace(f"{header}\n", f"{header}\n- {line}\n", 1)
        else:
            block = f"\n{header}\n- {line}\n{block.lstrip(chr(10))}"

    elif mode == "daily":
        commits = get_commits_today()
        if not commits:
            print("No commits today, skipping.")
            return
        block = prepend_day(block, d, commits)

    write(set_block(content, block))
    print(f"DEVLOG updated ({mode}, {d})")


if __name__ == "__main__":
    main()
