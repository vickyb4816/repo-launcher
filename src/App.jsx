import { useState } from "react";

const FILE_GROUPS = [
  { label: "Docker", icon: "◈", files: ["dockerfile", "docker-compose.yml", "compose.yml"] },
  { label: "Node.js", icon: "⬡", files: ["package.json", "pnpm-lock.yaml", "yarn.lock"] },
  { label: "Python", icon: "⌘", files: ["requirements.txt", "pyproject.toml", "setup.py", "pipfile"] },
  { label: "Android", icon: "▣", files: ["build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts"] },
  { label: "Java", icon: "☕", files: ["pom.xml"] },
  { label: "Go", icon: "◌", files: ["go.mod"] },
  { label: "Rust", icon: "⚙", files: ["cargo.toml"] },
];

function parseGithubUrl(value) {
  const match = value.trim().match(/^(?:https?:\/\/)?github\.com\/([^/]+)\/([^/#?]+)\/?(?:#.*)?$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

function getDetectedStacks(files) {
  const names = files.map((file) => file.name.toLowerCase());
  return FILE_GROUPS.filter((group) => group.files.some((file) => names.includes(file)));
}

function getRecommendation(stacks) {
  const labels = stacks.map((item) => item.label);
  if (labels.includes("Android")) {
    return {
      title: "Android build pipeline",
      detail: "APK build can run in a temporary Android runner. The first build will need a larger paid runner than this dashboard.",
      action: "Prepare APK job",
    };
  }
  if (labels.includes("Docker")) {
    return {
      title: "Container deployment",
      detail: "This repo already includes Docker files. A runner can build it in an isolated container and expose a temporary preview URL.",
      action: "Prepare container",
    };
  }
  if (labels.includes("Node.js")) {
    return {
      title: "Web app preview",
      detail: "A Node.js runner can install dependencies, run the build, and detect the port for a live preview.",
      action: "Prepare web preview",
    };
  }
  if (labels.includes("Python")) {
    return {
      title: "Python sandbox",
      detail: "A restricted Python runner can install declared dependencies and show a safe command or web preview.",
      action: "Prepare Python job",
    };
  }
  return {
    title: "Manual recipe needed",
    detail: "No common project manifest was found at the root. The next version will inspect subfolders and README instructions.",
    action: "View files",
  };
}

export default function App() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  async function analyze(event) {
    event.preventDefault();
    const parsed = parseGithubUrl(url);
    if (!parsed) {
      setError("Please paste a complete GitHub repository link.");
      return;
    }

    setStatus("loading");
    setError("");
    setReport(null);

    try {
      const base = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
      const [repoResponse, contentsResponse] = await Promise.all([
        fetch(base, { headers: { Accept: "application/vnd.github+json" } }),
        fetch(`${base}/contents`, { headers: { Accept: "application/vnd.github+json" } }),
      ]);

      if (repoResponse.status === 404) throw new Error("Repository not found. For a private repository, GitHub login will be needed.");
      if (!repoResponse.ok) throw new Error("GitHub could not read this repository right now.");
      if (!contentsResponse.ok) throw new Error("Repository found, but its root files could not be read.");

      const repository = await repoResponse.json();
      const files = await contentsResponse.json();
      const stacks = getDetectedStacks(Array.isArray(files) ? files : []);
      setReport({
        owner: parsed.owner,
        repo: parsed.repo,
        repository,
        files: Array.isArray(files) ? files : [],
        stacks,
        recommendation: getRecommendation(stacks),
      });
      setStatus("ready");
    } catch (requestError) {
      setError(requestError.message || "Something went wrong while reading GitHub.");
      setStatus("idle");
    }
  }

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="/"><span className="brand-mark">↗</span> Repo Launcher</a>
        <span className="beta">PRIVATE BETA</span>
      </nav>

      <section className="hero">
        <div className="eyebrow">FROM REPOSITORY TO TESTABLE PREVIEW</div>
        <h1>Paste a repo.<br /><em>Understand what it needs.</em></h1>
        <p className="lead">Start with a public GitHub link. Repo Launcher reads the setup files and creates a safe launch plan—before anything runs.</p>

        <form className="url-form" onSubmit={analyze}>
          <label htmlFor="repo-url">GitHub repository URL</label>
          <div className="url-row">
            <input
              id="repo-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://github.com/owner/repository"
              autoComplete="url"
            />
            <button disabled={status === "loading"}>{status === "loading" ? "Scanning…" : "Analyze repo"} <span>→</span></button>
          </div>
          {error && <p className="error">{error}</p>}
          <p className="hint">Works with public GitHub repositories. Private-repo login is coming next.</p>
        </form>
      </section>

      {status === "loading" && (
        <section className="scan-card">
          <div className="spinner" />
          <div><strong>Reading repository files</strong><p>Checking project type, manifests, and deployment clues.</p></div>
        </section>
      )}

      {report && (
        <section className="report">
          <div className="report-heading">
            <div>
              <div className="eyebrow">ANALYSIS COMPLETE</div>
              <h2>{report.owner}<span>/</span>{report.repo}</h2>
            </div>
            <a className="github-link" href={report.repository.html_url} target="_blank" rel="noreferrer">Open on GitHub ↗</a>
          </div>

          <div className="stats">
            <div><span>Visibility</span><strong>{report.repository.private ? "Private" : "Public"}</strong></div>
            <div><span>Language</span><strong>{report.repository.language || "Not detected"}</strong></div>
            <div><span>Root files</span><strong>{report.files.length}</strong></div>
          </div>

          <div className="grid">
            <article className="card">
              <p className="card-label">Detected stack</p>
              {report.stacks.length ? (
                <div className="chips">{report.stacks.map((stack) => <span className="chip" key={stack.label}>{stack.icon} {stack.label}</span>)}</div>
              ) : <p className="muted">No common build manifest at the repository root.</p>}
              <p className="card-label files-label">Files read</p>
              <div className="file-list">{report.files.slice(0, 8).map((file) => <span key={file.path}>{file.type === "dir" ? "□" : "—"} {file.name}</span>)}</div>
            </article>

            <article className="card launch-card">
              <p className="card-label">Suggested next job</p>
              <h3>{report.recommendation.title}</h3>
              <p>{report.recommendation.detail}</p>
              <button className="secondary" type="button" onClick={() => alert("Runner setup is the next build step. This first version only analyzes repositories safely.")}>{report.recommendation.action} →</button>
            </article>
          </div>
        </section>
      )}

      {!report && status !== "loading" && (
        <section className="how">
          <div><b>01</b><h3>Read</h3><p>Find Docker, Node, Python, Android, and other project files.</p></div>
          <div><b>02</b><h3>Plan</h3><p>Choose the right isolated runner and required settings.</p></div>
          <div><b>03</b><h3>Launch</h3><p>Later: build an APK or create a temporary live preview.</p></div>
        </section>
      )}
    </main>
  );
}
