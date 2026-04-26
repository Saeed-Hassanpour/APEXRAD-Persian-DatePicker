/*
 *  Oracle APEX Persian (Jalali/Iranian) Date Picker
 *  Plugin: INFO.APEXRAD.PERSIANDATEPICKER
 *  APEX versions: 24.2+
 *  Created By Saeed Hassanpour
 *  Company : Paya Shetaban Andisheh(APEXRAD)- https://apexrad.info
 *  Date    : 2026/04
 *  Telegram: @SaeedHassanpour | @apexrad
 *  Twitter : @HassanpourSaeed
 *  Email   : info@apexrad.info
 */
/**
 * @namespace apexrad
 */
var apexrad = apexrad || {};

;(function ($, apex, IC, apexrad, undefined) {
  'use strict';

  if (!IC) {
    console.error('[apexrad.PDP] IranianCal not found — load jalali-calendar.js first');
    return;
  }

  var PLUGIN_NAME = 'apexradPersianDatePicker';


  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function isPageRTL() { return $('html').hasClass('u-RTL'); }

  function parseHolidays(str, offset) {
    var set = {};
    if (!str) return set;
    offset = offset || 0;
    var entries = IC.toLatin(String(str)).split(',');
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i].trim().replace(/-/g, '/');
      var parts = e.split('/');
      if (parts.length !== 3) continue;
      var y = parseInt(parts[0],10) - offset;
      var m = parseInt(parts[1],10), d = parseInt(parts[2],10);
      if (y && m && d) set[y+'/'+m+'/'+d] = true;
    }
    return set;
  }

  function holidayKey(d) { return d.y+'/'+d.m+'/'+d.d; }

  /** Parse comma-separated year list: "1404,1405,1406" → Set {1404:true,...} */
  function parseYearRange(str, offset) {
    var set = {};
    if (!str) return set;
    offset = offset || 0;
    IC.toLatin(String(str)).split(',').forEach(function(v) {
      var n = parseInt(v.trim(), 10);
      if (n) set[n - offset] = true;
    });
    return set;
  }

  /** Parse comma-separated month list: "01,03,06" → Set {1:true,3:true,6:true} */
  function parseMonthRange(str) {
    var set = {};
    if (!str) return set;
    IC.toLatin(String(str)).split(',').forEach(function(v) {
      var n = parseInt(v.trim(), 10);
      if (n >= 1 && n <= 12) set[n] = true;
    });
    return set;
  }

  /**
   * Parse holiday JSON.
   * Input may be:
   *   - a string  : '[{"date":"1405-01-01","name":"نوروز"},...]'
   *   - an Array  : jQuery's .data() auto-parses valid JSON attributes into objects
   * Returns: { "1405/1/1": "نوروز", ... }  keyed as y/m/d (no leading zeros, matches holidayKey)
   */
  function parseHolidayJson(input, offset) {
    offset = offset || 0;
    var map = {};
    if (!input) return map;
    var arr;
    try {
      if (Array.isArray(input)) {
        // jQuery already parsed the JSON attribute into an array — use directly
        arr = input;
      } else if (typeof input === 'object') {
        arr = [input];
      } else {
        // Plain string — parse it (do NOT call toLatin on the whole JSON)
        arr = JSON.parse(String(input).trim());
      }
      if (!Array.isArray(arr)) return map;
      arr.forEach(function(item) {
        if (!item || !item.date) return;
        // Only convert digits in the date field, never in the name
        var dateLatin = IC.toLatin(String(item.date)).trim().replace(/-/g, '/');
        var parts = dateLatin.split('/');
        if (parts.length !== 3) return;
        var y = parseInt(parts[0], 10) - offset;
        var m = parseInt(parts[1], 10),
            d = parseInt(parts[2], 10);
        if (!y || !m || !d) return;
        var key = y + '/' + m + '/' + d;    // matches holidayKey() format
        var name = String(item.name || '');
        map[key] = map[key] ? map[key] + ' / ' + name : name;
      });
    } catch(e) {
      // silent fail — return whatever was built
    }
    return map;
  }

  function resolveDateBound(type, itemName, staticVal, rFmt) {
    if (!type || type === 'none') return null;
    var raw = '';
    if (type === 'item') {
      try { raw = apex.item(itemName).getValue(); } catch(e) { raw = ''; }
    } else if (type === 'static') {
      raw = staticVal || '';
    }
    if (!raw) return null;
    return IC.parse(IC.toLatin(String(raw).trim()), rFmt) || null;
  }

  /**
   * Parse manual input that may include time.
   * Returns { date: {y,m,d}, h: number, m: number } or null.
   * rFmt is the RETURN format (always numeric, e.g. YYYY/MM/DD).
   */
  function parseManualWithTime(raw, dFmt, hasTime) {
    raw = IC.toLatin(String(raw || '').trim());
    raw = raw.replace(/[\u06F0-\u06F9]/g, function(c){ return c.charCodeAt(0) - 0x06F0; });
    if (!raw) return null;
    var h = 0, mi = 0;
    var tMatch = raw.match(/(\d{1,2}):(\d{2})$/);
    if (tMatch) {
      h  = Math.min(23, Math.max(0, +tMatch[1]));
      mi = Math.min(59, Math.max(0, +tMatch[2]));
      raw = raw.slice(0, raw.length - tMatch[0].length).trim().replace(/[-\s]+$/, '');
    }
    var fUp = (dFmt || 'YYYY/MM/DD').toUpperCase();
    var d   = null;
    if (fUp === 'YYYY/MON' || fUp === 'FMMONTH') return null;
    if (fUp.indexOf('MON') >= 0 && fUp.indexOf('YYYY') >= 0) {
      var parts = raw.split(/[-\/]/);
      if (parts.length >= 3) {
        var yPos = fUp.indexOf('YYYY'), mPos = fUp.indexOf('MON');
        var dPos = fUp.indexOf('FMDD') >= 0 ? fUp.indexOf('FMDD') : fUp.indexOf('DD');
        var order = [{t:'y',i:yPos},{t:'m',i:mPos},{t:'d',i:dPos}]
                    .sort(function(a,b){ return a.i - b.i; });
        var v = {};
        for (var i = 0; i < 3; i++) {
          var tok = order[i].t, val = (parts[i] || '').trim();
          if      (tok === 'y') v.y = parseInt(val, 10);
          else if (tok === 'd') v.d = parseInt(val, 10);
          else                  v.m = parseMonthName(val);
        }
        if (v.y && v.m && v.d && IC.isValid(v.y, v.m, v.d)) d = {y:v.y,m:v.m,d:v.d};
      }
    }
    if (!d && fUp.indexOf('FMDAY') >= 0 && fUp.indexOf('FMMONTH') >= 0) {
      var s2 = raw.replace(/^[^\d]+/, '').replace(/[\u060C,]/g, ' ').trim();
      var sp = s2.split(/\s+/);
      if (sp.length >= 3) {
        var dd2=parseInt(sp[0],10), mm2=parseMonthName(sp[1]), yy2=parseInt(sp[sp.length-1],10);
        if (dd2 && mm2 && yy2 && IC.isValid(yy2,mm2,dd2)) d={y:yy2,m:mm2,d:dd2};
      }
    }
    if (!d) d = IC.parse(raw, dFmt);
    if (!d) return null;
    return { date: d, h: h, m: mi };
  }

  var MONTH_FA = ['','فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

  function parseMonthName(str) {
    str = String(str || '').trim();
    for (var i = 1; i <= 12; i++) { if (MONTH_FA[i] === str) return i; }
    return 0;
  }

  function safeReturnFmt(fmt) {
    return /MON|fmMonth|fmDay/i.test(fmt) ? 'YYYY/MM/DD' : fmt;
  }

  function normalizeJalaliValue(val) {
    if (!val) return val;
    val = IC.toLatin(String(val).trim());
    var tm = '', datepart = val;
    var tMatch = val.match(/ (\d{1,2}:\d{2})$/);
    if (tMatch) {
      var hp = tMatch[1].split(':');
      tm = ' ' + ('0'+hp[0]).slice(-2) + ':' + ('0'+hp[1]).slice(-2);
      datepart = val.slice(0, val.length - tMatch[0].length);
    }
    var m = datepart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m && +m[3] >= 1300 && +m[3] <= 1500) {
      datepart = m[3] + '/' + ('0'+m[1]).slice(-2) + '/' + ('0'+m[2]).slice(-2);
    }
    return datepart + tm;
  }

  var DEFAULTS = {
    displayFormat:    'YYYY/MM/DD',
    returnFormat:     'YYYY/MM/DD',
    usePersianDigits: true,
    showTodayButton:  true,
    showClearButton:  true,
    showTime:         false,
    allowManualInput: false,
    showOn:           'button',
    holidays:         {},
    disableHoliday:   false,
    showYear:         true,
    showMonth:        true,
    displayAs:        'popup',   // 'popup' | 'inline'
    calendarYear:     'jalali',  // 'jalali' | 'imperial' (display only; session always Jalali)
    minDateType:      'none',
    minDateItem:      '',
    minDateStatic:    '',
    maxDateType:      'none',
    maxDateItem:      '',
    maxDateStatic:    '',
    yearRange:        {},   // set of allowed years {} = all
    monthRange:       {},   // set of allowed months {} = all
    holidayJson:      {},   // map of date → name for tooltip
    disabled:         false,
    placeholder:      'انتخاب تاریخ'
  };

  
  apexrad.getAuthor = function () {
    return 'Saeed Hassanpour | Paya Shetaban Andisheh (APEXRAD) | https://apexrad.info';
  };


  /* ── Imperial year helper ─────────────────────────────────────
   * Returns the display year for the calendar header and formatted
   * string. Internal dates (_sel, _view) are ALWAYS Jalali.
   * Imperial = Jalali + 1180  (e.g. 1405 → 2585)
   */
  function imperialOffset(opts) {
    return opts.calendarYear === 'imperial' ? 1180 : 0;
  }

  /* ═══════════════════════════════════════════════════════════════
   * Widget
   * ═══════════════════════════════════════════════════════════════ */
  function PDP(el, opts) {
    this.$el         = $(el);
    this.opts        = $.extend({}, DEFAULTS, opts);
    this._sel        = null;
    this._time       = { h: 0, m: 0 };
    this._view       = null;
    this._open       = false;
    this._justPicked = false;
    this._popupMD    = false;
    this._dropdown   = null;
    this._minDate    = null;
    this._maxDate    = null;
    this._rtl        = isPageRTL();
    this._uid        = this.$el.attr('id') || ('pdp_' + Math.random().toString(36).slice(2));
    this._inline     = (this.opts.displayAs === 'inline');
    this._build();
  }

  PDP.prototype = {

    _build: function () {
      var self = this;

      this.$el.css({
        position: 'absolute', width: '1px', height: '1px',
        overflow: 'hidden', opacity: '0', pointerEvents: 'none'
      }).attr('tabindex', '-1');

      if (this._inline) {
        // ── INLINE mode: no input/button, popup renders in place ─────
        this.$wrapper = $('<div>', {
          'class': 'apexrad-pdp-wrapper apexrad-pdp-wrapper--inline'
        });
        this.$display = $('<input>', {
          type: 'hidden', id: this._uid + '_DISPLAY'
        });
        this.$btn = $('<span>'); // placeholder to avoid null refs
        this.$wrapper.append(this.$display);
        this.$el.after(this.$wrapper);

        this.$popup = this._buildPopup();
        this.$popup.addClass('apexrad-pdp-popup--inline').show();
        this.$wrapper.append(this.$popup);
      } else {
        // ── POPUP mode (default) ─────────────────────────────────────
        var iAttr = {
          type: 'text', id: this._uid + '_DISPLAY',
          'class': 'apexrad-pdp-display apex-item-text apex-item-datepicker',
          placeholder: this.opts.placeholder, autocomplete: 'off',
          'aria-haspopup': 'true', 'aria-expanded': 'false',
          'aria-controls': this._uid + '_POPUP'
        };
        if (!this.opts.allowManualInput) iAttr.readonly = true;
        this.$display = $('<input>', iAttr);

        var iconCls = this.opts.showTime ? 'a-Icon icon-calendar-time' : 'a-Icon icon-calendar';
        this.$btn = $('<button>', {
          type: 'button', 'class': 'a-Button a-Button--calendar',
          tabindex: '-1', 'aria-label': 'باز کردن تقویم'
        }).html('<span class="' + iconCls + '" aria-hidden="true"></span>');

        this.$wrapper = $('<span>', {
          'class': 'apexrad-pdp-wrapper ' + (this._rtl ? 'apexrad-pdp-rtl' : 'apexrad-pdp-ltr')
        }).append(this.$display).append(this.$btn);

        this.$el.after(this.$wrapper);

        this.$popup = this._buildPopup();
        $('body').append(this.$popup);
      }

      this._restoreValue(this.$el.val());
      if (this.opts.disabled) this.disable();
      this._bindEvents();

      // Inline: open immediately and keep open
      if (this._inline) {
        this._open = true;
        var t = IC.today();
        this._view = this._sel ? { y: this._sel.y, m: this._sel.m } : { y: t.y, m: t.m };
        this._resolveMinMax();
        this._renderGrid();
        this._renderTime();
      }
    },

    _restoreValue: function (val) {
      if (!val) return;
      var latinVal = normalizeJalaliValue(val);
      var parts = latinVal.split(' ');
      var d = IC.parse(parts[0], this.opts.returnFormat);
      if (!d) return;
      this._sel = d;
      if (this.opts.showTime && parts[1]) {
        var tp = parts[1].split(':');
        this._time = { h: Math.min(23,+tp[0]||0), m: Math.min(59,+tp[1]||0) };
      }
      this._renderDisplay();
    },

    _buildPopup: function () {
      var $p = $('<div>', {
        id: this._uid + '_POPUP', 'class': 'apexrad-pdp-popup',
        role: 'dialog', 'aria-label': 'انتخاب تاریخ',
        'aria-modal': 'true', dir: 'rtl'
      });
      if (!this._inline) $p.hide();

      // Header — show/hide year and month blocks based on options
      var $hdr = $('<div class="apexrad-pdp-header">');

      var $mLblBlock = $('<div class="apexrad-pdp-month-block">');
      if (this.opts.showMonth) {
        $mLblBlock.append('<button type="button" class="apexrad-pdp-month-lbl apexrad-pdp-lbl-btn" title="انتخاب ماه" aria-label="انتخاب ماه"></button>');
      }

      var $yrBlock = $('<div class="apexrad-pdp-year-block">');
      if (this.opts.showYear) {
        var _noYrRange = Object.keys(this.opts.yearRange).length === 0;
        if (_noYrRange) { $yrBlock.append('<button type="button" class="apexrad-pdp-year-btn apexrad-pdp-next-year apexrad-pdp-year-up" title="سال بعد" aria-label="سال بعد">&#x25B4;</button>'); }
        $yrBlock.append('<button type="button" class="apexrad-pdp-year-lbl apexrad-pdp-lbl-btn" title="انتخاب سال" aria-label="انتخاب سال"></button>');
        if (_noYrRange) { $yrBlock.append('<button type="button" class="apexrad-pdp-year-btn apexrad-pdp-prev-year apexrad-pdp-year-down" title="سال قبل" aria-label="سال قبل">&#x25BE;</button>'); }
      }

      var $mNavBlock = $('<div class="apexrad-pdp-month-arrow-block">');
      if (this.opts.showMonth) {
        var _noMnRange = Object.keys(this.opts.monthRange).length === 0;
        if (_noMnRange) { $mNavBlock.append('<button type="button" class="apexrad-pdp-nav apexrad-pdp-prev-month" title="ماه قبل" aria-label="ماه قبل">&#x2039;</button>'); }
        if (_noMnRange) { $mNavBlock.append('<button type="button" class="apexrad-pdp-nav apexrad-pdp-next-month" title="ماه بعد" aria-label="ماه بعد">&#x203A;</button>'); }
      }

      $hdr.append($mLblBlock).append($yrBlock).append($mNavBlock);

      var $dh = $('<div class="apexrad-pdp-dow">');
      ['ش','ی','د','س','چ','پ','ج'].forEach(function(d){
        $dh.append('<span class="apexrad-pdp-dow-cell">' + d + '</span>');
      });

      this.$grid = $('<div class="apexrad-pdp-grid" role="grid">');

      this.$dropdown = $('<div class="apexrad-pdp-dd" role="listbox" dir="rtl">').hide();
      this.$ddList   = $('<ul class="apexrad-pdp-dd-list">');
      this.$dropdown.append(this.$ddList);

      var $ft = $('<div class="apexrad-pdp-footer" dir="rtl">');
      if (!this._inline) {
        $ft.append('<button type="button" class="apexrad-pdp-foot-btn apexrad-pdp-close">تأیید</button>');
      }
      if (this.opts.showTodayButton) {
        $ft.append('<button type="button" class="apexrad-pdp-foot-btn apexrad-pdp-today">امروز</button>');
      }
      if (this.opts.showClearButton) {
        $ft.append('<button type="button" class="apexrad-pdp-foot-btn apexrad-pdp-clear">پاک کردن</button>');
      }
      if (this.opts.showTime) {
        this.$timeRow = $('<div class="apexrad-pdp-time-inline" dir="ltr">');
        this.$timeRow.html(
          '<span class="apexrad-pdp-time-icon"><span class="a-Icon icon-time" aria-hidden="true"></span></span>' +
          '<div class="apexrad-pdp-time-ctrl">' +
            '<button type="button" class="apexrad-pdp-time-btn" data-f="h" data-d="1">&#x25B4;</button>' +
            '<button type="button" class="apexrad-pdp-time-btn" data-f="h" data-d="-1">&#x25BE;</button>' +
          '</div>' +
          '<div class="apexrad-pdp-time-ctrl">' +
            '<button type="button" class="apexrad-pdp-time-inp apexrad-pdp-h apexrad-pdp-lbl-btn apexrad-pdp-h-btn" title="انتخاب ساعت" aria-label="انتخاب ساعت">00</button>' +
          '</div>' +
          '<span class="apexrad-pdp-time-sep">:</span>' +
          '<div class="apexrad-pdp-time-ctrl">' +
            '<button type="button" class="apexrad-pdp-time-inp apexrad-pdp-m apexrad-pdp-lbl-btn apexrad-pdp-m-btn" title="انتخاب دقیقه" aria-label="انتخاب دقیقه">00</button>' +
          '</div>' +
          '<div class="apexrad-pdp-time-ctrl">' +
            '<button type="button" class="apexrad-pdp-time-btn" data-f="m" data-d="1">&#x25B4;</button>' +
            '<button type="button" class="apexrad-pdp-time-btn" data-f="m" data-d="-1">&#x25BE;</button>' +
          '</div>'
        );
        $ft.append(this.$timeRow);
      } else {
        this.$timeRow = $('<div>').hide();
      }

      return $p
        .append($hdr)
        .append(this.$dropdown)
        .append($dh)
        .append(this.$grid)
        .append($ft);
    },

    _resolveMinMax: function() {
      var o = this.opts, rFmt = o.returnFormat;
      this._minDate = resolveDateBound(o.minDateType, o.minDateItem, o.minDateStatic, rFmt);
      this._maxDate = resolveDateBound(o.maxDateType, o.maxDateItem, o.maxDateStatic, rFmt);
    },

    _bindEvents: function () {
      var self = this;
      var ns   = '.pdp_' + this._uid;

      if (!this._inline) {
        // Button toggles
        this.$btn.on('click' + ns, function(e) {
          e.preventDefault(); e.stopPropagation();
          self._open ? self.close() : self.open();
        });

        if (this.opts.allowManualInput) {
          if (this.opts.showOn === 'focus') {
            this.$display.on('focus' + ns, function() {
              if (!self._justPicked && !self._open) self.open();
              self._showEditableValue();
            });
          } else {
            this.$display.on('focus' + ns, function() {
              self._showEditableValue();
            });
          }
          this.$display.on('blur' + ns, function() {
            if (self._popupMD) return;
            self._parseManual(); self.close();
          });
          this.$display.on('keydown' + ns, function(e) {
            if (e.key === 'Enter')  { e.preventDefault(); self._parseManual(); self.close(); }
            if (e.key === 'Escape') { self._renderDisplay(); self.close(); }
            // Issue 2: close popup when user starts typing manually
            // (any printable key that is not a navigation/modifier key)
            if (self._open && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
              self.close();
            }
          });
        } else {
          if (this.opts.showOn === 'focus') {
            this.$display.on('focus' + ns, function() {
              self._renderDisplay();
              if (self._justPicked || self._open) return;
              self.open();
            });
          } else {
            this.$display.on('focus' + ns, function() { self._renderDisplay(); });
          }
          this.$display.on('keydown' + ns, function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.open(); }
            if (e.key === 'Escape') self.close();
          });
        }

        this.$popup.on('mousedown' + ns, function() { self._popupMD = true; });
        $(document).on('mouseup' + ns,   function() { self._popupMD = false; });

        $(document).on('mousedown' + ns, function(e) {
          var $t = $(e.target);
          if ($t.closest(self.$wrapper).length || $t.closest(self.$popup).length) return;
          if (self.opts.allowManualInput) self._parseManual();
          self.close();
        });

        this.$popup.on('keydown' + ns, function(e) {
          if (e.key === 'Escape') {
            if (self._dropdown) { self._closeDropdown(); }
            else { self.close(); self.$display.focus(); }
          }
        });

        $(window).on('scroll' + ns + ' resize' + ns, function() {
          if (self._open) self._positionPopup();
        });
      }

      // ── Popup navigation ────────────────────────────────────────
      this.$popup
        .on('click', '.apexrad-pdp-prev-month', function() { self._closeDropdown(); self._nav(0,-1); })
        .on('click', '.apexrad-pdp-next-month', function() { self._closeDropdown(); self._nav(0, 1); })
        .on('click', '.apexrad-pdp-prev-year',  function() { self._closeDropdown(); self._nav(-1,0); })
        .on('click', '.apexrad-pdp-next-year',  function() { self._closeDropdown(); self._nav( 1,0); })
        .on('click', '.apexrad-pdp-today',      function() { self._closeDropdown(); self._pickToday(); })
        .on('click', '.apexrad-pdp-clear',      function() { self._closeDropdown(); self.clear(); })
        .on('click', '.apexrad-pdp-close',      function() { self._closeDropdown(); self.close(); })
        .on('click', '.apexrad-pdp-day',        function() {
          self._closeDropdown();
          var $c = $(this);
          if ($c.hasClass('apexrad-pdp-day--off') || $c.hasClass('apexrad-pdp-day--empty')) return;
          var picked = { y: +$c.data('y'), m: +$c.data('m'), d: +$c.data('d') };
          if (self.opts.showTime) {
            self._sel = picked;
            self._renderGrid(); self._renderDisplay(); self._syncHidden();
            apex.event.trigger(self.$el[0], 'change');
          } else {
            self._pick(picked);
          }
        });

      // Dropdown openers
      this.$popup.on('click', '.apexrad-pdp-month-lbl', function(e) {
        e.stopPropagation();
        self._dropdown === 'month' ? self._closeDropdown() : self._openDropdown('month');
      });
      this.$popup.on('click', '.apexrad-pdp-year-lbl', function(e) {
        e.stopPropagation();
        self._dropdown === 'year' ? self._closeDropdown() : self._openDropdown('year');
      });
      this.$popup.on('click', '.apexrad-pdp-h-btn', function(e) {
        e.stopPropagation();
        self._dropdown === 'hour' ? self._closeDropdown() : self._openDropdown('hour');
      });
      this.$popup.on('click', '.apexrad-pdp-m-btn', function(e) {
        e.stopPropagation();
        self._dropdown === 'minute' ? self._closeDropdown() : self._openDropdown('minute');
      });

      this.$popup.on('click', '.apexrad-pdp-dd-item', function() {
        var val = +$(this).data('val');
        var type = self._dropdown;
        self._closeDropdown();
        if (type === 'month')  { self._view.m = val; self._renderGrid(); }
        else if (type === 'year')   { self._view.y = val; self._renderGrid(); }
        else if (type === 'hour')   { self._time.h = val; self._renderTime(); if (self._sel) { self._renderDisplay(); self._syncHidden(); apex.event.trigger(self.$el[0], 'change'); } }
        else if (type === 'minute') { self._time.m = val; self._renderTime(); if (self._sel) { self._renderDisplay(); self._syncHidden(); apex.event.trigger(self.$el[0], 'change'); } }
      });

      this.$popup.on('click', '.apexrad-pdp-time-btn', function() {
        self._closeDropdown();
        var f = $(this).data('f'), delta = +$(this).data('d');
        self._time[f] = f === 'h' ? (self._time.h + delta + 24) % 24 : (self._time.m + delta + 60) % 60;
        self._renderTime();
        if (self._sel) { self._renderDisplay(); self._syncHidden(); apex.event.trigger(self.$el[0], 'change'); }
      });
    },

    // Show editable value (Return Format + time if applicable) for manual typing
    _showEditableValue: function() {
      if (!this._sel) return;
      var dispY  = this._sel.y + imperialOffset(this.opts);
      var eFmt   = safeReturnFmt(this.opts.returnFormat);
      var hasTimeFmt = /HH:MI/i.test(eFmt);
      var str;
      if (hasTimeFmt) {
        str = IC.format(dispY, this._sel.m, this._sel.d, eFmt, false, this._time.h, this._time.m);
      } else {
        str = IC.format(dispY, this._sel.m, this._sel.d, eFmt, false);
        if (this.opts.showTime) { str = str + ' ' + pad2(this._time.h) + ':' + pad2(this._time.m); }
      }
      this.$display.val(str);
    },

    _openDropdown: function(type) {
      var self = this;
      this._dropdown = type;
      this.$ddList.empty();
      var items = [], selected, fa = this.opts.usePersianDigits;

      if (type === 'month') {
        var hasMR = Object.keys(this.opts.monthRange).length > 0;
        for (var m = 1; m <= 12; m++) {
          if (!hasMR || this.opts.monthRange[m]) {
            items.push({ val: m, label: IC.monthNames[m-1] });
          }
        }
        selected = this._view.m;
      } else if (type === 'year') {
        var cy = this._view.y;
        var hasYR = Object.keys(this.opts.yearRange).length > 0;
        if (hasYR) {
          // Only show allowed years, sorted descending
          Object.keys(this.opts.yearRange).map(Number).sort(function(a,b){return b-a;}).forEach(function(y) {
            var _dl1 = y + imperialOffset(self.opts);
            items.push({ val: y, label: fa ? IC.toPersian(String(_dl1)) : String(_dl1) });
          });
        } else {
          for (var y = cy+10; y >= cy-15; y--) {
            var _dl2 = y + imperialOffset(self.opts);
            items.push({ val: y, label: fa ? IC.toPersian(String(_dl2)) : String(_dl2) });
          }
        }
        selected = cy;
      } else if (type === 'hour') {
        for (var h = 0; h <= 23; h++) items.push({ val: h, label: fa ? IC.toPersian(pad2(h)) : pad2(h) });
        selected = this._time.h;
      } else if (type === 'minute') {
        for (var mi = 0; mi <= 59; mi++) items.push({ val: mi, label: fa ? IC.toPersian(pad2(mi)) : pad2(mi) });
        selected = this._time.m;
      }

      var $selItem = null;
      items.forEach(function(item) {
        var $li = $('<li>', {
          'class': 'apexrad-pdp-dd-item' + (item.val === selected ? ' apexrad-pdp-dd-item--sel' : ''),
          html: item.val === selected ? item.label + '<span class="apexrad-pdp-dd-check"></span>' : item.label,
          'data-val': item.val, role: 'option',
          'aria-selected': item.val === selected ? 'true' : 'false'
        });
        self.$ddList.append($li);
        if (item.val === selected) $selItem = $li;
      });

      this.$dropdown.show();
      if ($selItem) {
        var ddEl = this.$dropdown[0], liEl = $selItem[0];
        ddEl.scrollTop = liEl.offsetTop - ddEl.clientHeight / 2 + liEl.offsetHeight / 2;
      }
    },

    _closeDropdown: function() {
      if (!this._dropdown) return;
      this._dropdown = null;
      this.$dropdown.hide();
      this.$ddList.empty();
    },

    /* ── FIX 1: Parse manual input including time part ──────────*/
    _parseManual: function() {
      var rawInput = this.$display.val().trim();
      if (!rawInput) { this.clear(); return; }

      // Navigation guard: if display shows the formatted value (user didn't edit), skip
      if (this._sel) {
        var _dispY  = this._sel.y + imperialOffset(this.opts);
        var _hasTF  = /HH:MI/i.test(this.opts.displayFormat);
        var _dispVal = _hasTF
          ? IC.format(_dispY, this._sel.m, this._sel.d, this.opts.displayFormat, this.opts.usePersianDigits, this._time.h, this._time.m)
          : IC.format(_dispY, this._sel.m, this._sel.d, this.opts.displayFormat, this.opts.usePersianDigits);
        if (!_hasTF && this.opts.showTime) {
          var _hD = this.opts.usePersianDigits ? IC.toPersian(pad2(this._time.h)) : pad2(this._time.h);
          var _mD = this.opts.usePersianDigits ? IC.toPersian(pad2(this._time.m)) : pad2(this._time.m);
          _dispVal = _dispVal + '  ' + _hD + ':' + _mD;
        }
        var _eFmt0  = safeReturnFmt(this.opts.returnFormat);
        var _hasTF0 = /HH:MI/i.test(_eFmt0);
        var _editVal = _hasTF0
          ? IC.format(_dispY, this._sel.m, this._sel.d, _eFmt0, false, this._time.h, this._time.m)
          : IC.format(_dispY, this._sel.m, this._sel.d, _eFmt0, false);
        if (!_hasTF0 && this.opts.showTime) { _editVal = _editVal + ' ' + pad2(this._time.h) + ':' + pad2(this._time.m); }
        if (rawInput === _dispVal || rawInput === _editVal ||
            IC.toLatin(rawInput) === IC.toLatin(_dispVal) ||
            IC.toLatin(rawInput) === IC.toLatin(_editVal)) {
          this._renderDisplay();
          return;
        }
      }

      rawInput = IC.toLatin(rawInput);
      rawInput = rawInput.replace(/[\u06F0-\u06F9]/g, function(c){ return c.charCodeAt(0) - 0x06F0; });

      var offset = imperialOffset(this.opts);
      var adjustedInput = rawInput;
      if (offset !== 0) {
        adjustedInput = rawInput.replace(/^(\d{4})/, function(yr) {
          var n = parseInt(yr, 10) - offset;
          return String(n);
        });
      }

      var _eFmt  = safeReturnFmt(this.opts.returnFormat);
      var parsed = parseManualWithTime(adjustedInput, _eFmt, this.opts.showTime);
      this._resolveMinMax();

      if (!parsed || this._isDisabled(parsed.date)) {
        this.$display.addClass('apex-page-item-error');
        var _id = this.$el.attr('id');
        setTimeout(function() {
          try { parent.apex.message.clearErrors(); } catch(e) {}
          apex.message.clearErrors();
          apex.message.showErrors([{
            type: 'error', location: 'page', pageItem: _id,
            message: 'تاریخ وارد شده معتبر نیست', unsafe: false
          }]);
        }, 10);
        return;
      }
      this._sel    = parsed.date;
      this._time.h = parsed.h;
      this._time.m = parsed.m;
      this.$display.removeClass('apex-page-item-error');
      this._renderDisplay();
      this._syncHidden();
      setTimeout(function() {
        try { parent.apex.message.clearErrors(); } catch(e) {}
        apex.message.clearErrors();
      }, 50);
      apex.event.trigger(this.$el[0], 'change');
    },

    open: function() {
      if (this._open || this.opts.disabled) return;
      this._resolveMinMax();
      this._open = true;
      var t = IC.today();
      this._view = this._sel ? { y: this._sel.y, m: this._sel.m } : { y: t.y, m: t.m };
      this._renderGrid();
      this._renderTime();
      this.$popup.show();
      this._positionPopup();
      this.$display.attr('aria-expanded', 'true');
    },

    close: function() {
      if (!this._open || this._inline) return;
      this._closeDropdown();
      this._open = false;
      this.$popup.hide();
      this.$display.attr('aria-expanded', 'false');
    },

    _positionPopup: function() {
      if (this._inline) return;
      // Use getBoundingClientRect for accurate viewport coords with position:fixed.
      // This works correctly inside IG cells, transformed containers, and sticky headers.
      var rect = this.$wrapper[0].getBoundingClientRect();
      var popW = this.$popup.outerWidth(true) || 296;
      var popH = this.$popup.outerHeight(true) || 360;
      var winH = window.innerHeight;
      var winW = window.innerWidth;
      var gap  = 2;
      // Position below wrapper, or above if not enough space below
      var top = (rect.bottom + popH + gap > winH && rect.top > popH)
              ? rect.top - popH - gap
              : rect.bottom + gap;
      top  = Math.max(gap, Math.min(top, winH - popH - gap));
      var left = this._rtl ? (rect.right - popW) : rect.left;
      left = Math.max(gap, Math.min(left, winW - popW - gap));
      this.$popup.css({ position: 'fixed', top: top, left: left });
    },

    _nav: function(dy, dm) {
      var y = this._view.y + dy, m = this._view.m + dm;
      if (m > 12) { m = 1;  y++; }
      if (m < 1)  { m = 12; y--; }
      this._view = { y: y, m: m };
      this._renderGrid();
    },

    _renderGrid: function() {
      var self = this;
      var y = this._view.y, m = this._view.m;
      var fa = this.opts.usePersianDigits, today = IC.today();

      if (this.opts.showYear) {
        var _dispY = y + imperialOffset(this.opts);
        this.$popup.find('.apexrad-pdp-year-lbl').text(fa ? IC.toPersian(_dispY) : _dispY);
      }
      if (this.opts.showMonth) {
        this.$popup.find('.apexrad-pdp-month-lbl').text(IC.monthNames[m - 1]);
      }

      var daysInM  = IC.daysInMonth(y, m);
      var firstDOW = IC.dayOfWeek(y, m, 1);

      this.$grid.empty();
      this.$grid.toggleClass('apexrad-pdp-grid--persian', !!fa);
      var $row = $('<div class="apexrad-pdp-grid-row" role="row">');
      var count = 0;

      for (var e = 0; e < firstDOW; e++) {
        $row.append('<span class="apexrad-pdp-day apexrad-pdp-day--empty" role="gridcell"></span>');
        count++;
      }

      for (var d = 1; d <= daysInM; d++) {
        var cur = { y: y, m: m, d: d };
        var dow = IC.dayOfWeek(y, m, d);
        var cls = ['apexrad-pdp-day'];
        if (IC.compare(cur, today) === 0)                  cls.push('apexrad-pdp-day--today');
        if (this._sel && IC.compare(cur, this._sel) === 0) cls.push('apexrad-pdp-day--sel');
        if (dow === 6)                                      cls.push('apexrad-pdp-day--fri');
        if (this.opts.holidays[holidayKey(cur)])            cls.push('apexrad-pdp-day--hol');
        if (this._isDisabled(cur))                         cls.push('apexrad-pdp-day--off');

        var dayLbl = fa ? IC.toPersian(d) : String(d);
        var hKey   = y+'/'+m+'/'+d;
        var hjName = self.opts.holidayJson[hKey] || '';
        if (hjName) cls.push('apexrad-pdp-day--hol');  // also mark as holiday
        var $dayBtn = $('<button>', {
          type: 'button', 'class': cls.join(' '),
          html: '<span>' + dayLbl + '</span>',
          role: 'gridcell',
          'aria-label': IC.monthNames[m-1] + ' ' + d + ' ' + y,
          'data-y': y, 'data-m': m, 'data-d': d
        });
        if (hjName) $dayBtn.attr('title', hjName);
        $row.append($dayBtn);
        count++;

        if (count % 7 === 0) {
          this.$grid.append($row);
          $row = $('<div class="apexrad-pdp-grid-row" role="row">');
        }
      }
      if (count % 7 !== 0) {
        while (count % 7 !== 0) {
          $row.append('<span class="apexrad-pdp-day apexrad-pdp-day--empty" role="gridcell"></span>');
          count++;
        }
        this.$grid.append($row);
      }
    },

    _renderTime: function() {
      if (!this.opts.showTime) return;
      var fa = this.opts.usePersianDigits;
      this.$popup.find('.apexrad-pdp-h').text(fa ? IC.toPersian(pad2(this._time.h)) : pad2(this._time.h));
      this.$popup.find('.apexrad-pdp-m').text(fa ? IC.toPersian(pad2(this._time.m)) : pad2(this._time.m));
    },

    _isDisabled: function(d) {
      if (this._minDate && IC.compare(d, this._minDate) < 0) return true;
      if (this._maxDate && IC.compare(d, this._maxDate) > 0) return true;
      // Year range restriction
      if (Object.keys(this.opts.yearRange).length > 0 && !this.opts.yearRange[d.y]) return true;
      // Month range restriction
      if (Object.keys(this.opts.monthRange).length > 0 && !this.opts.monthRange[d.m]) return true;
      if (this.opts.disableHoliday) {
        if (IC.dayOfWeek(d.y, d.m, d.d) === 6) return true;
        if (this.opts.holidays[holidayKey(d)])  return true;
        if (this.opts.holidayJson[holidayKey(d)]) return true;
      }
      return false;
    },

    
    _renderDisplay: function() {
      if (this._inline) return; // inline has no display input
      if (!this._sel) { this.$display.val(''); return; }
      var fa  = this.opts.usePersianDigits;
      var fmt = this.opts.displayFormat;

      // Formats containing Persian month/day names produce RTL text.
      // Set dir=rtl on the input so the browser's bidi algorithm renders
      // the string in natural Persian reading order (دوشنبه on the right,
      // ۱۴۰۵ on the left) without any Unicode embedding tricks.
      // Numeric-only formats use dir=ltr (Latin digit order).
      var hasPersianNameFmt = /MON|fmMonth|fmDay/.test(fmt);
      this.$display.attr('dir', hasPersianNameFmt ? 'rtl' : 'ltr');

      // Check if displayFormat contains HH:MI — if so, pass time values
      var hasTimeFmt = /HH:MI/.test(fmt);
      var str;
      if (hasTimeFmt) {
        str = IC.format(this._sel.y + imperialOffset(this.opts), this._sel.m, this._sel.d, fmt, fa, this._time.h, this._time.m);
      } else {
        str = IC.format(this._sel.y + imperialOffset(this.opts), this._sel.m, this._sel.d, fmt, fa);
        // Append time separately if showTime=true and format doesn't include it
        if (this.opts.showTime) {
          var hDisp = fa ? IC.toPersian(pad2(this._time.h)) : pad2(this._time.h);
          var mDisp = fa ? IC.toPersian(pad2(this._time.m)) : pad2(this._time.m);
          str = str + '  ' + hDisp + ':' + mDisp;
        }
      }
      this.$display.val(str).removeClass('apex-page-item-error');
    },

    _syncHidden: function() {
      if (!this._sel) { this.$el.val(''); return; }
      var rFmt = safeReturnFmt(this.opts.returnFormat);
      var hasTimeFmt = /HH:MI/i.test(rFmt);
      var str;
      if (hasTimeFmt) {
        str = IC.format(this._sel.y, this._sel.m, this._sel.d, rFmt, false, this._time.h, this._time.m);
      } else {
        str = IC.format(this._sel.y, this._sel.m, this._sel.d, rFmt, false);
        if (this.opts.showTime) { str += ' ' + pad2(this._time.h) + ':' + pad2(this._time.m); }
      }
      this.$el.val(str);
      if (this._inline) { this.$display.val(str); }
    },

    _pick: function(d) {
      this._justPicked = true;
      this._sel = d;
      this._renderDisplay(); this._syncHidden();
      if (!this._inline) this.close();
      else this._renderGrid();
      apex.event.trigger(this.$el[0], 'change');
      // Re-apply Imperial display on IG cell after model update
      var $tr = this.$el.closest('tr');
      if ($tr.length && $tr.find('td.persianDatepicker-ig-imperial').length) {
        setTimeout(function() { fixIGImperialDisplay($tr); }, 80);
      }
      var self = this;
      setTimeout(function() { self._justPicked = false; }, 300);
    },

    _pickToday: function() {
      var t = IC.today();
      if (!this._isDisabled(t)) this._pick(t);
    },

    getValue: function() { return this.$el.val(); },
    setValue: function(v) {
      if (!v) { this.clear(); return; }
      var parts = normalizeJalaliValue(v).split(' ');
      var d = IC.parse(parts[0], this.opts.returnFormat);
      if (!d) return;
      this._sel = d;
      if (this.opts.showTime && parts[1]) {
        var tp = parts[1].split(':');
        this._time = { h: Math.min(23,+tp[0]||0), m: Math.min(59,+tp[1]||0) };
      }
      this._renderDisplay(); this._syncHidden();
      if (this._inline && this._view) this._renderGrid();
    },
    clear: function() {
      this._sel = null; this._time = { h: 0, m: 0 };
      if (!this._inline) {
        this.$display.val('').removeClass('apex-page-item-error');
        this.close();
      }
      this.$el.val('');
      if (this._inline && this._view) this._renderGrid();
      apex.event.trigger(this.$el[0], 'change');
    },
    disable: function() {
      this.opts.disabled = true;
      if (!this._inline) { this.$display.prop('disabled', true); this.$btn.prop('disabled', true); }
      this.$wrapper.addClass('apexrad-pdp-wrapper--disabled');
    },
    enable: function() {
      this.opts.disabled = false;
      if (!this._inline) { this.$display.prop('disabled', false); this.$btn.prop('disabled', false); }
      this.$wrapper.removeClass('apexrad-pdp-wrapper--disabled');
    },
    show: function() { this.$wrapper.show(); },
    hide: function() { if (!this._inline) this.close(); this.$wrapper.hide(); },
    destroy: function() {
      var ns = '.pdp_' + this._uid;
      $(document).off(ns); $(window).off(ns);
      if (!this._inline) this.$display.off(ns);
      this.$popup.off(ns);
      if (!this._inline) this.$popup.remove();
      this.$wrapper.remove();
      this.$el.css({ position:'', width:'', height:'', overflow:'', opacity:'', pointerEvents:'' }).removeAttr('tabindex');
      $.removeData(this.$el[0], PLUGIN_NAME);
    }
  };

  $.fn[PLUGIN_NAME] = function(opts) {
    return this.each(function() {
      if (!$.data(this, PLUGIN_NAME)) $.data(this, PLUGIN_NAME, new PDP(this, opts));
    });
  };

  apexrad.PersianDatePicker = PDP;

  function attach(pCtx$) {
    $('input.apexrad-pdp-input', pCtx$).each(function() {
      var el = this, $el = $(el), id = $el.attr('id');
      if ($.data(el, PLUGIN_NAME)) return;
      if ($el.data('plugin-name') !== 'INFO.APEXRAD.PERSIANDATEPICKER') {
        apex.debug.warn('[apexrad.PDP] Security: plugin name mismatch.');
        return;
      }

      var rFmt = $el.data('return-format')  || 'YYYY/MM/DD';
      var dFmt = $el.data('display-format') || rFmt;
      // Compute imperial offset once — used by all parse functions below
      var calYear       = $el.data('calendar-year') || 'jalali';
      var calYearOffset = calYear === 'imperial' ? 1180 : 0;
      var holidays = parseHolidays($el.data('holidays') || '', calYearOffset);

      var opts = {
        displayFormat:    dFmt,
        returnFormat:     rFmt,
        usePersianDigits: $el.data('persian-digits')    !== 'N',
        showTodayButton:  $el.data('show-today')        !== 'N',
        showClearButton:  $el.data('show-clear')        !== 'N',
        showTime:         $el.data('show-time')         === 'Y',
        allowManualInput: $el.data('manual-input')      === 'Y',
        showOn:           $el.data('show-on')           || 'button',
        disableHoliday:   $el.data('disable-holiday')   === 'Y',
        showYear:         $el.data('show-year')         !== 'N',
        showMonth:        $el.data('show-month')        !== 'N',
        displayAs:        $el.data('display-as')        || 'popup',
        calendarYear:     calYear,
        holidays:         holidays,
        placeholder:      $el.data('placeholder')       || 'انتخاب تاریخ',
        disabled:         $el.prop('disabled'),
        minDateType:      $el.data('min-date-type')     || 'none',
        minDateItem:      $el.data('min-date-item')     || '',
        minDateStatic:    $el.data('min-date-static')   || '',
        maxDateType:      $el.data('max-date-type')     || 'none',
        maxDateItem:      $el.data('max-date-item')     || '',
        maxDateStatic:    $el.data('max-date-static')   || '',
        yearRange:        parseYearRange($el.data('year-range')   || '', calYearOffset),
        monthRange:       parseMonthRange($el.data('month-range')  || ''),
        holidayJson:      parseHolidayJson($el.data('holiday-json') || '', calYearOffset)
      };

      // Legacy backward-compat
      var legacyMin = $el.data('min-date'), legacyMax = $el.data('max-date');
      if (legacyMin && opts.minDateType === 'none') { opts.minDateType='static'; opts.minDateStatic=legacyMin; }
      if (legacyMax && opts.maxDateType === 'none') { opts.maxDateType='static'; opts.maxDateStatic=legacyMax; }

      $el[PLUGIN_NAME](opts);
      var inst = $.data(el, PLUGIN_NAME);

      if ($el.hasClass('persianDatepicker-ig-col')) {
        inst.$wrapper.addClass('persianDatepicker-ig-dir');
        // Register calendarYear for this column by TD headers value
        var $igTd = $el.closest('td');
        var hdrs  = $igTd.attr('headers') || $igTd.attr('id') || '';
        if (hdrs) { g_igColCalYear[hdrs] = opts.calendarYear || 'jalali'; }
        // Also store by input name for fallback lookup
        var inputName = $el.attr('name') || '';
        if (inputName) { g_igColCalYear[inputName] = opts.calendarYear || 'jalali'; }
      }

      apex.item.create(id, {
        item_type: 'PERSIAN_DATE_PICKER',
        getValue:             function()    { return inst.getValue(); },
        setValue:             function(v)   { inst.setValue(v); },
        setFocusTo:           function()    { return inst.$display; },
        disable:              function()    { inst.disable(); },
        enable:               function()    { inst.enable(); },
        show:                 function()    { inst.show(); },
        hide:                 function()    { inst.hide(); },
        addCSSClass:          function(c)   { inst.$wrapper.addClass(c); },
        removeCSSClass:       function(c)   { inst.$wrapper.removeClass(c); },
        isDisabled:           function()    { return inst.opts.disabled; },
        nullValue:            '',
        getValidity: function() {
          var v = inst.getValue();
          if (!v) return { valid: true };
          var sFmt = safeReturnFmt(inst.opts.returnFormat);
          var d = IC.parse(IC.toLatin(v.split(' ')[0]), sFmt);
          if (!d) return { valid: false };
          inst._resolveMinMax();
          if (inst._isDisabled(d)) return { valid: false };
          return { valid: true };
        },
        getValidationMessage: function() { return 'تاریخ وارد شده معتبر نیست'; }
      });
    });
  }

  apex.item.addAttachHandler(attach);

  apexrad.pdpInit = function(id) {
    var el = document.getElementById(id);
    if (el) { attach($(el).parent()); }
  };

  /* ── Imperial year: fix IG cell display text ───────────────────────────
   * In an Editable IG the cell displays the raw SQL value (Jalali) as
   * plain text BEFORE the user clicks to edit. The plugin only runs on
   * click. This function finds every Imperial PDP input, locates its
   * parent IG display cell, and rewrites the text to Imperial year.
   * Called after attach and after every IG refresh/pagination.
   */
  function tdCalYear($td) {
    // Look up calendarYear for a TD using the registry populated at attach time.
    // Try: headers attr, id attr, input name inside TD (when editing)
    var hdrs = ($td.attr('headers') || '').split(' ');
    for (var hi = 0; hi < hdrs.length; hi++) {
      if (g_igColCalYear[hdrs[hi]]) return g_igColCalYear[hdrs[hi]];
    }
    // Fallback: input is inside TD (edit mode)
    var $inp = $td.find('input.apexrad-pdp-input');
    if ($inp.length) {
      var n = $inp.attr('name') || '';
      if (g_igColCalYear[n]) return g_igColCalYear[n];
      return $inp.data('calendar-year') || 'jalali';
    }
    return 'jalali'; // default
  }

  function applyCalYear($td) {
    // Determine calYear from the TD class — no registry needed.
    // persianDatepicker-ig-imperial class = imperial, anything else = jalali.
    var calYear = $td.hasClass('persianDatepicker-ig-imperial')
                  ? 'imperial' : 'jalali';
    // Find the direct text node
    var textNode = null;
    $td.contents().each(function() {
      if (this.nodeType === 3 && this.nodeValue.trim()) {
        textNode = this; return false;
      }
    });
    if (!textNode) return;
    var text = textNode.nodeValue.trim();
    var yr4  = parseInt(text.substring(0, 4), 10);
    if (isNaN(yr4)) return;
    var isJalali   = yr4 >= 1300 && yr4 <= 1599;
    var isImperial = yr4 >= 2480 && yr4 <= 2779;
    if (calYear === 'imperial' && isJalali) {
      textNode.nodeValue = String(yr4 + 1180) + text.substring(4);
    } else if (calYear === 'jalali' && isImperial) {
      textNode.nodeValue = String(yr4 - 1180) + text.substring(4);
    }
  }

  function fixIGImperialDisplay(ctx$) {
    // Targets TDs with class 'persianDatepicker-ig-imperial'.
    // Works for BOTH jalali and imperial calendarYear settings.
    var $tds = ctx$
      ? $('td.persianDatepicker-ig-imperial', ctx$)
      : $('td.persianDatepicker-ig-imperial');
    $tds.each(function() { applyCalYear($(this)); });
  }

  $(document).on('apexbeforerefresh', function() {
    $('input.apexrad-pdp-input').each(function() {
      var i = $.data(this, PLUGIN_NAME);
      if (i) i.destroy();
    });
  });

  // After IG refreshes (pagination, search, save) re-apply Imperial display
  $(document).on('apexafterrefresh', function(e) {
    fixIGImperialDisplay($(e.target));
  });

  // Also run on initial page load after all items are attached
  $(document).on('apexreadyend', function() {
    setTimeout(function() { fixIGImperialDisplay(); }, 150);
  });

  /* ── MutationObserver: watch for is-active removal on Imperial TDs ────
   * When user clicks a cell: APEX adds    'is-focused is-active'
   * When user leaves a cell: APEX removes 'is-focused is-active'
   * That removal is the exact moment the TD goes back to display mode
   * and we need to re-apply the Jalali → Imperial year conversion.
   * We observe the IG grid body for class attribute mutations on TDs.
   */
  // ── Single MutationObserver on the grid container ──────────────────────
  // Watches for TWO things on TD class changes:
  //   1) is-active REMOVED → cell left edit mode:
  //        a) Close the plugin popup (fix: datepicker stays open)
  //        b) Convert TD text Jalali → Imperial
  //   2) Any childList change on the grid tbody (row re-render after save):
  //        Re-apply Imperial to all imperial TDs in the affected rows
  var g_igObserver  = null;
  // Maps TD headers value → calendarYear ('jalali'|'imperial')
  // Populated at attach time when the input IS inside the TD.
  var g_igColCalYear = {};

  function initImperialObserver() {
    // Disconnect any previous instance
    if (g_igObserver) { g_igObserver.disconnect(); g_igObserver = null; }
    // Nothing to do if no imperial columns on page
    if (!$('td.persianDatepicker-ig-imperial').length) return;

    g_igObserver = new MutationObserver(function(mutations) {
      var rowsToFix = {};
      mutations.forEach(function(mut) {

        // ── Case 1: class change on a TD ───────────────────────────────
        if (mut.type === 'attributes' && mut.attributeName === 'class') {
          var td = mut.target;
          if (td.tagName !== 'TD') return;

          var hadActive = mut.oldValue && mut.oldValue.indexOf('is-active') >= 0;
          var hasActive = td.classList.contains('is-active');

          // is-active just removed → cell leaving edit mode
          if (hadActive && !hasActive) {

            // Fix 2: close any open plugin popup inside this TD
            $(td).find('input.apexrad-pdp-input').each(function() {
              var inst = $.data(this, PLUGIN_NAME);
              if (inst && inst._open) { inst.close(); }
            });

            // Re-apply calYear display after APEX writes the new value
            if (td.classList.contains('persianDatepicker-ig-imperial')) {
              (function(imperialTd) {
                var tdObs = new MutationObserver(function() {
                  tdObs.disconnect();
                  applyCalYear($(imperialTd));
                });
                tdObs.observe(imperialTd, {
                  childList: true, characterData: true, subtree: true
                });
                setTimeout(function() {
                  tdObs.disconnect();
                  applyCalYear($(imperialTd));
                }, 400);
              }(td));
            }
          }
        }

        // ── Case 2: row nodes added to tbody (re-render after save) ───
        if (mut.type === 'childList' && mut.addedNodes.length) {
          mut.addedNodes.forEach(function(node) {
            if (node.tagName === 'TR') {
              if (!rowsToFix[node]) { rowsToFix[node] = node; }
            }
          });
        }
      });

      // Apply Imperial conversion to all affected rows in one pass
      var rows = Object.keys(rowsToFix).map(function(k) { return rowsToFix[k]; });
      if (rows.length) {
        rows.forEach(function(tr) { fixIGImperialDisplay($(tr)); });
      }
    });

    // Observe the grid scroll container — catches both tbody row changes
    // and TD class changes in one observer
    $('div.a-GV-w-scroll').each(function() {
      g_igObserver.observe(this, {
        subtree:           true,
        childList:         true,      // row re-render after save
        attributes:        true,      // TD class changes
        attributeFilter:   ['class'],
        attributeOldValue: true
      });
    });
  }

  $(document).on('apexreadyend', function() {
    fixIGImperialDisplay();
    initImperialObserver();
  });

  // Re-init after IG refresh (pagination, search) — new DOM, new observer
  $(document).on('apexafterrefresh', function(e) {
    fixIGImperialDisplay($(e.target));
    initImperialObserver();
  });

}(jQuery, apex, window.IranianCal, apexrad));
