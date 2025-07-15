const lawOfCosines = (a, b, c, angle, side) => {
  // convert degrees → radians
  const θ = angle * Math.PI / 180;

  switch (side.toLowerCase()) {
    case 'a':
      // a² = b² + c² − 2bc·cos(A)
      if (b == null || c == null) throw new Error("Need b and c to find a");
      return Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(θ));

    case 'b':
      // b² = a² + c² − 2ac·cos(B)
      if (a == null || c == null) throw new Error("Need a and c to find b");
      return Math.sqrt(a * a + c * c - 2 * a * c * Math.cos(θ));

    case 'c':
      // c² = a² + b² − 2ab·cos(C)
      if (a == null || b == null) throw new Error("Need a and b to find c");
      return Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(θ));

    default:
      throw new Error("`side` must be one of 'a', 'b', or 'c'");
  }
};

/**
 * Converts degrees to radians.
 * @param {number} deg - Angle in degrees.
 * @returns {number} Angle in radians.
 */
function toRad(deg) {
  return deg * Math.PI / 180;
}

/**
 * Converts radians to degrees.
 * @param {number} rad - Angle in radians.
 * @returns {number} Angle in degrees.
 */
function toDeg(rad) {
  return rad * 180 / Math.PI;
}

/**
 * Calcula o ângulo interno A (em graus) de um losango dado
 * o comprimento do lado `a` e o comprimento da diagonal maior `p` -> Distancia da garra.
 * Derivado de: p = a * sqrt(2 + 2 cos A)  ⇒  cos A = (p²/a² - 2) / 2
 * @param {number} a - Comprimento do lado do losango.
 * @param {number} p - Comprimento da diagonal maior AC.
 * @throws Irá lançar um Error se a diagonal não for compatível com o comprimento do lado.
 * @returns {number} Ângulo interno em A em graus.
 */
const calcAngleBasedClawDistance = (a, p, complementaryAngle = false) => {
  const cosA = (p * p / (a * a) - 2) / 2;

  if (cosA < -1 || cosA > 1) throw new Error('Diagonal incompatível com lado a');

  if (complementaryAngle) return 180 - toDeg(Math.acos(cosA));
  return toDeg(Math.acos(cosA));
}

class Joint {
  // Colocar ang min e max tambem
  constructor(name, x, y, z = 0, angle, movel = true) {
    this.name = name
    this.x = x
    this.y = y
    this.z = z // Desativado eixo z no inicio
    this.angle = angle
    this.movel = movel

    // Outras configurações do arduino e servo irão aqui
  }

  getAngle() {
    return this.angle
  }

  coordinates() {
    return [this.x, this.y, this.z]
  }

  updateAngle(newAngle) {
    this.angle += newAngle
  }
}

const shoulder = new Joint("shoulder", 0, 0, 0, 50, false)
const elbow = new Joint("elbow", 0, 10, 0, 90)
const claw = new Joint("claw", 10, 10, 0, 45)

class RoboticArm {
  constructor(shoulderJoint, elbowJoint, clawJoint) {
    this.shoulderJoint = shoulderJoint;
    this.elbowJoint = elbowJoint;
    this.clawJoint = clawJoint;

    // Angulos Iniciais de cada vértice do Losango -> Inicia como um quadrado
    // A = C, B = D, A + B = 180, C + D = 180
    this.A_angle = 90
    this.B_angle = 180 - this.A_angle
    this.C_angle = this.A_angle
    this.D_angle = this.B_angle

    // // TODO: Verificar necessidade deste mapeamneto
    // this.last_A_angle = this.A_angle
    // this.last_B_angle = this.B_angle
    // this.last_C_angle = this.C_angle
    // this.last_D_angle = this.D_angle

    // Comprimentos fixos dos segmentos do braço
    this.segmentLength1 = 10; // Ombro para cotovelo
    this.segmentLength2 = this.segmentLength1; // Cotovelo para Garra

    this.updateArmGeometry();
  }

  updateArmGeometry() {
    //* Pontos / Joints
    this.A = this.shoulderJoint.coordinates(); // -> Fixo
    this.B = this.elbowJoint.coordinates();
    this.C = this.clawJoint.coordinates();
    // Ponto de referencia para o Losango (Referencial do braco)
    this.D = [10, 0] // -> Fixo

    //* Vetores
    this.AB = [this.B[0] - this.A[0], this.B[1] - this.A[1]];
    this.BC = [this.C[0] - this.B[0], this.C[1] - this.B[1]];
    this.AC = [this.C[0] - this.A[0], this.C[1] - this.A[1]];
    this.AD = [this.D[0] - this.A[0], this.D[1] - this.A[1]]

    //* Módulo da Reta
    this.moduloAB = Math.hypot(...this.AB);
    this.moduloBC = Math.hypot(...this.BC);
    this.moduloAC = Math.hypot(...this.AC);
    this.moduloAD = Math.hypot(...this.AD);

    this.a = this.moduloBC; // Distância BC
    this.b = this.moduloAC; // Distância AC (distância da garra)
    this.c = this.moduloAB; // Distância AB
    this.d = this.moduloAD  // Referencia para formação do Losango

    //* Direção unitária de cada vetor
    this.uAB = [this.AB[0] / this.moduloAB, this.AB[1] / this.moduloAB];
    this.uBC = [this.BC[0] / this.moduloBC, this.BC[1] / this.moduloBC];
    this.uAC = [this.AC[0] / this.moduloAC, this.AC[1] / this.moduloAC];
    this.uAD = [this.AD[0] / this.moduloAD, this.AD[1] / this.moduloAD];
  }

