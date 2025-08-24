import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

export default function App() {
  const [step, setStep] = useState("start"); // "start" | "game" | "result"
  const [fileNumber, setFileNumber] = useState("");
  const [questions, setQuestions] = useState([]);
  const [letters, setLetters] = useState([]);
  const [active, setActive] = useState(null);

  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({}); // letter -> "correct" | "wrong"
  const [draft, setDraft] = useState("");

  // Giriş ekranında sayı girilip başlatıldığında
  const handleStart = async () => {
    if (!fileNumber) return;

    try {
      const res = await fetch(`./data/questions${fileNumber}.json`);
      const data = await res.json();
      setQuestions(data);
      setLetters(data.map((q) => q.letter));
      setActive(data[0].letter);
      setAnswers({});
      setResults({});
      setDraft("");
      setStep("game");
    } catch (err) {
      alert("Bu dosya bulunamadı!");
    }
  };

  // Aktif harf değişince draft güncelle
  useEffect(() => {
    if (active) setDraft(answers[active] ?? "");
  }, [active]); // answers'a bağlı olmasına gerek yok; aktif değişince okuyoruz

  // Doğruluk kontrol yardımcıları
  const normalize = (s) => s.trim().toLowerCase();

  const isCorrectFor = (letter, userText) => {
    const q = questions.find((x) => x.letter === letter);
    if (!q) return false;
    const valid = q.answer.split(",").map((a) => normalize(a));
    return valid.includes(normalize(userText || ""));
  };

  // Kaydet + hepsi bitti mi kontrol et (tek yerde)
  const saveAndMaybeFinish = () => {
    const user = draft;
    const correct = isCorrectFor(active, user);

    // answers & results için "yeni" objeleri hesapla
    const nextAnswers = { ...answers, [active]: user };
    const nextResults = {
      ...results,
      [active]: correct ? "correct" : "wrong",
    };

    setAnswers(nextAnswers);
    setResults(nextResults);

    // tüm harflerin sonucu oluşmuş mu?
    const finished =
      letters.length > 0 && letters.every((l) => Boolean(nextResults[l]));

    if (finished) {
      setStep("result");
      return true; // bitti
    }
    return false; // bitmedi
  };

  // Pas → sonraki boş harfe geç
  const passToNextEmpty = () => {
    const isEmpty = (l) => !answers[l] || !answers[l].trim();
    const start = letters.indexOf(active);

    let nextIdx = letters.findIndex((l, i) => i > start && isEmpty(l));
    if (nextIdx === -1) nextIdx = letters.findIndex(isEmpty);

    if (nextIdx !== -1) setActive(letters[nextIdx]);
  };

  // Enter → kaydet + (bitmediyse) sonraki boş harfe geç
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const finished = saveAndMaybeFinish();
      if (!finished) passToNextEmpty();
    }
  };

  // Özet metni (panoya kopyalanabilir)
  const buildSummaryText = () => {
    const total = letters.length;
    const correctCount = letters.filter((l) => results[l] === "correct").length;
    const wrongCount = total - correctCount;

    const lines = [];
    lines.push(`Dosya: questions${fileNumber}.json`);
    lines.push(`Toplam: ${total}`);
    lines.push(`Doğru: ${correctCount}`);
    lines.push(`Yanlış: ${wrongCount}`);
    lines.push("");
    lines.push("Detaylar:");
    letters.forEach((l) => {
      const q = questions.find((x) => x.letter === l);
      const user = answers[l] ?? "";
      const status = results[l] === "correct" ? "✅ Doğru" : "❌ Yanlış";
      lines.push(
        `[${l}] ${status}\nSoru: ${q?.question ?? "-"}\nDoğru: ${q?.answer ?? "-"}\nSenin cevabın: ${user || "-"}\n`
      );
    });
    return lines.join("\n");
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      alert("Özet panoya kopyalandı!");
    } catch {
      const ta = document.getElementById("copy-summary");
      if (ta) {
        ta.select();
        document.execCommand("copy");
        alert("Seçilen metni kopyalayabilirsiniz.");
      }
    }
  };

  // Ekranlar arasında geçiş
  if (step === "start") {
    return (
      <div className="start-screen">
        <h1>Başlamak için dosya numarasını gir</h1>
        <input
          type="number"
          value={fileNumber}
          onChange={(e) => setFileNumber(e.target.value)}
          placeholder="Örn: 1"
        />
        <button onClick={handleStart}>Başla</button>
      </div>
    );
  }

  if (step === "game") {
    const activeQuestion = questions.find((q) => q.letter === active);

    return (
      <>
        {/* üst bar */}
        <div className="topbar">
          <div className="scroller">
            <div className="row">
              {letters.map((letter) => {
                const isActive = letter === active;
                const result = results[letter];
                return (
                  <button
                    key={letter}
                    className={`circle ${isActive ? "active" : ""} ${result ?? ""}`}
                    onClick={() => setActive(letter)}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* İçerik (tek editor bloğu içinde, seninki gibi) */}
        <main className="stage">
          <div className="editor">
            <h1 className="stage-text">
              {activeQuestion ? activeQuestion.question : `${active} için soru yok`}
            </h1>

            <label className="field">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${active} harfi için cevap...`}
                rows={3}
              />
            </label>

            <div className="actions">
              <button className="btn" onClick={passToNextEmpty}>
                Pas
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (step === "result") {
    const total = letters.length;
    const correctCount = letters.filter((l) => results[l] === "correct").length;
    const wrongCount = total - correctCount;

    return (
      <main className="result-page">
        <h1>Sonuç</h1>
        <p>
          Toplam: <b>{total}</b> — Doğru: <b className="ok">{correctCount}</b> — Yanlış:{" "}
          <b className="bad">{wrongCount}</b>
        </p>

        <div className="result-table">
          <div className="result-head">
            <span>Harf</span>
            <span>Soru</span>
            <span>Doğru Cevap(lar)</span>
            <span>Bizim Cevap</span>
            <span>Durum</span>
          </div>
          {letters.map((l) => {
            const q = questions.find((x) => x.letter === l);
            const user = answers[l] ?? "";
            const status = results[l] === "correct" ? "Doğru" : "Yanlış";
            return (
              <div key={l} className="result-row">
                <span className="mono">{l}</span>
                <span>{q?.question ?? "-"}</span>
                <span>{q?.answer ?? "-"}</span>
                <span>{user || "-"}</span>
                <span className={results[l] === "correct" ? "ok" : "bad"}>{status}</span>
              </div>
            );
          })}
        </div>

        <div className="copy-block">
          <textarea
            id="copy-summary"
            readOnly
            value={buildSummaryText()}
            rows={Math.min(20, 4 + letters.length * 3)}
          />
          <button className="btn primary" onClick={copySummary}>
            Sonuçları Kopyala
          </button>
          <button className="btn" onClick={() => setStep("start")}>
            Başa Dön
          </button>
        </div>
      </main>
    );
  }

  return null;
}