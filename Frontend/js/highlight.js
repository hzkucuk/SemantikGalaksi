/** SemantikGalaksi — Arapça Metin Kök Vurgulama */

var highlightArabicText = (text, roots) => {
    if (!roots || roots.length === 0) return text;
    const diacritics = /[\u064B-\u0670\u065F\u06D6-\u06ED]/g;
    const normChar = c => {
        if ('\u0623\u0625\u0622\u0627\u0621\u0671'.includes(c)) return '\u0627';
        if ('\u064A\u0649\u0626'.includes(c)) return '\u064A';
        if (c === '\u0624') return '\u0648';
        return c;
    };
    const isWeak = c => '\u0627\u0648\u064A'.includes(c);
    const cleanNorm = s => {
        let r = '';
        for (let i = 0; i < s.length; i++) {
            const c = s[i];
            if (c === '\u0640') continue;
            if (!c.match(diacritics)) r += normChar(c);
        }
        return r;
    };
    const subseqMatch = (word, root) => {
        let ri = 0;
        for (let wi = 0; wi < word.length && ri < root.length; wi++) {
            if (word[wi] === root[ri]) ri++;
            else if (isWeak(root[ri]) && isWeak(word[wi])) ri++;
        }
        return ri >= root.length;
    };
    const rootMatchesWord = (word, root) => {
        if (subseqMatch(word, root)) return true;
        for (let i = 0; i < root.length; i++) {
            if (isWeak(root[i])) {
                const reduced = root.slice(0, i) + root.slice(i + 1);
                if (reduced.length >= 2 && subseqMatch(word, reduced)) return true;
            }
        }
        return false;
    };
    const rootData = roots.filter(r => r).map(r => {
        const clean = cleanNorm(r.trim()).replace(/\s/g, '');
        return { orig: r, clean, color: getRootCSSColor(r) };
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
                            result += `<span class="root-highlight" style="color: ${rd.color}">${buf}</span>`;
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
