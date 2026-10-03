import test from 'node:test';
import assert from 'node:assert/strict';
import {csv,validateAnswers,normalizeName} from '../src/lib/helpers';
test('bingo rejects names repeated with accents, case and punctuation',()=>{
 const f=[{key:'a',label:'A'},{key:'b',label:'B'}];
 assert.equal(normalizeName('  José   Pérez '),normalizeName('JOSE-PEREZ'));
 assert.match(validateAnswers(f,{a:'José Pérez',b:'JOSE-PEREZ'},true),/diferente/);
 assert.match(validateAnswers(f,{a:'Ana',b:' '},true),/todos/);
 assert.equal(validateAnswers(f,{a:'Ana Pérez',b:'Luis Mora'},true),'');
});
test('CSV preserves Unicode, quotes, newlines and neutralizes spreadsheet formulas',()=>{
 const text=csv([['Nombre','Respuesta'],['José','Hola,"equipo"\nBien'],['=SUM(A1:A2)',' \t@evil']]);
 assert.ok(text.startsWith('\uFEFF'));assert.ok(text.includes('"Hola,""equipo""\nBien"'));
 assert.ok(text.includes('"\'=SUM(A1:A2)"'));assert.ok(text.includes('"\' \t@evil"'));
});
