"""Idempotent seed for Phase 2 catalog: skills, careers, questions, trainings.

Run: python /app/backend/seed_phase2.py

All rows are marked as SkillAlign-managed sample content and are safe to
re-seed; existing documents are upserted by id.
"""

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

DOMAIN = 'IT_TECH'

SKILLS = [
    ('skill-python', 'Python', 'General-purpose programming used for scripting, analytics, and ML.'),
    ('skill-javascript', 'JavaScript', 'Programming language of the web browser and Node.js.'),
    ('skill-sql', 'SQL', 'Query language for relational databases and analytics.'),
    ('skill-html-css', 'HTML & CSS', 'Markup and styling for building web interfaces.'),
    ('skill-react', 'React', 'Component-based library for building interactive UIs.'),
    ('skill-node', 'Node.js', 'JavaScript runtime for building server-side APIs.'),
    ('skill-git', 'Git & Version Control', 'Distributed version control fundamentals.'),
    ('skill-dsa', 'Data Structures', 'Core data structures and algorithmic thinking.'),
    ('skill-cloud', 'Cloud Fundamentals', 'Core cloud services, storage, compute, and IAM basics.'),
    ('skill-ml', 'Machine Learning Basics', 'Supervised learning, evaluation, and common algorithms.'),
]

CAREERS = [
    {
        'id': 'career-fullstack',
        'name': 'Full Stack Developer',
        'description': 'Builds both the interface and the backing services of web products.',
        'required_skills': [
            ('skill-javascript', 'INTERMEDIATE'),
            ('skill-react', 'INTERMEDIATE'),
            ('skill-node', 'INTERMEDIATE'),
            ('skill-sql', 'BEGINNER'),
            ('skill-html-css', 'INTERMEDIATE'),
            ('skill-git', 'BEGINNER'),
        ],
    },
    {
        'id': 'career-data-analyst',
        'name': 'Data Analyst',
        'description': 'Turns raw data into decisions with SQL, Python, and clear reporting.',
        'required_skills': [
            ('skill-python', 'INTERMEDIATE'),
            ('skill-sql', 'INTERMEDIATE'),
            ('skill-ml', 'BEGINNER'),
            ('skill-dsa', 'BEGINNER'),
        ],
    },
    {
        'id': 'career-cloud',
        'name': 'Cloud Engineer',
        'description': 'Automates and operates workloads on cloud platforms.',
        'required_skills': [
            ('skill-python', 'BEGINNER'),
            ('skill-cloud', 'INTERMEDIATE'),
            ('skill-git', 'INTERMEDIATE'),
            ('skill-node', 'BEGINNER'),
        ],
    },
    {
        'id': 'career-frontend',
        'name': 'Frontend Engineer',
        'description': 'Crafts fast, accessible, delightful web interfaces.',
        'required_skills': [
            ('skill-javascript', 'INTERMEDIATE'),
            ('skill-react', 'ADVANCED'),
            ('skill-html-css', 'INTERMEDIATE'),
            ('skill-git', 'BEGINNER'),
        ],
    },
]

