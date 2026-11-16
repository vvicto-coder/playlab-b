/* B7 검색 — 입력과 동시에 결과(디바운스 200ms) + 돋보기 옆 필터 아이콘의 드롭다운 필터(이용 조건 · 유형 · 장르, 다중 선택).
   결과 카드에 바로 ▶ 재생(검색 → 재생 단축). 이용 조건은 B2와 같은 기준(멤버십 포함 / 패스 필요 / 개별구매). 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const root = document.getElementById("app");
  try { await App.load(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }

  const L = App.Logger, esc = App.esc, C = App.data.contents;
  const params = new URLSearchParams(location.search);
  let q = (params.get("q") || "").trim();

  const gcount = {};
  C.forEach((c) => c.genres.forEach((g) => (gcount[g] = (gcount[g] || 0) + 1)));
  const GENRES = Object.keys(gcount).sort((a, b) => gcount[b] - gcount[a]).slice(0, 16);
  const ACCESS = [["member", "멤버십 포함(무료)"], ["pass", "패스 필요"], ["paid", "개별구매"]];
  const TYPES = [["movie", "영화"], ["series", "시리즈"], ["anime", "애니"], ["docu", "다큐"], ["variety", "예능"]];
  const typeOf = (c) => (c.type === "영화" ? "movie" : c.type === "애니메이션" ? "anime" : c.type === "다큐멘터리" ? "docu" : c.type === "예능" ? "variety" : "series");
  const F = { genre: new Set(), access: new Set(), type: new Set() };
  if (params.get("g")) F.genre.add(params.get("g"));

  const match = (c) => !q || c.title.includes(q) || c.genres.some((g) => g.includes(q)) || c.type.includes(q);
  const pass = (c) => (!F.genre.size || c.genres.some((g) => F.genre.has(g))) && (!F.access.size || F.access.has(App.accessKind(c))) && (!F.type.size || F.type.has(typeOf(c)));
  const active = () => q || F.genre.size || F.access.size || F.type.size;

  const chip = (grp, k, t) => `<button type="button" data-f="${grp}" data-k="${esc(k)}" aria-pressed="${F[grp].has(k)}" class="${F[grp].has(k) ? "on" : ""}">${esc(t)}</button>`;
  const SLIDERS = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="15" cy="6" r="2.6" fill="#fff"/><circle cx="8" cy="12" r="2.6" fill="#fff"/><circle cx="15.5" cy="18" r="2.6" fill="#fff"/></svg>';
  root.innerHTML = `<section class="s-panel b7"><div class="s-wrap"><form class="s-box b7box" id="sf" role="search"><input id="sq" placeholder="제목, 장르로 검색해보세요" autocomplete="off" value="${esc(q)}" aria-label="검색어">
        <button type="button" class="s-ftoggle" id="ftog" aria-label="필터" aria-expanded="false" aria-controls="sfp">${SLIDERS}<b class="fcnt" hidden></b></button><button class="s-go" aria-label="검색">🔍</button></form>
      <div class="s-filters s-drop" id="sfp" aria-label="검색 필터" hidden>
        <div class="frow"><span class="fl">이용 조건</span>${ACCESS.map(([k, t]) => chip("access", k, t)).join("")}</div>
        <div class="frow"><span class="fl">유형</span>${TYPES.map(([k, t]) => chip("type", k, t)).join("")}</div>
        <div class="frow"><span class="fl">장르</span><div class="fwrap">${GENRES.map((g) => chip("genre", g, g)).join("")}</div></div>
        <div class="fend"><button type="button" class="btn" data-freset>초기화</button><button type="button" class="btn primary" data-fclose>닫기</button></div>
      </div></div></section>
    <section class="s-res" id="res" aria-live="polite"></section>`;

  const inp = root.querySelector("#sq"), res = root.querySelector("#res");
  /* B7 필터: 돋보기 옆 필터 아이콘 → 드롭다운(이용 조건·유형·장르), 선택 즉시 결과 갱신 */
  const ftog = root.querySelector("#ftog"), drop = root.querySelector("#sfp"), fcnt = ftog.querySelector(".fcnt");
  const nSel = () => F.genre.size + F.access.size + F.type.size;
  const syncChips = () => {
    drop.querySelectorAll("[data-f]").forEach((b) => { const on = F[b.dataset.f].has(b.dataset.k); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    fcnt.hidden = !nSel(); fcnt.textContent = nSel(); ftog.classList.toggle("on", !!nSel());
  };
  const setDrop = (open) => { drop.hidden = !open; ftog.setAttribute("aria-expanded", open); };
  ftog.addEventListener("click", () => { const open = drop.hidden; setDrop(open); if (open) L.log("search_filter_open", { section: "search" }); });
  document.addEventListener("click", (e) => { if (!drop.hidden && !e.target.closest(".s-wrap")) setDrop(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !drop.hidden) { setDrop(false); ftog.focus(); } });
  syncChips();
  const card = (c, sec) => `<div class="s-card"><a class="card" href="detail.html?id=${c.id}" data-id="${c.id}" data-section="${sec}"><div class="thumb" style="--h:${App.hue(c.id)}">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""}${App.tagHTML(c)}<div class="ctitle">${esc(c.title)}</div></div></a>
    <div class="s-meta"><small>${esc(c.type)} · ${esc(c.genres.slice(0, 2).join(", "))} · <em class="acc ${App.accessKind(c)}">${esc(App.accessLabel(c))}</em></small><a class="s-play" href="detail.html?id=${c.id}&play=1&from=search" data-play="${c.id}" aria-label="${esc(c.title)} 재생">▶ 재생</a></div></div>`;

  function draw() {
    if (!active()) {
      /* 지금 뜨는 콘텐츠: 순위 + 가로형 카드, 3줄(1·2·3 → 4·5·6 …) 옆으로 스크롤 */
      const top = C.filter((c) => c.weeklyFree).concat(C.filter((c) => !c.weeklyFree).sort((a, b) => b.rating - a.rating)).slice(0, 12);
      res.innerHTML = `<h2>지금 뜨는 콘텐츠 <span class="info" title="최근 시청 수 기준(교육용 가상 데이터)">ⓘ</span></h2>
        <div class="trend3">${top.map((c, i) => `<a class="tcard card" href="detail.html?id=${c.id}" data-id="${c.id}" data-section="search_trend"><span class="trank">${i + 1}</span><div class="thumb" style="--h:${App.hue(c.id)}">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""}${App.tagHTML(c)}<div class="ctitle">${esc(c.title)}</div></div></a>`).join("")}</div>`;
      return;
    }
    const hits = C.filter((c) => match(c) && pass(c));
    const tags = [q ? `“${esc(q)}”` : ""].concat([...F.access].map((k) => ACCESS.find((a) => a[0] === k)[1]), [...F.type].map((k) => TYPES.find((a) => a[0] === k)[1]), [...F.genre]).filter(Boolean);
    res.innerHTML = `<div class="s-sum"><h1>${tags.join(" · ")} 검색 결과 <b>${hits.length}</b>개</h1><button class="btn" data-reset>초기화</button></div>
      ${hits.length ? `<div class="s-grid wide b7g">${hits.map((c) => card(c, "search")).join("")}</div>` : '<p class="soon big">조건에 맞는 작품이 없어요. 필터를 줄이거나 다른 검색어를 입력해 보세요.</p>'}`;
    L.log("search_result", { value: q, section: "search", target_id: String(hits.length) });
  }

  /* 입력 즉시 결과: 200ms 디바운스, 결과가 1초 이상 유지되면 search_submit 으로 기록 */
  let deb, keep;
  const armSubmit = () => { clearTimeout(keep); if (q) keep = setTimeout(() => L.log("search_submit", { value: q, section: "search_instant" }), 1000); };
  inp.addEventListener("input", () => {
    clearTimeout(deb);
    deb = setTimeout(() => {
      q = inp.value.trim();
      L.log("search_input", { value: q.length, section: "search" });
      history.replaceState(null, "", q ? "search.html?q=" + encodeURIComponent(q) : "search.html");
      draw(); armSubmit();
    }, 200);
  });
  root.querySelector("#sf").addEventListener("submit", (e) => { e.preventDefault(); clearTimeout(deb); q = inp.value.trim(); draw(); clearTimeout(keep); if (q) L.log("search_submit", { value: q, section: "search_enter" }); });
  drop.addEventListener("click", (e) => {
    if (e.target.closest("[data-fclose]")) { setDrop(false); ftog.focus(); return; }
    if (e.target.closest("[data-freset]")) { Object.values(F).forEach((s) => s.clear()); syncChips(); L.log("search_filter_apply", { value: "reset", section: "search_filter" }); draw(); return; }
    const b = e.target.closest("[data-f]"); if (!b) return;
    const set = F[b.dataset.f], k = b.dataset.k, on = !set.has(k);
    on ? set.add(k) : set.delete(k);
    syncChips();
    L.log("search_filter_apply", { value: `${b.dataset.f}:${k}${on ? "" : ":off"}`, section: "search_instant" });
    draw();
  });
  res.addEventListener("click", (e) => {
    if (e.target.closest("[data-reset]")) {
      q = ""; inp.value = ""; Object.values(F).forEach((s) => s.clear()); syncChips();
      L.log("search_filter_apply", { value: "reset", section: "search_instant" }); history.replaceState(null, "", "search.html"); draw(); inp.focus(); return;
    }
    const p = e.target.closest("[data-play]");
    if (p) { L.log("card_click", { target_id: p.dataset.play, section: "search", value: "play" }); return; }
    const cd = e.target.closest(".card"); if (cd) L.log("card_click", { target_id: cd.dataset.id, section: cd.dataset.section });
  });

  L.log("search_open", { section: "search" });
  document.title = "검색 · PLAYLAB B안";
  draw();
  inp.focus();
  if (q) armSubmit();
})();
