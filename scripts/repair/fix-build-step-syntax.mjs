#!/usr/bin/env node
import fs from "fs";

const FILE = "utils/math-explanations.js";
let s = fs.readFileSync(FILE, "utf8");

const fnStart = s.indexOf("export function buildStepExplanation");
let fn = s.slice(fnStart);

fn = fn.replace(/mix`([^`]*?)"\s*\)/g, "mix`$1`)");
fn = fn.replace(/mix`([^`]*?)"\s*;/g, "mix`$1`);");
fn = fn.replace(/\$\{LTR\(\s*\n?\s*`/g, "${M(`");
fn = fn.replace(/\$\{LTR\(`/g, "${M(`");
fn = fn.replace(/\$\{M\(`([^`]*?)\n\s*\)\}/g, "${M(`$1`)}");

s = s.slice(0, fnStart) + fn;
fs.writeFileSync(FILE, s);
console.log("fixed buildStepExplanation syntax");