# Question bank: exactly 5 per skill (2 BEGINNER, 2 INTERMEDIATE, 1 ADVANCED).
# choices are 0-indexed; correct_index points to the correct choice.
QUESTIONS = [
    # ---------- Python
    ('q-py-1', 'skill-python', 'BEGINNER', "Which keyword defines a function in Python?", ["func", "def", "function", "lambda"], 1,
     "`def` starts a function definition. `lambda` creates a one-line anonymous function."),
    ('q-py-2', 'skill-python', 'BEGINNER', "What is the output of `len(\"skill\")`?", ["4", "5", "6", "Error"], 1,
     "`len` returns the number of characters; 'skill' has 5."),
    ('q-py-3', 'skill-python', 'INTERMEDIATE', "Which structure preserves insertion order and allows duplicates?", ["set", "dict (Py3.7+)", "list", "frozenset"], 2,
     "A list preserves order and allows duplicates. dict also preserves insertion since 3.7, but keys are unique."),
    ('q-py-4', 'skill-python', 'INTERMEDIATE', "What does `[x*x for x in range(3)]` produce?", ["[0,1,4]", "[1,4,9]", "[0,1,2]", "[1,2,3]"], 0,
     "range(3) yields 0,1,2 → squares are 0,1,4."),
    ('q-py-5', 'skill-python', 'ADVANCED', "Which statement about the GIL is correct?", ["It speeds up CPU-bound threads", "It allows one thread to execute Python bytecode at a time", "It only affects async code", "It is removed in CPython 3.10"], 1,
     "The Global Interpreter Lock permits one Python bytecode-executing thread at a time in CPython."),

    # ---------- JavaScript
    ('q-js-1', 'skill-javascript', 'BEGINNER', "Which keyword creates a block-scoped constant?", ["var", "let", "const", "static"], 2,
     "`const` is block-scoped and cannot be reassigned."),
    ('q-js-2', 'skill-javascript', 'BEGINNER', "`typeof null` returns:", ["'null'", "'object'", "'undefined'", "'number'"], 1,
     "A long-standing quirk: `typeof null === 'object'`."),
    ('q-js-3', 'skill-javascript', 'INTERMEDIATE', "Which array method returns a new array with each item transformed?", ["forEach", "map", "reduce", "filter"], 1,
     "`map` returns a new transformed array; forEach returns undefined."),
    ('q-js-4', 'skill-javascript', 'INTERMEDIATE', "What resolves an unhandled Promise rejection warning?", ["`.finally` handler", "`.catch` or try/catch with await", "Wrapping in setTimeout", "Nothing, it is cosmetic"], 1,
     "Attach a `.catch` (or await inside try/catch) to handle rejections."),
    ('q-js-5', 'skill-javascript', 'ADVANCED', "Which best explains the JS event loop microtask queue?", ["Runs before rendering, after each task", "Runs once per second", "Is a synonym for setTimeout 0", "Runs only in Node.js"], 0,
     "Microtasks (e.g. Promise `then`) drain between macrotasks/render steps."),

    # ---------- SQL
    ('q-sql-1', 'skill-sql', 'BEGINNER', "Which clause filters rows before grouping?", ["HAVING", "WHERE", "ORDER BY", "GROUP BY"], 1,
     "WHERE filters rows; HAVING filters groups after aggregation."),
    ('q-sql-2', 'skill-sql', 'BEGINNER', "Which command adds a new row?", ["ADD ROW", "PUSH", "INSERT INTO", "APPEND"], 2,
     "`INSERT INTO ... VALUES (...)` inserts rows."),
    ('q-sql-3', 'skill-sql', 'INTERMEDIATE', "Which join keeps unmatched rows from the left table?", ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "CROSS JOIN"], 1,
     "LEFT JOIN keeps all left rows, filling right side with NULL where no match."),
    ('q-sql-4', 'skill-sql', 'INTERMEDIATE', "Which aggregate ignores NULLs?", ["COUNT(*)", "COUNT(column)", "SUM(*)", "AVG(*)"], 1,
     "COUNT(column) counts non-NULL values; COUNT(*) counts every row."),
    ('q-sql-5', 'skill-sql', 'ADVANCED', "A window function differs from GROUP BY because it:", ["Cannot be used with ORDER BY", "Collapses rows into groups", "Returns a value per row while looking across a window", "Requires an index"], 2,
     "Window functions return a value for each row, computed over a defined window (PARTITION BY / ORDER BY)."),

    # ---------- HTML & CSS
    ('q-hc-1', 'skill-html-css', 'BEGINNER', "Which tag defines the largest heading?", ["<h6>", "<head>", "<h1>", "<header>"], 2,
     "`<h1>` is the top-level heading; `<h6>` is the smallest."),
    ('q-hc-2', 'skill-html-css', 'BEGINNER', "Which CSS property sets text color?", ["font-color", "text-color", "color", "foreground"], 2,
     "The property is simply `color`."),
    ('q-hc-3', 'skill-html-css', 'INTERMEDIATE', "Which layout tool is best for a one-dimensional bar?", ["Grid", "Flexbox", "Float", "Table"], 1,
     "Flexbox is optimised for one-dimensional layouts (row or column)."),
    ('q-hc-4', 'skill-html-css', 'INTERMEDIATE', "Which selector has the highest specificity?", [".btn", "#submit", "button", "button.btn"], 1,
     "An id (#submit) beats class or element selectors."),
    ('q-hc-5', 'skill-html-css', 'ADVANCED', "`display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));` produces:", ["Fixed 3 columns", "A responsive column grid that fills available space", "A single column always", "Stacked flex items"], 1,
     "auto-fit + minmax builds a responsive grid whose columns fit the container width."),

    # ---------- React
    ('q-rc-1', 'skill-react', 'BEGINNER', "React components must return:", ["A string", "One React element (or fragment)", "Two elements at root", "Nothing"], 1,
     "A component returns a single element; use <>...</> to return siblings."),
    ('q-rc-2', 'skill-react', 'BEGINNER', "The hook that stores local component state is:", ["useEffect", "useMemo", "useState", "useRef"], 2,
     "`useState` returns [value, setter] for local state."),
    ('q-rc-3', 'skill-react', 'INTERMEDIATE', "When does `useEffect(fn, [])` run?", ["On every render", "Only on mount and cleanup on unmount", "Never", "Only when deps change"], 1,
     "Empty deps means run once on mount; cleanup runs on unmount."),
    ('q-rc-4', 'skill-react', 'INTERMEDIATE', "The `key` prop on list items should be:", ["The array index always", "A stable unique id per item", "The item value", "Not needed"], 1,
     "A stable unique id lets React reconcile lists correctly across updates."),
    ('q-rc-5', 'skill-react', 'ADVANCED', "Which pattern avoids re-creating a callback on every render?", ["useCallback with correct deps", "useEffect on click", "Anonymous inline function", "Class components"], 0,
     "`useCallback` memoises a function reference across renders when deps are unchanged."),

    # ---------- Node.js
    ('q-nd-1', 'skill-node', 'BEGINNER', "Which command installs a dependency to package.json?", ["npm run", "npm install <pkg>", "node <pkg>", "npm exec"], 1,
     "`npm install <pkg>` adds and installs the package."),
    ('q-nd-2', 'skill-node', 'BEGINNER', "The Node.js runtime is powered by:", ["JVM", "V8", "SpiderMonkey", "Chakra"], 1,
     "Node embeds Chrome's V8 JavaScript engine."),
    ('q-nd-3', 'skill-node', 'INTERMEDIATE', "Which is a non-blocking file read?", ["fs.readFileSync", "fs.readFile", "readFileBlocking", "sync.file"], 1,
     "`fs.readFile` is asynchronous; `fs.readFileSync` blocks the event loop."),
    ('q-nd-4', 'skill-node', 'INTERMEDIATE', "Environment variables are typically read via:", ["process.env", "os.env", "global.env", "env.get"], 0,
     "`process.env.X` gives access to environment variables in Node."),
    ('q-nd-5', 'skill-node', 'ADVANCED', "Which best describes worker_threads?", ["Alternative to child_process for CPU-heavy work with shared memory", "A polyfill for setTimeout", "Deprecated in Node 20", "Only for HTTP scaling"], 0,
     "worker_threads runs JS in parallel threads with SharedArrayBuffer/MessagePort — good for CPU-bound work."),

    # ---------- Git
    ('q-gt-1', 'skill-git', 'BEGINNER', "Which command downloads a repository for the first time?", ["git pull", "git init", "git clone <url>", "git fetch"], 2,
     "`git clone` creates a working copy of a remote repository."),
    ('q-gt-2', 'skill-git', 'BEGINNER', "Which command stages a file for commit?", ["git commit", "git add <file>", "git push", "git stash"], 1,
     "`git add` stages changes to the index."),
    ('q-gt-3', 'skill-git', 'INTERMEDIATE', "Which command creates a new branch and switches to it?", ["git branch new", "git switch new", "git checkout -b new", "git merge new"], 2,
     "`git checkout -b new` (or `git switch -c new`) does both in one step."),
    ('q-gt-4', 'skill-git', 'INTERMEDIATE', "A merge conflict is resolved by:", ["Reverting the branch", "Editing the file, staging, then committing", "Running git push --force", "Deleting the repo"], 1,
     "Manually resolve markers in the file, `git add` it, then `git commit`."),
    ('q-gt-5', 'skill-git', 'ADVANCED', "`git rebase main` on a feature branch:", ["Merges main into feature", "Reapplies feature commits on top of main's tip", "Deletes commits", "Renames the branch"], 1,
     "Rebase replays your commits on top of the target branch, producing a linear history."),

    # ---------- Data Structures
    ('q-ds-1', 'skill-dsa', 'BEGINNER', "Which structure follows Last-In-First-Out order?", ["Queue", "Stack", "Heap", "Set"], 1,
     "A stack pushes and pops from the same end — LIFO."),
    ('q-ds-2', 'skill-dsa', 'BEGINNER', "Which structure gives O(1) average lookup by key?", ["Linked list", "Sorted array", "Hash map", "Tree"], 2,
     "Hash maps offer average-case constant-time lookup."),
    ('q-ds-3', 'skill-dsa', 'INTERMEDIATE', "Big-O of binary search on a sorted array?", ["O(n)", "O(log n)", "O(n log n)", "O(1)"], 1,
     "Binary search halves the search space each step — logarithmic."),
    ('q-ds-4', 'skill-dsa', 'INTERMEDIATE', "A queue processes elements in what order?", ["LIFO", "FIFO", "Random", "Depth-first"], 1,
     "Queues serve the earliest inserted element first — FIFO."),
    ('q-ds-5', 'skill-dsa', 'ADVANCED', "A min-heap's root is always:", ["The largest value", "The smallest value", "The last inserted", "Undefined"], 1,
     "In a min-heap, each parent ≤ its children, so the root is the minimum."),

    # ---------- Cloud
    ('q-cl-1', 'skill-cloud', 'BEGINNER', "IaaS gives you control of:", ["Only apps", "Virtual machines and networking", "Nothing", "Only databases"], 1,
     "Infrastructure as a Service exposes compute, storage, and networking primitives."),
    ('q-cl-2', 'skill-cloud', 'BEGINNER', "S3 (or equivalent) is best for:", ["Relational transactions", "Object storage of files/blobs", "Serving DNS", "Running containers"], 1,
     "Object storage services store files/blobs with high durability and HTTP access."),
    ('q-cl-3', 'skill-cloud', 'INTERMEDIATE', "IAM roles are used to:", ["Store secrets", "Grant time-bound identities to workloads without long-lived keys", "Encrypt disks", "Run VMs"], 1,
     "Roles let services or users assume identities with least-privilege permissions."),
    ('q-cl-4', 'skill-cloud', 'INTERMEDIATE', "An autoscaling group primarily adjusts:", ["CPU frequency", "The number of running instances based on load", "Disk size", "Network zones"], 1,
     "Autoscaling adds/removes instances to match demand while respecting min/max bounds."),
    ('q-cl-5', 'skill-cloud', 'ADVANCED', "Which pairing best implements least privilege for a Lambda calling S3?", ["Wildcard * policy", "Role with s3:GetObject on the specific bucket/prefix", "Root credentials", "Public bucket"], 1,
     "Scope the role to only the specific action and resource ARN needed."),

    # ---------- ML
    ('q-ml-1', 'skill-ml', 'BEGINNER', "Supervised learning requires:", ["Only unlabeled data", "Labeled examples of inputs and outputs", "Only images", "A GPU"], 1,
     "Supervised learning trains on labelled input→output pairs."),
    ('q-ml-2', 'skill-ml', 'BEGINNER', "Which is a classification task?", ["Predicting house price", "Predicting spam vs not-spam", "Grouping customers", "Compressing an image"], 1,
     "Predicting one of a finite set of labels is classification."),
    ('q-ml-3', 'skill-ml', 'INTERMEDIATE', "Overfitting means the model:", ["Underperforms on training data", "Memorises training data but generalises poorly", "Is too small", "Runs too slowly"], 1,
     "Overfitting = low training error but high validation/test error."),
    ('q-ml-4', 'skill-ml', 'INTERMEDIATE', "Which metric handles class imbalance better than accuracy?", ["MSE", "F1-score", "R^2", "Perplexity"], 1,
     "F1 balances precision and recall, useful when one class is rare."),
    ('q-ml-5', 'skill-ml', 'ADVANCED', "Regularisation (e.g. L2) primarily helps by:", ["Speeding up training", "Penalising large weights to reduce variance", "Adding more layers", "Changing the optimiser"], 1,
     "L2 shrinks weights, reducing variance/overfitting."),
]

