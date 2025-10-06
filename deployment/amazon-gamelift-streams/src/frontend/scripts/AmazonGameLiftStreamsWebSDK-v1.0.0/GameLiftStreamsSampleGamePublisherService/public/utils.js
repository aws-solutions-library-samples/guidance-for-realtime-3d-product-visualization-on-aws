// Functions for using query params
function setQueryParams(queryParamsMap) {
    const url = new URL(location);
    for (const [key, value] of queryParamsMap.entries()) {
        url.searchParams.set(key, value);
    }
    // Use replace state to prevent page refresh
    window.history.replaceState(null, null, url);
}

function getQueryParams() {
    return new URLSearchParams(window.location.search);
}

function deleteAllQueryParams() {
    window.history.replaceState(null, null, location.href.split("?")[0]);
}

// Functions for using cookie
function setCookie(name, val) {
    const d = new Date();
    d.setTime(d.getTime() + 365*24*3600*1000);
    document.cookie = `${name}=${encodeURIComponent(val)};expires=${d.toUTCString()};path=/`;
}

function expireCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

function getCookieIfSet(name) {
    const value = document.cookie.split(/;\s*/).find(x => x.startsWith(name + '='))?.split('=')?.[1];
    if (value) {
        return decodeURIComponent(value);
    }
    return value;
}

function restoreFromCookieIfSet(id, name) {
    const x = getCookieIfSet(name);
    if (x) {
        document.getElementById(id).value = x;
    }
}