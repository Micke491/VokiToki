(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/pusher-client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "pusherClient",
    ()=>pusherClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$pusher$2d$js$2f$dist$2f$web$2f$pusher$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/pusher-js/dist/web/pusher.js [app-client] (ecmascript)");
;
const pusherClient = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$pusher$2d$js$2f$dist$2f$web$2f$pusher$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"](("TURBOPACK compile-time value", "52683d98ea1684999c7d"), {
    cluster: ("TURBOPACK compile-time value", "eu")
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/storage.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AUTH_TOKEN_KEY",
    ()=>AUTH_TOKEN_KEY,
    "getAuthToken",
    ()=>getAuthToken,
    "removeAuthToken",
    ()=>removeAuthToken,
    "setAuthToken",
    ()=>setAuthToken
]);
const AUTH_TOKEN_KEY = 'token';
const getAuthToken = ()=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
};
const setAuthToken = (token, persist = false)=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    if (persist) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
    } else {
        sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.removeItem(AUTH_TOKEN_KEY);
    }
};
const removeAuthToken = ()=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "API_BASE_URL",
    ()=>API_BASE_URL,
    "apiFetch",
    ()=>apiFetch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/storage.ts [app-client] (ecmascript)");
;
const API_BASE_URL = ("TURBOPACK compile-time value", "http://127.0.0.1:8081") || '';
async function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAuthToken"])();
    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, {
        ...options,
        headers
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/pushNotifications.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getNotificationPermission",
    ()=>getNotificationPermission,
    "isNotificationsEnabled",
    ()=>isNotificationsEnabled,
    "registerServiceWorker",
    ()=>registerServiceWorker,
    "requestNotificationPermission",
    ()=>requestNotificationPermission,
    "setNotificationsEnabled",
    ()=>setNotificationsEnabled,
    "showNotification",
    ()=>showNotification
]);
async function registerServiceWorker() {
    if (("TURBOPACK compile-time value", "object") === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });
        return registration;
    } catch (err) {
        console.error('[Push] SW registration failed:', err);
        return null;
    }
}
async function requestNotificationPermission() {
    if (("TURBOPACK compile-time value", "object") === 'undefined' || !('Notification' in window)) return 'denied';
    const result = await Notification.requestPermission();
    return result;
}
function getNotificationPermission() {
    if (("TURBOPACK compile-time value", "object") === 'undefined' || !('Notification' in window)) return 'denied';
    return Notification.permission;
}
function isNotificationsEnabled() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return localStorage.getItem('notificationsEnabled') !== 'false';
}
function setNotificationsEnabled(enabled) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.setItem('notificationsEnabled', enabled ? 'true' : 'false');
}
async function showNotification(data) {
    if (!isNotificationsEnabled()) return;
    if (getNotificationPermission() !== 'granted') return;
    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            if (registration && registration.active) {
                registration.active.postMessage({
                    action: 'showNotification',
                    ...data
                });
                return;
            }
        }
        const options = {
            body: data.body,
            tag: data.chatId || 'default'
        };
        if (data.icon) options.icon = data.icon;
        if (data.badge) options.badge = data.badge;
        new Notification(data.title, options);
    } catch (err) {
        console.error('[Push] Failed to show notification:', err);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/chat/IncomingCallModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>IncomingCallModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/phone.js [app-client] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$video$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Video$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/video.js [app-client] (ecmascript) <export default as Video>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
function IncomingCallModal({ callData, onAccept, onDecline }) {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "IncomingCallModal.useEffect": ()=>{
            const timer = setTimeout({
                "IncomingCallModal.useEffect.timer": ()=>{
                    onDecline();
                }
            }["IncomingCallModal.useEffect.timer"], 30000);
            return ({
                "IncomingCallModal.useEffect": ()=>clearTimeout(timer)
            })["IncomingCallModal.useEffect"];
        }
    }["IncomingCallModal.useEffect"], [
        onDecline
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "IncomingCallModal.useEffect": ()=>{
            let audio = null;
            try {
                audio = new Audio('/ringtone.mp3');
                audio.loop = true;
                audio.play().catch({
                    "IncomingCallModal.useEffect": (e)=>{
                        if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
                            console.warn('Ringtone could not be played (likely missing /ringtone.mp3)', e.message);
                        }
                    }
                }["IncomingCallModal.useEffect"]);
            } catch (e) {
                console.error('Audio initialization failed', e);
            }
            return ({
                "IncomingCallModal.useEffect": ()=>{
                    if (audio) {
                        audio.pause();
                        audio.currentTime = 0;
                    }
                }
            })["IncomingCallModal.useEffect"];
        }
    }["IncomingCallModal.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
            initial: {
                opacity: 0,
                y: -50,
                scale: 0.9
            },
            animate: {
                opacity: 1,
                y: 0,
                scale: 1
            },
            exit: {
                opacity: 0,
                y: -50,
                scale: 0.9
            },
            className: "fixed top-6 left-1/2 -translate-x-1/2 z-[110] bg-chat-glass backdrop-blur-2xl rounded-2xl shadow-2xl border border-chat-border p-4 w-[90%] max-w-sm flex flex-col items-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-16 h-16 rounded-full overflow-hidden mb-3 bg-gradient-to-br from-chat-accent to-chat-accent-secondary flex items-center justify-center shadow-lg border-2 border-chat-bg-primary",
                    children: callData.callerAvatar ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: callData.callerAvatar,
                        alt: callData.callerName,
                        className: "w-full h-full object-cover"
                    }, void 0, false, {
                        fileName: "[project]/components/chat/IncomingCallModal.tsx",
                        lineNumber: 52,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-2xl font-bold text-white",
                        children: callData.callerName.charAt(0).toUpperCase()
                    }, void 0, false, {
                        fileName: "[project]/components/chat/IncomingCallModal.tsx",
                        lineNumber: 54,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/chat/IncomingCallModal.tsx",
                    lineNumber: 50,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                    className: "text-lg font-semibold text-chat-text-primary mb-1 text-center",
                    children: callData.callerName
                }, void 0, false, {
                    fileName: "[project]/components/chat/IncomingCallModal.tsx",
                    lineNumber: 60,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm text-chat-text-secondary mb-6 text-center flex items-center justify-center gap-2",
                    children: [
                        callData.callType === 'video' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$video$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Video$3e$__["Video"], {
                            className: "w-4 h-4"
                        }, void 0, false, {
                            fileName: "[project]/components/chat/IncomingCallModal.tsx",
                            lineNumber: 64,
                            columnNumber: 44
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                            className: "w-4 h-4"
                        }, void 0, false, {
                            fileName: "[project]/components/chat/IncomingCallModal.tsx",
                            lineNumber: 64,
                            columnNumber: 76
                        }, this),
                        "Incoming ",
                        callData.callType,
                        " call..."
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/chat/IncomingCallModal.tsx",
                    lineNumber: 63,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-center gap-8 w-full",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onDecline,
                            className: "flex flex-col items-center gap-2 group",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20 group-hover:bg-red-600 transition-colors",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                                        className: "w-6 h-6 rotate-[135deg]"
                                    }, void 0, false, {
                                        fileName: "[project]/components/chat/IncomingCallModal.tsx",
                                        lineNumber: 74,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/chat/IncomingCallModal.tsx",
                                    lineNumber: 73,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs font-medium text-chat-text-secondary",
                                    children: "Decline"
                                }, void 0, false, {
                                    fileName: "[project]/components/chat/IncomingCallModal.tsx",
                                    lineNumber: 76,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/chat/IncomingCallModal.tsx",
                            lineNumber: 69,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onAccept,
                            className: "flex flex-col items-center gap-2 group animate-bounce",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20 group-hover:bg-green-600 transition-colors",
                                    children: callData.callType === 'video' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$video$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Video$3e$__["Video"], {
                                        className: "w-6 h-6"
                                    }, void 0, false, {
                                        fileName: "[project]/components/chat/IncomingCallModal.tsx",
                                        lineNumber: 84,
                                        columnNumber: 48
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                                        className: "w-6 h-6"
                                    }, void 0, false, {
                                        fileName: "[project]/components/chat/IncomingCallModal.tsx",
                                        lineNumber: 84,
                                        columnNumber: 80
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/chat/IncomingCallModal.tsx",
                                    lineNumber: 83,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs font-medium text-chat-text-secondary",
                                    children: "Accept"
                                }, void 0, false, {
                                    fileName: "[project]/components/chat/IncomingCallModal.tsx",
                                    lineNumber: 86,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/chat/IncomingCallModal.tsx",
                            lineNumber: 79,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/chat/IncomingCallModal.tsx",
                    lineNumber: 68,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/chat/IncomingCallModal.tsx",
            lineNumber: 44,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/chat/IncomingCallModal.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, this);
}
_s(IncomingCallModal, "3ubReDTFssvu4DHeldAg55cW/CI=");
_c = IncomingCallModal;
var _c;
__turbopack_context__.k.register(_c, "IncomingCallModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/chat/CallModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CallModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$livekit$2f$components$2d$react$2f$dist$2f$room$2d$BP3SCCCd$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__L__as__LiveKitRoom$3e$__ = __turbopack_context__.i("[project]/node_modules/@livekit/components-react/dist/room-BP3SCCCd.mjs [app-client] (ecmascript) <export L as LiveKitRoom>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$livekit$2f$components$2d$react$2f$dist$2f$prefabs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@livekit/components-react/dist/prefabs.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
function CallModal({ onLeave, chatId, callType, username }) {
    _s();
    const [token, setToken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [serverUrl, setServerUrl] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const isLeaving = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useRef(false);
    const [isConnected, setIsConnected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CallModal.useEffect": ()=>{
            ({
                "CallModal.useEffect": async ()=>{
                    try {
                        const resp = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/api/calls/create-room", {
                            method: "POST",
                            body: JSON.stringify({
                                chatId,
                                username
                            })
                        });
                        const data = await resp.json();
                        setToken(data.token);
                        setServerUrl(data.serverUrl);
                    } catch (e) {
                        console.error("Token fetch error:", e);
                    }
                }
            })["CallModal.useEffect"]();
        }
    }["CallModal.useEffect"], [
        chatId,
        username
    ]);
    const handleDisconnected = (reason)=>{
        if (isLeaving.current) return;
        console.log("LiveKit Disconnected. Reason:", reason);
        // Only leave if it wasn't a temporary hiccup or if it's been long enough
        isLeaving.current = true;
        onLeave();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/api/calls/end", {
            method: "POST",
            body: JSON.stringify({
                chatId,
                callType
            })
        }).catch(console.error);
    };
    const handleConnected = ()=>{
        setIsConnected(true);
        console.log("Connected to LiveKit room successfully");
    };
    if (token === "" || serverUrl === "") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                className: "w-10 h-10 text-white animate-spin"
            }, void 0, false, {
                fileName: "[project]/components/chat/CallModal.tsx",
                lineNumber: 62,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/chat/CallModal.tsx",
            lineNumber: 61,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
        initial: {
            opacity: 0,
            scale: 0.95
        },
        animate: {
            opacity: 1,
            scale: 1
        },
        exit: {
            opacity: 0,
            scale: 0.95
        },
        className: "fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative w-full max-w-5xl h-[80vh] bg-chat-glass backdrop-blur-2xl border border-chat-border rounded-xl overflow-hidden shadow-2xl flex flex-col",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$livekit$2f$components$2d$react$2f$dist$2f$room$2d$BP3SCCCd$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__L__as__LiveKitRoom$3e$__["LiveKitRoom"], {
                video: callType === "video",
                audio: true,
                token: token,
                serverUrl: serverUrl,
                onConnected: handleConnected,
                onDisconnected: handleDisconnected,
                connectOptions: {
                    autoSubscribe: true
                },
                "data-lk-theme": "default",
                style: {
                    height: '100%'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$livekit$2f$components$2d$react$2f$dist$2f$prefabs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["VideoConference"], {}, void 0, false, {
                    fileName: "[project]/components/chat/CallModal.tsx",
                    lineNumber: 88,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/chat/CallModal.tsx",
                lineNumber: 75,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/chat/CallModal.tsx",
            lineNumber: 74,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/chat/CallModal.tsx",
        lineNumber: 68,
        columnNumber: 5
    }, this);
}
_s(CallModal, "W3r3bPbykLfRM20J8IDkHfN7X84=");
_c = CallModal;
var _c;
__turbopack_context__.k.register(_c, "CallModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/layout/NotificationListener.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NotificationListener
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pusher$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/pusher-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pushNotifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/pushNotifications.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$chat$2f$IncomingCallModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/chat/IncomingCallModal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$chat$2f$CallModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/chat/CallModal.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
function NotificationListener({ currentUser: propUser }) {
    _s();
    const [internalUser, setInternalUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NotificationListener.useEffect": ()=>{
            if (propUser === undefined) {
                const fetchUser = {
                    "NotificationListener.useEffect.fetchUser": async ()=>{
                        try {
                            const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])(`/api/users/current_user`);
                            if (response.ok) {
                                const data = await response.json();
                                setInternalUser(data.user);
                            }
                        } catch (error) {
                            console.error("Failed to fetch user in NotificationListener:", error);
                        }
                    }
                }["NotificationListener.useEffect.fetchUser"];
                fetchUser();
            }
        }
    }["NotificationListener.useEffect"], [
        propUser
    ]);
    const currentUser = propUser !== undefined ? propUser : internalUser;
    const [incomingCall, setIncomingCall] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [activeCall, setActiveCall] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const pathnameRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(pathname);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NotificationListener.useEffect": ()=>{
            pathnameRef.current = pathname;
        }
    }["NotificationListener.useEffect"], [
        pathname
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NotificationListener.useEffect": ()=>{
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pushNotifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["registerServiceWorker"])();
            if (("TURBOPACK compile-time value", "object") !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }["NotificationListener.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NotificationListener.useEffect": ()=>{
            if (!currentUser) return;
            const userChannel = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pusher$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pusherClient"].subscribe(`user-${currentUser._id}`);
            const handleChatUpdate = {
                "NotificationListener.useEffect.handleChatUpdate": (data)=>{
                    const { chatId, lastMessage } = data;
                    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pushNotifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isNotificationsEnabled"])() && lastMessage) {
                        const senderId = lastMessage.sender?._id?.toString() || lastMessage.sender?.toString();
                        const currentUserId = currentUser._id.toString();
                        if (senderId === currentUserId) return;
                        const currentPath = pathnameRef.current;
                        const currentChatId = currentPath.startsWith('/chat/') ? currentPath.split('/')[2] : null;
                        const isCurrentChat = currentChatId === chatId;
                        const isVisible = document.visibilityState === 'visible';
                        if (!isVisible || !isCurrentChat) {
                            const senderName = lastMessage.sender?.username || 'Someone';
                            const bodyText = lastMessage.text ? lastMessage.text.substring(0, 100) : lastMessage.mediaType === 'image' ? 'Photo' : lastMessage.mediaType === 'video' ? 'Video' : lastMessage.mediaType === 'audio' ? 'Voice message' : 'New message';
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pushNotifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["showNotification"])({
                                title: senderName,
                                body: bodyText,
                                chatId: chatId,
                                type: 'message',
                                senderName,
                                icon: lastMessage.sender?.avatar
                            });
                        }
                    }
                }
            }["NotificationListener.useEffect.handleChatUpdate"];
            const handleIncomingCall = {
                "NotificationListener.useEffect.handleIncomingCall": (data)=>{
                    const callerId = data.callerId?.toString();
                    const myId = currentUser._id?.toString();
                    if (callerId && myId && callerId !== myId) {
                        setIncomingCall(data);
                        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pushNotifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isNotificationsEnabled"])()) {
                            const callerName = data.callerName || 'Someone';
                            const callType = data.callType === 'video' ? 'Video' : 'Voice';
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pushNotifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["showNotification"])({
                                title: `${callType} Call`,
                                body: `${callerName} is calling you...`,
                                chatId: data.chatId,
                                type: 'call',
                                icon: data.callerAvatar
                            });
                        }
                    }
                }
            }["NotificationListener.useEffect.handleIncomingCall"];
            const handleCallEnded = {
                "NotificationListener.useEffect.handleCallEnded": (data)=>{
                    setIncomingCall({
                        "NotificationListener.useEffect.handleCallEnded": (prev)=>{
                            if (prev?.chatId === data.chatId) return null;
                            return prev;
                        }
                    }["NotificationListener.useEffect.handleCallEnded"]);
                    setActiveCall({
                        "NotificationListener.useEffect.handleCallEnded": (prev)=>{
                            if (prev?.chatId === data.chatId) return null;
                            return prev;
                        }
                    }["NotificationListener.useEffect.handleCallEnded"]);
                }
            }["NotificationListener.useEffect.handleCallEnded"];
            userChannel.bind("chat-update", handleChatUpdate);
            userChannel.bind("call:incoming", handleIncomingCall);
            userChannel.bind("call:ended", handleCallEnded);
            return ({
                "NotificationListener.useEffect": ()=>{
                    userChannel.unbind("chat-update", handleChatUpdate);
                    userChannel.unbind("call:incoming", handleIncomingCall);
                    userChannel.unbind("call:ended", handleCallEnded);
                }
            })["NotificationListener.useEffect"];
        }
    }["NotificationListener.useEffect"], [
        currentUser
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NotificationListener.useEffect": ()=>{
            const handleStartCall = {
                "NotificationListener.useEffect.handleStartCall": async (e)=>{
                    const { chatId, type } = e.detail;
                    if (!currentUser) return;
                    try {
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/api/calls/notify", {
                            method: "POST",
                            body: JSON.stringify({
                                chatId,
                                callType: type,
                                callerName: currentUser.username,
                                callerAvatar: currentUser.avatar
                            })
                        });
                        setActiveCall({
                            chatId,
                            type
                        });
                    } catch (err) {
                        console.error("Failed to initiate call:", err);
                    }
                }
            }["NotificationListener.useEffect.handleStartCall"];
            window.addEventListener("start-call", handleStartCall);
            return ({
                "NotificationListener.useEffect": ()=>window.removeEventListener("start-call", handleStartCall)
            })["NotificationListener.useEffect"];
        }
    }["NotificationListener.useEffect"], [
        currentUser
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            incomingCall && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$chat$2f$IncomingCallModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                callData: incomingCall,
                onAccept: ()=>{
                    setActiveCall({
                        chatId: incomingCall.chatId,
                        type: incomingCall.callType
                    });
                    setIncomingCall(null);
                },
                onDecline: ()=>{
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/api/calls/end", {
                        method: "POST",
                        body: JSON.stringify({
                            chatId: incomingCall.chatId,
                            callType: incomingCall.callType
                        })
                    }).catch(console.error);
                    setIncomingCall(null);
                }
            }, void 0, false, {
                fileName: "[project]/components/layout/NotificationListener.tsx",
                lineNumber: 168,
                columnNumber: 9
            }, this),
            activeCall && currentUser && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$chat$2f$CallModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                chatId: activeCall.chatId,
                callType: activeCall.type,
                username: currentUser.username,
                onLeave: ()=>setActiveCall(null)
            }, void 0, false, {
                fileName: "[project]/components/layout/NotificationListener.tsx",
                lineNumber: 185,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true);
}
_s(NotificationListener, "U9alwPNY2VtE7t+vpAsOM3joBes=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = NotificationListener;
var _c;
__turbopack_context__.k.register(_c, "NotificationListener");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_833847a5._.js.map