import { useEffect, useRef, useState } from 'react';
import { copy, languages } from '../i18n';

export default function AudioPlayer({ text, language }) {
  const labels = copy[language].specimen;
  const [status, setStatus] = useState("idle");
  const utteranceRef = useRef(null);
  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  useEffect(() => {
    setStatus("idle");
    return () => {
      // Invalida callbacks tardios antes de cancelar a versão anterior.
      utteranceRef.current = null;
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported, text, language]);

  const play = () => {
    if (!supported || !text) return;
    const synth = window.speechSynthesis;

    if (status === "speaking" && utteranceRef.current) {
      synth.pause();
      setStatus("paused");
      return;
    }

    if (status === "paused" && utteranceRef.current) {
      synth.resume();
      setStatus("speaking");
      return;
    }

    utteranceRef.current = null;
    synth.cancel();
    // Cancelar remove a fila, mas pode manter o sintetizador pausado.
    if (synth.paused) synth.resume();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languages[language].locale;
    utterance.rate = 0.95;
    const voices = synth.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase() === utterance.lang.toLowerCase()) ?? voices.find((item) => item.lang.toLowerCase().startsWith(language));
    if (voice) utterance.voice = voice;
    utteranceRef.current = utterance;
    utterance.onstart = () => {
      if (utteranceRef.current === utterance) setStatus("speaking");
    };
    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setStatus("idle");
      }
    };
    utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setStatus("error");
      }
    };
    synth.speak(utterance);
    setStatus("speaking");
  };

  const label = !supported
    ? labels.listenUnavailable
    : status === "speaking"
      ? labels.pause
      : status === "paused"
        ? labels.continue
        : labels.play;
  const textLabel = !supported
    ? labels.listenUnavailable
    : status === "speaking"
      ? labels.listenSpeaking
    : status === "paused"
        ? labels.listenPaused
        : status === "error"
          ? labels.listenError
          : labels.listenIdle;

  return (
    <div className="audio">
      <button onClick={play} disabled={!supported || !text} aria-label={label}>
        {status === "speaking" ? "Ⅱ" : "▶"}
      </button>
      <span aria-live="polite">{textLabel}</span>
      <div className="audio-line" aria-hidden="true">
        <i className={status === "speaking" ? "playing" : ""} />
      </div>
      <small>
        {supported ? labels.nativeVoice : labels.listenUnavailable}
      </small>
    </div>
  );
}