  updateCoordinates(x, y, z, joint) {
    if (joint.movel) {
      joint.x = x;
      joint.y = y;
      joint.z = z;
    }
  }

  /**
   * Calcula a altura do losango (Garra) em relação ao solo
   * @returns {number}
 */
  calculateLosangoHeight() {
    // h=asin(A)
    return this.segmentLength1 * Math.sin(toRad(this.A_angle))
  }

  /**
    * Retorna a distancia da Garra em relação a origem levando em consideração a geometria
    * que a mesma forma (triângulo) onde a distancia AC é a hipotenusa, a altura do losango é um dos catetos
    * e o outro cateto é a distancia da garra.
    * 
    * Calcula a distância horizontal da perna do triângulo retângulo formado pela altura
    * do losango e sua diagonal maior. Usa o teorema de Pitágoras:
    * distanciaHorizontal = √(hipotenusa² − altura²)
    *
    * @returns {number}  
    *   A distância horizontal (isto é, o outro cateto) correspondente à
    *   diagonal maior dada (`this.b`) e a altura do losango
    *   (como retornado por `this.calculateLosangoHeight()`)
    * @throws {Error}  
    *   Se o radicando calculado (this.b² − altura²) for negativo, indicando
    *   medidas inconsistentes do losango.
  */
  getClawDistance() {
    const height = this.calculateLosangoHeight();
    const hypot = this.b;               // comprimento da diagonal maior AC
    const radicand = hypot * hypot - height * height;
    if (radicand < 0) {
      throw new Error('Dimensões inconsistentes: não é possível calcular a distância horizontal');
    }
    return Math.sqrt(radicand);
  }

  rotateVector(vectorUn, angle) {
    const [x, y] = vectorUn

    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    // Retorna as novas coordenadas pós rotação apenas se a Joint for móvel no plano
    return [x * cos - y * sin, x * sin + y * cos]
  }

  // Formula ANtiga
  // Calcular novos ângulos usando lei dos cossenos
  // Para um braço de dois segmentos, calculamos os ângulos internos do triângulo
  // Calculo com lei dos cossenos para achar novos angulos -> Ver mais informacoes na documentacao
  // p = a √(2 - 2 cos(B))
  moveClawFront(distance) {
    console.log(`\nMovendo garra ${distance} unidades para frente...`);
    // Para mover para frente, deve-se alterar o valor da reta AC para o tamanho final do movimento
    // Exemplo: mover garra dois cm para frente é resultado da trigonometria para calcular os angulos nas `Joints` Shoulder e Elbow]
    const height = this.calculateLosangoHeight();
    const currentClaw = this.getClawDistance();
    const newClaw = currentClaw + distance;

    // Verificar se o movimento é possível
    // TODO: Atualizar limites
    const maxReach = this.segmentLength1 + this.segmentLength2;
    const minReach = Math.abs(this.segmentLength1 - this.segmentLength2);
    if (newClaw > maxReach || newClaw < minReach) {
      console.log(`Movimento impossível. Alcance deve estar entre ${minReach} e ${maxReach}`);
      return;
    }

    const newAC = Math.sqrt((height * height) + (newClaw * newClaw));

    // Atualiza novo angulo interno de A
    const a = this.segmentLength1;
    const ratio = (newAC * newAC) / (a * a);
    const cosA = (ratio - 2) / 2;
    if (cosA < -1 || cosA > 1) {
      throw new Error('Requested movement out of reach');
    }

    const oldAngA = this.A_angle
    const oldAngB = this.B_angle
    const newAngleA = Math.acos(cosA) * 180 / Math.PI;
    // * OBS -> This just works with ideal rhombus (losango) onde os lados são iguais, em outros cenários será necessário usar lei dos cossenos
    const newAngleB = 180 - newAngleA

    // * Calcula a variação do angulo nos motores apos a mudança de posição e atualiza movimento dos motores (Joints)
    const angleDeltaA = newAngleA - oldAngA
    const angleDeltaB = newAngleB - oldAngB

    //* Atualização dos angulos do Losango de acordo com a movimentação do braço
    this.A_angle = newAngleA;
    // B angle is complementary with A -> Losango laws
    this.B_angle = newAngleB;
    this.C_angle = this.A_angle
    this.D_angle = this.B_angle

    // New Diagonal distance -> this.b
    this.b = newAC;

    // Recalcula medidas
    const updatedHeight = this.calculateLosangoHeight();
    const updatedClaw = this.getClawDistance();

    // * Calcula a variação do angulo nos motores apos a mudança de posição e atualiza movimento dos motores (Joints)
    this.shoulderJoint.updateAngle(angleDeltaA);
    this.elbowJoint.updateAngle(angleDeltaB)

    //* Rotaciona o segmento AB em relação a AD
    //* calcular AB girando AD em +angleA (padrão CCW).
    const new_AB = this.rotateVector(this.uAD, toRad(newAngleA)).map(c => c * this.segmentLength1)

    //* Calcular novas posições das Joints no plano cartesiano (Coordenadas)
    const elbowX = this.A[0] + new_AB[0]
    const elbowY = this.A[1] + new_AB[1]
    const elbowZ = 0 // Disabled for now...

    const clawX = elbowX + (this.D[0] - this.A[0])
    const clawY = elbowY + (this.D[1] - this.A[1])
    const clawZ = 0 // Disabled for now...

    //* Atualiza coordenadas das Joints móveis
    this.updateCoordinates(elbowX, elbowY, elbowZ, this.elbowJoint)
    this.updateCoordinates(clawX, clawY, clawZ, this.clawJoint)

    // Atualizar geometria do braço
    this.updateArmGeometry();
  }

