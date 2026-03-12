/** SemantikGalaksi — Ses Sistemi */

var stopAudio = () => { if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; } };
var playAudio = (url) => { if (currentAudio) stopAudio(); currentAudio = new Audio(url); currentAudio.play().catch(e => {}); };

var pcmToWav = (pcm, rate) => {
    const b = new ArrayBuffer(44 + pcm.length); const v = new DataView(b);
    const s = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    s(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, pcm.length, true);
    for (let i = 0; i < pcm.length; i++) v.setUint8(44 + i, pcm[i]); return b;
};

var speakAyah = async (text) => {
    if (!apiKey) { apiKey = await KeyManager.getWorkingKey(); }
    if (!apiKey) return false;
    stopAudio();
    if (audioCache.has(text)) { playAudio(audioCache.get(text)); return true; }
    if (isAudioLoading) return false;
    isAudioLoading = true;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Bu Türkçe metni güçlü, tok ve kararlı bir erkek sesiyle oku. Her kelimeyi aynı ses yüksekliğinde, net ve güçlü söyle. Cümle sonlarında sesi kısma, son kelimeleri de güçlü bitir: ${text}` }] }],
                generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Orus" } } } },
                model: "gemini-2.5-flash-preview-tts"
            })
        });
        if (!response.ok) {
            KeyManager.updateStatus(apiKey, 'fail');
            apiKey = await KeyManager.getWorkingKey();
            return false;
        }
        const result = await response.json();
        const part = result.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData?.data) {
            const raw = window.atob(part.inlineData.data);
            const pcm = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) pcm[i] = raw.charCodeAt(i);
            const url = URL.createObjectURL(new Blob([pcmToWav(pcm, 24000)], { type: 'audio/wav' }));
            audioCache.set(text, url);
            playAudio(url);
            return true;
        }
        console.warn('TTS: Ses verisi alınamadı', result);
        return false;
    } catch (err) { console.error('TTS hata:', err); return false; } finally { isAudioLoading = false; }
};

var speakWithBrowser = (text) => {
    if (!window.speechSynthesis) return false;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'tr-TR';
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
    return utter;
};
