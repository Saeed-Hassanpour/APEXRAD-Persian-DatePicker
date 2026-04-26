/**
 * Iranian (Solar Hijri / Jalali) Calendar — Standalone Library
 * Extracted from jquery.calendars.iranian.js by Keith Wood (MIT licence)
 * Adapted to work WITHOUT any external dependencies (no $.calendars needed).
 *
 * Exposed as: window.IranianCal
 *
 * API:
 *   IranianCal.toIranian(gYear, gMonth, gDay)     → {y, m, d}
 *   IranianCal.toGregorian(iYear, iMonth, iDay)    → {gy, gm, gd}
 *   IranianCal.today()                             → {y, m, d}
 *   IranianCal.daysInMonth(year, month)            → number
 *   IranianCal.isLeap(year)                        → boolean
 *   IranianCal.dayOfWeek(iYear, iMonth, iDay)      → 0-6 (0=Sat … 6=Fri)
 *   IranianCal.isValid(y, m, d)                    → boolean
 *   IranianCal.format(y, m, d, fmt, usePersian)    → string
 *   IranianCal.parse(str, fmt)                     → {y,m,d} or null
 *   IranianCal.toPersian(str)                      → string with Persian digits
 *   IranianCal.toLatin(str)                        → string with Latin digits
 *
 * Month names (Farsi):
 *   IranianCal.monthNames[0..11]
 *   IranianCal.monthNamesShort[0..11]
 *
 * Day names (Farsi):  dayNames[0..6]  0=Sat … 6=Fri
 *
 * Algorithm credit: Keith Wood, kbwood.au@gmail.com, March 2025 (MIT)
 */
