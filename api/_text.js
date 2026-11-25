/* Text people send through the forms keeps every letter, mark and emoji it was written with, and loses only the
   characters that change what a reader sees without being seen themselves: the bidirectional embedding, override and
   isolate controls, which can show a title's characters in another order than they are stored ("Trojan Source",
   CVE-2021-42574), and control characters other than tab and line ends. Joiners and variation selectors stay: emoji
   and some scripts (Persian, the Indic scripts) need them. */
const HIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;

/** `value` without the hidden controls above. */
export const visible = (value) => value.replace(HIDDEN, "");
