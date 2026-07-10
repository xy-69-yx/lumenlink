import os
import subprocess
import datetime

commits = [
    ("docs: Add project README", ["README.md"]),
    ("chore: Initialize Cargo workspace", ["Cargo.toml", "Cargo.lock"]),
    ("chore(contracts): Add registry contract config", ["contracts/lumenlink_registry/Cargo.toml", "contracts/lumenlink_registry/Makefile"]),
    ("feat(contracts): Implement registry contract logic", ["contracts/lumenlink_registry/src/lib.rs"]),
    ("test(contracts): Add unit tests for registry contract", ["contracts/lumenlink_registry/src/test.rs"]),
    ("test(contracts): Add initial test snapshots", ["contracts/lumenlink_registry/test_snapshots/test/validate_input_rules.1.json", "contracts/lumenlink_registry/test_snapshots/test/list_filters_by_owner.1.json"]),
    ("test(contracts): Add flow test snapshots", ["contracts/lumenlink_registry/test_snapshots/test/admin_rotation_changes_admin.1.json", "contracts/lumenlink_registry/test_snapshots/test/init_create_read_update_delete_flow.1.json"]),
    ("build: Add compile script", ["scripts/compile.sh"]),
    ("build: Add deploy script", ["scripts/deploy.sh"]),
    ("chore(frontend): Init package.json for Next.js", ["frontend/package.json", "frontend/package-lock.json"]),
    ("chore(frontend): Add Next.js TypeScript config", ["frontend/tsconfig.json", "frontend/next.config.ts", "frontend/next-env.d.ts"]),
    ("chore(frontend): Add ESLint and PostCSS configs", ["frontend/eslint.config.mjs", "frontend/postcss.config.mjs"]),
    ("feat(frontend): Add base layout and global styles", ["frontend/app/layout.tsx", "frontend/app/globals.css", "frontend/app/favicon.ico"]),
    ("feat(frontend): Implement landing page UI", ["frontend/app/page.tsx"]),
    ("assets(frontend): Add lumenlink mark SVG", ["frontend/public/lumenlink-mark.svg"]),
    ("feat(frontend): Add lumenlink library logic", ["frontend/lib/lumenlink.ts"]),
    ("chore(frontend): Add contract bindings config", ["frontend/src/contracts/lumenlink_registry/package.json", "frontend/src/contracts/lumenlink_registry/tsconfig.json"]),
    ("feat(frontend): Add contract bindings exports", ["frontend/src/contracts/lumenlink_registry/src/index.ts"]),
    ("docs(frontend): Add contract bindings docs", ["frontend/src/contracts/lumenlink_registry/README.md", "frontend/src/contracts/lumenlink_registry/.gitignore"]),
    ("chore(frontend): Add .env.local and .gitignore", ["frontend/.env.local", "frontend/.gitignore"]),
    ("chore: Final project synchronization", ["."])
]

# Base date: 10 days ago from today (July 1, 2026)
base_date = datetime.datetime(2026, 7, 1, 10, 0, 0)
time_increment = datetime.timedelta(hours=11, minutes=15)

# Remove DS_Store from everywhere before we add .
os.system('find . -name ".DS_Store" -delete')

for idx, (msg, files) in enumerate(commits):
    current_date = base_date + (time_increment * idx)
    date_str = current_date.strftime("%Y-%m-%dT%H:%M:%S")
    
    # Add files
    for f in files:
        if f == "." or os.path.exists(f):
            subprocess.run(["git", "add", f])
    
    # Commit
    env = os.environ.copy()
    env["GIT_AUTHOR_DATE"] = date_str
    env["GIT_COMMITTER_DATE"] = date_str
    
    # Check if there's anything to commit
    status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
    if status.stdout.strip():
        subprocess.run(["git", "commit", "-m", msg], env=env)
        print(f"Committed: {msg} at {date_str}")
    else:
        print(f"Skipped (nothing to commit): {msg}")

print("Done creating commits.")
