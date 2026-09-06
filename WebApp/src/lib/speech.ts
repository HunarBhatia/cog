/**
 * Web Speech Synthesis Utility for Cogniva Voice Companion
 */

export function speakAnnouncement(text: string, rate: number = 0.88, pitch: number = 1.05): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Speech Synthesis is not supported in this environment.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;
  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
