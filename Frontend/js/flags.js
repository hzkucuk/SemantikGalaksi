/** SemantikGalaksi — Ülke Bayrakları SVG Haritası
 *  Locale kodundan (TR-tr, EN-en, DE-de vb.) SVG bayrak döndürür.
 *  Bilinmeyen kodlar için otomatik renkli placeholder üretir.
 *  Bağımlılıklar: Yok (i18n.js'ten önce yüklenmeli)
 *
 *  Kullanım:
 *    CountryFlags.get('TR-tr')   → Türk bayrağı SVG
 *    CountryFlags.get('DE-de')   → Alman bayrağı SVG
 *    CountryFlags.get('XX-xx')   → "XX" yazılı renkli placeholder
 */

var CountryFlags = (function () {

    var W = 20, H = 14, VB = '0 0 30 20';
    var S = 'style="vertical-align:middle;border-radius:2px;"';

    // ════════════════════════════════════════════════════════════
    // SVG BAYRAK HARİTASI — Dil kodu (büyük harf, ör: "TR") → SVG
    // ════════════════════════════════════════════════════════════

    var _flags = {

        // ── Türkiye ──
        TR: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#E30A17"/><circle cx="11" cy="10" r="6" fill="#fff"/><circle cx="12.8" cy="10" r="4.8" fill="#E30A17"/><polygon points="17,10 14.5,8.2 15.7,11 13.2,9 16.3,9" fill="#fff"/></svg>',

        // ── Birleşik Krallık ──
        EN: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#012169"/><path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" stroke-width="3"/><path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" stroke-width="1.5"/><path d="M15,0 V20 M0,10 H30" stroke="#fff" stroke-width="5"/><path d="M15,0 V20 M0,10 H30" stroke="#C8102E" stroke-width="3"/></svg>',

        // ── Rusya ──
        RU: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0039A6"/><rect y="13.33" width="30" height="6.67" fill="#D52B1E"/></svg>',

        // ── İtalya ──
        IT: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#CE2B37"/></svg>',

        // ── İspanya ──
        ES: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="5" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/><rect y="15" width="30" height="5" fill="#AA151B"/></svg>',

        // ── Almanya ──
        DE: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#DD0000"/><rect y="13.33" width="30" height="6.67" fill="#FFCC00"/></svg>',

        // ── Fransa ──
        FR: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="10" height="20" fill="#002395"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ED2939"/></svg>',

        // ── Portekiz ──
        PT: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="12" height="20" fill="#006600"/><rect x="12" width="18" height="20" fill="#FF0000"/><circle cx="12" cy="10" r="3.5" fill="#FFCC00"/></svg>',

        // ── Hollanda ──
        NL: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#AE1C28"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#21468B"/></svg>',

        // ── Polonya ──
        PL: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#DC143C"/></svg>',

        // ── Ukrayna ──
        UK: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="10" fill="#005BBB"/><rect y="10" width="30" height="10" fill="#FFD500"/></svg>',

        // ── İsveç ──
        SV: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#006AA7"/><rect x="9" width="4" height="20" fill="#FECC00"/><rect y="8" width="30" height="4" fill="#FECC00"/></svg>',

        // ── Norveç ──
        NO: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#BA0C2F"/><rect x="8" width="6" height="20" fill="#fff"/><rect y="7" width="30" height="6" fill="#fff"/><rect x="9.5" width="3" height="20" fill="#00205B"/><rect y="8.5" width="30" height="3" fill="#00205B"/></svg>',

        // ── Danimarka ──
        DA: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#C8102E"/><rect x="8" width="4" height="20" fill="#fff"/><rect y="8" width="30" height="4" fill="#fff"/></svg>',

        // ── Finlandiya ──
        FI: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#fff"/><rect x="8" width="4" height="20" fill="#003580"/><rect y="8" width="30" height="4" fill="#003580"/></svg>',

        // ── Yunanistan ──
        EL: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#0D5EAF"/><rect y="2.22" width="30" height="2.22" fill="#fff"/><rect y="6.67" width="30" height="2.22" fill="#fff"/><rect y="11.11" width="30" height="2.22" fill="#fff"/><rect y="15.56" width="30" height="2.22" fill="#fff"/><rect width="11" height="11.11" fill="#0D5EAF"/><rect x="4" y="3.3" width="3" height="0.8" fill="#fff"/><rect x="4.8" y="2" width="1.4" height="7" fill="#fff"/><rect x="1" y="4.5" width="9" height="1.4" fill="#fff"/></svg>',

        // ── Macaristan ──
        HU: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#CE2939"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#477050"/></svg>',

        // ── Çekya ──
        CS: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#D7141A"/><polygon points="0,0 14,10 0,20" fill="#11457E"/></svg>',

        // ── Romanya ──
        RO: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="10" height="20" fill="#002B7F"/><rect x="10" width="10" height="20" fill="#FCD116"/><rect x="20" width="10" height="20" fill="#CE1126"/></svg>',

        // ── Bulgaristan ──
        BG: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#00966E"/><rect y="13.33" width="30" height="6.67" fill="#D62612"/></svg>',

        // ── Hırvatistan ──
        HR: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#FF0000"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#171796"/></svg>',

        // ── Sırbistan ──
        SR: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#C6363C"/><rect y="6.67" width="30" height="6.67" fill="#0C4076"/><rect y="13.33" width="30" height="6.67" fill="#fff"/></svg>',

        // ── Slovakya ──
        SK: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0B4EA2"/><rect y="13.33" width="30" height="6.67" fill="#EE1C25"/></svg>',

        // ── Slovenya ──
        SL: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#003DA5"/><rect y="13.33" width="30" height="6.67" fill="#ED1C24"/></svg>',

        // ── Japonya ──
        JA: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5.5" fill="#BC002D"/></svg>',

        // ── Çin (Basitleştirilmiş) ──
        ZH: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#DE2910"/><polygon points="5,3 5.9,5.8 3,4.2 7,4.2 4.1,5.8" fill="#FFDE00"/><polygon points="10,1.5 10.3,2.4 9.5,1.9 10.5,1.9 9.7,2.4" fill="#FFDE00"/><polygon points="12,3.5 12.3,4.4 11.5,3.9 12.5,3.9 11.7,4.4" fill="#FFDE00"/><polygon points="12,6 12.3,6.9 11.5,6.4 12.5,6.4 11.7,6.9" fill="#FFDE00"/><polygon points="10,8 10.3,8.9 9.5,8.4 10.5,8.4 9.7,8.9" fill="#FFDE00"/></svg>',

        // ── Kore ──
        KO: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5" fill="#CD2E3A"/><path d="M10,10 Q15,5 20,10 Q15,15 10,10" fill="#0047A0"/></svg>',

        // ── Arapça (Suudi Arabistan) ──
        AR: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#006C35"/><text x="15" y="10" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="5" font-family="serif">لا إله إلا الله</text></svg>',

        // ── Farsça (İran) ──
        FA: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#239F40"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#DA0000"/></svg>',

        // ── Urduca (Pakistan) ──
        UR: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="7" height="20" fill="#fff"/><rect x="7" width="23" height="20" fill="#01411C"/><circle cx="19" cy="10" r="5" fill="#fff"/><circle cx="20.2" cy="10" r="4" fill="#01411C"/><polygon points="22,7 21.3,9 23,8 21,8 22.7,9" fill="#fff"/></svg>',

        // ── Hintçe (Hindistan) ──
        HI: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#FF9933"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#138808"/><circle cx="15" cy="10" r="2.5" fill="none" stroke="#000080" stroke-width="0.5"/></svg>',

        // ── Bengalce (Bangladeş) ──
        BN: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#006A4E"/><circle cx="13" cy="10" r="5" fill="#F42A41"/></svg>',

        // ── Tay ──
        TH: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="3.33" fill="#A51931"/><rect y="3.33" width="30" height="3.33" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#2D2A4A"/><rect y="13.33" width="30" height="3.33" fill="#fff"/><rect y="16.67" width="30" height="3.33" fill="#A51931"/></svg>',

        // ── Vietnamca ──
        VI: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#DA251D"/><polygon points="15,4 16.5,8.5 12,6 18,6 13.5,8.5" fill="#FFFF00"/></svg>',

        // ── Endonezce ──
        ID: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="10" fill="#FF0000"/><rect y="10" width="30" height="10" fill="#fff"/></svg>',

        // ── Malayca ──
        MS: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#CC0001"/><rect width="30" height="2.86" fill="#fff"/><rect y="5.71" width="30" height="2.86" fill="#fff"/><rect y="11.43" width="30" height="2.86" fill="#fff"/><rect y="17.14" width="30" height="2.86" fill="#fff"/><rect width="15" height="11.43" fill="#010066"/><circle cx="6" cy="5.7" r="3.5" fill="#FC0"/><circle cx="7.2" cy="5.7" r="2.8" fill="#010066"/><polygon points="9,3 9.5,4.5 8,3.6 10,3.6 8.5,4.5" fill="#FC0"/></svg>',

        // ── İbranice (İsrail) ──
        HE: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#fff"/><rect y="1" width="30" height="3.5" fill="#0038B8"/><rect y="15.5" width="30" height="3.5" fill="#0038B8"/><polygon points="15,5.5 17.5,12.5 12.5,12.5" fill="none" stroke="#0038B8" stroke-width="0.8"/><polygon points="15,13 12.5,6 17.5,6" fill="none" stroke="#0038B8" stroke-width="0.8"/></svg>',

        // ── Swahili (Kenya) ──
        SW: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="5" fill="#000"/><rect y="4" width="30" height="1.5" fill="#fff"/><rect y="5.5" width="30" height="9" fill="#BB0000"/><rect y="14.5" width="30" height="1.5" fill="#fff"/><rect y="16" width="30" height="4" fill="#006600"/></svg>',

        // ── Azerbaycan ──
        AZ: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#0092BC"/><rect y="6.67" width="30" height="6.67" fill="#E4002B"/><rect y="13.33" width="30" height="6.67" fill="#00AF66"/><circle cx="14" cy="10" r="3" fill="#fff"/><circle cx="15" cy="10" r="2.5" fill="#E4002B"/><polygon points="17.5,9 17.1,10 18,10.5 17,10.3 17,11 16.7,10 16,10.5 16.5,9.8 16,9 17,9.5" fill="#fff"/></svg>',

        // ── Gürcüce ──
        KA: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#fff"/><rect x="13" width="4" height="20" fill="#FF0000"/><rect y="8" width="30" height="4" fill="#FF0000"/></svg>',

        // ── Kazakça ──
        KK: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#00AFCA"/><circle cx="15" cy="10" r="5" fill="#FEC50C"/><circle cx="15" cy="10" r="3.5" fill="#00AFCA"/></svg>',

        // ── Özbekçe ──
        UZ: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6" fill="#0099B5"/><rect y="6" width="30" height="1" fill="#CE1126"/><rect y="7" width="30" height="6" fill="#fff"/><rect y="13" width="30" height="1" fill="#CE1126"/><rect y="14" width="30" height="6" fill="#1EB53A"/><circle cx="6" cy="3" r="2" fill="#fff"/><circle cx="7" cy="3" r="1.8" fill="#0099B5"/></svg>',

        // ── Kürtçe (Kürdistan) ──
        KU: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#ED2024"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#21B14B"/><circle cx="15" cy="10" r="4" fill="#FECE07"/></svg>',

        // ── Boşnakça ──
        BS: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#002395"/><polygon points="6,0 22,20 6,20" fill="#FECB00"/><polygon points="8,2.5 8.4,3.5 7.5,3 8.7,3 7.8,3.5" fill="#fff"/><polygon points="10,5 10.4,6 9.5,5.5 10.7,5.5 9.8,6" fill="#fff"/><polygon points="12,7.5 12.4,8.5 11.5,8 12.7,8 11.8,8.5" fill="#fff"/></svg>',

        // ── Arnavutça ──
        SQ: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="20" fill="#E41E20"/><text x="15" y="11" text-anchor="middle" dominant-baseline="central" fill="#000" font-size="10">☗</text></svg>',

        // ── Litvanyaca ──
        LT: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#FDB913"/><rect y="6.67" width="30" height="6.67" fill="#006A44"/><rect y="13.33" width="30" height="6.67" fill="#C1272D"/></svg>',

        // ── Letonca ──
        LV: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="8" fill="#9E3039"/><rect y="8" width="30" height="4" fill="#fff"/><rect y="12" width="30" height="8" fill="#9E3039"/></svg>',

        // ── Estonca ──
        ET: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="6.67" fill="#0072CE"/><rect y="6.67" width="30" height="6.67" fill="#000"/><rect y="13.33" width="30" height="6.67" fill="#fff"/></svg>',

        // ── Filipince / Tagalog ──
        TL: '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '><rect width="30" height="10" fill="#0038A8"/><rect y="10" width="30" height="10" fill="#CE1126"/><polygon points="0,0 14,10 0,20" fill="#fff"/><circle cx="5" cy="10" r="2" fill="#FCD116"/></svg>'
    };

    // ════════════════════════════════════════════════════════════
    // FALLBACK — Bilinmeyen kod için renkli placeholder üretir
    // ════════════════════════════════════════════════════════════

    var _hashColor = function (code) {
        var h = 0;
        for (var i = 0; i < code.length; i++) {
            h = code.charCodeAt(i) + ((h << 5) - h);
        }
        var hue = Math.abs(h) % 360;
        return 'hsl(' + hue + ',55%,45%)';
    };

    var _fallback = function (code) {
        var c = code.split('-')[0].toUpperCase().substring(0, 2);
        var bg = _hashColor(c);
        return '<svg viewBox="' + VB + '" width="' + W + '" height="' + H + '" ' + S + '>' +
            '<rect width="30" height="20" rx="2" fill="' + bg + '"/>' +
            '<text x="15" y="11" text-anchor="middle" dominant-baseline="central" ' +
            'fill="#fff" font-size="9" font-weight="bold" font-family="system-ui,sans-serif">' + c + '</text></svg>';
    };

    // ════════════════════════════════════════════════════════════
    // PUBLIC API
    // ════════════════════════════════════════════════════════════

    return {
        /**
         * Locale kodundan SVG bayrak döndürür.
         * @param {string} localeCode — "TR-tr", "DE-de", "EN-en" vb.
         * @returns {string} Inline SVG string
         */
        get: function (localeCode) {
            var key = (localeCode || '').split('-')[0].toUpperCase();
            return _flags[key] || _fallback(localeCode || '??');
        },

        /**
         * Kayıtlı bayrak var mı kontrol eder.
         * @param {string} localeCode
         * @returns {boolean}
         */
        has: function (localeCode) {
            var key = (localeCode || '').split('-')[0].toUpperCase();
            return key in _flags;
        },

        /**
         * Mevcut bayrak kodlarını döndürür.
         * @returns {string[]}
         */
        codes: function () {
            return Object.keys(_flags);
        }
    };

})();