TRAININGS = [
    {
        'id': 'trg-python-101',
        'title': 'Python Fundamentals (SkillAlign DEMO)',
        'description': 'Hands-on introduction to Python syntax, data structures, and problem-solving.',
        'skills': [{'skill_id': 'skill-python', 'target_level': 'INTERMEDIATE'}],
        'duration_hours': 30, 'mode': 'ONLINE', 'seats': 120, 'provider': 'SkillAlign Sample Academy',
    },
    {
        'id': 'trg-data-analytics',
        'title': 'Data Analytics with Python & SQL (DEMO)',
        'description': 'Wrangle data with pandas, query with SQL, and build simple dashboards.',
        'skills': [
            {'skill_id': 'skill-python', 'target_level': 'INTERMEDIATE'},
            {'skill_id': 'skill-sql', 'target_level': 'INTERMEDIATE'},
            {'skill_id': 'skill-ml', 'target_level': 'BEGINNER'},
        ],
        'duration_hours': 60, 'mode': 'HYBRID', 'seats': 60, 'provider': 'SkillAlign Sample Academy',
    },
    {
        'id': 'trg-js-essentials',
        'title': 'JavaScript Essentials (DEMO)',
        'description': 'Modern JavaScript, async/await, DOM, and the fetch API.',
        'skills': [{'skill_id': 'skill-javascript', 'target_level': 'INTERMEDIATE'}],
        'duration_hours': 40, 'mode': 'ONLINE', 'seats': 100, 'provider': 'SkillAlign Sample Academy',
    },
    {
        'id': 'trg-react-mastery',
        'title': 'React Development Bootcamp (DEMO)',
        'description': 'Component architecture, hooks, state management, and testing.',
        'skills': [
            {'skill_id': 'skill-react', 'target_level': 'ADVANCED'},
            {'skill_id': 'skill-javascript', 'target_level': 'INTERMEDIATE'},
        ],
        'duration_hours': 55, 'mode': 'ONLINE', 'seats': 80, 'provider': 'SkillAlign Sample Academy',
    },
    {
        'id': 'trg-fullstack-node',
        'title': 'Full Stack with Node.js (DEMO)',
        'description': 'Express APIs, authentication, and connecting to databases.',
        'skills': [
            {'skill_id': 'skill-node', 'target_level': 'INTERMEDIATE'},
            {'skill_id': 'skill-javascript', 'target_level': 'INTERMEDIATE'},
            {'skill_id': 'skill-sql', 'target_level': 'BEGINNER'},
        ],
        'duration_hours': 70, 'mode': 'HYBRID', 'seats': 45, 'provider': 'SkillAlign Sample Academy',
    },
    {
        'id': 'trg-cloud-foundations',
        'title': 'Cloud Foundations (DEMO)',
        'description': 'Compute, storage, networking, and IAM basics on a major cloud provider.',
        'skills': [
            {'skill_id': 'skill-cloud', 'target_level': 'INTERMEDIATE'},
            {'skill_id': 'skill-git', 'target_level': 'BEGINNER'},
        ],
        'duration_hours': 45, 'mode': 'ONLINE', 'seats': 90, 'provider': 'SkillAlign Sample Academy',
    },
    {
        'id': 'trg-sql-analytics',
        'title': 'SQL for Analytics (DEMO)',
        'description': 'Joins, aggregations, and window functions with real datasets.',
        'skills': [{'skill_id': 'skill-sql', 'target_level': 'INTERMEDIATE'}],
        'duration_hours': 25, 'mode': 'ONLINE', 'seats': 150, 'provider': 'SkillAlign Sample Academy',
    },
    {
        'id': 'trg-frontend-web',
        'title': 'Frontend Web Design (DEMO)',
        'description': 'Modern HTML, CSS Grid/Flex, and responsive design.',
        'skills': [
            {'skill_id': 'skill-html-css', 'target_level': 'INTERMEDIATE'},
            {'skill_id': 'skill-git', 'target_level': 'BEGINNER'},
        ],
        'duration_hours': 30, 'mode': 'ONLINE', 'seats': 110, 'provider': 'SkillAlign Sample Academy',
    },
]


async def upsert(collection, docs, key='id'):
    for doc in docs:
        await db[collection].update_one({key: doc[key]}, {'$set': doc}, upsert=True)


async def main():
    skills = [{'id': sid, 'name': name, 'description': desc, 'domain': DOMAIN} for sid, name, desc in SKILLS]
    await upsert('skills', skills)
    careers = [
        {
            'id': c['id'],
            'name': c['name'],
            'description': c['description'],
            'domain': DOMAIN,
            'required_skills': [{'skill_id': sid, 'required_level': lvl} for sid, lvl in c['required_skills']],
        }
        for c in CAREERS
    ]
    await upsert('careers', careers)
    questions = [
        {
            'id': qid, 'skill_id': sid, 'difficulty': diff, 'prompt': prompt,
            'choices': choices, 'correct_index': idx, 'explanation': expl,
        }
        for qid, sid, diff, prompt, choices, idx, expl in QUESTIONS
    ]
    await upsert('questions', questions)
    trainings = [{**t, 'is_sample': True} for t in TRAININGS]
    await upsert('trainings', trainings)

    print(f"Seeded: {len(skills)} skills, {len(careers)} careers, {len(questions)} questions, {len(trainings)} trainings")


if __name__ == '__main__':
    asyncio.run(main())
