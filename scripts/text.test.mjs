// What the forms' text cleaning removes and what it keeps (api/_text.js).   node scripts/text.test.mjs
// Removed: the bidirectional embedding, override and isolate controls ("Trojan Source", CVE-2021-42574) and control
// characters other than tab and line ends. Kept: every letter, mark and emoji, including the joiners, variation
// selectors and direction marks that emoji and some scripts need.
import assert from "node:assert/strict";
import { visible } from "../api/_text.js";

let n = 0;
const same = (input, want, what) => { assert.equal(visible(input), want, what); n++; };

// Removed
for (const c of ["‪", "‫", "‬", "‭", "‮", "⁦", "⁧", "⁨", "⁩"])
  same("Wave" + c + " One", "Wave One", "a direction control U+" + c.codePointAt(0).toString(16).toUpperCase() + " is removed");
same("evil‮txt.exe", "eviltxt.exe", "a right-to-left override cannot reorder a title");
same("a\u0000b\u0007c\u001Bd\u007Fe", "abcde", "control characters (null, bell, escape, delete) are removed");
same("\u0008\u000B\u000C", "", "backspace, vertical tab and form feed are removed");

// Kept
same("line one\nline two\r\n\tindented", "line one\nline two\r\n\tindented", "tab, line feed and carriage return stay");
same("\u{1F468}‍\u{1F469}‍\u{1F467}", "\u{1F468}‍\u{1F469}‍\u{1F467}", "a family emoji keeps its zero width joiners");
same("❤️", "❤️", "a heart keeps its variation selector");
same("می‌خواهم", "می‌خواهم", "a Persian word keeps its zero width non-joiner");
same("abc‏def‎", "abc‏def‎", "right-to-left and left-to-right marks stay");
same("Ünïcödé ✦ 波 שלום", "Ünïcödé ✦ 波 שלום", "letters and symbols from every script stay");

console.log(`text: ${n} checks passed`);
