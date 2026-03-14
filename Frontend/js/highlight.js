/** SemantikGalaksi — Arapça Metin Kök Vurgulama */

var highlightArabicText = (text, roots) => {
    if (!roots || roots.length === 0) return text;
    const diacritics = /[\u064B-\u0650\u0652-\u0670\u065F\u06D6-\u06ED]/g;
    const normChar = c => {
        if ('\u0623\u0625\u0622\u0627\u0621\u0671'.includes(c)) return '\u0627';
        if ('\u064A\u0649\u0626'.includes(c)) return '\u064A';
        if (c === '\u0624') return '\u0648';
        if (c === '\u0629') return '\u062A';
        return c;
    };
    const isWeak = c => '\u0627\u0648\u064A'.includes(c);
    const cleanNorm = s => {
        let r = '';
        for (let i = 0; i < s.length; i++) {
            const c = s[i];
            if (c === '\u0640') continue;
            if (c === '\u0651') { if (r.length > 0) r += r[r.length - 1]; continue; }
            if (!c.match(diacritics)) r += normChar(c);
        }
        return r;
    };
    const stripPrefixes = w => {
        var forms = [w];
        if (w.length > 3 && w.startsWith('\u0627\u0644')) forms.push(w.slice(2));
        if (w.length > 3 && (w[0] === '\u0648' || w[0] === '\u0641' || w[0] === '\u0628' || w[0] === '\u0644' || w[0] === '\u0643')) {
            var rest = w.slice(1);
            forms.push(rest);
            if (rest.length > 3 && rest.startsWith('\u0627\u0644')) forms.push(rest.slice(2));
        }
        return forms;
    };
    const subseqMatch = (word, root, noWeakEquiv) => {
        let ri = 0, firstMatch = -1, lastMatch = -1;
        for (let wi = 0; wi < word.length && ri < root.length; wi++) {
            if (word[wi] === root[ri] || (!noWeakEquiv && isWeak(root[ri]) && isWeak(word[wi]))) {
                if (firstMatch < 0) firstMatch = wi;
                lastMatch = wi;
                ri++;
            }
        }
        if (ri < root.length) return false;
        return (lastMatch - firstMatch + 1) <= root.length + 2;
    };
    const rootMatchesWord = (word, root) => {
        var candidates = stripPrefixes(word);
        for (var cand of candidates) {
            if (cand.length > root.length + 5) continue;
            if (subseqMatch(cand, root)) return true;
            for (let i = 0; i < root.length; i++) {
                if (isWeak(root[i])) {
                    const reduced = root.slice(0, i) + root.slice(i + 1);
                    if (reduced.length >= 2 && subseqMatch(cand, reduced, true)) return true;
                }
            }
        }
        return false;
    };
    const rootData = roots.filter(r => r).map((r, idx) => {
        const clean = cleanNorm(r.trim()).replace(/\s/g, '');
        return { orig: r, clean, color: getRootCSSColor(r, idx) };
    }).filter(r => r.clean.length >= 2);
    let result = '', buf = '';
    for (let i = 0; i <= text.length; i++) {
        const ch = i < text.length ? text[i] : null;
        if (!ch || ch === ' ' || ch === '\u00A0') {
            if (buf) {
                const cw = cleanNorm(buf);
                let matched = false;
                if (cw.length >= 2) {
                    for (const rd of rootData) {
                        if (rootMatchesWord(cw, rd.clean)) {
                            result += `<span class="root-highlight" style="color: ${rd.color} !important">${buf}</span>`;
                            matched = true;
                            break;
                        }
                    }
                }
                if (!matched) result += buf;
                buf = '';
            }
            if (ch) result += ch;
        } else {
            buf += ch;
        }
    }
    return result;
};
