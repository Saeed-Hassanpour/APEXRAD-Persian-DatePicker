create or replace PACKAGE apexrad_util AS

-- =============================================================================
-- Package: APEXRAD_UTIL
-- Author : Saeed Hassanpour | Paya Shetaban Andisheh (APEXRAD)
-- Formula: Imperial Year = Jalali Year + 1180  (e.g. 1405 → 2585)
--
-- Performance design:
--   NLS_CALENDAR=PERSIAN is checked ONCE per session using a package-level
--   boolean flag (g_persian_set). On the first call the flag is FALSE,
--   so the check runs. Every subsequent call in the same session skips
--   the check entirely — no repeated nls_session_parameters queries,
--   no repeated ALTER SESSION, no per-row context switches.
--   For a 10,000-row report: 1 NLS check + 1 ALTER SESSION (if needed),
--   then 9,999 rows go straight to the arithmetic.
--
-- Overloaded function jalali_to_imperial:
--   1) VARCHAR2 — Jalali string (YYYY/MM/DD, YYYY-MM-DD, with or without time)
--   2) DATE     — Oracle DATE; ensures NLS_CALENDAR=PERSIAN automatically
--                 Optional fmt, default 'YYYY/MM/DD'
--
-- Usage:
--   apexrad_util.jalali_to_imperial('1405/01/10')                   → '2585/01/10'
--   apexrad_util.jalali_to_imperial('1405/01/10 14:30')             → '2585/01/10 14:30'
--   apexrad_util.jalali_to_imperial('1405-01-10')                   → '2585-01-10'
--   apexrad_util.jalali_to_imperial(hire_date)                      → '2585/01/10'
--   apexrad_util.jalali_to_imperial(hire_date,'YYYY/MM/DD HH24:MI') → '2585/01/10 14:30'
--   apexrad_util.jalali_to_imperial(TO_CHAR(NULL))         → NULL
--   apexrad_util.jalali_to_imperial(TO_DATE(NULL))             → NULL
-- =============================================================================

    -- Overload 1: VARCHAR2 input (Jalali string, or NULL)
    FUNCTION jalali_to_imperial (
        p_jalali_date  IN  VARCHAR2
    ) RETURN VARCHAR2;

    -- Overload 2: DATE input
    FUNCTION jalali_to_imperial (
        p_date  IN  DATE,
        p_fmt   IN  VARCHAR2 DEFAULT 'YYYY/MM/DD'
    ) RETURN VARCHAR2;

END apexrad_util;
/