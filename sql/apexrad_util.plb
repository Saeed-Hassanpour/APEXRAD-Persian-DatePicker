create or replace PACKAGE BODY apexrad_util AS

    -- ── Session-level flag ───────────────────────────────────────────────────
    -- Initialised to FALSE when the package is first loaded in a session.
    -- Set to TRUE after the first successful NLS check/set.
    -- Stays TRUE for the entire session — no repeated checks per row.
    g_persian_set  BOOLEAN := FALSE;

    -- ── Internal: ensure NLS_CALENDAR=PERSIAN, once per session ─────────────
    PROCEDURE ensure_persian_calendar
    IS
        v_nls_cal  VARCHAR2(100);
    BEGIN
        IF g_persian_set THEN
            RETURN;   -- already verified this session — skip everything
        END IF;

        SELECT value
        INTO   v_nls_cal
        FROM   nls_session_parameters
        WHERE  parameter = 'NLS_CALENDAR';

        IF UPPER(v_nls_cal) != 'PERSIAN' THEN
            EXECUTE IMMEDIATE 'ALTER SESSION SET NLS_CALENDAR=PERSIAN';
        END IF;

        g_persian_set := TRUE;   -- mark done for this session

    EXCEPTION
        WHEN OTHERS THEN
            -- If check fails for any reason, attempt the ALTER anyway
            BEGIN
                EXECUTE IMMEDIATE 'ALTER SESSION SET NLS_CALENDAR=PERSIAN';
                g_persian_set := TRUE;
            EXCEPTION
                WHEN OTHERS THEN NULL;
            END;
    END ensure_persian_calendar;

    -- ── Overload 1: VARCHAR2 ─────────────────────────────────────────────────
    FUNCTION jalali_to_imperial (
        p_jalali_date  IN  VARCHAR2
    ) RETURN VARCHAR2
    IS
        v_year  NUMBER;
    BEGIN
        IF p_jalali_date IS NULL OR LENGTH(p_jalali_date) < 4 THEN
            RETURN p_jalali_date;
        END IF;

        v_year := TO_NUMBER(SUBSTR(p_jalali_date, 1, 4));
        RETURN TO_CHAR(v_year + 1180) || SUBSTR(p_jalali_date, 5);

    EXCEPTION
        WHEN OTHERS THEN
            RETURN p_jalali_date;   -- non-numeric year: return unchanged
    END jalali_to_imperial;

    -- ── Overload 2: DATE ─────────────────────────────────────────────────────
    FUNCTION jalali_to_imperial (
        p_date  IN  DATE,
        p_fmt   IN  VARCHAR2 DEFAULT 'YYYY/MM/DD'
    ) RETURN VARCHAR2
    IS
    BEGIN
        IF p_date IS NULL THEN
            RETURN NULL;
        END IF;

        -- Ensure NLS_CALENDAR=PERSIAN — runs real check only on first call
        ensure_persian_calendar;

        RETURN jalali_to_imperial(TO_CHAR(p_date, p_fmt));

    EXCEPTION
        WHEN OTHERS THEN
            RETURN TO_CHAR(p_date, p_fmt);
    END jalali_to_imperial;

END apexrad_util;
/