(function (global) {
  'use strict';

  /* ── Helper arithmetic ────────────────────────────────────────── */
  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  /* ── Special year boundaries for leap calculation ─────────────── */
  var SPECIAL = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181,
                 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  var LAST = SPECIAL.length - 1;

  /* ── Days per month (common year) ────────────────────────────── */
  var DAYS_PER_MONTH = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

  /* ── Persian digits ───────────────────────────────────────────── */
  var FA_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];

  function toPersian(str) {
    return String(str).replace(/[0-9]/g, function(d) { return FA_DIGITS[+d]; });
  }
  function toLatin(str) {
    return String(str)
      .replace(/[۰-۹]/g, function(d) { return FA_DIGITS.indexOf(d); })
      .replace(/[٠-٩]/g, function(d) { return d.charCodeAt(0) - 0x0660; });
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* ── Year info ─────────────────────────────────────────────────── */
  function yearInfo(year) {
    if (year < 0) { year++; }
    var gy = year + 621;
    var m  = -14;
    var prevSpec = SPECIAL[0];
    var specDiff;
    for (var i = 1; i <= LAST && (specDiff = SPECIAL[i] - prevSpec, SPECIAL[i] <= year); i++) {
      m += 8 * div(specDiff, 33) + div(mod(specDiff, 33), 4);
      prevSpec = SPECIAL[i];
    }
    var offset = year - prevSpec;
    m += 8 * div(offset, 33) + div(mod(offset, 33) + 3, 4);
    if (mod(specDiff, 33) === 4 && specDiff - offset === 4) { m++; }
    var r     = div(gy, 4) - div(3 * (div(gy, 100) + 1), 4) - 150;
    var march = 20 + m - r;
    if (specDiff - offset < 6) {
      offset = offset - specDiff + 33 * div(specDiff + 4, 33);
    }
    var leap = mod(mod(offset + 1, 33) - 1, 4);
    leap = (leap === -1 ? 4 : leap);
    return { gy: gy, leap: leap, march: march };
  }

    function g2d(year, month, day) {
    var i = ~~(1461 * (year + ~~((month - 8) / 6) + 100100) / 4) +
            ~~((153 * ((month + 9) % 12) + 2) / 5) + day - 34840408;
    return i - ~~(3 * ~~((year + 100100 + ~~((month - 8) / 6)) / 100) / 4) + 752 - 0.5;
  }

  function d2gy(jd) {
    var i  = 4 * (jd + 0.5) + 139361631 +
             4 * ~~(3 * ~~((4 * (jd + 0.5) + 183187720) / 146097) / 4) - 3908;
    var j  = 5 * ~~((i % 1461) / 4) + 308;
    var gm = (~~(j / 153) % 12) + 1;
    var gd = ~~((j % 153) / 5) + 1;
    var gy = ~~(i / 1461) - 100100 + ~~((8 - gm) / 6);
    return { gy: gy, gm: gm, gd: gd };
  }

  /* Use JS Date arithmetic for Jalali->Gregorian — immune to JDN rounding bugs */
  function iranianToJSDate(iy, im, id) {
    var info = yearInfo(iy);
    var nowruz = new Date(info.gy, 2, info.march); // 2 = March
    var dayOfYear = (im <= 6)
      ? (im - 1) * 31 + (id - 1)
      : 186 + (im - 7) * 30 + (id - 1);
    return new Date(nowruz.getTime() + dayOfYear * 86400000);
  }

  function jdToIranian(jd) {
    jd = Math.floor(jd) + 0.5;
    var g = d2gy(jd);
    var iy = g.gy - 621;
    var info = yearInfo(iy);
    var jdN = g2d(g.gy, 3, info.march);
    var k   = Math.floor(jd - jdN);
    if (k >= 0) {
      if (k <= 185) {
        var im = 1 + ~~(k / 31);
        var id = (k % 31) + 1;
        return { y: iy, m: im, d: id };
      }
      k -= 186;
    } else {
      iy--;
      info = yearInfo(iy);
      k += 179;
      if (info.leap === 1) { k++; }
    }
    var im2 = 7 + ~~(k / 30);
    var id2 = (k % 30) + 1;
    return { y: iy, m: im2, d: id2 };
  }

  var IranianCal = {

    monthNames: ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
                 'مهر','آبان','آذر','دی','بهمن','اسفند'],
    monthNamesShort: ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
                      'مهر','آبان','آذر','دی','بهمن','اسفند'],
    // 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
    dayNames: ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'],

    toPersian: toPersian,
    toLatin:   toLatin,

    toIranian: function(gy, gm, gd) {
      return jdToIranian(g2d(gy, gm, gd));
    },

    toGregorian: function(iy, im, id) {
      var jsDate = iranianToJSDate(iy, im, id);
      return { gy: jsDate.getFullYear(), gm: jsDate.getMonth()+1, gd: jsDate.getDate() };
    },

    today: function() {
      var now = new Date();
      return IranianCal.toIranian(now.getFullYear(), now.getMonth()+1, now.getDate());
    },

    isLeap: function(year) {
      return yearInfo(year).leap === 0;
    },

    daysInMonth: function(year, month) {
      if (month < 1 || month > 12) return 0;
      if (month <= 6) return 31;
      if (month <= 11) return 30;
      return IranianCal.isLeap(year) ? 30 : 29;
    },

    dayOfWeek: function(iy, im, id) {
      var jsDate = iranianToJSDate(iy, im, id);
      return (jsDate.getDay() + 1) % 7;
    },

    isValid: function(y, m, d) {
      if (!y || m < 1 || m > 12 || d < 1) return false;
      return d <= IranianCal.daysInMonth(y, m);
    },

    /**
     * Format Iranian date to string.
     * Supported tokens (applied in this order):
     *   fmDay    → weekday name (دوشنبه etc.)
     *   fmMonth  → full month name (فروردین etc.)
     *   fmDD     → day without leading zero (۱ or 1)
     *   MON      → full month name (alias for fmMonth)
     *   YYYY     → 4-digit year
     *   YYY      → 4-digit year (alias, same)
     *   MM       → 2-digit month number
     *   DD       → 2-digit day
     *   HH:MI    → hour:minute placeholder (kept as-is, caller appends time)
     */
    format: function(y, m, d, fmt, usePersian, hh, mi) {
      fmt = fmt || 'YYYY/MM/DD';
      hh = (hh !== undefined) ? hh : 0;
      mi = (mi !== undefined) ? mi : 0;

      var monthName = IranianCal.monthNames[m - 1] || '';
      var dow       = IranianCal.dayOfWeek(y, m, d);
      var dayName   = IranianCal.dayNames[dow] || '';
      var dNoZero   = String(d);
      var hStr      = pad2(hh);
      var mStr      = pad2(mi);

      var result = fmt
        .replace(/fmDay/g,   dayName)
        .replace(/fmMonth/g, monthName)
        .replace(/fmDD/g,    dNoZero)
        .replace(/MON/g,     monthName)
        .replace(/YYYY|YYY/g, String(y))
        .replace(/MM/g,      pad2(m))
        .replace(/DD/g,      pad2(d))
        .replace(/HH:MI/g,   hStr + ':' + mStr);

      return usePersian ? toPersian(result) : result;
    },

    /**
     * Parse Iranian date string → {y, m, d} or null.
     * Only parses numeric formats (YYYY/MM/DD, DD/MM/YYYY, YYYY-MM-DD etc.)
     * Non-numeric display formats (month names, day names) are not parsed.
     */
    parse: function(str, fmt) {
      if (!str) return null;
      str = toLatin(String(str).trim());
      fmt = (fmt || 'YYYY/MM/DD').toUpperCase();

      // Only attempt parse for numeric-only formats
      var yIdx = fmt.indexOf('YYYY');
      var mIdx = fmt.indexOf('MM');
      var dIdx = fmt.indexOf('DD');
      if (yIdx < 0 || mIdx < 0 || dIdx < 0) return null;

      var sepMatch = str.match(/[^0-9]/);
      var sep = sepMatch ? sepMatch[0] : '/';
      var parts = str.split(sep);
      if (parts.length < 3) return null;

      var order = [
        { t: 'y', i: yIdx },
        { t: 'm', i: mIdx },
        { t: 'd', i: dIdx }
      ].sort(function(a, b){ return a.i - b.i; });

      var vals = {};
      for (var i = 0; i < 3; i++) {
        vals[order[i].t] = parseInt(parts[i], 10);
      }
      if (!vals.y || !vals.m || !vals.d) return null;
      if (!IranianCal.isValid(vals.y, vals.m, vals.d)) return null;
      return { y: vals.y, m: vals.m, d: vals.d };
    },

    compare: function(a, b) {
      if (a.y !== b.y) return a.y < b.y ? -1 : 1;
      if (a.m !== b.m) return a.m < b.m ? -1 : 1;
      if (a.d !== b.d) return a.d < b.d ? -1 : 1;
      return 0;
    }
  };

  global.IranianCal = IranianCal;

}(typeof window !== 'undefined' ? window : this));
