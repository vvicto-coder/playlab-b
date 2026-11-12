/* B안 홈 + 카테고리 탭(드라마·예능/영화/스토어/키즈) + 오직 PLAYLAB에서 전용 페이지.
   홈(B1·B3·B5): 콘텐츠 피드에는 무료 콘텐츠(멤버십 포함)와 오직 PLAYLAB에서 콘텐츠만 — 스포츠·스토어(개별구매)·패스 전용 일반작은 제외.
   상단 카테고리 탭·'카테고리' 버튼(목록)으로 진입, 섹션 20개 이하, 이어보기 큰 카드 최상단, 관심사 + 행동 기반 개인화 정렬.
   페이지는 <body data-page>로 구분. 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const root = document.getElementById("app");
  try { await App.load(); }
  catch (e) {
    root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버(예: <code>python3 -m http.server</code>)로 열어 주세요.</p>';
    return;
  }
  const PAGE = document.body.dataset.page || "home";
  let PAGES = null;
  if (PAGE !== "home" && PAGE !== "originals") {
    try { PAGES = (await (await fetch("data/pages.json?v=20261111")).json())[PAGE]; }
    catch (e) { root.innerHTML = '<p class="page">편성 데이터를 불러오지 못했어요.</p>'; return; }
  }
  if (!App.SS.get("home_t0")) App.SS.set("home_t0", String(Date.now()));
  App.Logger.log("page_view", { section: PAGE });

  const L = App.Logger, esc = App.esc, P = App.P, C = App.data.contents, A = App.data.home_A;
  const discount = (c) => Math.round((c.price * 0.8) / 100) * 100;
  const playable = (c) => App.canPlay(c);
  const ORIGS = A.layout.find((b) => b.kind === "originals").items.map((id) => App.byId[id]);
  const ORIG_FREE = ORIGS.filter(App.isFree);                  // PLAYLAB 시리즈·영화(멤버십 포함)
  const ORIG_PASS = ORIGS.filter((c) => c.partnerPass);        // 오직 PLAYLAB에서 중 패스가 필요한 작품 → 패스별로 분리
  const passGroups = () => App.data.passes.map((p) => ({ p, items: P.rank(ORIG_PASS.filter((c) => c.partnerPass === p.id)) })).filter((g) => g.items.length);

  /* ───── 편성 ───── */
  const ids = (list, n) => list.slice(0, n || 12).map((c) => c.id);
  const lastOf = (arr) => arr.map((id) => App.byId[id]).filter(Boolean)[0];
  function homeLayout() {
    /* 일반 줄은 무료 콘텐츠만, 오직 PLAYLAB에서의 패스 작품은 '패스로 보는 오직 PLAYLAB에서' 줄에만(패스 작품 분리) */
    const free = C.filter(App.isFree);
    const it = P.interests() || [];
    const lay = [];
    lay.push({ kind: "tilebar", sec: "tilebar", events: ["승부예측 이벤트", "출석체크 이벤트"], items: App.data.passes.map((x) => x.id) });   // 이어보기 위: 이벤트 2개 + 패스 브랜드관 아이콘 줄
    lay.push({ kind: "continue", title: "이어보기", items: [{ id: "c104", ep: 3, progress: 0.45 }, { id: "c095", ep: 7, progress: 0.2 }] });
    const chips = it.filter((g) => free.filter((c) => P.matches(c, g)).length);
    const liked = free.filter((c) => chips.some((g) => P.matches(c, g)));
    lay.push(liked.length >= 4
      ? { kind: "row", sec: "personal_interest", title: `회원님이 좋아할 만한 ${chips.join(" · ")}`, items: ids(P.rank(liked)) }
      : { kind: "row", sec: "personal_interest", title: "회원님이 좋아할 만한 콘텐츠", items: ids(P.rank(free)) });
    lay.push({ kind: "originals", sec: "originals", title: "오직 PLAYLAB에서", items: ids(P.rank(ORIG_FREE)), more: "originals.html" });
    lay.push({ kind: "row", sec: "originals_pass", title: "패스로 보는 오직 PLAYLAB에서", items: passGroups().flatMap((g) => g.items).map((c) => c.id), more: "originals.html#pass" });
    const wished = App.wish.list().slice().reverse().map((id) => App.byId[id]).filter((c) => c && App.homeEligible(c))[0];
    const b = P.behav();
    const seed = wished || lastOf((b.play || []).concat(b.click || []).filter((id) => App.byId[id] && App.homeEligible(App.byId[id]))) || App.byId.c104;
    const similar = free.filter((c) => c.id !== seed.id && c.genres.some((g) => seed.genres.includes(g)));
    const fill = P.rank(free.filter((c) => c.id !== seed.id && !similar.includes(c)));
    lay.push({ kind: "row", sec: wished ? "personal_wish" : "personal_seen", title: `${seed.title}을(를) ${wished ? "찜했다면" : "보셨다면"}`, items: ids(P.rank(similar).concat(fill)) });
    lay.push({ kind: "top", sec: "top10", title: "지금 많이 보는 TOP 10", items: A.layout.find((x) => x.kind === "top20").items.filter((id) => App.isFree(App.byId[id])).slice(0, 10) });
    lay.push({ kind: "promo", id: "promo_orig", title: "오직 PLAYLAB에서만 볼 수 있는 이야기", sub: "PLAYLAB 시리즈 · 영화 전체 보기 ›", hue: 250, href: "originals.html" });
    lay.push({ kind: "row", sec: "new", title: "새로 올라온 콘텐츠", items: ids(P.rank(free.filter(App.isNew))) });
    lay.push({ kind: "row", sec: "free_docu", title: "무료로 보는 다큐멘터리 · 시사교양", items: ids(P.rank(free.filter((c) => c.type === "다큐멘터리"))) });
    lay.push({ kind: "row", sec: "free_anime", title: "무료로 보는 애니메이션 · 키즈", items: ids(P.rank(free.filter((c) => c.type === "애니메이션"))) });
    lay.push({ kind: "row", sec: "free_drama", title: "무료로 보는 드라마 · 영화", items: ids(P.rank(free.filter((c) => c.type === "드라마" || c.type === "영화"))) });
    const others = P.CHIPS.filter((g) => !it.includes(g) && free.some((c) => P.matches(c, g)));
    const explore = it.length ? free.filter((c) => !it.some((g) => P.matches(c, g))) : free;
    lay.push({ kind: "explore", sec: "personal_explore", title: "다른 관심사도 둘러보기", chips: others.slice(0, 8), items: ids(explore.slice().sort((a, z) => z.rating - a.rating || a.id.localeCompare(z.id))) });
    return { hero: A.hero, layout: lay.filter((x) => !x.items || x.items.length) };
  }
  function originalsLayout() {
    /* 위: PLAYLAB 시리즈·영화(멤버십 포함) / 아래: 패스 종류별 */
    const r = P.rank(ORIG_FREE);
    return {
      hero: { items: ids(r, 6), cta: "재생하기", ctaMode: "play", autoplayMs: 5000 },
      layout: [
        { kind: "originals", sec: "orig_series", title: "PLAYLAB 시리즈", items: ids(r.filter((c) => c.format === "series")) },
        { kind: "originals", sec: "orig_movie", title: "PLAYLAB 영화", items: ids(r.filter((c) => c.format === "movie")) },
      ].concat(passGroups().map((g, i) => ({ kind: "passOrig", sec: "orig_pass_" + g.p.id, pass: g.p, first: i === 0, items: ids(g.items) })))
        .filter((x) => x.items.length),
    };
  }
  function categoryLayout() {                              // 카테고리 탭: 편성은 A와 같고, 일반 줄만 개인화 정렬
    return Object.assign({}, PAGES, { layout: PAGES.layout.map((b) => (b.kind === "row" ? Object.assign({}, b, { items: P.rank(b.items.map((id) => App.byId[id]).filter(Boolean)).map((c) => c.id) }) : b)) });
  }
  const build = () => (PAGE === "home" ? homeLayout() : PAGE === "originals" ? originalsLayout() : categoryLayout());
  let H = build();

  /* ───── 카드: 제목 + 배지 1개(신규/이용권), 캡션 줄 없음 ───── */
  function card(c, o) {
    o = o || {};
    let tag = App.tagHTML(c);
    if (o.deal && c.price) tag = `<span class="tag buy">개별구매 ${discount(c).toLocaleString("ko-KR")}원 · 20%↓</span>`;
    const img = c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" onerror="this.remove()">` : "";
    return `<a class="card ${o.kind || ""} ${o.pass ? "pass-card" : ""}" href="detail.html?id=${c.id}" data-id="${c.id}" data-section="${esc(o.section)}">
      <div class="thumb" style="--h:${App.hue(c.id)}">${img}${tag}<div class="ctitle">${esc(c.title)}</div></div>
      ${o.rank ? `<span class="rank">${o.rank}</span>` : ""}${o.below || ""}</a>`;
  }
  const strip = (cls, html) => `<div class="strip-wrap"><button class="arrow l" aria-label="이전">‹</button><div class="strip ${cls}">${html}</div><button class="arrow" aria-label="다음">›</button></div>`;
  const h2 = (b) => {
    if (!b.more) return `<h2>${esc(b.title)}</h2>`;
    const page = typeof b.more === "string" ? b.more : "";      // pages.json 은 more: true(전체보기 토스트), 홈은 이동할 페이지
    return `<h2><a href="${page || "#"}" ${page ? "data-more-page" : `data-more="${esc(b.title)}"`}>${esc(b.title)} ›</a></h2>`;
  };

  /* ───── 히어로 ───── */
  let heroTimer = null;
  function hero() {
    const items = H.hero.items.map((id) => App.byId[id]);
    return `<section class="hero" aria-roledescription="carousel" aria-label="추천 콘텐츠">
      ${items.map((c, i) => `<div class="slide ${i ? "" : "on"}" data-id="${c.id}" style="background-image:url('${esc(c.image)}')"></div>`).join("")}
      <button class="mutebtn" id="hero-mute" aria-label="음소거 해제">🔇</button>
      <div class="copy">${PAGE === "originals" ? '<div class="orig-kicker">오직 PLAYLAB에서</div>' : ""}<div class="meta"></div><h1></h1>
        <div class="btns"><button class="btn primary ${H.hero.ctaMode === "buy" ? "buy" : ""}" id="hero-cta">${esc(H.hero.cta)}</button>${H.hero.cta2 ? `<button class="btn white" id="hero-cta2">${esc(H.hero.cta2)}</button>` : ""}<a class="btn ghost" id="hero-info" href="#">ⓘ 상세정보</a></div></div>
      <div class="ctl"><button id="h-prev" aria-label="이전">‹</button>${items.map((_, i) => `<button class="dot ${i ? "" : "on"}" data-i="${i}" aria-label="${i + 1}번 슬라이드"></button>`).join("")}<button id="h-next" aria-label="다음">›</button></div></section>`;
  }
  function bindHero() {
    const items = H.hero.items.map((id) => App.byId[id]);
    const slides = [...root.querySelectorAll(".hero .slide")], dots = [...root.querySelectorAll(".hero .dot")];
    const meta = root.querySelector(".hero .meta"), h1 = root.querySelector(".hero h1");
    let cur = 0;
    function go(i, byUser, init) {
      cur = (i + items.length) % items.length;
      slides.forEach((s, k) => s.classList.toggle("on", k === cur));
      dots.forEach((d, k) => d.classList.toggle("on", k === cur));
      const c = items[cur];
      meta.textContent = `★ ${c.rating.toFixed(1)} · ${App.runtime(c.runtime)} · ${App.accessLabel(c)}`;
      h1.textContent = c.title;
      if (!init) L.log("hero_slide_change", { target_id: c.id, value: byUser ? "user" : "auto" });
    }
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let paused = false;
    const arm = () => {
      clearInterval(heroTimer);
      if (reduce) return;
      heroTimer = setInterval(() => { if (!paused && !document.hidden) go(cur + 1); }, H.hero.autoplayMs || 5000);
    };
    const heroEl = root.querySelector(".hero");
    ["mouseenter", "focusin"].forEach((ev) => heroEl.addEventListener(ev, () => (paused = true)));
    ["mouseleave", "focusout"].forEach((ev) => heroEl.addEventListener(ev, () => (paused = false)));
    go(0, false, true); arm();
    root.querySelector("#h-prev").onclick = () => { go(cur - 1, true); arm(); };
    root.querySelector("#h-next").onclick = () => { go(cur + 1, true); arm(); };
    dots.forEach((d) => (d.onclick = () => { go(+d.dataset.i, true); arm(); }));
    root.querySelector("#hero-mute").onclick = (e) => { const b = e.currentTarget; const on = b.textContent === "🔇"; b.textContent = on ? "🔊" : "🔇"; b.setAttribute("aria-label", on ? "음소거" : "음소거 해제"); L.log("mute_toggle", { section: "hero", value: on ? "on" : "off" }); };
    root.querySelector("#hero-cta").onclick = () => {
      const c = items[cur]; L.log("hero_cta_click", { target_id: c.id, section: "hero" });
      if (H.hero.ctaMode === "play" && playable(c)) location.href = `detail.html?id=${c.id}&play=1`;
      else App.openGate(c);
    };
    const c2 = root.querySelector("#hero-cta2");
    if (c2) c2.onclick = () => { L.log("banner_click", { target_id: "hero_event", section: PAGE }); App.toast("교육용 페이지: 이벤트 응모는 제공되지 않아요."); };
    root.querySelector("#hero-info").onclick = (e) => {
      e.preventDefault(); const c = items[cur]; L.log("card_click", { target_id: c.id, section: "hero" }); location.href = "detail.html?id=" + c.id;
    };
  }

  /* ───── 섹션 렌더 ───── */
  function block(b, idx) {
    const sec = b.sec || (b.kind === "row" ? "row_" + idx : b.kind);
    switch (b.kind) {
      case "continue":                                       // B5 이어보기: 홈 최상단 큰 카드(회차·남은 시간·진행률·버튼)
        return `<section class="sec cwb-sec"><h2>${esc(b.title)}</h2><div class="cwb">${b.items.map((it) => {
          const c = App.byId[it.id], left = Math.max(1, Math.round(c.runtime * (1 - it.progress)));
          return `<article class="cwb-card" data-id="${c.id}"><a class="cwb-media" href="detail.html?id=${c.id}&ep=${it.ep}&play=1" data-continue="${c.id}" data-ep="${it.ep}" aria-label="${esc(c.title)} ${it.ep}화 이어보기">
              ${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy">` : ""}<span class="cwb-play">▶</span><span class="cwb-bar"><i style="width:${Math.round(it.progress * 100)}%"></i></span></a>
            <div class="cwb-info"><h3>${esc(c.title)}</h3><p>${c.format === "movie" ? "본편" : `${it.ep}화`} · 남은 시간 ${App.runtime(left)} · ${Math.round(it.progress * 100)}% 시청</p>
              <a class="btn primary cwb-btn" href="detail.html?id=${c.id}&ep=${it.ep}&play=1" data-continue="${c.id}" data-ep="${it.ep}">▶ 이어보기</a></div></article>`;
        }).join("")}</div></section>`;
      case "top":
      case "top20":
        return `<section class="sec"><h2>${esc(b.title)}</h2>${strip("poster", b.items.map((id, i) => card(App.byId[id], { section: sec, kind: "poster", rank: i + 1 })).join(""))}</section>`;
      case "originals":
        return `<section class="sec originals">${h2(b)}<div class="orig-glow">${strip("origs", b.items.map((id) => card(App.byId[id], { section: sec, kind: "big" })).join(""))}</div></section>`;
      case "passOrig": {                                     // 오직 PLAYLAB에서 탭: 패스 종류별 분리
        const p = b.pass;
        return `${b.first ? '<h2 class="po-head sec" id="pass">패스로 보는 오직 PLAYLAB에서 <small>멤버십과 별도로 패스 구독이 필요해요</small></h2>' : ""}
          <section class="sec po-sec" style="--bc:${p.color}"><div class="po-top"><span class="po-mark">${esc(p.brand)}</span><span class="po-t"><b>${esc(p.name)}</b><small>${esc(p.tagline)} · 월 ${p.price.toLocaleString("ko-KR")}원 · ${b.items.length}편</small></span>
            <a class="po-link" href="brand.html?p=${p.id}" data-po="${p.id}">브랜드관 ›</a></div>
          ${strip("wide rowp", b.items.map((id) => card(App.byId[id], { section: sec })).join(""))}</section>`;
      }
      case "promo": {
        const t = b.target && App.byId[b.target];
        if (b.adult) return `<section class="sec"><div class="promo adult" data-promo="${b.id}" role="button" tabindex="0"><b>${esc(b.title)}</b><span>${esc(b.sub)}</span></div></section>`;
        return `<section class="sec"><div class="promo" data-promo="${b.id}" ${t ? `data-target="${t.id}"` : ""} ${b.href ? `data-href="${b.href}"` : ""} ${b.pass ? `data-pass="${b.pass}"` : ""} style="--h:${b.hue != null ? b.hue : App.hue(b.id)}" role="link" tabindex="0"><b>${esc(b.title)}</b><span>${esc(b.sub)}</span></div></section>`;
      }
      case "explore":
        return `<section class="sec"><h2>${esc(b.title)}</h2>${b.chips.length ? `<div class="ex-chips">${b.chips.map((g) => `<a href="search.html?g=${encodeURIComponent(g)}" data-explore="${esc(g)}">${esc(g)}</a>`).join("")}</div>` : ""}${strip("wide rowp", b.items.map((id) => card(App.byId[id], { section: sec })).join(""))}</section>`;
      case "tilebar": {                                      // 이벤트 2개 + 패스 브랜드관 아이콘: 접속(새로고침)할 때마다 순서를 무작위로 섞음
        const tiles = b.events.map((lb) => `<button class="tile event" data-type="event" data-target="" data-label="${esc(lb)}"><span>${esc(lb)}</span></button>`)
          .concat(b.items.map((id) => { const ps = App.pass(id); return `<a class="btile" href="brand.html?p=${id}" data-brand="${id}" style="--bc:${ps.color}"><span class="bw ${id}">${esc(ps.brand)}</span></a>`; }));
        for (let k = tiles.length - 1; k > 0; k--) { const r = Math.floor(Math.random() * (k + 1)); [tiles[k], tiles[r]] = [tiles[r], tiles[k]]; }
        return `<section class="sec">${strip("tiles tilebar", tiles.join(""))}</section>`;
      }
      case "shortcuts":                                      // 카테고리 탭(A와 같은 편성)
        return `<section class="sec">${strip("tiles", b.items.map((it) => {
          const c = it.type === "content" ? App.byId[it.target] : null;
          const bg = c && c.image ? ` has-img" style="background-image:url('${esc(c.image)}')` : it.type === "event" ? " event" : `" style="--h:${it.hue != null ? it.hue : App.hue(it.label)}`;
          return `<button class="tile${bg}" data-type="${it.type}" data-target="${esc(it.target || "")}" data-label="${esc(it.label)}"><span>${esc(it.label)}</span>${it.pill ? `<em class="tpill ${it.buy ? "buy" : ""}">✨ ${esc(it.pill)} ✨</em>` : ""}</button>`;
        }).join(""))}</section>`;
      default:
        return `<section class="sec">${h2(b)}${strip("wide rowp", b.items.map((id) => card(App.byId[id], { section: b.sec || b.title, deal: b.deal })).join(""))}</section>`;
    }
  }

  function render() {
    root.innerHTML = hero() + H.layout.map(block).join("");
    root.dataset.sections = String(1 + H.layout.length);   // 히어로 포함 섹션 수(검증용)
    bindHero();
    root.querySelectorAll(".strip-wrap").forEach((w) => {
      const s = w.querySelector(".strip");
      w.querySelector(".arrow.l").onclick = () => s.scrollBy({ left: -s.clientWidth * 0.85, behavior: "smooth" });
      w.querySelector(".arrow:not(.l)").onclick = () => s.scrollBy({ left: s.clientWidth * 0.85, behavior: "smooth" });
    });
    if (PAGE === "home") {
      const info = document.createElement("section");
      info.className = "home-info";
      info.innerHTML = `<div class="hi-logo"><i></i>PLAYLAB</div>
        <p>교육용 비영리 UI/UX A/B 테스트 프로젝트입니다. 실제 OTT 서비스 및 해당 기업과 관련이 없으며, 아래 정보는 모두 가상의 예시입니다.</p>
        <p class="hi-l">상호: (가상) 플레이랩 · 대표: - · 사업자등록번호: 없음 · 통신판매업 신고: 없음<br>연락처: 없음 (실제 문의·결제·가입이 불가능한 테스트 페이지)</p>
        <p class="hi-links"><a href="#" data-info>이용약관</a><a href="#" data-info>개인정보처리방침</a><a href="#" data-info>청소년보호정책</a><a href="#" data-info>고객센터</a><a href="#" data-info>자주 묻는 질문</a><a href="#" data-info="interest">관심사 다시 고르기</a></p>`;
      root.appendChild(info);
    }
  }
  render();
  if (location.hash.length > 1) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView(), 60); }

  /* 관심사 선택: 교육용 고지 동의 직후(이미 동의했다면 첫 홈 진입 시) */
  const askInterest = () => P.showSheet(() => { H = build(); render(); window.scrollTo(0, 0); });
  if (PAGE === "home") {
    App.afterConsent = () => { if (P.interests() === null) askInterest(); };
    if (App.LS.get("consent_B", false) && P.interests() === null) askInterest();
  }

  if (H.toastBar) {                                                   // 스토어: 하단 와우회원 안내 바
    const bar = document.createElement("div");
    bar.className = "buybar"; bar.setAttribute("role", "status");
    bar.innerHTML = `<span class="lk">🔒</span><span><b>${esc(H.toastBar.text)}</b><a href="#" id="buybar-join">${esc(H.toastBar.link)} ›</a></span><button aria-label="닫기">✕</button>`;
    document.body.appendChild(bar);
    bar.querySelector("button").onclick = () => bar.remove();
    bar.querySelector("#buybar-join").onclick = (e) => { e.preventDefault(); L.log("banner_click", { target_id: "buybar_join", section: PAGE }); App.toast("교육용 페이지입니다. 실제 가입은 진행되지 않아요."); };
  }

  /* ───── 클릭 위임 ───── */
  root.addEventListener("click", (e) => {
    const cn = e.target.closest("[data-continue]");
    if (cn) { L.log("continue_click", { target_id: cn.dataset.continue, value: cn.dataset.ep, section: "home_continue" }); return; }
    const ex = e.target.closest("[data-explore]");
    if (ex) { L.log("shortcut_click", { value: ex.dataset.explore, section: "personal_explore" }); return; }
    const cd = e.target.closest(".card");
    if (cd) { L.log("card_click", { target_id: cd.dataset.id, section: cd.dataset.section }); return; }
    const bt = e.target.closest(".btile");
    if (bt) { L.log("pass_icon_click", { value: bt.dataset.brand, section: "home_brands" }); return; }
    const t = e.target.closest(".tile");
    if (t) {
      L.log("shortcut_click", { target_id: t.dataset.target || t.dataset.label, section: "shortcuts", value: t.dataset.type });
      if (t.dataset.type === "content") location.href = "detail.html?id=" + t.dataset.target;
      else if (t.dataset.type === "category" && t.dataset.target === "sports") location.href = App.sportsDest();
      else if (t.dataset.type === "pass") location.href = "brand.html?p=" + t.dataset.target;
      else App.toast("교육용 테스트 페이지: 해당 기능은 제공되지 않아요.");
      return;
    }
    const pr = e.target.closest(".promo");
    if (pr) {
      L.log("banner_click", { target_id: pr.dataset.promo });
      if (pr.dataset.href === "originals.html") L.log("category_entry_click", { value: "originals", section: "home_banner" });
      if (pr.classList.contains("adult")) App.toast("교육용 테스트 페이지: 성인 인증 화면은 제공되지 않아요.");
      else if (pr.dataset.href) location.href = pr.dataset.href;
      else if (pr.dataset.pass) location.href = "brand.html?p=" + pr.dataset.pass;
      else if (pr.dataset.target) location.href = "detail.html?id=" + pr.dataset.target;
      else App.toast("교육용 페이지로 외부 이동은 없어요.");
      return;
    }
    const mp = e.target.closest("[data-more-page]");
    if (mp) { L.log("row_more_click", { section: mp.textContent.replace(" ›", "") }); if (mp.getAttribute("href").startsWith("originals.html")) L.log("category_entry_click", { value: "originals", section: "home_row_more" }); return; }
    const po = e.target.closest("[data-po]");
    if (po) { L.log("pass_icon_click", { value: po.dataset.po, section: "originals_pass" }); return; }
    const mo = e.target.closest("[data-more]");
    if (mo) { e.preventDefault(); L.log("row_more_click", { section: mo.dataset.more }); App.toast("교육용 테스트 페이지: 전체보기 화면은 제공되지 않아요."); return; }
    const inf = e.target.closest("[data-info]");
    if (inf) {
      e.preventDefault();
      if (inf.dataset.info === "interest") { L.log("gnb_click", { value: "footer:관심사 다시 고르기" }); askInterest(); return; }
      L.log("gnb_click", { value: "footer:" + inf.textContent }); App.toast("교육용 테스트 페이지: 이 화면은 제공되지 않아요.");
    }
  });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.classList.contains("promo")) e.target.click(); });

  /* ───── 호버 프리뷰 (300ms 지연) ───── */
  const hv = document.getElementById("hover");
  let showT, hideT, curCard = null;
  const hide = () => { hv.classList.remove("show"); curCard = null; };
  const scheduleHide = () => { clearTimeout(hideT); hideT = setTimeout(hide, 160); };

  function showHover(cd) {
    const c = App.byId[cd.dataset.id]; curCard = cd;
    const wished = App.wish.has(c.id);
    const k = App.accessKind(c);
    hv.innerHTML = `<div class="vid">${c.image ? `<img src="${esc(c.image)}" alt="">` : ""}<div class="lbl"></div><button class="mute" aria-label="음소거">🔇</button></div>
      <div class="body"><h3>${esc(c.title)}</h3>
      <div class="mrow"><span>★ ${c.rating.toFixed(1)}</span><span>· ${esc(c.genres[0])}</span><span>· ${App.runtime(c.runtime)}</span><span class="age">${App.age(c.age)}</span></div>
      <div class="msg acc ${k}">${esc(App.accessLabel(c))}</div>
      <div class="acts"><button class="rb pri" data-a="play" aria-label="재생">▶</button><button class="rb" data-a="wish" aria-label="찜">${wished ? "✓" : "＋"}</button><span class="sp"></span><button class="rb" data-a="info" aria-label="상세정보">i</button></div></div>`;
    const r = cd.getBoundingClientRect(), W = Math.max(Math.round(r.width * 1.1), 250);
    hv.style.width = W + "px";
    let left = r.left + scrollX + r.width / 2 - W / 2;
    left = Math.max(8 + scrollX, Math.min(left, scrollX + innerWidth - W - 16));
    hv.style.left = left + "px"; hv.style.top = "0px"; hv.classList.add("show");
    const hh = hv.offsetHeight;
    let top = r.top + scrollY - 6;
    top = Math.max(scrollY + 80, Math.min(top, scrollY + innerHeight - hh - 12));
    hv.style.top = top + "px";
    hv.dataset.id = c.id; hv.dataset.section = cd.dataset.section;
    L.log("card_hover", { target_id: c.id, section: cd.dataset.section });
  }
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest("#hover")) { clearTimeout(hideT); return; }
    const cd = e.target.closest(".card");
    if (!cd) { clearTimeout(showT); scheduleHide(); return; }
    clearTimeout(hideT);
    if (cd === curCard) return;
    clearTimeout(showT);
    showT = setTimeout(() => showHover(cd), 300);
  });
  window.addEventListener("scroll", () => { clearTimeout(showT); if (curCard) hide(); }, { passive: true });
  hv.addEventListener("click", (e) => {
    const c = App.byId[hv.dataset.id], sec = hv.dataset.section;
    const b = e.target.closest("button"), a = b && b.dataset.a;
    if (b && b.classList.contains("mute")) { b.textContent = b.textContent === "🔇" ? "🔊" : "🔇"; return; }
    if (a === "wish") {
      const added = App.wish.toggle(c.id);
      b.textContent = added ? "✓" : "＋";
      if (added) L.log("wishlist_add", { target_id: c.id, section: sec });
      App.toast(added ? "찜 목록에 추가했어요." : "찜 목록에서 뺐어요.");
      return;
    }
    if (a === "play") {
      L.log("card_click", { target_id: c.id, section: sec, value: "hover_play" });
      location.href = `detail.html?id=${c.id}&play=1`;
      return;
    }
    L.log("card_click", { target_id: c.id, section: sec, value: a === "info" ? "hover_info" : "hover_card" });
    location.href = "detail.html?id=" + c.id;
  });

  /* ───── 스크롤 깊이 ───── */
  const seen = new Set();
  function depth() {
    const d = (scrollY + innerHeight) / document.documentElement.scrollHeight * 100;
    [25, 50, 75, 100].forEach((t) => { if (d >= t - 1 && !seen.has(t)) { seen.add(t); L.log("scroll_depth", { section: PAGE, value: t }); } });
  }
  window.addEventListener("scroll", depth, { passive: true }); depth();
})();
