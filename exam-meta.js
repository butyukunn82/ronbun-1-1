(() => {
  if (!window.ST_GLOSSARY) return;

  const A2_FAMILY_KEYS = ["戦略","企画","調達","業務改革","顧客・業務","プロジェクト","サービス","継続","マネジメント"];
  const A1_FAMILY_KEYS = ["セキュリティ","ネットワーク","データベース","クラウド","システム","データ・AI","マネジメント"];

  const B_TERMS = new Set([
    "KPI","KGI","CSF","ROI","TCO","NPV","IRR","BSC","SWOT","PEST","3C","5 Forces","VRIO",
    "RFI","RFP","RFQ","PoC","PoV","Fit & Gap","EA","SOA",
    "BPR","BPM","ERP","CRM","SCM","BI","DWH","API","SaaS",
    "WBS","EVM","CPI","SPI","Critical Path","Agile","Scrum",
    "SLA","BCP","BIA","RTO","RPO","DR","DRP",
    "ISMS","Zero Trust","IAM","MFA","SSO","SIEM","SOC",
    "AI","LLM","RAG","Generative AI","PDCA","OODA","SMART"
  ]);

  const A2_EXTRA = new Set([
    "SaaS","PaaS","IaaS","API","AI","Machine Learning","Deep Learning","LLM","RAG","Generative AI",
    "ISMS","Zero Trust","IAM","MFA","SSO","SIEM","SOC","BCP","BIA","RTO","RPO","DR","DRP"
  ]);

  const A1_EXTRA = new Set([
    "KPI","ROI","TCO","RFI","RFP","PoC","SLA","BCP","RTO","RPO","API","SaaS","PaaS","IaaS",
    "ISMS","MFA","SSO","AI","Machine Learning","Deep Learning","LLM","RAG","Generative AI","PDCA"
  ]);

  const S_TERMS = new Set([
    "KPI","KGI","CSF","ROI","TCO","SWOT","RFI","RFP","PoC","BPR","ERP","CRM","SCM","API","SaaS",
    "WBS","EVM","Agile","SLA","BCP","BIA","RTO","RPO","ISMS","Zero Trust","AI","LLM","RAG","Generative AI","PDCA"
  ]);

  const includesAny = (text, keys) => keys.some(k => String(text || "").includes(k));

  function classify(g) {
    const stages = [];
    const family = g.family || "";
    const term = g.term || "";

    if (includesAny(family, A1_FAMILY_KEYS) || A1_EXTRA.has(term)) stages.push("A1");
    if (includesAny(family, A2_FAMILY_KEYS) || A2_EXTRA.has(term)) stages.push("A2");
    if (B_TERMS.has(term)) stages.push("B");
    if (!stages.length) stages.push("A1");

    const unique = [...new Set(stages)];
    const priority = S_TERMS.has(term) ? "S" : (unique.includes("A2") || unique.includes("B") ? "A" : "B");
    const goal = unique.includes("B")
      ? "意味を覚えるだけでなく、課題→判断→施策→効果・KPIの文脈で自分の答案に使える状態まで。"
      : unique.includes("A2")
        ? "定義に加えて、似た用語との違い・適用場面・選定理由を説明できる状態まで。"
        : "問題文で見た瞬間に意味と対比語が浮かび、選択肢を切れる状態まで。";

    return { stages: unique, priority, goal };
  }

  window.ST_GLOSSARY.forEach(g => {
    const m = classify(g);
    g.examStages = m.stages;
    g.priority = m.priority;
    g.learningGoal = m.goal;
  });

  const stageLabel = { A1: "A-1 基礎", A2: "A-2 重点", B: "B-1/B-2 答案" };
  const priorityLabel = { S: "最優先", A: "重要", B: "補強" };

  function ensureStyle() {
    if (document.getElementById("examMetaStyle")) return;
    const s = document.createElement("style");
    s.id = "examMetaStyle";
    s.textContent = `
      .exam-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
      .exam-badge,.priority-badge{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900;line-height:1}
      .exam-badge.a1{background:#f1f5f9;color:#334155}.exam-badge.a2{background:#eef2ff;color:#4338ca}.exam-badge.b{background:#ecfdf5;color:#047857}
      .priority-badge.s{background:#fff7ed;color:#c2410c}.priority-badge.a{background:#fffbeb;color:#a16207}.priority-badge.b{background:#f8fafc;color:#64748b}
      .vocab-exam-position{margin:16px 0;padding:15px;border:1px solid #dbeafe;background:#f8fbff;border-radius:14px}
      .vocab-exam-position h4{margin:0 0 9px;font-size:14px}.vocab-exam-position p{margin:9px 0 0;color:#334155;font-size:13px;line-height:1.7}
      .exam-filter-row{display:flex;gap:7px;overflow-x:auto;padding:8px 0 1px;scrollbar-width:none}.exam-filter-row::-webkit-scrollbar{display:none}
      .exam-filter-chip{border:1px solid #dbe2ea;background:#fff;color:#475569;border-radius:999px;padding:7px 10px;white-space:nowrap;font-size:11px;font-weight:900}
      .exam-filter-chip.active{background:#1e293b;color:#fff;border-color:#1e293b}
      .exam-filter-label{font-size:10px;font-weight:900;color:#64748b;display:flex;align-items:center;padding-right:2px;white-space:nowrap}
    `;
    document.head.appendChild(s);
  }

  function decorateCards() {
    const list = document.getElementById("vocabList");
    if (!list) return;
    const data = new Map(window.ST_GLOSSARY.map(g => [g.term, g]));

    list.querySelectorAll(".vocab-card").forEach(card => {
      if (card.dataset.examDecorated === "1") return;
      const g = data.get(card.dataset.term);
      if (!g) return;
      card.dataset.examDecorated = "1";
      card.dataset.examStages = (g.examStages || []).join(",");
      card.dataset.priority = g.priority || "B";

      const badgeHtml = [
        ...(g.examStages || []).map(x => `<span class="exam-badge ${x.toLowerCase()}">${stageLabel[x]}</span>`),
        `<span class="priority-badge ${(g.priority || "B").toLowerCase()}">${priorityLabel[g.priority || "B"]}</span>`
      ].join("");

      const titleRow = card.querySelector(".vocab-title-row");
      if (titleRow) titleRow.insertAdjacentHTML("afterend", `<span class="exam-badges">${badgeHtml}</span>`);

      const nameBlock = card.querySelector(".vocab-name-block");
      if (nameBlock) nameBlock.insertAdjacentHTML("afterend", `
        <section class="vocab-exam-position">
          <h4>📍 試験での位置づけ</h4>
          <div class="exam-badges">${badgeHtml}</div>
          <p><b>ここまでできればOK：</b>${g.learningGoal || ""}</p>
        </section>`);
    });
  }

  let activeExam = "all";
  function normalize(s) { return String(s || "").toLowerCase().replace(/\s+/g, ""); }

  function applyCombinedFilter() {
    const list = document.getElementById("vocabList");
    const search = document.getElementById("vocabSearch");
    const count = document.getElementById("vocabResultCount");
    if (!list || !search || !count) return;

    const q = normalize(search.value);
    const familyBtn = document.querySelector("#vocabFamilyFilter .vocab-family-chip.active");
    const activeFamily = familyBtn ? familyBtn.dataset.family : "すべて";
    const data = new Map(window.ST_GLOSSARY.map(g => [g.term, g]));
    let visible = 0;

    list.querySelectorAll(".vocab-card").forEach(card => {
      const g = data.get(card.dataset.term);
      if (!g) return;
      const hay = normalize([
        g.term,g.reading,g.english,g.englishReading,g.family,g.oneLine,g.meaning,g.memoryPoint,g.examPoint,
        (g.topics || []).join(" "),(g.relatedWords || []).join(" "),(g.examStages || []).join(" "),priorityLabel[g.priority || "B"]
      ].join(" "));
      const okFamily = activeFamily === "すべて" || g.family === activeFamily;
      const okQuery = !q || hay.includes(q);
      const okExam = activeExam === "all"
        || (activeExam === "S" && g.priority === "S")
        || (g.examStages || []).includes(activeExam);
      const ok = okFamily && okQuery && okExam;
      card.style.display = ok ? "" : "none";
      if (ok) visible++;
    });

    count.textContent = `${visible}/${window.ST_GLOSSARY.length}語`;
    let empty = list.querySelector(".vocab-empty");
    if (!visible) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "vocab-empty";
        empty.textContent = "該当する用語がありません。";
        list.appendChild(empty);
      }
    } else if (empty) empty.remove();
  }

  function setupExamFilter() {
    const tools = document.getElementById("vocabTools");
    if (!tools || document.getElementById("examFilterRow")) return;
    const row = document.createElement("div");
    row.id = "examFilterRow";
    row.className = "exam-filter-row";
    row.innerHTML = `
      <span class="exam-filter-label">試験：</span>
      <button type="button" class="exam-filter-chip active" data-exam="all">すべて</button>
      <button type="button" class="exam-filter-chip" data-exam="A1">A-1 基礎</button>
      <button type="button" class="exam-filter-chip" data-exam="A2">A-2 重点</button>
      <button type="button" class="exam-filter-chip" data-exam="B">B答案</button>
      <button type="button" class="exam-filter-chip" data-exam="S">最優先</button>`;
    tools.appendChild(row);

    row.addEventListener("click", e => {
      const b = e.target.closest("[data-exam]");
      if (!b) return;
      activeExam = b.dataset.exam;
      row.querySelectorAll(".exam-filter-chip").forEach(x => x.classList.toggle("active", x === b));
      applyCombinedFilter();
    });

    const search = document.getElementById("vocabSearch");
    const family = document.getElementById("vocabFamilyFilter");
    if (search) search.addEventListener("input", () => setTimeout(applyCombinedFilter, 0));
    if (family) family.addEventListener("click", () => setTimeout(applyCombinedFilter, 0));
  }

  function setup() {
    ensureStyle();
    setupExamFilter();
    decorateCards();
    const list = document.getElementById("vocabList");
    if (list) {
      new MutationObserver(() => {
        decorateCards();
        setTimeout(applyCombinedFilter, 0);
      }).observe(list, { childList: true, subtree: true });
    }
    setTimeout(() => { setupExamFilter(); applyCombinedFilter(); }, 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();