  coordinates() {
    return {
      shoulder: this.shoulderJoint.coordinates(),
      elbow: this.elbowJoint.coordinates(),
      claw: this.clawJoint.coordinates()
    };
  }

  joints() {
    console.log("Shoulder:", this.A);
    console.log("Elbow:", this.B);
    console.log("Claw:", this.C);
  }

  parts() {
    console.log("Length a:", this.a);
    console.log("Length b:", this.b);
    console.log("Length c:", this.c);
  }

  angles() {
    console.log("Shoulder Angle:", this.shoulderJoint.getAngle());
    console.log("Elbow Angle:", this.elbowJoint.getAngle());
    console.log("Claw Angle:", this.clawJoint.getAngle());
  }

  directions() {
    console.log("Unit direction AB:", this.uAB);
    console.log("Unit direction BC:", this.uBC);
    console.log("Unit direction AC:", this.uAC);
    console.log("Unit direction AD:", this.uAD);
  }
}

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(prompt) {
  return new Promise(res => rl.question(prompt, ans => res(parseFloat(ans))));
}
const arm1 = new RoboticArm(shoulder, elbow, claw);

function displayArmStatus() {
  console.log("=".repeat(50));
  console.log("📊 STATUS DO BRAÇO ROBÓTICO");
  console.log("=".repeat(50));

  console.log("\n🔧 ÂNGULOS Das Juntas:");
  console.log(`  Ombro: ${arm1.A_angle.toFixed(2)}°`);
  console.log(`  Cotovelo: ${arm1.B_angle.toFixed(2)}°`);

  console.log("\n📏 COMPRIMENTOS:");
  console.log(`  Lado a (BC): ${arm1.a.toFixed(2)}`);
  console.log(`  Lado b (AC): ${arm1.b.toFixed(2)}`);
  console.log(`  Lado c (AB): ${arm1.c.toFixed(2)}`);

  console.log(`Claw Distance: ${arm1.getClawDistance()}`);
  

  console.log("\n📍 COORDENADAS:");
  const coords = arm1.coordinates();
  console.log(`  Ombro: (${coords.shoulder[0].toFixed(2)}, ${coords.shoulder[1].toFixed(2)})`);
  console.log(`  Cotovelo: (${coords.elbow[0].toFixed(2)}, ${coords.elbow[1].toFixed(2)})`);
  console.log(`  Garra: (${coords.claw[0].toFixed(2)}, ${coords.claw[1].toFixed(2)})`);

  console.log("\n🧭 DIREÇÕES UNITÁRIAS:");
  console.log(`  AB: (${arm1.uAB[0].toFixed(3)}, ${arm1.uAB[1].toFixed(3)})`);
  console.log(`  BC: (${arm1.uBC[0].toFixed(3)}, ${arm1.uBC[1].toFixed(3)})`);
  console.log(`  AC: (${arm1.uAC[0].toFixed(3)}, ${arm1.uAC[1].toFixed(3)})`);

  console.log("=".repeat(50));
}

async function startInteractiveMode() {
  console.log("🤖 CONTROLE INTERATIVO DO BRAÇO ROBÓTICO");
  console.log("Insira a distância para mover a garra (números positivos/negativos)");

  // Mostrar status inicial
  displayArmStatus();

  while (true) {
    try {
      const input = await ask("\nDigite a distância para mover a garra: ");

      if (isNaN(input)) {
        console.log("Por favor, insira um número válido.");
        continue;
      }

      console.log(`\nMovendo garra ${input > 0 ? input : input} unidades...`);

      arm1.moveClawFront(input);

      console.log("✅ Movimento concluído!");
      displayArmStatus();

    } catch (error) {
      console.log("❌ Erro:", error.message);
    }
  }
}

// Iniciar modo interativo
startInteractiveMode().catch(console.error);