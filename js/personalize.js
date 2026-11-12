/* B3 개인화(규칙 기반, 가상) — 관심사 선택 시트 + 점수 계산.
   점수 = 선택 장르 일치(+3) + 최근 클릭·재생 작품과 장르 일치(+2) + 찜 작품과 장르 일치(+2) + 평점 보정(+0~1).
   이미 재생한 작품은 하단으로, 같은 점수는 작품 ID 순(같은 입력이면 같은 결과). 저장은 참가자 브라우저(localStorage)에만. */
(function () {
  const App = window.App, LS = App.LS, L = App.Logger, esc = App.esc;
  /* 관심사 칩 12개 → 실제 데이터 장르 묶음 */
  const CHIPS = {
    "드라마": ["드라마", "하이틴", "의학"], "로맨스": ["로맨스", "로맨틱 코미디"], "코미디": ["코미디", "예능", "리얼리티"], "액션": ["액션", "히어로", "밀리터리"],
    "SF": ["SF"], "판타지": ["판타지", "동화"], "애니메이션": ["애니메이션"], "키즈": ["키즈", "유아", "가족", "동요"],
    "다큐멘터리": ["다큐멘터리", "자연", "동물"], "시사교양": ["시사교양", "역사"], "음식": ["음식"], "음악": ["음악", "공연", "뮤지컬"],
  };
  const groupOf = (chip) => CHIPS[chip] || [chip];
  const overlap = (c, genres) => c.genres.some((g) => genres.includes(g));
  const genresOf = (ids) => [...new Set(ids.map((id) => App.byId[id]).filter(Boolean).flatMap((c) => c.genres))];

  const P = {
    CHIPS: Object.keys(CHIPS),
    interests() { return LS.get("interest_B", null); },          // null = 아직 묻지 않음, [] = 건너뜀
    behav() { return LS.get("behav_B", { click: [], play: [] }); },
    score(c) {
      const it = this.interests() || [], b = this.behav();
      const want = it.flatMap(groupOf);
      const recent = genresOf((b.click || []).slice(0, 10).concat((b.play || []).slice(0, 10)).filter((id) => id !== c.id));
      const wished = genresOf(App.wish.list().filter((id) => id !== c.id));
      let s = 0;
      if (want.length && overlap(c, want)) s += 3;
      if (recent.length && overlap(c, recent)) s += 2;
      if (wished.length && overlap(c, wished)) s += 2;
      s += Math.max(0, Math.min(1, (c.rating - 3) / 2));
      return s;
    },
    rank(list) {
      const played = new Set(this.behav().play || []);
      return list.map((c) => ({ c, s: this.score(c), seen: played.has(c.id) }))
        .sort((a, z) => (a.seen - z.seen) || (z.s - a.s) || a.c.id.localeCompare(z.c.id)).map((o) => o.c);
    },
    /* 관심사 칩과 일치하는 작품인지 */
    matches(c, chip) { return overlap(c, groupOf(chip)); },
    /* 첫 진입(교육용 고지 동의 직후) 관심사 선택 시트: 1~3개, 건너뛰기 가능 */
    showSheet(onDone) {
      const ov = document.createElement("div");
      ov.className = "overlay interest";
      let picked = (this.interests() || []).slice();
      ov.innerHTML = `<div class="modal int-modal" role="dialog" aria-modal="true" aria-labelledby="int-t">
        <h2 id="int-t">어떤 콘텐츠를 좋아하세요?</h2>
        <p>관심 있는 장르를 <b>1~3개</b> 골라 주시면 홈을 취향에 맞게 보여드려요. (브라우저에만 저장돼요)</p>
        <div class="int-chips">${this.CHIPS.map((g) => `<button type="button" data-g="${esc(g)}" aria-pressed="${picked.includes(g)}" class="${picked.includes(g) ? "on" : ""}">${esc(g)}</button>`).join("")}</div>
        <p class="fine int-cnt"></p>
        <div class="modal-actions"><button class="btn" data-a="skip">건너뛰기</button><button class="btn primary" data-a="ok">선택 완료</button></div></div>`;
      document.body.appendChild(ov);
      document.body.classList.add("no-scroll");
      const ok = ov.querySelector('[data-a="ok"]'), cnt = ov.querySelector(".int-cnt");
      const upd = () => { ok.disabled = !picked.length; cnt.textContent = picked.length ? `${picked.length}개 선택 (최대 3개)` : "1개 이상 선택해 주세요."; };
      upd();
      ov.querySelector(".int-chips").addEventListener("click", (e) => {
        const b = e.target.closest("[data-g]"); if (!b) return;
        const g = b.dataset.g, i = picked.indexOf(g);
        if (i >= 0) picked.splice(i, 1);
        else if (picked.length < 3) picked.push(g);
        else { App.toast("관심사는 최대 3개까지 고를 수 있어요."); return; }
        b.classList.toggle("on", picked.includes(g)); b.setAttribute("aria-pressed", picked.includes(g)); upd();
      });
      const close = (list) => {
        LS.set("interest_B", list);
        ov.remove(); document.body.classList.remove("no-scroll");
        if (onDone) onDone(list);
      };
      ok.addEventListener("click", () => {
        if (!picked.length) return;
        picked.forEach((g) => L.log("onboarding_interest_select", { value: g, section: "onboarding" }));
        App.SS.set("home_t0_interest", String(Date.now()));       // TTFP를 관심사 선택 완료 시점부터도 계산(6장 3)
        close(picked);
      });
      ov.querySelector('[data-a="skip"]').addEventListener("click", () => { L.log("onboarding_skip", { section: "onboarding" }); App.SS.set("home_t0_interest", String(Date.now())); close([]); });
      ok.focus();
    },
  };
  App.P = P;
})();
