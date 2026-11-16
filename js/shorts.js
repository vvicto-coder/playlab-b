/* B안 숏플 — 세로 전체화면 숏폼 피드(위/아래로 넘기기). 영상은 정지 이미지+천천히 확대로 대체, 자막·대사는 모두 가상.
   하단 정보 막대: 찜(✓) / 파란 ▶ → 상세 화면. 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const L = App.Logger, esc = App.esc, root = document.getElementById("app");
  let CM;
  try { await App.load(); CM = await (await fetch("data/comments.json?v=1")).json(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }
  const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 33 + ch.charCodeAt(0)) >>> 0; return h; };
  /* B4 가상 댓글: 작품 ID로 결정(같은 작품이면 같은 댓글), 참가자가 쓴 댓글은 이 화면에만 잠깐 보임(저장·전송 없음) */
  const mine = new Map();
  const commentsOf = (c) => {
    const h = hash(c.id), g = c.genres.find((x) => CM.byGenre[x]);
    const texts = (g ? CM.byGenre[g] : []).concat(CM.byGenre.default);
    return Array.from({ length: 5 }, (_, i) => ({ nick: CM.nicknames[(h + i * 5) % CM.nicknames.length], text: texts[(h + i) % texts.length], ago: `${1 + ((h >> (i + 1)) % 23)}시간 전`, likes: (h >> (i + 3)) % 120 }));
  };
  const countOf = (c) => 24 + (hash(c.id) % 460) + (mine.get(c.id) || []).length;
  L.log("page_view", { section: "shorts" });

  /* 가상 대사: 장르별 */
  const SUB = {
    액션: ["지금 아니면 기회가 없어.", "따라와, 시간이 없다고."], 범죄: ["이 장부에 이름이 있는 사람이 전부야.", "누가 먼저 입을 열지 지켜보자고."],
    로맨스: ["그때 하려던 말, 아직 기억나?", "우리 이대로 괜찮을까."], 코미디: ["이게 왜 여기서 나오는 거죠?", "저 오늘 진짜 운이 없네요."],
    스릴러: ["문 밖에 누군가 있어.", "72시간, 그게 전부였어."], 공포: ["불 끄지 마, 제발.", "방금 그 소리 들었지?"],
    드라마: ["그래도 내일은 오겠죠.", "말하지 않아도 알고 있었어요."], 판타지: ["이 문을 열면 돌아올 수 없어.", "별이 길을 알려줄 거야."],
    SF: ["신호가 끊기기 전에 가야 해.", "이건 기억이 아니야."], 애니메이션: ["같이 가자, 우리 친구잖아!", "오늘은 어떤 모험일까?"],
    가족: ["밥은 먹고 다니는 거지?", "우리 집이 제일 좋아요."], 키즈: ["하나, 둘, 셋! 같이 해보자!", "와, 정말 신나요!"],
  };
  const CAP = ["이 장면, 다시 보고 싶어요", "여기서부터 분위기가 달라져요", "놓치면 아쉬운 명장면", "마지막 반전을 기대하세요"];
  const pick = (c) => SUB[c.genres.find((g) => SUB[g])] || SUB.드라마;

  /* 피드: 이미지가 있는 작품을 평점·고정 순서로 섞어서 20편 */
  const feed = App.data.contents.filter((c) => c.image).map((c, i) => ({ c, k: (parseInt(c.id.slice(1), 10) * 37) % 101 })).sort((a, b) => a.k - b.k).slice(0, 20).map((x) => x.c);

  root.innerHTML = `<div class="sh-feed" tabindex="0" aria-label="숏플 영상 목록">${feed.map((c, i) => {
    const s = pick(c);
    const on = App.wish.has(c.id);
    return `<section class="sh-item" data-id="${c.id}" aria-label="${esc(c.title)}">
      <div class="sh-bg"><img src="${esc(c.image)}" alt="" ${i < 2 ? "" : 'loading="lazy"'}></div>
      <div class="sh-shade"></div>
      <div class="sh-top"><span class="sh-title">${esc(c.title)}</span><span class="sh-logo"><i></i>PLAYLAB</span></div>
      <div class="sh-sub"><b data-sub>${esc(s[0])}</b></div>
      <div class="sh-cap">${esc(CAP[i % CAP.length])}</div>
      <div class="sh-rail"><button class="sh-cbtn" data-cmt="${c.id}" aria-label="댓글 보기"><span class="ic">💬</span><span class="n">${countOf(c)}</span></button></div>
      <div class="sh-done" aria-hidden="true">✓ 시청 완료 · 본편에서 이어서 보세요</div>
      <div class="sh-bar"><a class="sh-poster" href="detail.html?id=${c.id}" data-open="${c.id}"><img src="${esc(c.image)}" alt=""></a>
        <a class="sh-meta" href="detail.html?id=${c.id}" data-open="${c.id}"><b>${esc(c.title)} ›</b><small>★ ${c.rating.toFixed(1)} · ${App.age(c.age)} · ${esc(c.genres[0])}</small></a>
        <button class="sh-wish ${on ? "on" : ""}" data-wish="${c.id}" aria-label="찜" aria-pressed="${on}">${on ? "✓" : "✓"}</button>
        <a class="sh-play" href="detail.html?id=${c.id}" data-open="${c.id}" aria-label="상세 화면에서 재생"><span class="pi">▶</span><span class="pl">본편 보기</span></a></div>
      <div class="sh-prog" aria-hidden="true"><i></i></div></section>`;
  }).join("")}</div>`;

  /* 보이는 영상만 '재생'(자막 교체) + 노출 로그 */
  const items = [...root.querySelectorAll(".sh-item")];
  const timers = new Map(), dwell = new Map(), completed = new Set();
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      const el = e.target, c = App.byId[el.dataset.id];
      const bar = el.querySelector(".sh-prog i");
      if (e.isIntersecting && e.intersectionRatio > 0.6) {
        el.classList.add("on");
        L.log("short_view", { target_id: c.id, section: "shorts" });
        clearTimeout(dwell.get(el));
        if (!completed.has(c.id)) {
          /* B4 시청 완료 표시: 10초 모의 재생 진행 막대 → 끝나면 '본편 보기' 강조 (기록 기준은 A와 같은 10초 체류) */
          bar.style.transition = "none"; bar.style.width = "0%"; void bar.offsetWidth;
          bar.style.transition = "width 10s linear"; bar.style.width = "100%";
          dwell.set(el, setTimeout(() => { completed.add(c.id); el.classList.add("done"); L.log("short_complete", { target_id: c.id, section: "shorts", value: "dwell10s" }); }, 10000));
        }
        const s = pick(c), b = el.querySelector("[data-sub]"); let n = 0;
        clearInterval(timers.get(el));
        timers.set(el, setInterval(() => { n = (n + 1) % s.length; b.textContent = s[n]; }, 2800));
      } else {
        el.classList.remove("on"); clearInterval(timers.get(el)); clearTimeout(dwell.get(el));
        if (!completed.has(c.id)) { bar.style.transition = "none"; bar.style.width = "0%"; }
      }
    });
  }, { threshold: [0, 0.6, 1] });
  items.forEach((el) => io.observe(el));

  /* B4 댓글 창: 데스크톱은 오른쪽 패널, 모바일은 바텀시트 */
  const panel = document.createElement("aside");
  panel.className = "sh-cmt"; panel.hidden = true; panel.setAttribute("aria-label", "댓글");
  panel.innerHTML = `<header><b>댓글 <span class="cnt"></span></b><button class="x" aria-label="댓글 닫기">✕</button></header>
    <ul class="list"></ul>
    <form class="cform"><input maxlength="100" placeholder="댓글 추가… (모의 작성 · 저장·전송되지 않아요)" aria-label="댓글 입력"><button>등록</button></form>
    <p class="fine">교육용: 가상 댓글이며, 작성한 댓글은 이 화면에만 잠깐 보여요. 이름·연락처 등 개인정보는 입력하지 마세요.</p>`;
  document.body.appendChild(panel);
  let cmtId = null;
  const drawCmt = () => {
    const c = App.byId[cmtId];
    const list = (mine.get(c.id) || []).concat(commentsOf(c));
    panel.querySelector(".cnt").textContent = countOf(c).toLocaleString("ko-KR");
    panel.querySelector(".list").innerHTML = list.map((m) => `<li class="${m.me ? "me" : ""}"><span class="av" style="background:hsl(${hash(m.nick) % 360} 55% 45%)">${esc(m.nick[0])}</span><div><small><b>${esc(m.nick)}</b> · ${esc(m.ago)}</small><p>${esc(m.text)}</p><button data-like>👍 ${m.likes}</button></div></li>`).join("");
    const btn = root.querySelector(`[data-cmt="${c.id}"] .n`); if (btn) btn.textContent = countOf(c);
  };
  const openCmt = (id) => {
    cmtId = id; drawCmt(); panel.hidden = false; document.body.classList.add("cmt-open");
    L.log("short_comment_open", { target_id: id, section: "shorts" });
    panel.querySelector("input").focus({ preventScroll: true });
  };
  const closeCmt = () => { panel.hidden = true; document.body.classList.remove("cmt-open"); cmtId = null; };
  panel.querySelector(".x").addEventListener("click", closeCmt);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) closeCmt(); });
  panel.querySelector(".cform").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = panel.querySelector("input"), v = inp.value.trim();
    if (!v || !cmtId) return;
    mine.set(cmtId, [{ nick: "나", text: v, ago: "방금", likes: 0, me: true }].concat(mine.get(cmtId) || []));
    L.log("short_comment_post", { target_id: cmtId, section: "shorts", value: v.length });   // 댓글 본문은 기록하지 않음
    inp.value = ""; drawCmt();
  });
  panel.addEventListener("click", (e) => { const lk = e.target.closest("[data-like]"); if (lk) lk.classList.toggle("on"); });

  root.addEventListener("click", (e) => {
    const cb = e.target.closest("[data-cmt]");
    if (cb) { if (cmtId === cb.dataset.cmt && !panel.hidden) closeCmt(); else openCmt(cb.dataset.cmt); return; }
    const w = e.target.closest("[data-wish]");
    if (w) {
      const added = App.wish.toggle(w.dataset.wish);
      w.classList.toggle("on", added); w.setAttribute("aria-pressed", added);
      if (added) L.log("wishlist_add", { target_id: w.dataset.wish, section: "shorts" });
      App.toast(added ? "찜 목록에 추가했어요." : "찜 목록에서 뺐어요.");
      return;
    }
    const o = e.target.closest("[data-open]");
    if (o) L.log("card_click", { target_id: o.dataset.open, section: "shorts", value: o.classList.contains("sh-play") ? "play" : "info" });
  });
  /* 데스크톱: 키보드 ↑↓ 로 넘기기 */
  root.querySelector(".sh-feed").addEventListener("keydown", (e) => {
    const f = e.currentTarget;
    if (e.key === "ArrowDown") { e.preventDefault(); f.scrollBy({ top: f.clientHeight, behavior: "smooth" }); }
    if (e.key === "ArrowUp") { e.preventDefault(); f.scrollBy({ top: -f.clientHeight, behavior: "smooth" }); }
  });
})();
