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

var normalizePcm = (raw) => {
    var n = raw.length >> 1;
    var samples = new Int16Array(n);
    for (var i = 0; i < n; i++) samples[i] = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8);
    var peak = 0;
    for (var i = 0; i < n; i++) { var a = Math.abs(samples[i]); if (a > peak) peak = a; }
    if (peak === 0) peak = 1;
    var ratio = 28000 / peak;
    var out = new Uint8Array(n * 2);
    for (var i = 0; i < n; i++) {
        var s = Math.max(-32767, Math.min(32767, Math.round(samples[i] * ratio)));
        out[i * 2] = s & 0xFF;
        out[i * 2 + 1] = (s >> 8) & 0xFF;
    }
    return out;
};

var speakAyah = async (text) => {
    if (!apiKey) { apiKey = await KeyManager.getWorkingKey(); }
    if (!apiKey) return false;
    stopAudio();
    var lang = I18n.getLanguage();
    var cacheKey = lang + ':' + text;
    if (audioCache.has(cacheKey)) { playAudio(audioCache.get(cacheKey)); return true; }
    if (isAudioLoading) return false;
    isAudioLoading = true;
    try {
        var ttsPrompt = (lang === 'TR-tr') ? t('tts.promptTR') + text : t('tts.promptTranslate') + text;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: ttsPrompt }] }],
                generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Orus" } } } }
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
            const pcm = normalizePcm(raw);
            const url = URL.createObjectURL(new Blob([pcmToWav(pcm, 24000)], { type: 'audio/wav' }));
            audioCache.set(cacheKey, url);
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
    var langMap = { 'TR-tr': 'tr-TR', 'EN-en': 'en-US', 'RU-ru': 'ru-RU', 'IT-it': 'it-IT', 'ES-es': 'es-ES' };
    utter.lang = langMap[I18n.getLanguage()] || 'tr-TR';
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
    return utter;
};
