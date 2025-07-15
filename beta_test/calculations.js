/**
 * Converte graus para radianos.
 * @param {number} deg - Ângulo em graus.
 * @returns {number} Ângulo em radianos.
 */
function toRad(deg) {
  return deg * Math.PI / 180;
}

/**
 * Converte radianos para graus.
 * @param {number} rad - Ângulo em radianos.
 * @returns {number} Ângulo em graus.
 */
function toDeg(rad) {
  return rad * 180 / Math.PI;
}

/**
 * Calcula o ângulo interno A (em graus) de um losango dado
 * o comprimento do lado `a` e o comprimento da diagonal maior `p`.
 * Derivado de: p = a * sqrt(2 + 2 cos A)  ⇒  cos A = (p²/a² - 2) / 2
 * @param {number} a - Comprimento do lado do losango.
 * @param {number} p - Comprimento da diagonal maior AC.
 * @throws Lançará um Error se a diagonal não for compatível com o comprimento do lado.
 * @returns {number} Ângulo interno em A em graus.
 */
function calcAngleFromDiagonal(a, p) {
  const cosA = (p*p/(a*a) - 2) / 2;
  if (cosA < -1 || cosA > 1) throw new Error('Diagonal incompatível com lado a');
  return toDeg(Math.acos(cosA));
}

/**
 * Rotaciona um vetor 2D por um ângulo especificado (em radianos).
 * @param {[number, number]} v - O vetor a ser rotacionado como [x, y].
 * @param {number} angle - O ângulo de rotação em radianos.
 * @returns {[number, number]} O vetor rotacionado como [x', y'].
 */
function rotate(v, angle) {
  const [x,y] = v;
  const c = Math.cos(angle), s = Math.sin(angle);
  return [x*c - y*s, x*s + y*c];
}

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// lê um número do prompt
function ask(prompt) {
  return new Promise(res => rl.question(prompt, ans => res(parseFloat(ans))));
}

(async () => {
  try {
    console.log('\n--- Posições de B e C em um losango ---');
    // entradas
    const Ax = await ask('A.x: ');
    const Ay = await ask('A.y: ');
    const Dx = await ask('D.x: ');
    const Dy = await ask('D.y: ');
    const a  = await ask('Comprimento do lado a: ');
    const p  = await ask('Diagonal maior p (AC): ');
    let angleA = await ask('Ângulo interno A (°). Se quiser recalcular a partir de p, digite 0: ');

    if (Math.abs(angleA) < 1e-6) {
      angleA = calcAngleFromDiagonal(a, p);
      console.log(` → Ângulo A recalculado: ${angleA.toFixed(4)}°`);
    }

    // vetor AD e sua norma (deve ≈ a)
    const vAD = [Dx - Ax, Dy - Ay];
    const lenAD = Math.hypot(...vAD);
    if (Math.abs(lenAD - a) > 1e-3) {
      console.warn('⚠️  Atenção: |AD| ≠ a. Verifique as coordenadas de D ou o valor de a.');
    }
    // direção unitária de AD
    const uAD = [vAD[0]/lenAD, vAD[1]/lenAD];

    // (3) calcular AB girando AD em +angleA (padrão CCW).
    //     Se quiser a outra orientação, troque o sinal do ângulo.
    const AB = rotate(uAD, toRad(angleA)).map(c => c * a);
    const Bx = Ax + AB[0];
    const By = Ay + AB[1];

    // (4) ponto C pelo paralelogramo: C = B + (D - A)
    const Cx = Bx + (Dx - Ax);
    const Cy = By + (Dy - Ay);

    console.log('\n→ Coordenadas calculadas:');
    console.log(`  B: (${Bx.toFixed(4)}, ${By.toFixed(4)})`);
    console.log(`  C: (${Cx.toFixed(4)}, ${Cy.toFixed(4)})`);

    // (5) validação opcional da diagonal AC
    const AC = Math.hypot(Cx - Ax, Cy - Ay);
    console.log(`  |AC| = ${AC.toFixed(4)} (esperado ≈ ${p})`);

  } catch (err) {
    console.error('\nErro:', err.message);
  } finally {
    rl.close();
  }
})();
