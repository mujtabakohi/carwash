// Tiny clock so tests can control "now".
let fixed = null;
export const clock = { now: () => (fixed ? new Date(fixed) : new Date()), set: d => { fixed = d ? new Date(d) : null; } };
