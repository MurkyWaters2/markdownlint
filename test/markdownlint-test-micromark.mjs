// @ts-check

import fs from "node:fs/promises";
import test from "ava";
import { newLineRe } from "../helpers/helpers.js";
import { filterByPredicate, filterByTypes, getMicromarkEvents, parse }
  from "../helpers/micromark.cjs";

const testContent = new Promise((resolve, reject) => {
  fs
    .readFile("./test/every-markdown-syntax.md", "utf8")
    .then((content) => content.split(newLineRe).join("\n"))
    .then(resolve, reject);
});

const testTokens = new Promise((resolve, reject) => {
  testContent.then(parse).then(resolve, reject);
});

test("parse", async(t) => {
  t.plan(1);
  t.snapshot(await testTokens, "Unexpected tokens");
});

test("getMicromarkEvents/filterByPredicate", async(t) => {
  t.plan(1);
  const content = await testContent;
  const events = getMicromarkEvents(content);
  let inHtmlFlow = false;
  const eventTypes = events
    .filter((event) => {
      const result = !inHtmlFlow && (event[0] === "enter");
      if (event[1].type === "htmlFlow") {
        inHtmlFlow = !inHtmlFlow;
      }
      return result;
    })
    .map((event) => event[1].type);
  const tokens = parse(content);
  const filtered = filterByPredicate(
    tokens,
    () => true,
    (token) => ((token.type === "htmlFlow") ? [] : token.children)
  );
  const tokenTypes = filtered.map((token) => token.type);
  t.deepEqual(tokenTypes, eventTypes);
});

test("filterByTypes", async(t) => {
  t.plan(8);
  const filtered = filterByTypes(
    await testTokens,
    [ "atxHeadingText", "codeText", "htmlText", "setextHeadingText" ]
  );
  for (const token of filtered) {
    t.true(token.type.endsWith("Text"));
  }
});

test("filterByPredicate/filterByTypes", async(t) => {
  t.plan(1);
  const tokens = await testTokens;
  const byPredicate = filterByPredicate(tokens, () => true);
  const allTypes = new Set(byPredicate.map(((token) => token.type)));
  const byTypes = filterByTypes(tokens, [ ...allTypes.values() ]);
  t.deepEqual(byPredicate, byTypes);
});
